# 11 — Splash Screen Timing Fix

> **Priority:** P2 (Should fix — causes visible flash of wrong screen on cold start)
> **Effort:** Short (1–4 hours)

---

## The Problem

`SplashScreen.hideAsync()` is called on mount in `app/_layout.tsx` without waiting for:

1. Auth state to resolve (Firebase `onAuthStateChanged`)
2. Font assets to load
3. Theme to hydrate
4. Navigation to mount

**Result:** Users see a flash of the auth screen before being redirected to the app (or vice versa).

---

## Solution: Startup Gate

Keep the native splash visible until **all startup conditions are met**, then hide after the first stable layout.

### Readiness Conditions

```typescript
startupReady = authReady && fontsReady && themeReady && navReady;
```

| Condition    | Source                                   | Ready When                             |
| ------------ | ---------------------------------------- | -------------------------------------- |
| `authReady`  | `onAuthStateChanged` callback OR timeout | First callback fires, or 5s timeout    |
| `fontsReady` | `useFonts()`                             | Loaded, errored, or timeout            |
| `themeReady` | Theme provider hydration                 | Hydrated (or `true` if sync)           |
| `navReady`   | Root navigation state                    | `useRootNavigationState()?.key` exists |

---

## Code Flow

### Module Load (`app/_layout.tsx`)

```typescript
import * as SplashScreen from "expo-splash-screen";
SplashScreen.preventAutoHideAsync().catch(() => {});
```

### Render Phase

1. Start font load (`useFonts`)
2. AuthProvider mounts, attaches `onAuthStateChanged`
3. ThemeProvider hydrates
4. Expo Router mounts navigation tree

### Hide Sequence (only once)

```typescript
const splashHiddenRef = useRef(false);

const onLayoutRoot = useCallback(async () => {
  if (!startupReady || splashHiddenRef.current) return;
  splashHiddenRef.current = true;
  await SplashScreen.hideAsync();
}, [startupReady]);

if (!startupReady) return null; // Native splash stays visible

return (
  <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRoot}>
    {/* providers + Stack */}
  </GestureHandlerRootView>
);
```

---

## Auth Initialization Changes (`lib/auth-context.tsx`)

Add explicit "auth initialized" semantics:

```typescript
const AUTH_INIT_TIMEOUT_MS = 5000;

const [authInitialized, setAuthInitialized] = useState(false);

useEffect(() => {
  const timeout = setTimeout(() => {
    setAuthInitialized(true); // Proceed even if Firebase is slow
  }, AUTH_INIT_TIMEOUT_MS);

  const unsubscribe = onAuthStateChanged(auth, (user) => {
    clearTimeout(timeout);
    setUser(user);
    setAuthInitialized(true); // First callback = initialized
  });

  return () => {
    clearTimeout(timeout);
    unsubscribe();
  };
}, []);
```

**Key:** `authInitialized` is separate from other loading states (login calls, token refresh). It only tracks "has the first auth state been determined?"

---

## Edge Cases

### Firebase Unreachable / Offline

- Timeout fires after 5s → `authInitialized = true`
- App proceeds to auth screen with offline banner
- User can retry or use cached auth state (MMKV persistence)

### Font Load Fails

- Treat as `fontsReady = true` — continue with system fonts
- Optionally log `fontsError` for diagnostics

### Android vs iOS

- **Android 12+**: Splash exit can feel abrupt if hidden before first layout → `onLayout` pattern prevents this
- **iOS**: LaunchScreen shows until hide → long timeouts (>5s) feel "frozen"
- **Recommendation:** 4–6s max timeout, then show in-app loading/offline UI

### Timeout Too Long

- Users may think app is frozen if splash shows >5s
- After timeout, show an in-app loading state with offline banner, not continued splash

---

## Optional: Fade Transition

After hiding native splash, render a `SplashOverlay` component:

- Matches splash background color (#329f3d) and logo
- Animated opacity 1→0 over 200–350ms
- Unmount after animation completes

This softens the transition and avoids a "jarring swap" feel.

---

## File-by-File Changes

| File                           | Change                                                                                                                                     |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `app/_layout.tsx`              | Remove `useEffect(() => SplashScreen.hideAsync(), [])`. Add `useFonts`, `startupReady` gate, `onLayout` handler, conditional `return null` |
| `lib/auth-context.tsx`         | Add `authInitialized` state with timeout. Export via context. Separate from other loading flags                                            |
| `components/SplashOverlay.tsx` | **NEW** (optional) — Matching visual + fade animation                                                                                      |

---

## Testing Strategy

### Manual Cold Start Matrix

1. **Signed in, good network** → Should go directly to app, no flash
2. **Signed out, good network** → Should go to auth screen, no flash
3. **Airplane mode** → Should show auth/offline state after timeout, no flash
4. **Slow network** → Should wait for auth (up to timeout), then show correct screen
5. **Font asset missing** → Should proceed with system fonts, no crash

### Instrumentation

- Log timestamps for `fontsReady`, `authInitialized`, `navReady`, and splash hide
- Compare perceived startup time before/after

### Platform Checks

- Android API 31+ emulator cold start
- iOS simulator cold start
- Look for "blank frame" or "route flash" as splash hides

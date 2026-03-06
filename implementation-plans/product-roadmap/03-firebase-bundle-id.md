# 03 — Firebase Bundle ID Fix

> **Priority:** P0 (App Store Blocker — Firebase services may fail in production)
> **Effort:** Short (1–4 hours) if same Firebase project; Medium (1–2 days) if project migration needed

---

## The Problem

| File                       | Current Bundle/Package | Expected    |
| -------------------------- | ---------------------- | ----------- |
| `app.json`                 | `com.cartful.app`      | ✅ Correct  |
| `GoogleService-Info.plist` | `com.grocerylist.app`  | ❌ Mismatch |
| `google-services.json`     | `com.grocerylist.app`  | ❌ Mismatch |

Both Firebase config files contain **placeholder values** (not real Firebase credentials).

---

## Key Question: Do These Files Even Matter?

### For JS SDK (current setup): Mostly No

- `lib/firebase.ts` initializes Firebase using `EXPO_PUBLIC_*` env vars
- **Auth and Firestore via JS SDK are unaffected** by native config files
- The JS SDK uses the config object passed directly (`apiKey`, `projectId`, etc.)

### For Native Firebase SDKs: Yes, Critical

These files matter when:

- **FCM push notifications** (Android requires `google-services.json`)
- **Firebase Analytics / Crashlytics** (native SDKs)
- **`@react-native-firebase/*`** modules
- Any Expo plugins that reference `googleServicesFile`

---

## Recommended Approach

### Option A: Fix the Files (Recommended)

Even if not strictly needed today, correct files prevent future "works in dev, breaks in prod" issues and unblock native features (push, analytics, crash reporting).

**Steps:**

1. Open **Firebase Console → Project Settings → Your apps**
2. Verify the project matches your `.env.local` `projectId`
3. **Add iOS app** with bundle ID `com.cartful.app` → download `GoogleService-Info.plist`
4. **Add Android app** with package `com.cartful.app` → download `google-services.json`
5. Replace placeholder files in repo root with real ones
6. Configure in `app.json`:
   ```json
   "ios": {
     "googleServicesFile": "./GoogleService-Info.plist"
   },
   "android": {
     "googleServicesFile": "./google-services.json"
   }
   ```

### Option B: Remove the Files

If staying JS-only with no plans for native Firebase features:

1. Delete `GoogleService-Info.plist` and `google-services.json` from repo
2. Remove any `googleServicesFile` references from `app.json`
3. Accept that native Firebase features won't work until files are reintroduced

---

## EAS Build Considerations

- Managed workflow: EAS runs prebuild under the hood
- Only files referenced via Expo config (or required by plugins) get copied into native projects
- **Best practice:** Either commit config files (they are NOT secret) or store as base64 EAS secrets and materialize during build
- Ensure each EAS profile (dev/preview/prod) uses consistent Firebase project config

---

## Expo Plugins That May Depend on These Files

- `expo-notifications` — for Android FCM push tokens in standalone/dev builds
- `@react-native-firebase/*` — absolutely depends on these files
- Check `app.json` plugins array for any Firebase-related plugins

Currently only `expo-router` is in the plugins array.

---

## Testing Strategy

### JS-Level (Expo Go)

- Sign up / sign in
- Read/write Firestore documents
- Verify no project-mismatch errors

### Native-Level (Dev/Preview Build via EAS)

- Build with corrected files
- Confirm no Google services/bundle mismatch warnings in build logs
- Retest Auth + Firestore
- If push enabled: verify FCM device token acquisition

---

## File-by-File Changes

| File                       | Change                                                                                   |
| -------------------------- | ---------------------------------------------------------------------------------------- |
| `GoogleService-Info.plist` | Replace with correct file from Firebase Console (bundle ID: `com.cartful.app`) OR delete |
| `google-services.json`     | Replace with correct file from Firebase Console (package: `com.cartful.app`) OR delete   |
| `app.json`                 | Add `ios.googleServicesFile` and `android.googleServicesFile` if keeping files           |

---

## Watch Out For

- **Expo Go vs Dev Client:** Expo Go ignores native Firebase config; dev builds include it — test both
- **Profile mismatch:** Dev/preview/prod env vars may point at different Firebase projects; ensure native files match each profile
- **Placeholder files wired in:** If `googleServicesFile` points at placeholder files, native features will misconfigure even if JS Auth/Firestore seems fine

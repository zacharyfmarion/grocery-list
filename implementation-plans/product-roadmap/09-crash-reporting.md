# 09 — Crash Reporting

> **Priority:** P2 (Should fix before release — flying blind on production crashes)
> **Effort:** Short (1–4 hours) if clean EAS profiles; Medium (1–2 days) if converting config + validating sourcemaps

---

## Recommendation: Sentry

### Why Sentry over Crashlytics

| Feature              | Sentry                                | Firebase Crashlytics                                                |
| -------------------- | ------------------------------------- | ------------------------------------------------------------------- |
| Expo managed support | **Best fit** (official config plugin) | Requires native Firebase setup                                      |
| JS error capture     | **Automatic**                         | Manual (non-fatal logs)                                             |
| Native crash capture | **Yes**                               | **Yes (excellent)**                                                 |
| Source maps          | **Yes** (CI upload)                   | Not applicable for JS                                               |
| Additional deps      | `@sentry/react-native` only           | `@react-native-firebase/app` + `/crashlytics` + native config files |

**Verdict:** Sentry aligns with managed Expo + EAS workflow, captures both JS + native crashes, and has clear source map support.

---

## Installation

```bash
npx expo install @sentry/react-native
```

---

## Configuration

### app.config.ts (or app.json)

Add Sentry plugin:

```ts
plugins: ["expo-router", "@sentry/react-native/expo"];
```

### Environment Variables

**Runtime (safe to embed):**

- `EXPO_PUBLIC_SENTRY_DSN` — Sentry project DSN
- `EXPO_PUBLIC_APP_ENV` — `development` | `preview` | `production`

**Build/CI secrets (NOT prefixed with EXPO*PUBLIC*):**

- `SENTRY_AUTH_TOKEN` — for source map upload
- `SENTRY_ORG` — Sentry org slug
- `SENTRY_PROJECT` — Sentry project slug (e.g., `cartful`)

### EAS Build Profiles

| Profile     | SENTRY_DSN | SENTRY_AUTH_TOKEN | Notes                |
| ----------- | ---------- | ----------------- | -------------------- |
| development | _(empty)_  | _(not needed)_    | No noise from dev    |
| preview     | Set        | Set               | Test crash reporting |
| production  | Set        | Set               | Full reporting       |

---

## Integration

### 1. Sentry Init Module (`lib/sentry.ts` — NEW)

```typescript
import * as Sentry from "@sentry/react-native";

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: DSN,
  enabled: !__DEV__ && !!DSN,
  environment: process.env.EXPO_PUBLIC_APP_ENV ?? "unknown",
  beforeSend(event) {
    // Scrub sensitive data from URLs, headers, breadcrumbs
    return event;
  },
  tracesSampleRate: 0, // Enable later if needed (0.05-0.1 for prod)
});

export { Sentry };
```

### 2. Root Layout (`app/_layout.tsx`)

- Import `lib/sentry` **before** rendering (top of file)
- Replace exported ErrorBoundary with custom version:

```typescript
import { Sentry } from "@/lib/sentry";

export { ErrorBoundary } from "expo-router";
// OR custom:
export function ErrorBoundary({ error, retry }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);
  // Render fallback UI
}
```

### 3. User Identification (`lib/auth-context.tsx`)

On auth state change:

```typescript
import { Sentry } from "@/lib/sentry";

// On login:
Sentry.setUser({ id: user.uid });

// On logout:
Sentry.setUser(null);
```

---

## Source Maps

### How It Works

- `@sentry/react-native/expo` plugin integrates source map upload during EAS builds
- Requires `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` in build environment

### Validation

1. Build with preview profile
2. Trigger a test exception: `throw new Error('Sentry test')`
3. Check Sentry dashboard — stack trace should show original TS/JS filenames + line numbers
4. If sourcemaps missing: add EAS build hook for `sentry-cli` upload as fallback

---

## What Gets Captured

| Type                         | Captured             | Method                        |
| ---------------------------- | -------------------- | ----------------------------- |
| JS runtime errors            | ✅ Automatic         | Sentry init                   |
| Native crashes               | ✅ Automatic         | Native SDK via plugin         |
| Unhandled promise rejections | ✅ Automatic         | Sentry init                   |
| Network failures             | Breadcrumbs only     | Default behavior (not events) |
| Route-level errors           | ✅ Via ErrorBoundary | Custom boundary               |

---

## Privacy Implications

**Data sent to Sentry:**

- Stack traces, device/OS/app version, timestamps
- Runtime breadcrumbs (navigation, user actions)
- User identifier (Firebase UID — not email)

**Mitigations:**

- `sendDefaultPii: false` (default)
- `beforeSend` scrubbing for URLs, query params, auth headers, Firebase tokens
- **Update privacy policy** to disclose crash reporting processor (Sentry)
- **Update App Store nutrition labels** if diagnostics data type changes

---

## Alerting Setup (Sentry Dashboard)

Create alert rules:

1. "New issue created" → Email / Slack
2. "Regression detected" → Email / Slack
3. "Error count > N in 10 min" (production only) → Slack

---

## File-by-File Changes

| File                            | Change                                                           |
| ------------------------------- | ---------------------------------------------------------------- |
| `lib/sentry.ts`                 | **NEW** — Sentry init, scrubbing, environment gating             |
| `app/_layout.tsx`               | Import sentry at top, custom ErrorBoundary with captureException |
| `lib/auth-context.tsx`          | Set/clear Sentry user on auth state changes                      |
| `app.json` (or `app.config.ts`) | Add `@sentry/react-native/expo` plugin                           |
| `eas.json`                      | Add env vars per profile for DSN + auth token                    |
| `package.json`                  | Add `@sentry/react-native` dependency                            |

---

## Watch Out For

- **Duplicate reporting**: Don't both capture in ErrorBoundary AND manually `captureException` for the same error
- **PII leakage**: Scrub request URLs/headers in `beforeSend`
- **Dev noise**: Ensure `enabled: !__DEV__` prevents dev build events
- **Source maps mismatch**: Release name in Sentry init must match what's used during build upload

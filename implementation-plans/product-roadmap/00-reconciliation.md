# 00 — Engineering Reconciliation

> Cross-plan compatibility analysis and definitive implementation order.

---

## Hot Files (Multiple Plans Touch These)

| File                      | Plans              | Risk                              |
| ------------------------- | ------------------ | --------------------------------- |
| `lib/auth-context.tsx`    | 01, 04, 09, 11     | Highest — state shape + lifecycle |
| `app/(app)/settings.tsx`  | 01, 02, 05, 06, 10 | Layout/section conflicts          |
| `app/_layout.tsx`         | 09, 10, 11         | Startup ordering critical         |
| `app/(auth)/register.tsx` | 02, 06, 10         | Legal UI block                    |
| `app.json` / `eas.json`   | 02, 03, 07, 09     | Config format decision            |
| `firestore.rules`         | 01, 10             | Combine user write policies       |

---

## 1. Conflicts & Resolutions

### auth-context.tsx (4 plans)

- **Plan 11** (authInitialized) must land first — it defines the canonical "auth is settled" lifecycle that all other plans depend on
- **Plan 04** (resetPassword) is purely additive — low conflict
- **Plan 01** (deleteAccount + reauth) depends on authInitialized being true + user being present
- **Plan 09** (Sentry.setUser) must hook into the final user state transitions to avoid misreporting

**Merge order:** 11 → 04 → 01 → 09

### settings.tsx (5 plans)

**Use a stable section layout:**

- **Account** — email display, display name edit, sign out, **"Delete account"** (plan 01, danger zone)
- **Appearance** — existing theme/accent settings
- **Preferences** — existing sort/haptics
- **Categories** — existing category management
- **Legal** — Privacy Policy + Terms of Service links (plans 02, 10)
- **Support** — "Contact support" with real email (plan 05)
- **About** — app version, existing info

This lets plans add to distinct sections without interleaving.

### app/\_layout.tsx (3 plans)

**Correct ordering:**

1. **Module scope (top):** Sentry init (plan 09) → `SplashScreen.preventAutoHideAsync()` — errors during boot get captured
2. **Component tree:** Sentry error boundary → Providers → **Startup gate** (plan 11, return null until ready) → Router
3. **Re-consent gate (plan 10):** Render AFTER auth is initialized and user is known. Use `app/(app)/_layout.tsx` (not root) to avoid deadlocking splash

### register.tsx (3 plans)

- Plans 02 + 10 both add legal UI → **implement together** as a single "Legal block" (checkbox + footer links)
- Plan 06 adjusts accessibility props afterward

### firestore.rules (2 plans)

- Plan 01: `accountDeletionRequests/{uid}` read access
- Plan 10: `users/{uid}.legal` write access
- **Combine** into one coherent `users/{uid}` policy update

---

## 2. Dependencies

```
03 (Firebase ID) ← 01 (Account Deletion — needs correct Firebase project)
                 ← 09 (Sentry — needs correct build config)

11 (Splash/Auth) ← 10 (ToS Gate — needs authInitialized to read user doc)
                  ← 01 (Delete — needs auth settled)

08 (Logging)     ← 09 (Sentry — logging forwards to Sentry)

02 (Privacy)     ← 10 (ToS — shared hosting infra, same Settings section)
```

---

## 3. Shared Infrastructure Decisions

### Constants

**Merge into one module: `lib/constants.ts`**

```typescript
// Support
export const SUPPORT_EMAIL = "support@cartful.app";

// Legal
export const LEGAL = {
  PRIVACY_URL: "https://...",
  TERMS_URL: "https://...",
  TERMS_VERSION: "2026-03-06",
} as const;
```

Don't split into `lib/constants/legal.ts` unless you already have a constants folder pattern.

### Logging + Sentry

- `lib/logging.ts` — single call site (`logError()`)
- `lib/sentry.ts` — only handles init/wrapping + setUser/clearUser
- `logError()` internally forwards to Sentry if initialized

### Firebase Exports

- Keep `lib/firebase.ts` as the single Firebase module
- Export `auth`, `db`, `app`, and **`functions`** (added for plan 01)

### Legal Hosting

- Host Privacy Policy + ToS on same domain (GitHub Pages or similar)
- Wire URLs via `app.config.ts` extras → access via `Constants.expoConfig?.extra`

---

## 4. Accessibility Breaking Change Strategy

**Do plan 06 LATE as a dedicated sweep**, after all feature plans (01, 02, 04, 10, 11) that add new UI.

Rationale:

- Making `accessibilityLabel` required on IconButton/FAB breaks ALL existing usages
- If done early, every subsequent plan that uses these components must remember to add labels
- Done late, you touch each screen/component ONCE and fix all call sites in one TypeScript-driven pass

During earlier work, add labels proactively where obvious — but don't flip the type to required until the sweep.

---

## 5. app.json → app.config.ts Decision

**Convert to `app.config.ts` FIRST** if:

- Plan 09 (Sentry) needs env-dependent plugin config
- You want URLs (privacy, terms) in extras driven by environment

**Keep `app.json`** if:

- All Sentry config can stay static (DSN from env vars at runtime, not build time)
- URLs are hardcoded constants

**Recommendation:** Convert early. It's a low-risk change that benefits plans 02, 03, 07, and 09.

---

## 6. Firebase Functions + Bundle ID

Cloud Functions callable SDK does **not** require native config files (`GoogleService-Info.plist` / `google-services.json`). But the overall Firebase project identity must be consistent:

- Fix bundle ID (plan 03) BEFORE adding Functions (plan 01)
- This ensures the JS SDK config, native files, and Functions all point at the same project

---

## 7. Root Layout Provider/Gate Ordering

```
app/_layout.tsx render tree:

Sentry.wrap(                          // Plan 09 — captures all errors
  <ErrorBoundary>                     // Plan 09 — custom with captureException
    <ThemeProvider>
      <NavThemeProvider>
        <GestureHandlerRootView onLayout={hideSplash}>  // Plan 11
          <KeyboardProvider>
            <AuthProvider>            // Plan 11 — exposes authInitialized
              {startupReady ? (       // Plan 11 — gate
                <Stack />
              ) : null}
            </AuthProvider>
          </KeyboardProvider>
        </GestureHandlerRootView>
      </NavThemeProvider>
    </ThemeProvider>
  </ErrorBoundary>
)

// Re-consent gate (Plan 10) lives in app/(app)/_layout.tsx
// NOT in root layout — avoids blocking auth screens
```

---

## Definitive Implementation Order

| Phase                | Plan(s)                                     | Rationale                                                                                   |
| -------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------- |
| **0. Prep**          | Convert `app.json` → `app.config.ts`        | Unblocks env-dependent config for all subsequent plans                                      |
| **1. Foundation**    | **03** Firebase Bundle ID Fix               | Establishes correct project identity for all Firebase features                              |
| **2. Startup**       | **11** Splash Screen Fix                    | Stabilizes auth lifecycle (`authInitialized`) that plans 01, 09, 10 depend on               |
| **3. Legal**         | **02 + 10** Privacy Policy + ToS (together) | Shared hosting, shared UI (Settings Legal section + Register legal block), shared constants |
| **4. Auth Flows**    | **04** Forgot Password                      | Additive auth feature, low conflict                                                         |
| **5. Account**       | **01** Account Deletion                     | Depends on stable auth + Firebase identity. Largest feature.                                |
| **6. Quick Fixes**   | **05** Placeholder Email                    | Usually folded into Settings work from phase 3-5                                            |
| **7. Observability** | **08** then **09**                          | Logging helper first, then Sentry (forwards logError → Sentry)                              |
| **8. Accessibility** | **06** Full Sweep                           | Single breaking PR after all new UI exists                                                  |
| **9. Release**       | **07** EAS Submit Config                    | Needs all features complete, correct IDs, metadata ready                                    |
| **10. Cleanup**      | **12** Build Artifacts                      | Housekeeping, any time                                                                      |

---

## Implementation Phases Visualized

```
Phase 0:  app.config.ts conversion
Phase 1:  [03 Firebase ID] ─────────────────────────────────────────┐
Phase 2:  [11 Splash] ──────────────────────────────────────────────┤
Phase 3:  [02 Privacy + 10 ToS] ────────────────────────────────────┤
Phase 4:  [04 Forgot Password] ─────────────────────────────────────┤
Phase 5:  [01 Account Deletion] ────────────────────────────────────┤
Phase 6:  [05 Email Fix] ──────────────────────────────────────────┤
Phase 7:  [08 Logging] → [09 Sentry] ──────────────────────────────┤
Phase 8:  [06 Accessibility Sweep] ─────────────────────────────────┤
Phase 9:  [07 EAS Submit] ─────────────────────────────────────────┤
Phase 10: [12 Build Artifacts] ─────────────────────────────────────┘
```

---

## Key Rules During Implementation

1. **Never modify `auth-context.tsx` out of the prescribed order** (11 → 04 → 01 → 09)
2. **Settings sections are stable** — add to your designated section, don't reflow others
3. **Re-consent gate goes in `app/(app)/_layout.tsx`**, NOT root layout
4. **Don't enforce required accessibility labels until plan 06 sweep** — but add them proactively
5. **All Firebase imports come from `lib/firebase.ts`** — never instantiate a second app
6. **Legal URLs live in `lib/constants.ts`** — single source of truth
7. **`logError()` is the only production logging call** — never use raw `console.*`

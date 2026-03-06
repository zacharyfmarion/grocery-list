# Cartful — V1 Product Roadmap

> App Store release readiness plan. Items ordered by priority.

## 🚫 P0 — Blockers (Will Cause Rejection)

### 1. Account Deletion

Apple requires apps with account creation to offer full account deletion (enforced since June 30, 2022). Currently no delete account option exists anywhere in the app.

### 2. Privacy Policy

Apple requires a privacy policy URL in App Store Connect and accessible within the app. No privacy policy exists or is linked.

### 3. Firebase Bundle ID Mismatch

`GoogleService-Info.plist` and `google-services.json` reference `com.grocerylist.app` but the app's bundle identifier is `com.cartful.app`. Firebase auth/services will fail in production builds.

---

## ⚠️ P1 — High Priority (Likely Rejection or Poor Experience)

### 4. Forgot Password Flow

No password reset mechanism. Users who forget their password are locked out. Reviewers test this.

### 5. Placeholder Feedback Email

Settings screen uses `feedback@example.com` — an obvious placeholder that reviewers may catch.

### 6. Accessibility

Only 2 accessibility references in the entire codebase (both in BottomSheet). No `accessibilityLabel` on buttons, icons, FAB, or interactive elements. Apple reviewers increasingly test VoiceOver.

### 7. EAS Submit Configuration

The `eas.json` submit profile is empty — no Apple-specific configuration for automated submission.

---

## 🟡 P2 — Should Fix Before Release

### 8. Remove Console Statements

9 `console.log`/`console.error` calls across 6 production files.

### 9. Crash Reporting

No Sentry, Crashlytics, or any crash reporting. Production crashes will be invisible.

### 10. Terms of Service

No ToS — recommended for apps with user accounts and shared data.

### 11. Splash Screen Timing

`SplashScreen.hideAsync()` fires on mount without waiting for auth state or asset loading. Causes flash of wrong screen.

### 12. Clean Up Build Artifacts

5 `.ipa` and 3 `.apk` files in project root.

---

## Status

| #   | Item                      | Priority | Plan                               | Status      |
| --- | ------------------------- | -------- | ---------------------------------- | ----------- |
| 1   | Account Deletion          | P0       | [plan](./01-account-deletion.md)   | Not Started |
| 2   | Privacy Policy            | P0       | [plan](./02-privacy-policy.md)     | Not Started |
| 3   | Firebase Bundle ID Fix    | P0       | [plan](./03-firebase-bundle-id.md) | Not Started |
| 4   | Forgot Password Flow      | P1       | [plan](./04-forgot-password.md)    | Not Started |
| 5   | Placeholder Email Fix     | P1       | [plan](./05-placeholder-email.md)  | Not Started |
| 6   | Accessibility             | P1       | [plan](./06-accessibility.md)      | Not Started |
| 7   | EAS Submit Config         | P1       | [plan](./07-eas-submit-config.md)  | Not Started |
| 8   | Remove Console Statements | P2       | [plan](./08-console-cleanup.md)    | Not Started |
| 9   | Crash Reporting           | P2       | [plan](./09-crash-reporting.md)    | Not Started |
| 10  | Terms of Service          | P2       | [plan](./10-terms-of-service.md)   | Not Started |
| 11  | Splash Screen Timing      | P2       | [plan](./11-splash-screen.md)      | Not Started |
| 12  | Build Artifact Cleanup    | P2       | [plan](./12-build-artifacts.md)    | Not Started |

# 05 — Fix Placeholder Feedback Email

> **Priority:** P1 (High — obvious placeholder that reviewers may catch)
> **Effort:** Quick (<30 minutes)

---

## The Problem

`app/(app)/settings.tsx` has `feedback@example.com` in the "Send Feedback" mailto link — an obvious placeholder.

---

## Options

### Option A: Real Support Email (Recommended — Fastest)

- Create a real email (e.g., `support@cartful.app` or `cartful.feedback@gmail.com`)
- Update mailto link to include app version for context:
  ```
  mailto:${SUPPORT_EMAIL}?subject=Cartful%20Feedback%20(v${appVersion})&body=...
  ```
- **Pros:** Simplest, no infra needed
- **Cons:** Depends on user having mail configured; no ticketing

### Option B: Hosted Feedback Form

- Replace with `Linking.openURL(FEEDBACK_URL)` to Google Form/Typeform
- **Pros:** Works for everyone, structured responses
- **Cons:** External dependency, privacy considerations

### Option C: In-App Feedback Form

- Build a feedback form within the app
- **Pros:** Best UX, no external dependencies
- **Cons:** Requires backend endpoint, not a "quick fix"

---

## Recommended Approach

Use **Option A** for V1 launch. Centralize the email in constants:

```typescript
// lib/constants.ts
export const SUPPORT_EMAIL = "support@cartful.app"; // Replace with real email
```

---

## File-by-File Changes

| File                     | Change                                                                           |
| ------------------------ | -------------------------------------------------------------------------------- |
| `lib/constants.ts`       | Add `SUPPORT_EMAIL` constant                                                     |
| `app/(app)/settings.tsx` | Replace `feedback@example.com` with `SUPPORT_EMAIL`, add version to subject line |

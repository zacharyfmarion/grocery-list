# 04 — Forgot Password Flow

> **Priority:** P1 (High — reviewers test this, users get locked out without it)
> **Effort:** Short (1–4 hours) for web-based reset; Medium (1–2 days) for in-app deep-link reset

---

## UX Flow

### Entry Point (Login Screen)

- **"Forgot password?"** link placed **directly under the password field**, aligned right
- Navigates to `/(auth)/forgot-password`
- Optionally passes current email value as query param to prefill

### Forgot Password Screen (`app/(auth)/forgot-password.tsx`)

**Idle State:**

- Title: "Reset password"
- Helper text: "Enter the email you use for Cartful. We'll send you a reset link."
- Email input (prefilled if passed from login)
- Primary button: "Send reset link"
- Secondary: "Back to sign in"

**Submitting State:**

- Button shows loading indicator
- Inputs disabled

**Sent State (Confirmation):**

- Title: "Check your email"
- Body: "If an account exists for **{email}**, we sent a password reset link."
- Primary: "Back to sign in"
- Optional: "Resend" with cooldown timer

**Key UX decisions:**

- Do NOT auto-navigate back — let user tap "Back to sign in"
- Show same success message regardless of whether email exists (enumeration safety)

---

## Firebase Integration

### API

```typescript
sendPasswordResetEmail(auth, email);
```

### Error Code Mapping

| Firebase Error                | User-Facing Message                       | Behavior                                 |
| ----------------------------- | ----------------------------------------- | ---------------------------------------- |
| `auth/invalid-email`          | "Enter a valid email address"             | Field error (inline)                     |
| `auth/user-not-found`         | _(same as success)_                       | Show confirmation — **enumeration safe** |
| `auth/too-many-requests`      | "Too many attempts. Try again later."     | Banner/toast error                       |
| `auth/network-request-failed` | "Network error. Check your connection."   | Banner/toast error                       |
| `auth/user-disabled`          | Generic confirmation OR "Contact support" | Depends on policy                        |

### Security: Enumeration Safety

- **Never confirm whether an email is registered**
- `auth/user-not-found` → show the same "Check your email" confirmation
- Still validate email format locally (zod) to catch typos
- Soft cooldown on "Resend" to reduce spam

---

## Deep Link Handling

### Recommendation: Web-Based Reset (Keep It Simple)

- Firebase sends a password reset email with a link to Firebase's hosted action handler
- User resets password in browser, returns to app, signs in with new password
- **No deep linking needed for V1**

### Future: In-App Reset (Escalation Path)

If needed later:

- Configure Firebase action links to open `cartful://auth/reset?oobCode=...`
- Add `app/(auth)/reset-password.tsx`
- Parse `oobCode`, call `verifyPasswordResetCode()` then `confirmPasswordReset()`
- Route back to login with "Password updated" banner

---

## Email Template Customization

In **Firebase Console → Authentication → Templates → Password reset**:

- Set sender name to **Cartful**
- Configure support email
- Update subject/body with brand voice
- Include safety note: "If you didn't request this, ignore this email."
- Keep default Firebase hosted handler URL (simplest)

---

## File-by-File Changes

| File                             | Change                                                                                                                      |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `lib/auth-context.tsx`           | Add `resetPassword(email: string): Promise<void>` to context. Import and wrap `sendPasswordResetEmail` from `firebase/auth` |
| `app/(auth)/index.tsx`           | Add "Forgot password?" link under password field. Navigate to `/(auth)/forgot-password` with optional email prefill         |
| `app/(auth)/forgot-password.tsx` | **NEW** — RHF + zod email schema, submit handler, idle/submitting/sent states, error mapping, confirmation UI               |
| `app/(auth)/_layout.tsx`         | Ensure stack registers new screen: `options={{ title: "Reset password" }}`                                                  |

---

## Accessibility

- Email `TextInput`:
  - `accessibilityLabel="Email"`
  - `textContentType="emailAddress"`
  - `keyboardType="email-address"`
  - `autoCapitalize="none"`
  - `autoComplete="email"`
- Error text: announce with `accessibilityLiveRegion="polite"` or focus error summary
- Buttons: clear labels, sufficient hit targets (44x44pt minimum)
- After success: move focus to confirmation title/message

---

## Form Schema (Zod)

```typescript
const forgotPasswordSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});
```

---

## State Machine

```
idle → (submit) → submitting → (success) → sent
                             → (error)   → idle (with error displayed)
```

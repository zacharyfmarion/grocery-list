# 10 — Terms of Service

> **Priority:** P2 (Recommended for apps with user accounts and shared data)
> **Effort:** Short (1–4 hours) for app wiring + hosting; Medium (1–2 days) if reconciling shared list deletion/retention behavior

---

## Why Needed

- Cartful has user accounts, user-generated content, and shared lists
- ToS establishes usage rules, content ownership, and liability protections
- Required for App Store Connect (Terms of Use URL field)

---

## Content Outline (V1)

1. **Introduction / Acceptance** — Binding agreement, changes, effective date/version
2. **Eligibility** — Age, ability to contract, not directed to children under 13
3. **Account Registration & Security** — Accurate info, credential security, responsibility
4. **Service Description** — Personal lists, shared lists, templates/history, features may change
5. **User-Generated Content (UGC)**
   - What counts as UGC: list names, items, categories, notes
   - User responsibility + prohibited content (illegal, abusive, IP infringement)
   - Moderation rights (remove content, suspend accounts)
6. **Shared Lists / Collaboration Terms** ⭐
   - How sharing works (members can view/edit)
   - Contributors grant license to other members within the shared list context
   - Controls: who can add/remove members, what happens when membership changes
   - Expectation that content shared into a list is visible to all members
7. **Content Ownership & License**
   - Users own their content
   - Grant Cartful license to host/process/display for service provision
   - Grant other list members license to access within the app
8. **Acceptable Use** — No abuse, scraping, interference, reverse engineering, spam
9. **Third-Party Services** — Firebase, OS/app store, disclaimers
10. **Termination / Suspension** — By user or Cartful, effect on access
11. **Data Retention** ⭐
    - What happens to shared lists if user deletes account/leaves
    - Point to Privacy Policy for processing/retention details
12. **Disclaimers** — "As is", no guarantees, not responsible for shopping outcomes
13. **Limitation of Liability** — Caps, indirect damages
14. **Indemnification** — User covers claims from misuse/UGC
15. **Governing Law / Dispute Resolution** — Jurisdiction
16. **Contact** — Support email, notices

---

## Hosting

**Same host as Privacy Policy** — co-locate for consistency:

- `https://YOUR_DOMAIN/terms`
- `https://YOUR_DOMAIN/privacy`

Include "Last updated" date and version number.

---

## In-App Placement

### Registration Screen (`app/(auth)/register.tsx`)

- Add unchecked checkbox: "I agree to the [Terms of Service]"
- Link opens hosted ToS URL
- **Block account creation until checked**
- On successful signup, write acceptance to Firestore:
  ```
  users/{uid}.legal.tos = {
    version: "2026-03-06",
    acceptedAt: serverTimestamp(),
    appVersion: "1.0.0"
  }
  ```

### Settings Screen (`app/(app)/settings.tsx`)

- Add "Legal" section (or extend About):
  - "Terms of Service" → `Linking.openURL(termsUrl)`
  - "Privacy Policy" → `Linking.openURL(privacyPolicyUrl)`

### Cross-Links

- ToS page links to Privacy Policy
- Privacy Policy links to ToS

---

## Re-Consent on Updates

When terms materially change:

1. Bump `TERMS_VERSION` constant
2. On app start (after auth resolves), compare stored acceptance version vs current
3. If outdated, show blocking modal:
   - "We've updated our Terms of Service"
   - "View Terms" link + "I Agree" button
4. On agree, update Firestore acceptance record with new version

### Implementation

```typescript
// lib/constants/legal.ts (NEW)
export const TERMS_URL = "https://YOUR_DOMAIN/terms";
export const TERMS_VERSION = "2026-03-06";
export const PRIVACY_URL = "https://YOUR_DOMAIN/privacy";
```

```typescript
// components/TermsUpdateModal.tsx (NEW)
// Blocking modal with "View Terms" link + "I Agree" button
// Shows when user's accepted version < TERMS_VERSION
```

---

## Shared List Legal Semantics

### Key Decision: What Happens to Shared Content on Account Deletion?

**Recommended policy:** When a user deletes their account:

- Their contributed items in **others' lists** remain (owned by the list)
- Their **owned lists** are deleted (with warning — see [01-account-deletion.md](./01-account-deletion.md))
- Their membership is removed from all shared lists

**This must match** the ToS language AND the actual account deletion implementation.

---

## Firestore Schema Addition

```
users/{uid}:
  legal:
    tos:
      version: string      // "2026-03-06"
      acceptedAt: Timestamp
      appVersion: string   // "1.0.0"
```

Update `firestore.rules` to allow user to write their own `legal` fields.

---

## App Store Connect

- Add **Terms of Use URL** in App Store Connect → App Information
- Decide: use Apple's Standard EULA or custom? (Custom recommended if you have shared list terms)

---

## File-by-File Changes

| File                              | Change                                                                   |
| --------------------------------- | ------------------------------------------------------------------------ |
| `lib/constants/legal.ts`          | **NEW** — Export TERMS_URL, TERMS_VERSION, PRIVACY_URL                   |
| `app/(auth)/register.tsx`         | Add ToS checkbox, block submit until checked, write acceptance on signup |
| `app/(app)/settings.tsx`          | Add Legal section with ToS + Privacy Policy links                        |
| `app/(app)/_layout.tsx`           | Add TermsUpdateGate that checks acceptance vs current version            |
| `components/TermsUpdateModal.tsx` | **NEW** — Blocking modal for re-consent                                  |
| `firestore.rules`                 | Allow user to read/write `users/{uid}.legal`                             |
| External: ToS web page            | **NEW** — Hosted HTML page                                               |
| External: App Store Connect       | Set Terms of Use URL                                                     |

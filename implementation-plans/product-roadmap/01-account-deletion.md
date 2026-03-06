# 01 — Account Deletion

> **Priority:** P0 (App Store Blocker)
> **Effort:** Medium (1–2 days) if Cloud Functions exist; Large (3+ days) if introducing Functions infra
> **Apple Requirement:** Apps with account creation must provide in-app account deletion (enforced since June 30, 2022)

---

## UX Flow

### Placement

- **Settings → Account → "Delete account"** — destructive styling (red text), visually separated from "Sign out"
- Tapping navigates to a dedicated confirmation screen: `app/(app)/account-delete.tsx`

### Confirmation Screen Sections

1. **Impact Summary** — shows counts of:
   - Lists you own (with warning if any have other members)
   - Lists you're a member of
   - Personal data to be removed (preferences, history, templates)
2. **Shared Lists Warning** — dedicated block if owned lists have other members: "These lists and their items will be permanently deleted for all members"
3. **Re-authentication** — password input (react-hook-form + zod)
4. **Final Confirmation** — type "DELETE" + destructive button
5. **Progress Display** — loading state while deletion runs, with retry on failure

### Copy/Warnings

- "This action is permanent and cannot be undone"
- "Your profile, preferences, history, and templates will be deleted"
- "Lists you own will be deleted for all members"
- "You will be removed from all shared lists"

---

## Data Deletion Flow

### Recommended: Cloud Function (Callable)

**Why server-side:**

- More reliable than client-side iteration
- Works if app is killed mid-deletion
- Avoids Firestore rule limitations for cross-user operations
- One auditable place for "data deletion truly happened"

### Deletion Algorithm (deterministic order)

```
1. Remove user from lists where they are MEMBER (not owner)
   → arrayRemove(uid) from lists/{listId}.members

2. Delete lists where user is OWNER
   → Delete all lists/{listId}/items/* (batched recursive)
   → Delete lists/{listId}

3. Delete user-owned documents
   → userPreferences/{uid}
   → userHistory/{uid} + subcollections
   → templates owned by uid (query by ownerId)
   → users/{uid}

4. Delete Firebase Auth user (Admin SDK)
```

### Status Tracking

- Write to `accountDeletionRequests/{uid}` with stages:
  - `started` → `removing_membership` → `deleting_lists` → `deleting_user_docs` → `deleting_auth` → `done` | `failed`
- Client observes this doc for progress/retry

---

## Re-Authentication

Firebase requires recent authentication for `deleteUser()`.

1. Collect password via form on confirmation screen
2. Call `reauthenticateWithCredential(EmailAuthProvider.credential(email, password))`
3. Handle errors:
   - Wrong password → inline error, allow retry
   - Rate limited → show cooldown message
   - User disabled → show contact support
4. **Never start deletion without successful reauth**

---

## Error Handling

| Failure Mode                 | Handling                                                                    |
| ---------------------------- | --------------------------------------------------------------------------- |
| Wrong password (reauth)      | Inline error, allow retry. Offer "Forgot password" if supported             |
| Rate limited (reauth)        | "Too many attempts. Try again later."                                       |
| Network/offline              | Block starting deletion. Show "Check connection and try again"              |
| Backend partial failure      | Status doc shows `failed` + `lastError`. UI shows "Retry" button            |
| Permission/data-shape issues | Function marks failed with readable code. Show generic error + support link |
| Timeout (large accounts)     | Use Admin recursive delete + batching. Store progress in status doc         |

---

## Edge Cases

### Owned shared lists

**Recommended policy:** Delete owned lists entirely (even if shared). Warn clearly in confirmation UI.

- Alternative: Require ownership transfer before deletion (more UX work, may block deletion which Apple dislikes)

### Very large accounts

- Batch deletes to avoid Cloud Function timeout
- Use `firestore.recursiveDelete()` from Admin SDK
- Persist progress in status doc for resume/retry

### Partial deletion + retry

- Make every step idempotent (safe to rerun)
- Client can re-invoke the callable to resume from last successful stage

### App killed during deletion

- Server-side function continues regardless
- On next app open, check for pending deletion status doc

---

## File-by-File Changes

| File                           | Change                                                                                                                   |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `app/(app)/settings.tsx`       | Add "Delete account" row with destructive styling. Navigate to delete screen                                             |
| `app/(app)/account-delete.tsx` | **NEW** — Confirmation UI, impact summary, password + typed confirm, progress display, retry UX                          |
| `lib/auth-context.tsx`         | Add `deleteAccount(password: string): Promise<void>` — orchestrate reauth → callable → progress listener → signOut/reset |
| `lib/firebase.ts`              | Export `functions` (Firebase Functions client) for `httpsCallable`                                                       |
| `lib/account-deletion.ts`      | **NEW** (optional) — Encapsulate `reauthenticate()`, `requestDeletion()`, `watchDeletionStatus()` helpers                |
| `firestore.rules`              | Allow user to read `accountDeletionRequests/{uid}`. Disallow client writes to deletion docs                              |
| `/functions/src/index.ts`      | **NEW** — `deleteAccount` callable. Firestore cleanup, status tracking, idempotency                                      |
| Zustand stores                 | Add `reset()` per store or central `resetAllStores()` called on deletion success                                         |

---

## Apple Compliance Checklist

- [ ] Delete Account is reachable in-app without contacting support
- [ ] UI clearly states what data is deleted/retained
- [ ] Deletion completes within a reasonable time (Apple guideline: within a few days)
- [ ] If deletion is queued/async, UI communicates expected timeline
- [ ] Privacy policy reflects deletion capability and data retention policy

---

## Open Questions

1. Do `lists` docs have an `ownerId` field, or is ownership only enforced via rules?
2. Do `templates` docs include an `ownerId`, or is ownership derived from doc path?
3. Is Cloud Functions infrastructure already set up, or does this need to be bootstrapped?

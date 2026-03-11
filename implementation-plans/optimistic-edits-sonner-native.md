# Optimistic Edits + Toast Undo Plan

> Updated March 11, 2026.
> This plan assumes Cartful will use `sonner-native` for toast UI instead of a custom-built toast component.

---

## Progress

### Completed

- `sonner-native` and `react-native-svg` installed
- Global toaster mounted in [app/\_layout.tsx](/Users/zacharymarion/Documents/code/cartful/app/_layout.tsx)
- Shared toast wrapper added in [lib/toast.tsx](/Users/zacharymarion/Documents/code/cartful/lib/toast.tsx)
- `useItems()` now applies optimistic toggle updates
- `useItems()` now applies optimistic inline/full item updates
- `useItems()` now applies delayed optimistic delete with undo toast
- Add-sheet close behavior was decoupled from network completion so the tray dismisses immediately
- Newly added items no longer momentarily jump to the top while waiting for a server timestamp

### Remaining

- Optimistic create with temporary client ids
- Optimistic reorder
- Optional retry actions in error toasts
- Broader screen-by-screen rollout beyond the list detail surface

---

## Goals

- Make common list item edits feel immediate
- Roll back UI cleanly when Firestore writes fail
- Reuse one toast system for:
  - passive feedback
  - error feedback
  - undo actions

---

## Library Choice

Use `sonner-native` as the app-wide toast UI layer.

### Why

- Good fit for Expo + React Native
- Supports action buttons needed for `Undo`
- Works as a global provider pattern instead of screen-local UI
- Avoids custom animation, queue, and placement work

### Dependency impact

- Add `sonner-native`
- Add any peer dependency it requires that is not already present, most likely `react-native-svg`

---

## Initial Scope

### Phase 1

- Global toast provider in the root app shell
- Optimistic delete with undo
- Optimistic toggle check/uncheck
- Optimistic inline rename

### Phase 2

- Optimistic full item edit
- Optimistic create item with temporary client ids

### Phase 3

- Optimistic reorder

Reorder is last because its rollback surface is wider than single-item mutations.

---

## Architecture

## 1. Global Toast Layer

Mount the global toaster once in [app/\_layout.tsx](/Users/zacharymarion/Documents/code/cartful/app/_layout.tsx).

Create a small wrapper helper in `lib/` so screens/hooks do not import the library directly everywhere.

### Recommended wrapper API

```ts
showSuccessToast(message: string)
showErrorToast(message: string)
showUndoToast(options: {
  message: string;
  actionLabel?: string;
  onUndo: () => void;
  durationMs?: number;
})
```

This keeps library usage contained and makes later replacement easier.

---

## 2. Optimistic Item State In `useItems`

Move optimistic behavior into [hooks/useItems.ts](/Users/zacharymarion/Documents/code/cartful/hooks/useItems.ts), not the screen.

### Keep separate state buckets

- `serverItems`: latest Firestore snapshot
- `optimisticItems`: rendered list after pending local mutations
- `pendingDeletes`: delete mutations waiting for commit or undo

Render from `optimisticItems`.

### Why this matters

- The screen stays simple
- Firestore snapshot updates can be reconciled centrally
- Rollback logic is testable and reusable

---

## 3. Mutation Model

Each optimistic mutation should keep enough state to either:

- confirm when the server catches up
- roll back on failure
- undo when the user taps the toast action

### Required mutation fields

```ts
{
  id: string;
  type: "delete" | "toggle" | "rename" | "edit" | "create" | "reorder";
  itemId: string;
  before?: GroceryItem | GroceryItem[];
  after?: GroceryItem | GroceryItem[];
  createdAt: number;
}
```

For V0.2, this does not need to be a generic framework. It only needs to support the item flows we are actually shipping.

---

## Implementation Details By Mutation

## Delete

### Behavior

1. Remove the item from `optimisticItems` immediately
2. Show toast with `Undo`
3. Delay Firestore delete for a short window, recommended `4000ms`
4. If user taps `Undo`:
   - cancel timeout
   - restore the item in local state
   - dismiss pending delete record
5. If timeout expires:
   - perform Firestore delete
   - if delete fails, restore the item and show error toast

### Why delayed commit first

Delayed commit is simpler than immediate delete + recreate because it avoids:

- timestamp reconstruction
- order/category restoration complexity
- duplicate create/delete side effects

### Edge cases

- If the item is being edited when deleted, close the editor immediately
- If the list snapshot changes during the undo window, restore the item near its original order
- If the user leaves the screen before timeout, the hook must still either commit or cancel safely

---

## Toggle Check

### Behavior

1. Flip `checked` locally immediately
2. Send Firestore update
3. On failure, revert and show error toast

### Notes

- No undo toast needed initially
- This should remain quiet on success to avoid noisy UI

---

## Inline Rename

### Behavior

1. Update item name locally immediately
2. Send Firestore update
3. On failure, restore old name and show error toast

### Notes

- No success toast required
- Failure toast should be specific: `"Couldn't rename item"`

### Edge cases

- If rename is unchanged or blank, skip mutation entirely
- If another inline rename starts before the first resolves, last local edit should win, but per-item writes should remain serialized where practical

---

## Full Edit Save

### Behavior

1. Apply field changes locally immediately
2. Persist to Firestore
3. Roll back on failure and show error toast

### Fields covered

- name
- quantity
- unit
- category
- note

### Notes

- This uses the same rollback pattern as rename, just with a larger `before` snapshot

---

## Create Item

### Behavior

1. Insert temp item locally with client id like `temp:<uuid>`
2. Persist create to Firestore
3. When server snapshot arrives, replace temp item with real item
4. On failure, remove temp item and show error toast

### Edge cases

- Avoid duplicate rows while waiting for the real snapshot
- Preserve order placement
- Preserve category assignment

This should come after delete/toggle/rename because reconciliation is more complex.

---

## Reorder

### Behavior

1. Apply new ordering locally immediately
2. Persist order batch
3. On failure, restore prior ordering and show error toast

### Edge cases

- Reordering affects multiple items, so rollback should restore the whole affected ordering snapshot
- This should wait until after the simpler optimistic flows are stable

---

## Firestore Snapshot Reconciliation

This is the main correctness risk.

### Rules

- Do not let an older server snapshot overwrite a pending optimistic mutation
- Once server data matches the optimistic result, clear that mutation from local pending state
- If server data diverges after a failed write, prefer server truth and remove the optimistic overlay

### Practical V0.2 approach

- Keep optimistic patches local only for in-flight operations
- On successful write, let the next snapshot become source of truth and clear any local pending entry
- For delayed delete, exclude pending-deleted items from the rendered list even though they still exist on the server until commit

---

## Error Handling

### Error toast rules

- Toggle failure: `"Couldn't update item"`
- Rename failure: `"Couldn't rename item"`
- Edit failure: `"Couldn't save item"`
- Delete failure after delay: `"Couldn't delete item"`
- Reorder failure: `"Couldn't update item order"`

### Retry

Retry is optional for the first pass.

For V0.2, rollback + error toast is enough. Undo on delete is the higher-value interaction.

---

## Screen Integration

Primary consumer is [app/(app)/list/[id].tsx](</Users/zacharymarion/Documents/code/cartful/app/(app)/list/[id].tsx>).

### Expected screen changes

- Replace direct delete flow with optimistic delete + undo toast
- Replace direct toggle flow with optimistic toggle
- Replace direct inline rename save with optimistic rename
- Keep full edit sheet behavior, but call optimistic update helpers

The screen should not own timeout or rollback logic.

---

## Files Expected To Change

- [app/\_layout.tsx](/Users/zacharymarion/Documents/code/cartful/app/_layout.tsx)
- New toast helper under `lib/`, recommended `lib/toast.ts`
- [hooks/useItems.ts](/Users/zacharymarion/Documents/code/cartful/hooks/useItems.ts)
- [app/(app)/list/[id].tsx](</Users/zacharymarion/Documents/code/cartful/app/(app)/list/[id].tsx>)

Potential follow-up:

- [types/index.ts](/Users/zacharymarion/Documents/code/cartful/types/index.ts) if temp-id or local-only metadata needs explicit typing

---

## Rollout Order

1. Install and mount `sonner-native`
2. Add toast helper wrapper
3. Implement optimistic delete with undo
4. Implement optimistic toggle
5. Implement optimistic inline rename
6. Convert full edit save
7. Add optimistic create
8. Add optimistic reorder

---

## Verification Checklist

- Delete removes row immediately and shows `Undo`
- Undo restores the exact item without duplicates
- Delete commit after timeout removes the item permanently
- Failed delete restores item and shows error toast
- Toggle updates instantly and reverts on failure
- Inline rename updates instantly and reverts on failure
- Firestore snapshots do not cause flicker or duplicate rows
- Toasts appear above bottom-sheet/list content in both light and dark mode

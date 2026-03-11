# Undo System Plan

> Updated March 11, 2026.
> First implementation target: checking off an item shows a toast with an `Undo` action that reverses the change.

---

## Goal

Build one reusable undo system that can power multiple reversible actions, instead of wiring one-off toast callbacks into each feature.

Initial shipped flow:

- User checks off an item
- UI updates immediately
- Toast appears with `Undo`
- Tapping `Undo` reverses the change

---

## Principles

- The undo system owns timers and action registration
- The toast is only the UI surface for an undo entry
- Undoable actions should be registered with structured metadata
- The system must support both:
  - inverse actions, like check/uncheck
  - delayed commits, like delete

---

## Architecture

## 1. Undo Manager

Create a small app-level module in `lib/undo.ts` with an in-memory registry of active undo entries.

Recommended shape:

```ts
type UndoKind = "toggle" | "delete" | "edit" | "create" | "reorder";

interface UndoEntry {
  id: string;
  kind: UndoKind;
  message: string;
  durationMs: number;
  resourceKey?: string;
  undo: () => void | Promise<void>;
  commit?: () => void | Promise<void>;
}
```

The manager should expose:

```ts
registerUndo(entry: Omit<UndoEntry, "id">): string
undoNow(id: string): Promise<void>
dismissUndo(id: string): void
```

---

## 2. Toast Integration

The manager should call the shared toast wrapper in [lib/toast.tsx](/Users/zacharymarion/Documents/code/cartful/lib/toast.tsx).

Expected behavior:

- register an undo entry
- show toast with `Undo`
- store the toast id
- if `Undo` tapped:
  - cancel timer
  - call `undo()`
  - clear registry entry
- if timer expires:
  - call `commit()` if present
  - clear registry entry

---

## 3. Coalescing Rules

Use `resourceKey` to prevent a pile of overlapping undo actions for the same thing.

Examples:

- `list:<listId>:item:<itemId>:toggle`
- `list:<listId>:item:<itemId>:delete`

Recommended first rule:

- if a new undo entry registers for the same `resourceKey`, dismiss the prior entry and replace it

This is most important for rapid repeated toggles on the same item.

---

## First Flow: Check Off Item

## UX

- Only checking an item off should show undo at first
- Unchecking should stay quiet for now
- Toast copy: `Checked off Milk`

## Data flow

1. User taps checkbox
2. `useItems()` applies optimistic toggle immediately
3. Firestore write is sent immediately
4. If new state is `checked: true`, register undo entry
5. If user taps `Undo`, perform the inverse toggle
6. Inverse toggle should not create another undo toast

---

## Why Inverse Action For Toggle

Toggle is cheap and reversible, so it should not use delayed commit.

That means:

- first action writes immediately
- undo performs the reverse write

This differs from delete, where delayed commit is the better default.

---

## Implementation Details For Toggle

`useItems()` should gain an internal toggle path with options:

```ts
performToggle(itemId, nextChecked, options?: {
  registerUndo?: boolean;
})
```

Behavior:

- standard user check-off:
  - `registerUndo: true`
- undo-driven reverse toggle:
  - `registerUndo: false`

This avoids recursive undo-toasts.

---

## Edge Cases

## Rapid toggles on same item

- latest action wins
- previous undo entry for the same `resourceKey` is replaced

## Undo after remote change

- for V0.1 of the undo system, prefer local inverse action and let Firestore resolve
- if reverse write fails, show error toast

## Multiple undo taps

- guard each undo entry with active/settled status internally
- second undo tap should do nothing

## Screen navigation

- undo manager must not live in the list screen component
- module-level registry is acceptable for this use case

---

## Future Extensions

Once toggle works well, use the same system for:

- delete with delayed `commit()`
- reorder rollback
- edit rollback

Delete will use:

- optimistic local removal
- delayed Firestore delete in `commit()`
- restoration in `undo()`

---

## Files Expected To Change

- New file: `lib/undo.ts`
- [hooks/useItems.ts](/Users/zacharymarion/Documents/code/cartful/hooks/useItems.ts)
- Possibly [implementation-plans/optimistic-edits-sonner-native.md](/Users/zacharymarion/Documents/code/cartful/implementation-plans/optimistic-edits-sonner-native.md) later to reference the system

---

## Success Criteria

- Checking off an item updates the UI immediately
- A toast with `Undo` appears
- Undo reverses the check-off
- Undo does not spawn another undo toast
- Rapid repeated toggles on the same item do not create stacked contradictory undo entries

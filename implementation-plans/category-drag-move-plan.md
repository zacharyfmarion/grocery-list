# Category Drag Move Plan

> Updated March 11, 2026.
> Goal: replace the current manual reorder mode with long-press drag that changes an item's category when dropped into another section. Items should always be alphabetized within a category.

---

## Desired UX

- User long-presses any active item row
- The row lifts and follows the finger
- The user drags over another category section
- Releasing drops the item into that category
- The item is not manually positioned within the section
- The destination section remains alphabetized, so the item snaps into its sorted slot
- An undo toast appears so the category move can be reversed

Explicitly not part of this UX:

- manual reordering within a category
- a separate reorder mode toggle
- header reorder icon

---

## Core Product Rules

## 1. Category move only

Dragging should only change `item.category`.

There should be no stored manual sort index for active items within a category once this ships.

## 2. Alphabetical sections

Within each category section, items should always render alphabetically.

That means a drag does not choose the final row position. It only chooses the destination category.

## 3. Undo required

Every successful category move should register an undo action.

Toast copy should be something like:

- `Moved Watermelon to Produce`

Undo should restore the prior category and let alphabetical sort place it back automatically.

---

## Current State To Remove

Current list screen still contains a full manual reorder system in [app/(app)/list/[id].tsx](</Users/zacharymarion/Documents/code/cartful/app/(app)/list/[id].tsx>):

- `reorderMode` state
- header reorder icon
- row drag handle icon
- `ITEM_HEIGHT` offset math
- per-row `Pan` reorder logic
- `orderedSections` staging state
- `handleReorder()`
- calls to `reorderItems()` for manual row movement

All of that should be removed for this feature.

---

## Recommended Architecture

## 1. Keep sectioned list rendering

Keep `SectionList` and section grouping.

The feature does not require flattening the whole screen into a drag list as long as we can:

- long-press lift a row
- track finger position
- determine which category section is under the drag

## 2. Detect destination category by measured section frames

Measure each visible section header/body container and keep a map like:

```ts
Record<
  GroceryCategory,
  {
    y: number;
    height: number;
  }
>;
```

During drag:

- compare the finger Y position to section frames
- determine the hovered category
- visually highlight the current drop target

On release:

- if target category differs from source category, update the item category
- if target is unchanged, do nothing

This is a category-targeting system, not a row-targeting system.

---

## 3. Move API in `useItems`

Add a focused helper to [hooks/useItems.ts](/Users/zacharymarion/Documents/code/cartful/hooks/useItems.ts), separate from `reorderItems()`:

```ts
moveItemToCategory(itemId, nextCategory, options?: {
  registerUndo?: boolean;
})
```

Behavior:

- optimistic category change immediately
- Firestore update for `category`
- register undo via the undo manager
- undo performs the inverse category update without registering another undo toast

Since the list will be alphabetized, no order mutation is required for the first pass.

---

## Sorting Model

## 1. Active items

Active items inside each category should sort by normalized name.

Recommended comparator:

1. `name.toLowerCase().trim()`
2. quantity as tie-breaker if needed
3. createdAt as final fallback

## 2. Completed items

Recommended first pass:

- completed section stays separate
- completed items can keep current sort behavior unless product wants them alphabetical too

## 3. Manual order fields

Do not rely on `order` for active item rendering once category-drag ships.

The old reorder persistence can remain in Firestore temporarily for backward compatibility, but the UI should stop using it for active items.

---

## Interaction Design

## 1. Start gesture

Use a long-press threshold on the entire row, not a handle.

This is required because the product wants “press and hold on any item”.

## 2. While dragging

Show:

- lifted row styling
- hovered destination section highlight
- maybe subtle scale or shadow on the dragged row

Do not show:

- row insertion line
- explicit drop index

## 3. Drop result

- Different category: commit category change
- Same category: no-op
- No target detected: snap back, no-op

---

## Undo UX

This should use the shared undo manager from [lib/undo.ts](/Users/zacharymarion/Documents/code/cartful/lib/undo.ts).

Recommended registration:

```ts
registerUndo({
  kind: "edit",
  resourceKey: `list:${listId}:item:${itemId}:category`,
  message: `Moved ${item.name} to ${label}`,
  undo: () => moveItemToCategory(itemId, previousCategory, { registerUndo: false }),
});
```

Notes:

- latest category move for the same item should replace the previous undo entry
- undo should not create a second undo toast

---

## Edge Cases

## 1. Hidden categories

Recommended first rule:

- only visible categories plus explicit `Other` are valid drop targets

If an item currently belongs to a hidden category and is rendered under `Other`, dropping it onto `Other` should set category to `"other"` unless product wants hidden-category preservation.

## 2. Inline editing conflict

Dragging and inline rename should not be active at the same time.

Recommended behavior:

- if an item is being inline edited, long-press drag is disabled for that row
- if drag starts, any active inline editor elsewhere should close

## 3. Checked items

Recommended first rule:

- checked items are not draggable

This keeps the completed section simple and avoids unclear category semantics for already-completed items.

## 4. Collaboration conflicts

If another user changes the item category while the drag update is in flight:

- prefer optimistic local move first
- if server write fails, rollback and show error toast

## 5. Fast repeated moves

If a user drags the same item across categories repeatedly:

- the newest move wins
- undo entry for that item/category move should replace the prior one

---

## Visual/Accessibility Considerations

- Drag target highlight should be obvious in both light and dark mode
- Section headers should remain readable while highlighted
- Remove the old header reorder icon entirely
- Long-press drag should not interfere with tap-to-inline-edit on a normal quick tap
- Accessibility fallback for re-categorizing should be planned separately if drag is the only control

---

## Implementation Steps

1. Remove the existing reorder mode state, header icon, row handle, and reorder math from [app/(app)/list/[id].tsx](</Users/zacharymarion/Documents/code/cartful/app/(app)/list/[id].tsx>)
2. Change active-item section sorting to alphabetical
3. Add section frame measurement and hovered drop-target state
4. Add long-press drag gesture on active rows
5. Add `moveItemToCategory()` to [hooks/useItems.ts](/Users/zacharymarion/Documents/code/cartful/hooks/useItems.ts)
6. Register undo toasts for category moves through [lib/undo.ts](/Users/zacharymarion/Documents/code/cartful/lib/undo.ts)
7. Verify no overlap with inline edit, FAB, or bottom undo toast

---

## Files Expected To Change

- [app/(app)/list/[id].tsx](</Users/zacharymarion/Documents/code/cartful/app/(app)/list/[id].tsx>)
- [hooks/useItems.ts](/Users/zacharymarion/Documents/code/cartful/hooks/useItems.ts)
- [lib/undo.ts](/Users/zacharymarion/Documents/code/cartful/lib/undo.ts)
- Possibly [lib/constants.ts](/Users/zacharymarion/Documents/code/cartful/lib/constants.ts) if alphabetical normalization helpers are extracted

---

## Success Criteria

- No reorder icon in the header
- No reorder handle in item rows
- Long-press on an active item starts drag
- Dropping into another category changes category only
- Destination section remains alphabetized automatically
- Undo toast appears for the category move
- Undo restores the prior category

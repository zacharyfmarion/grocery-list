# Per-List Category Order Override Plan

> Updated March 11, 2026.
> Goal: let a user override category order for a single list without affecting their other lists or other members of a shared list.

---

## Goal

Add a list-specific category ordering flow that:

- starts from the list detail screen
- opens a dedicated list settings screen
- lets the signed-in user reorder categories for that list
- keeps global category settings as the default fallback
- does not change category visibility rules

---

## Product Decision

Treat per-list category order as a **user preference override**, not shared list data.

Reasoning:

- category order is currently a user-level display preference
- list documents are shared with collaborators
- a store-route preference is likely personal, not collaborative
- storing this only in MMKV would make the same list render differently across the user’s own devices

Recommended persistence model:

- store per-list category order overrides inside `userPreferences/<uid>`
- do not add category order to the `lists` collection
- do not persist this only locally

---

## Current State

Global category configuration already exists:

- ordering and visibility hook: [hooks/useCategories.ts](/Users/zacharymarion/Documents/code/cartful/hooks/useCategories.ts)
- preference fetch/write hook: [hooks/usePreferences.ts](/Users/zacharymarion/Documents/code/cartful/hooks/usePreferences.ts)
- preference type: [types/index.ts](/Users/zacharymarion/Documents/code/cartful/types/index.ts)
- category constants: [lib/constants.ts](/Users/zacharymarion/Documents/code/cartful/lib/constants.ts)

The list detail screen builds category sections from global visible categories:

- [app/(app)/list/[id].tsx](</Users/zacharymarion/Documents/code/cartful/app/(app)/list/[id].tsx>)

Global category settings already exist as a dedicated screen:

- [app/(app)/settings/categories.tsx](</Users/zacharymarion/Documents/code/cartful/app/(app)/settings/categories.tsx>)

The list detail screen currently exposes header actions for:

- show/hide completed
- share list

There is no list-level settings route yet.

---

## UX Recommendation

### Entry point

Add a list settings icon in the top-right area of the list detail screen, beside the existing actions.

Recommended icon:

- `settings-outline`

Behavior:

- tapping it pushes a dedicated list settings screen

Recommended route:

- `app/(app)/list-settings/[id].tsx`

This avoids route conflicts with the existing `app/(app)/list/[id].tsx` file.

### List settings screen

Screen title:

- `List Settings`

Initial content:

- explanatory copy: `Adjust how categories are ordered in this list. Hidden categories still come from your global settings.`
- one primary card for `Category Order`
- reorder controls for visible categories only
- `Reset to Global Order` action

Do not include:

- category visibility toggles
- completed section ordering
- shared/collaborative ordering language

### Reorder interaction

V1 recommendation:

- use simple up/down controls, matching the current global categories settings pattern

Reasoning:

- the app already uses this interaction in global category settings
- it is much cheaper than adding a second drag-and-drop system
- category count is moderate, so button-based reorder is acceptable for V1

Possible V2:

- drag-and-drop category rows inside list settings

### Scope boundaries

- `Completed` always stays last and is not reorderable
- hidden categories remain global-only
- items from hidden categories still roll into `Other` based on current list behavior
- `Other` should remain reorderable if it is visible; if that feels too noisy in testing, pinning it last is a reasonable follow-up simplification

---

## Data Model

Add a new field to `UserPreferences`:

```ts
listCategoryOrderOverrides?: Record<string, GroceryCategory[]>;
```

Recommended default:

```ts
listCategoryOrderOverrides: {
}
```

Example:

```ts
{
  hiddenCategories: ["baby"],
  categoryOrder: ["produce", "dairy", "meat"],
  listCategoryOrderOverrides: {
    "abc123": ["bakery", "produce", "dairy", "meat"]
  }
}
```

Why this model is correct:

- per-user, not shared
- remote, so it follows the user across devices
- consistent with the existing preference architecture
- easy to clear/reset per list

---

## Ordering Rules

### Global settings remain responsible for

- category visibility
- default category order

### List settings override only

- category order for one list

### Effective order precedence

1. `listCategoryOrderOverrides[listId]`, if present and non-empty
2. `categoryOrder`, if present and non-empty
3. default `CATEGORIES` order

### Hidden categories

After effective order is computed, filter out globally hidden categories.

This preserves the existing visibility model and avoids introducing per-list hidden state.

### Future-proofing for new categories

If a saved order does not include every known category:

- keep saved categories first
- append missing categories in default/global order

This ensures the UI stays stable when categories are added later.

---

## Hook Changes

Refactor [hooks/useCategories.ts](/Users/zacharymarion/Documents/code/cartful/hooks/useCategories.ts) to support an optional list context.

Recommended API:

```ts
useCategories(listId?: string)
```

Recommended outputs:

- `allCategories`
- `visibleCategories`
- `toggleCategory`
- `reorderCategories`
- `reorderCategoriesForList`
- `clearListCategoryOrder`
- `isCategoryVisible`
- `hasListOrderOverride`
- `loading`

Behavior:

- `reorderCategories()` continues to update global order
- `reorderCategoriesForList(listId, ordered)` writes to the override map
- `clearListCategoryOrder(listId)` removes that override
- `allCategories` and `visibleCategories` should reflect the effective order for the passed `listId`

---

## Screen Changes

### 1. List detail screen

File:

- [app/(app)/list/[id].tsx](</Users/zacharymarion/Documents/code/cartful/app/(app)/list/[id].tsx>)

Changes:

- call `useCategories(id)` instead of `useCategories()`
- add a header icon button for list settings
- route to `/list-settings/${id}`

Expected result:

- section headers render in the list-specific effective order
- lists without an override behave exactly as they do today

### 2. New list settings screen

File to add:

- `app/(app)/list-settings/[id].tsx`

Contents:

- read `id` from route params
- find the list name from `useLists()`
- call `useCategories(id)`
- render visible categories in effective order
- allow moving categories up/down
- persist through `reorderCategoriesForList`
- show `Reset to Global Order` only when an override exists

### 3. App stack

File:

- [app/(app)/\_layout.tsx](</Users/zacharymarion/Documents/code/cartful/app/(app)/_layout.tsx>)

Changes:

- register the new route in the stack
- allow the new screen to use the default navigation header

---

## State + Persistence Notes

No Firestore rules changes should be needed because this lives in the existing `userPreferences` document.

No `lists` schema changes should be needed.

Existing users are safe because:

- `usePreferences()` already merges remote data with `DEFAULT_PREFERENCES`
- missing `listCategoryOrderOverrides` will default to an empty object

---

## Implementation Steps

1. Add `listCategoryOrderOverrides` to `UserPreferences`.
2. Add the default value in `DEFAULT_PREFERENCES`.
3. Refactor `useCategories()` to compute an effective order from optional `listId`.
4. Add helper methods for per-list reorder and reset.
5. Update the list detail screen to consume list-specific category ordering.
6. Add a list settings action to the list header.
7. Build the new `list-settings/[id].tsx` screen using the existing categories settings row pattern.
8. Verify that reset returns the list to global order.
9. Verify that changing global hidden categories still affects list-specific screens correctly.

---

## Testing Checklist

- Reordering categories in one list does not affect another list.
- Reordering categories in one list does not affect the global categories settings screen.
- Resetting a list override returns that list to global/default order.
- Hidden categories still do not appear in list settings or list sections.
- Items from hidden categories still merge into `Other`.
- `Completed` still renders after all active sections.
- A user sees the same per-list order after reopening the app on another device signed into the same account.
- Lists with no override preserve current behavior exactly.

---

## Out Of Scope

- shared per-list category order across collaborators
- per-list hidden categories
- category drag-and-drop for V1
- per-store presets
- migration of existing global category settings UX

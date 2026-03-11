# List Preferences Settings Plan

> Updated March 11, 2026.
> Goal: add a dedicated settings screen for list preferences, backed by Firestore so preferences persist across devices for the signed-in user.

---

## Goal

Create a new nested settings screen for list-related display preferences.

First shipped preference:

- whether to show who created each item on list rows

This preference should:

- live in the existing remote `userPreferences` document
- sync across devices automatically for the same user
- update list row rendering without requiring a separate local persistence layer

---

## Product Decision

Treat this as a user-level list display preference, not a per-list preference.

Reasoning:

- the app already has a remote per-user preferences document in `userPreferences/<uid>`
- the request says it should persist across devices
- there is no existing per-list preference model
- “show who created the item” reads like a personal display choice, not shared list data

If product later wants per-list shared behavior, that should be a separate feature with data stored on the list document itself.

---

## Current State

Remote user preferences already exist:

- hook: [hooks/usePreferences.ts](/Users/zacharymarion/Documents/code/cartful/hooks/usePreferences.ts)
- type: [types/index.ts](/Users/zacharymarion/Documents/code/cartful/types/index.ts)
- defaults: [lib/constants.ts](/Users/zacharymarion/Documents/code/cartful/lib/constants.ts)

Current list row metadata always shows the creator label via `addedBy` in:

- [app/(app)/list/[id].tsx](/Users/zacharymarion/Documents/code/cartful/app/(app)/list/[id].tsx)

Settings already use a nested stack:

- [app/(app)/settings/_layout.tsx](/Users/zacharymarion/Documents/code/cartful/app/(app)/settings/_layout.tsx)

That makes this a straightforward extension of the current settings architecture.

---

## Data Model

Add a new field to `UserPreferences`:

```ts
showItemCreator: boolean;
```

Recommended default:

```ts
showItemCreator: true;
```

Files to update:

- [types/index.ts](/Users/zacharymarion/Documents/code/cartful/types/index.ts)
- [lib/constants.ts](/Users/zacharymarion/Documents/code/cartful/lib/constants.ts)

Why this is safe:

- `usePreferences()` already merges remote data with `DEFAULT_PREFERENCES`
- existing users who do not yet have the new field will pick up the default automatically
- the next preference write will backfill it remotely

Optional follow-up hardening:

- after fetching an older document, write missing defaults back to Firestore so the schema self-heals

That is not required for V1, but it would reduce long-tail partial documents.

---

## Screen Architecture

Add a new nested screen under settings:

- route: `app/(app)/settings/list-preferences.tsx`

Update the settings stack:

- [app/(app)/settings/_layout.tsx](/Users/zacharymarion/Documents/code/cartful/app/(app)/settings/_layout.tsx)

Recommended navigation structure:

- Main Settings
  - Appearance
  - Preferences
  - List Preferences
  - Categories

Recommended placement:

- put `List Preferences` in the existing `Preferences` section
- make it a row that navigates to the nested screen
- keep `Categories` as a separate row beside it

This keeps the main settings screen compact and gives room for future list-specific toggles.

---

## Initial UX

New screen title:

- `List Preferences`

Initial contents:

- one settings row with label `Show item creator`
- supporting text like `Display who added each item beneath the item name`
- a `Switch` bound to `preferences.showItemCreator`

Expected behavior:

- toggling updates UI immediately
- remote write happens through `updatePreferences()`
- another signed-in device picks up the same value when preferences load

Nice-to-have but not required:

- brief explanatory copy at the top of the screen
- additional placeholders for future preferences

Do not over-design this screen yet. One clean card with one toggle is enough for V1.

---

## List Screen Behavior

Use `usePreferences()` in the list screen and conditionally render the creator metadata.

Current row metadata block includes:

- `addedBy`
- optional note text

Recommended render rules:

## 1. If `showItemCreator` is `true`

- keep current `addedBy` text
- if note exists, continue rendering the separator and note

## 2. If `showItemCreator` is `false`

- hide only the creator label
- still show note when present
- remove the leading separator when there is no creator text ahead of the note

That means this logic should not be implemented by simply hiding the whole metadata row.

The note and creator should be treated as independent metadata fragments.

---

## Recommended Rendering Refactor

Right now the creator and note rendering is duplicated in both:

- inline editing row
- standard row

Before wiring the preference, extract the shared metadata fragment into a small helper inside [app/(app)/list/[id].tsx](/Users/zacharymarion/Documents/code/cartful/app/(app)/list/[id].tsx) or a tiny local component.

Suggested shape:

```ts
function ItemMeta({
  showCreator,
  addedBy,
  note,
  checked,
}: {
  showCreator: boolean;
  addedBy: string;
  note?: string;
  checked: boolean;
}) {
  // render creator and note conditionally
}
```

Why this is worth doing:

- avoids two copies of the same conditional logic
- reduces the chance of one row mode behaving differently from the other
- makes future list preferences easier to add

---

## Persistence Model

No new Firestore collection is needed.

Use the existing:

- `userPreferences/<uid>`

This should continue to flow through:

- `usePreferences()`

Important behavior to preserve:

- optimistic local state update before remote write
- `setDoc` fallback if the preference document does not exist yet

Potential improvement:

`usePreferences()` currently fetches once with `getDoc`.

If truly live multi-device preference sync while the app is already open matters, consider switching to `onSnapshot` for `userPreferences/<uid>`.

Recommendation:

- V1 can ship with the current fetch + write model if “persists across devices” only means the preference is stored remotely and picked up on next load
- if immediate cross-device live sync is desired while both devices are open simultaneously, upgrade `usePreferences()` to `onSnapshot`

The product requirement as written only requires remote persistence, not live cross-device streaming, so this can stay out of scope unless explicitly requested.

---

## Implementation Steps

## 1. Extend preferences schema

- add `showItemCreator` to `UserPreferences`
- add `showItemCreator: true` to `DEFAULT_PREFERENCES`

## 2. Add settings route

- create `app/(app)/settings/list-preferences.tsx`
- register the screen in the nested settings stack

## 3. Link from main settings

- add a `List Preferences` navigation row in [app/(app)/settings/index.tsx](/Users/zacharymarion/Documents/code/cartful/app/(app)/settings/index.tsx)

## 4. Build the new screen

- use `usePreferences()`
- render the `Show item creator` switch
- write changes with `updatePreferences()`

## 5. Update list item metadata rendering

- read `preferences.showItemCreator`
- conditionally render creator text
- keep note rendering correct when creator is hidden
- remove duplicated metadata logic if possible

## 6. Verify edge behavior

- newly created accounts get the default
- existing users without the field still see creator text
- toggling off hides creator labels in all list row states
- toggling on restores them

---

## Edge Cases

## 1. Existing users with partial preference documents

Handled by the current merge with `DEFAULT_PREFERENCES`.

## 2. Notes without creator text

When creator is hidden, notes should not render as:

- `· organic`

They should render as:

- `organic`

## 3. Loading state

While preferences are loading, default behavior should remain:

- creator text visible

This will happen automatically if the default is `true`.

## 4. Shared lists

This toggle only affects the current user’s UI.

It should not alter list data for collaborators.

---

## Testing

Recommended manual checks:

1. Open a list with visible creator labels
2. Toggle `Show item creator` off in the new screen
3. Return to a list and confirm creator text is hidden
4. Confirm item notes still render correctly
5. Confirm inline edit rows match normal rows
6. Kill and relaunch the app and verify the preference persists
7. Sign into the same account on another device or simulator and verify the stored value is used there

Recommended code-level checks if tests are added later:

- metadata rendering with:
  - creator on, note off
  - creator off, note on
  - creator on, note on
  - creator off, note off

---

## Files Expected To Change

- [types/index.ts](/Users/zacharymarion/Documents/code/cartful/types/index.ts)
- [lib/constants.ts](/Users/zacharymarion/Documents/code/cartful/lib/constants.ts)
- [hooks/usePreferences.ts](/Users/zacharymarion/Documents/code/cartful/hooks/usePreferences.ts) if snapshot sync or self-healing writes are added
- [app/(app)/settings/_layout.tsx](/Users/zacharymarion/Documents/code/cartful/app/(app)/settings/_layout.tsx)
- [app/(app)/settings/index.tsx](/Users/zacharymarion/Documents/code/cartful/app/(app)/settings/index.tsx)
- New file: [app/(app)/settings/list-preferences.tsx](/Users/zacharymarion/Documents/code/cartful/app/(app)/settings/list-preferences.tsx)
- [app/(app)/list/[id].tsx](/Users/zacharymarion/Documents/code/cartful/app/(app)/list/[id].tsx)

---

## Success Criteria

- A new `List Preferences` screen exists under Settings
- `Show item creator` is the first preference on that screen
- The preference is stored in Firestore under the signed-in user’s preferences
- The value persists across app relaunches and devices
- List rows hide or show creator text based on the preference
- Notes continue to render correctly when creator text is hidden

# 06 — Accessibility Improvements

> **Priority:** P1 (High — Apple reviewers increasingly test VoiceOver)
> **Effort:** Large (3+ days) — driven by gesture parity in list/[id].tsx + manual VoiceOver validation

---

## Current State

- Only 2 accessibility references in entire codebase (both in BottomSheet.tsx)
- No `accessibilityLabel` on buttons, icons, FAB, or interactive elements
- Icon-only controls (IconButton, FAB) have no screen reader labels — **highest rejection risk**

---

## Component-by-Component Changes

### `components/IconButton.tsx` (CRITICAL)

- Make `accessibilityLabel: string` **required** in TypeScript props
- Add `accessibilityRole="button"`
- Add `accessibilityHint?` (optional prop)
- Add `accessibilityState={{ disabled }}`
- Ensure `minHeight: 44, minWidth: 44` + `hitSlop` for touch targets
- Mark decorative icon child as `accessible={false}`

### `components/FAB.tsx` (CRITICAL)

- Same as IconButton: require `accessibilityLabel: string`
- Add `accessibilityRole="button"`, state, hint
- Ensure 44×44 minimum touch target

### `components/AppButton.tsx`

- Add `accessibilityRole="button"`
- Accept optional `accessibilityLabel`, `accessibilityHint`
- Derive `accessibilityState` from `disabled`, `loading` (`busy: true`)
- If button text is plain string children, use as default label
- Ensure 44pt minimum height

### `components/FormInput.tsx`

- Connect label + input + error text with accessibility IDs
- Use `accessibilityLabelledBy` for label → input connection
- When error exists: set `accessibilityInvalid={true}` on TextInput
- Error text should have `nativeID` for `accessibilityDescribedBy`

### `components/AppTextInput.tsx`

- Add `accessibilityLabel` (explicit, not placeholder-dependent)
- Add `accessibilityHint?`, `accessibilityState={{ disabled: !editable }}`
- Support `accessibilityInvalid` pass-through
- Ensure `allowFontScaling` is explicitly true
- Set proper keyboard semantics (`textContentType`, `autoComplete`, `secureTextEntry`)

### `components/EmptyState.tsx`

- Make container `accessible={true}` with combined label (e.g., "No items. Add your first item.")
- Mark decorative icons as `accessible={false}`
- Ensure CTA button (if present) has clear label and is next in focus order

### `components/BottomSheet.tsx` (extend existing)

- When open: `accessibilityViewIsModal={true}`
- Add labeled Close button
- On open: set focus to sheet title/first control
- On close: restore focus to opener element
- Hide background: `importantForAccessibility="no-hide-descendants"` on underlying root (Android)

### `components/OfflineBanner.tsx`

- Clear `accessibilityLabel` (e.g., "Offline. Changes will sync when connected.")
- Announce on appearance with `AccessibilityInfo.announceForAccessibility()`
- Don't steal focus unless it blocks actions

---

## Screen-Level Changes

### `app/(auth)/index.tsx` (Login)

- Screen title with `accessibilityRole="header"` + initial focus
- Inputs: explicit labels (not placeholder-dependent), correct `textContentType/autoComplete`
- Error messages announced + reachable
- Submit button: `accessibilityState={{ busy }}` during login

### `app/(auth)/register.tsx` (Registration)

- Same as login
- Password requirements text should be accessible
- Confirm password errors announced clearly

### `app/(app)/index.tsx` (Lists Overview)

- Each list row: `accessibilityRole="button"`, label includes list name + item count
- Any overflow menu/icon buttons require labels
- FAB: required label (e.g., "Create list")

### `app/(app)/list/[id].tsx` (Individual List — Most Complex)

**Checkbox items:**

- `accessibilityRole="checkbox"`, `accessibilityState={{ checked }}`
- Label includes item name
- Avoid making both row and checkbox separately focusable (prevents duplicate activation)

**Swipe actions → Custom accessibility actions:**

```typescript
accessibilityActions={[
  { name: 'activate', label: 'Open' },
  { name: 'edit', label: 'Edit item' },
  { name: 'delete', label: 'Delete item' },
]}
onAccessibilityAction={(event) => {
  // Map to same handlers as swipe UI
}}
```

**Drag-and-drop → Screen reader reordering:**

- Detect screen reader: `AccessibilityInfo.isScreenReaderEnabled()`
- When enabled, disable drag gestures and expose:

```typescript
accessibilityActions={[
  { name: 'increment', label: 'Move down' },
  { name: 'decrement', label: 'Move up' },
]}
```

- After move, announce: "Moved {item} to position X of Y"

**Touch targets:**

- Checkbox and swipe action buttons meet 44×44 + hitSlop
- Drag handles meet minimum target size

### `app/(app)/settings.tsx` (Settings)

- Toggles: `accessibilityRole="switch"` + `accessibilityState={{ checked }}`
- Label includes setting name (e.g., "Haptic feedback, on")
- Pickers: `accessibilityLabel` describing what's being chosen
- Reorderable categories: same Move up/down pattern as list items
- Announce changes after commit

---

## Dynamic Content Announcements

Create a small helper (no new deps):

```typescript
import { AccessibilityInfo } from "react-native";

export function announce(message: string) {
  AccessibilityInfo.announceForAccessibility(message);
}
```

### What to Announce

- Item added: "Added Milk"
- Item removed: "Removed Milk"
- Item checked: "Milk, checked"
- List renamed: "List name updated"
- Offline/online: "You're offline. Changes will sync when online."

### What NOT to Announce

- Every keystroke
- During drag hover (only on drop/commit)
- Rapid consecutive updates (debounce)

---

## Reduced Motion

Subscribe to `AccessibilityInfo.isReduceMotionEnabled()`:

- When enabled: reduce/disable non-essential animations (springy transitions, large movement)
- Consider reducing haptics tied to motion-heavy interactions
- Avoid attention-grabbing motion on banners/toasts

---

## Color Contrast

Minimum targets (WCAG AA):

- **4.5:1** for normal text
- **3:1** for large text and icons

Audit areas:

- Placeholder text colors
- Disabled button text
- Secondary/gray labels
- Offline banner contrast
- Swipe action button text on colored backgrounds
- Don't rely solely on color for checked/unchecked (use checkbox state + label)

---

## VoiceOver Testing Checklist

### Per Screen

1. Enable VoiceOver → open screen → verify initial focus lands on header/title
2. Swipe through: every control announces correct label/role/state
3. Icon-only controls read meaningful labels (not just "Button")
4. Perform core tasks without gestures: add, check, edit, delete, reorder
5. Trigger errors → confirm error is announced and reachable
6. Open/close BottomSheet → verify focus enters/exits correctly
7. Toggle Reduced Motion + Dynamic Type → confirm UI remains usable

### Critical Flows

- [ ] Sign up / Sign in (all form fields labeled, errors announced)
- [ ] Create a list (FAB labeled, form accessible)
- [ ] Add items (input accessible, success announced)
- [ ] Check/uncheck items (state change announced)
- [ ] Reorder items (Move up/down via actions)
- [ ] Delete items (via accessibility action, confirmation accessible)
- [ ] Open/close bottom sheets (focus management correct)
- [ ] Settings toggles (role + state correct)

---

## Automated Testing

### Component Tests (React Native Testing Library)

- `IconButton`/`FAB` render with `accessibilityLabel` (TypeScript + runtime)
- `AppButton` sets role/state correctly for disabled/loading
- Inputs expose `accessibilityLabel` and invalid state when error

### PR Review Checklist (No New Tooling)

- [ ] Icon-only controls have required `accessibilityLabel`
- [ ] Gesture-based actions have `accessibilityActions` equivalent
- [ ] Modal/sheet has focus management (enter + restore)
- [ ] Dynamic changes call `announceForAccessibility`

---

## File Summary

| File                           | Change                                                  |
| ------------------------------ | ------------------------------------------------------- |
| `components/IconButton.tsx`    | Require `accessibilityLabel`, add role/state/hitSlop    |
| `components/FAB.tsx`           | Require `accessibilityLabel`, add role/state/hitSlop    |
| `components/AppButton.tsx`     | Add role/state/label/hint, min height                   |
| `components/FormInput.tsx`     | Connect label/error with accessibility IDs              |
| `components/AppTextInput.tsx`  | Add label/hint/invalid state                            |
| `components/EmptyState.tsx`    | Make container accessible, hide decorative icons        |
| `components/BottomSheet.tsx`   | Modal semantics, focus management                       |
| `components/OfflineBanner.tsx` | Label + announcements                                   |
| `app/(auth)/index.tsx`         | Header role, input labels, error announcements          |
| `app/(auth)/register.tsx`      | Same as login + password requirements                   |
| `app/(app)/index.tsx`          | List row labels, FAB label                              |
| `app/(app)/list/[id].tsx`      | Checkbox roles, swipe actions, drag a11y, announcements |
| `app/(app)/settings.tsx`       | Toggle roles, picker labels, reorder a11y               |
| `lib/accessibility.ts`         | **NEW** — announce helper, screen reader detection hook |

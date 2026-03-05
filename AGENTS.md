# AGENTS.md — Cartful

Collaborative grocery list app built with React Native (Expo SDK 55), TypeScript, Firebase/Firestore, and NativeWind.

## Build & Run Commands

```bash
yarn start              # Start Expo dev server
yarn ios                # Run on iOS simulator
yarn android            # Run on Android emulator
yarn typecheck          # TypeScript strict check (tsc --noEmit)
yarn lint               # ESLint (ts/tsx files)
yarn lint:fix           # ESLint autofix
yarn format             # Prettier (app/, components/, hooks/, lib/)
yarn check              # typecheck + lint combined
```

## Testing

```bash
yarn jest                        # Run all tests
yarn jest --testPathPattern=suggestCategory  # Run a single test file by name
yarn jest --watch                # Watch mode
```

- Preset: `jest-expo`
- Tests live alongside source: `lib/__tests__/suggestCategory.test.ts`
- Path alias `@/` is mapped via `moduleNameMapper` in `jest.config.js`

## Project Structure

```
app/                    # Expo Router file-based routing
  _layout.tsx           # Root layout (providers: Theme, Auth, Gesture, Keyboard)
  (auth)/               # Auth group (login, register) — redirects if logged in
  (app)/                # Main app group — redirects if logged out
    index.tsx           # Lists screen (home)
    list/[id].tsx       # List detail screen
    settings.tsx        # Settings screen
components/
  ui/                   # Primitive UI components (AppButton, AppTextInput, BottomSheet, EmptyState, FAB, IconButton)
  FormInput.tsx         # react-hook-form wrapper around AppTextInput
  OfflineBanner.tsx     # Network status banner
hooks/                  # Custom hooks for Firebase data (useLists, useItems, usePreferences, etc.)
lib/                    # Utilities, contexts, Firebase config
  auth-context.tsx      # AuthProvider + useAuth
  theme-context.tsx     # ThemeProvider + useTheme (dark mode, accent colors)
  theme.ts              # MMKV-backed theme persistence, accent palettes
  firebase.ts           # Firebase init (reads EXPO_PUBLIC_FIREBASE_* env vars)
  schemas.ts            # Zod schemas for auth forms
  constants.ts          # Category definitions, unit constants, suggestCategory(), parseItemInput()
  mmkv-persistence.ts   # MMKV adapter for Firebase Auth persistence
  listOrderUtils.ts     # List drag-reorder reconciliation
types/
  index.ts              # Shared TypeScript interfaces (GroceryList, GroceryItem, UserProfile, etc.)
```

## Code Style

### TypeScript

- **Strict mode** enabled. Never use `as any`, `@ts-ignore`, or `@ts-expect-error`.
- Path alias: `@/*` maps to project root. Always use `@/` imports for project files.
- Prefer `interface` for object shapes. Use `type` for unions and intersections.
- Infer types from Zod schemas with `z.infer<typeof schema>`.

### Imports Order

1. React / React Native
2. Third-party libraries (expo-_, firebase/_, react-native-\*)
3. Project imports via `@/` (lib → hooks → components → types)

### Formatting (Prettier)

- Semicolons: yes
- Quotes: double
- Trailing commas: all
- Tab width: 2
- Print width: 100

### ESLint

- Unused vars: warn (prefix unused args with `_`)
- No explicit `any`: warn
- Require-imports: allowed (config files use CJS)

### Components

- **Screen components**: `export default function ScreenName()` — one per file, PascalCase.
- **Reusable components**: Named exports — `export function ComponentName()`.
- **Props**: Define an `interface` extending the relevant RN type (e.g., `TouchableOpacityProps`). Place above the component.
- **Ref forwarding**: Use `forwardRef` pattern (see `AppTextInput.tsx`).

### Styling

- **NativeWind** (Tailwind CSS for RN) via `className` prop.
- Dark mode: use `dark:` prefix — e.g., `className="bg-white dark:bg-gray-900"`.
- Dynamic colors (accent theming): use inline `style` prop with values from `useTheme().accent`.
- Never hardcode the primary green — always use `accent[500]`, `accent[600]`, etc.
- Icon colors: use theme-aware values from `useTheme().isDark`.

### Naming Conventions

- Components/screens: `PascalCase` (files and functions)
- Hooks: `camelCase` with `use` prefix — `useItems.ts`, `useLists.ts`
- Utilities: `camelCase` — `suggestCategory`, `parseItemInput`
- Constants: `UPPER_SNAKE_CASE` — `CATEGORIES`, `UNITS`, `DEFAULT_PREFERENCES`
- Types/interfaces: `PascalCase` — `GroceryItem`, `GroceryList`
- Type unions: `PascalCase` — `GroceryCategory`, `ColorMode`, `AccentName`

### State Management

- **Local state**: React `useState` / `useEffect` — no global store for UI state.
- **Server state**: Firebase `onSnapshot` for real-time subscriptions in hooks.
- **Persistence**: MMKV for theme preferences; Firestore for user data.
- **Forms**: `react-hook-form` + `zod` schemas (see `lib/schemas.ts`).
- `zustand` is a dependency but not yet in active use.

### Error Handling

- Wrap async ops in `try/catch`.
- User-facing errors: `Alert.alert("Error", "Human-readable message")`.
- Log errors: `console.error("Context:", error)`.
- Firebase auth errors: map via `mapFirebaseAuthError()` in `lib/schemas.ts`.
- Empty `catch` blocks are acceptable only when the failure is intentionally ignored (e.g., haptics).

### Haptics

- Use `expo-haptics` for user feedback on actions.
- `Haptics.impactAsync(Light)` for taps, `Haptics.notificationAsync(Success)` for completions.
- Respect `preferences.hapticsEnabled` when adding new haptic calls.

### Firebase / Firestore

- All Firebase config is via `EXPO_PUBLIC_FIREBASE_*` env vars in `.env.local`.
- Auth: email/password via Firebase Auth with MMKV persistence.
- Data model: `lists` (with `items` subcollection), `users`, `userPreferences`, `userHistory`.
- Security rules are in `firestore.rules` — access is scoped to members/owners.
- Always use `serverTimestamp()` for `createdAt` / `updatedAt` fields.

### Accessibility

- Add `testID` props to interactive elements for testing.
- Use `accessibilityLabel` and `accessibilityRole` on non-obvious controls (see BottomSheet close button).

## Package Manager

Yarn 4 (Berry) with Plug'n'Play disabled (node_modules mode). Use `yarn` for all installs.

## Environment Variables

Required in `.env.local` (not committed):

```
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=
```

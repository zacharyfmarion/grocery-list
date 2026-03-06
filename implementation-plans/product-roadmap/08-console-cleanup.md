# 08 — Remove Console Statements + Build Artifact Cleanup

> **Priority:** P2 (Should fix before release)
> **Effort:** Quick (<1 hour) without Babel plugin; Short (1–2 hours) with plugin

---

## Part 1: Console Statements

### Current State

9 `console.error` calls across 6 files. **All are in error handlers** (catch blocks / onSnapshot error callbacks) — none are debug noise.

### Approach

Replace with a minimal logger helper that:

- Logs in `__DEV__` mode (preserves developer experience)
- Can later forward to Sentry when crash reporting is added (see [09-crash-reporting.md](./09-crash-reporting.md))
- Keeps error visibility without raw `console.*` in production

### New Helper: `lib/logging.ts`

```typescript
export function logError(
  message: string,
  error?: unknown,
  context?: Record<string, unknown>,
): void {
  if (__DEV__) {
    console.error(message, error, context);
    return;
  }
  // Production: no-op until Sentry is wired
  // When Sentry is added:
  // Sentry.captureException(error, { extra: { message, ...context } });
}
```

### File-by-File Replacements

| File                      | Count | Current                                                | Replacement                                      |
| ------------------------- | ----- | ------------------------------------------------------ | ------------------------------------------------ |
| `app/(app)/list/[id].tsx` | 3     | `console.error("Failed to add item:", error)`          | `logError("Failed to add item", error)`          |
|                           |       | `console.error("Failed to toggle item:", error)`       | `logError("Failed to toggle item", error)`       |
|                           |       | `console.error("Failed to update quantity:", error)`   | `logError("Failed to update quantity", error)`   |
| `hooks/useItemHistory.ts` | 2     | `console.error("Error fetching item history:", error)` | `logError("Error fetching item history", error)` |
|                           |       | `console.error("Error recording item usage:", error)`  | `logError("Error recording item usage", error)`  |
| `hooks/useLists.ts`       | 1     | `console.error("Error listening to lists:", error)`    | `logError("Error listening to lists", error)`    |
| `hooks/useItems.ts`       | 1     | `console.error("Error listening to items:", error)`    | `logError("Error listening to items", error)`    |
| `hooks/usePreferences.ts` | 1     | `console.error("Error fetching preferences:", error)`  | `logError("Error fetching preferences", error)`  |
| `app/(app)/index.tsx`     | 1     | `console.error("Failed to delete list:", e)`           | `logError("Failed to delete list", e)`           |

### Optional: Babel Safety Net

Install `babel-plugin-transform-remove-console` as a production-only plugin:

```bash
yarn add -D babel-plugin-transform-remove-console
```

```javascript
// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      // ... other plugins
      process.env.NODE_ENV === "production" && [
        "transform-remove-console",
        { exclude: ["error", "warn"] },
      ],
    ].filter(Boolean),
  };
};
```

**Note:** Keep `console.error` and `console.warn` — only strip `console.log` and `console.debug` in production.

---

## Part 2: Build Artifact Cleanup

### Current State

5 `.ipa` and 3 `.apk` files in project root. Already in `.gitignore` (`*.apk`, `*.ipa`, `*.aab`).

### Actions

```bash
rm -f *.ipa *.apk
```

Verify they're not git-tracked:

```bash
git ls-files '*.ipa' '*.apk'
# Should return nothing
```

If any are tracked, untrack them:

```bash
git rm --cached *.ipa *.apk
```

---

## File-by-File Changes

| File                      | Change                                         |
| ------------------------- | ---------------------------------------------- |
| `lib/logging.ts`          | **NEW** — `logError()` helper                  |
| `app/(app)/list/[id].tsx` | Replace 3 console.error → logError             |
| `hooks/useItemHistory.ts` | Replace 2 console.error → logError             |
| `hooks/useLists.ts`       | Replace 1 console.error → logError             |
| `hooks/useItems.ts`       | Replace 1 console.error → logError             |
| `hooks/usePreferences.ts` | Replace 1 console.error → logError             |
| `app/(app)/index.tsx`     | Replace 1 console.error → logError             |
| `babel.config.js`         | (Optional) Add transform-remove-console plugin |
| Project root              | Delete _.ipa and _.apk files                   |

---

## Integration with Crash Reporting

When Sentry is added ([09-crash-reporting.md](./09-crash-reporting.md)), update `lib/logging.ts`:

```typescript
import { Sentry } from "./sentry";

export function logError(
  message: string,
  error?: unknown,
  context?: Record<string, unknown>,
): void {
  if (__DEV__) {
    console.error(message, error, context);
    return;
  }
  Sentry.captureException(error instanceof Error ? error : new Error(message), {
    extra: { message, ...context },
  });
}
```

This is why routing through `logError()` now pays off later — one change in one file enables production error reporting everywhere.

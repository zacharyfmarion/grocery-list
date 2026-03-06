# 12 — Build Artifact Cleanup

> **Priority:** P2 (Housekeeping)
> **Effort:** Quick (<5 minutes)

---

## The Problem

5 `.ipa` and 3 `.apk` files sitting in the project root directory.

## The Fix

```bash
rm -f *.ipa *.apk
```

## Verification

Already in `.gitignore`:

```
*.apk
*.ipa
*.aab
```

Verify none are git-tracked:

```bash
git ls-files '*.ipa' '*.apk'
# Should return empty
```

If any appear tracked:

```bash
git rm --cached *.ipa *.apk
```

---

This is covered in detail in [08-console-cleanup.md](./08-console-cleanup.md) (Part 2).

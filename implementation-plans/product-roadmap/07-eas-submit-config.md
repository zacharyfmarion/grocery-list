# 07 — EAS Submit Configuration

> **Priority:** P1 (High — required to actually submit to App Store)
> **Effort:** Medium (1–2 days) — ASC setup + metadata/screenshots dominates time

---

## Current State

- `eas.json` submit profile is empty: `"production": {}`
- Build profiles exist and work (development, preview, production)
- `appVersionSource: "remote"` with auto-increment enabled

---

## Step 1: Create App Store Connect App Record

1. Log into [App Store Connect](https://appstoreconnect.apple.com)
2. Create new app:
   - Platform: iOS
   - Name: "Cartful"
   - Primary language: English (U.S.)
   - Bundle ID: `com.cartful.app`
   - SKU: `cartful-ios` (internal, not visible)
3. Copy the **Apple ID** (numeric, shown in App Information) → this is your `ascAppId`
4. Note your **Team ID** from Apple Developer account

---

## Step 2: Create ASC API Key (Recommended over Apple ID auth)

**Why API Key:**

- Best for CI/automated submissions
- Revocable per-key
- Avoids 2FA/interactive challenges
- Narrower operational surface than Apple ID password

**Steps:**

1. App Store Connect → Users and Access → **Integrations** → App Store Connect API → "+"
2. Name: "EAS Submit" (or similar)
3. Role: **Admin**
4. Download the `.p8` file (only downloadable once!)
5. Copy **Key ID** and **Issuer ID** from the page

**Configure for EAS:**

- Preferred: `eas credentials --platform ios` → production → "Manage API Key for EAS Submit"
- Alternative: Store `.p8` securely and reference in `eas.json`

---

## Step 3: Configure `eas.json`

```json
{
  "cli": {
    "version": ">=16.31.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {
      "ios": {
        "ascAppId": "YOUR_ASC_APP_ID",
        "appleTeamId": "YOUR_TEAM_ID",
        "metadataPath": "./store.config.json"
      }
    }
  }
}
```

---

## Step 4: EAS Metadata (`store.config.json`)

Create `store.config.json` in project root:

```json
{
  "configVersion": 0,
  "apple": {
    "categories": ["PRODUCTIVITY"],
    "info": {
      "en-US": {
        "title": "Cartful",
        "subtitle": "Smart grocery lists",
        "description": "Create and organize grocery lists, share with family, track items, and shop faster. Never forget the milk again.",
        "keywords": [
          "grocery",
          "shopping list",
          "pantry",
          "checklist",
          "meal prep",
          "shared lists"
        ],
        "supportUrl": "https://YOUR_DOMAIN/support",
        "privacyPolicyUrl": "https://YOUR_DOMAIN/privacy",
        "releaseNotes": "Initial release."
      }
    },
    "review": {
      "firstName": "YOUR_FIRST",
      "lastName": "YOUR_LAST",
      "email": "YOUR_EMAIL",
      "phone": "+1 YOUR_PHONE",
      "demoRequired": true,
      "demoUsername": "reviewer@example.com",
      "demoPassword": "ReviewPassword123!",
      "notes": "Cartful is a grocery list app. Create an account or use the demo credentials above. Tap + to create a list, then + to add items. Swipe items to edit/delete. Use Settings to customize appearance."
    },
    "advisory": {
      "alcoholTobaccoOrDrugUseOrReferences": "NONE",
      "contests": "NONE",
      "gamblingSimulated": "NONE",
      "horrorOrFearThemes": "NONE",
      "matureOrSuggestiveThemes": "NONE",
      "medicalOrTreatmentInformation": "NONE",
      "profanityOrCrudeHumor": "NONE",
      "sexualContentGraphicAndNudity": "NONE",
      "sexualContentOrNudity": "NONE",
      "violenceCartoonOrFantasy": "NONE",
      "violenceRealistic": "NONE",
      "violenceRealisticProlongedGraphicOrSadistic": "NONE",
      "gambling": false,
      "unrestrictedWebAccess": false,
      "kidsAgeBand": null,
      "ageRatingOverride": "NONE"
    }
  }
}
```

Push metadata: `eas metadata:push`

---

## Step 5: TestFlight Setup

### Internal Testing

- Add testers as App Store Connect users
- Create internal group: "Internal Testers"
- Add `"groups": ["Internal Testers"]` to eas.json submit profile
- Internal builds don't require Beta App Review

### External Testing

- Create external group, add tester emails
- External builds require **Beta App Review** (lighter than full review)
- Good for pre-release user testing

---

## Step 6: App Store Screenshots

**Not automated by EAS Metadata** — must upload manually in App Store Connect.

Required device classes (if you support them):

- iPhone 6.9" (Pro Max)
- iPhone 6.7" (Plus)
- iPhone 6.5"
- iPhone 5.5" (SE/8 Plus)
- iPad Pro 12.9" (if `supportsTablet: true`)

**Tip:** Use Expo's simulator + screenshot tool, or use a service like [screenshots.pro](https://screenshots.pro) for store-quality frames.

---

## Step 7: App Store Connect Compliance

### Export Compliance

- Already set: `ITSAppUsesNonExemptEncryption: false` ✅
- Still confirm in ASC for each build version

### App Privacy (Nutrition Labels)

- See [02-privacy-policy.md](./02-privacy-policy.md) for detailed declarations
- Must complete before submission

### Pricing

- Set price tier (likely Free)
- Select availability territories

---

## Full Submission Workflow

```
1. eas build -p ios --profile production
   → Builds .ipa, uploads to EAS

2. eas submit -p ios --profile production
   → Uploads to App Store Connect / TestFlight
   (or use: eas build --auto-submit)

3. TestFlight testing
   → Wait for processing → add to internal group → test

4. Complete App Store version
   → Screenshots, metadata, privacy, compliance, pricing

5. Submit for review
   → In App Store Connect, select the build, submit

6. Release
   → Manual, automatic, scheduled, or phased release
```

---

## Review Information Checklist

- [ ] Demo account credentials (pre-created, working)
- [ ] Clear review notes explaining core functionality
- [ ] All features accessible and testable
- [ ] Privacy policy URL is live and accessible
- [ ] Screenshots match actual app UI
- [ ] Age rating questionnaire completed (all NONE for grocery app)
- [ ] Export compliance confirmed

---

## Common Rejection Reasons (Grocery List Apps)

1. **Missing/invalid Privacy Policy URL** or mismatched privacy declarations
2. **Reviewer can't access app** — login required but no demo credentials
3. **"Minimum functionality"** — app too barebones compared to description
4. **Misleading screenshots** — screenshots don't match actual app
5. **Missing account deletion** (see [01-account-deletion.md](./01-account-deletion.md))

# 02 — Privacy Policy

> **Priority:** P0 (App Store Blocker)
> **Effort:** Short (1–4 hours) if no analytics/ads; Medium (1–2 days) if auditing SDKs
> **Apple Requirement:** Privacy policy URL required in App Store Connect and accessible in-app

---

## Data Inventory (Source of Truth)

### A. Account / Identity (Firebase Auth)

- Email address (user-provided)
- Firebase UID (unique identifier)
- Auth metadata (creation time, last sign-in)
- IP address / device info processed by Firebase for security (not surfaced to developer)

### B. App Data (Firestore — User Content)

- User profile: display name
- Grocery lists: names, membership, settings
- Items: names, quantities, notes, checked state, timestamps
- History/templates: frequently used items, templates, usage history
- Preferences: appearance, sort order, haptic feedback, categories

### C. Analytics / Diagnostics

- Currently: **None** (Firebase Analytics disabled, no Crashlytics/Sentry)
- If crash reporting is added (see roadmap item 09), update this section

### D. Device / Technical Data

- Device model, OS version, app version, locale/timezone may appear in Firebase logs
- Push tokens — only if push notifications are implemented

---

## Privacy Policy Content Outline

1. **Who We Are** — Developer name, contact email, effective date
2. **What This Policy Covers** — App + Firebase services
3. **Information We Collect**
   - Account information (email, UID, auth metadata)
   - User content (lists, items, categories, preferences, templates/history)
   - Diagnostics (only if applicable)
   - Device/technical info for security
4. **How We Use Information**
   - Core functionality (sync lists across devices)
   - Account management & authentication
   - Security, fraud prevention, abuse detection
   - Support/feedback handling
5. **How We Share Information**
   - Service providers: Google Firebase
   - Legal/safety disclosures
   - **No selling of data; no ads/tracking**
6. **Shared Lists / Multi-User Data**
   - Collaborators can view/modify shared list content
   - What identifiers are visible to collaborators (email/display name)
   - Warning: don't put sensitive info in shared lists
7. **Data Retention**
   - Data kept while account is active
   - Deletion policy (link to account deletion flow)
   - Backup/retention windows
8. **Security** — Encryption in transit, access controls
9. **Your Choices and Rights**
   - Update account info in app
   - Delete account and data (link to instructions)
10. **GDPR (EU/UK Users)**
    - Controller contact
    - Lawful bases: contract, legitimate interests, consent
    - Rights: access, deletion, rectification, portability, objection
    - International transfers (Firebase US/global processing)
11. **Children / COPPA**
    - Not directed to children under 13
    - No knowing collection from under 13
    - Parent contact route
12. **Changes to This Policy** — Update notification method
13. **Contact** — Support email

---

## Hosting Strategy

**Recommended: GitHub Pages**

- Create repo (e.g., `cartful-legal`) with `privacy.html` (and `terms.html`)
- Enable GitHub Pages from main branch
- URL: `https://<username>.github.io/cartful-legal/privacy`
- Include "Last updated: YYYY-MM-DD" + version number
- Version history tracked via git

---

## In-App Integration

### Settings Screen (`app/(app)/settings.tsx`)

- Add to About section:
  - "Privacy Policy" → `Linking.openURL(privacyPolicyUrl)`
  - "Terms of Service" → `Linking.openURL(termsUrl)` (when ready)

### Auth Screens (`app/(auth)/index.tsx`, `app/(auth)/register.tsx`)

- Add footer text on registration screen:
  - "By creating an account, you agree to our [Terms] and acknowledge our [Privacy Policy]."
- Optional: similar footer on login screen

### Configuration

- Add URLs to `app.json` → `expo.extra`:
  ```json
  "extra": {
    "privacyPolicyUrl": "https://<username>.github.io/cartful-legal/privacy",
    "termsUrl": "https://<username>.github.io/cartful-legal/terms"
  }
  ```
- Access via `Constants.expoConfig?.extra?.privacyPolicyUrl`

---

## App Store Connect Configuration

### Privacy Policy URL

- Set in **App Information → Privacy Policy URL**
- Must be publicly accessible without login
- Must load on mobile

### App Privacy Nutrition Labels

**Tracking:** No

**Data Collected:**
| Data Type | Linked to User | Purpose |
|---|---|---|
| Email Address | Yes | App Functionality, Account Management |
| User ID (Firebase UID) | Yes | App Functionality, Account Management |
| User Content (lists/items) | Yes | App Functionality |
| Diagnostics (if crash reporting added) | Yes/No | App Functionality |

**Data NOT Collected:**

- Financial info, location, contacts, browsing history, search history, health data, advertising data

---

## Privacy Manifest (PrivacyInfo.xcprivacy)

- `NSPrivacyTracking`: **false**
- `NSPrivacyTrackingDomains`: empty
- `NSPrivacyAccessedAPITypes`: Declare any Required Reason APIs used by app/SDKs
  - Check Firebase + Expo modules for API access that needs Apple-approved reason codes
  - Common: file timestamp access, user defaults, system boot time
- Verify SDK manifests (Firebase, Expo) satisfy Apple's checks

---

## COPPA Considerations

- App is not directed to children
- Set App Store age rating to 4+ or appropriate level
- Privacy policy states: not for children under 13, no knowing collection
- No child-specific marketing

---

## File-by-File Changes

| File                          | Change                                                             |
| ----------------------------- | ------------------------------------------------------------------ |
| `app.json`                    | Add `extra.privacyPolicyUrl` and `extra.termsUrl`                  |
| `app/(app)/settings.tsx`      | Add "Privacy Policy" and "Terms of Service" links in About section |
| `app/(auth)/register.tsx`     | Add legal footer with links                                        |
| `app/(auth)/index.tsx`        | Optional: add legal footer                                         |
| External: privacy policy page | **NEW** — Hosted HTML/markdown page                                |
| External: App Store Connect   | Set Privacy Policy URL + fill nutrition labels                     |

---

## Critical Rule

> Policy text, in-app behavior, and App Store Connect labels MUST match. Inconsistencies are a common rejection reason.

If crash reporting or analytics are added later, privacy policy and nutrition labels must be updated simultaneously.

# <img src="assets/images/icon.png" width="28" height="28" alt="Cartful icon" /> Cartful

A collaborative grocery list app for iOS and Android. Create lists, share them with family or roommates, and never forget the milk again.

![React Native](https://img.shields.io/badge/React_Native-0.83-61DAFB?logo=react&logoColor=white)
![Expo](https://img.shields.io/badge/Expo_SDK-55-000020?logo=expo&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-11-FFCA28?logo=firebase&logoColor=black)

---

## Features

- **Shared Lists** — Invite others by email and collaborate in real-time
- **Smart Categorization** — Items are auto-sorted into grocery aisles (produce, dairy, meat, etc.)
- **Quick Add** — Type `3 lb chicken` and it parses quantity, unit, and name automatically
- **Drag & Reorder** — Rearrange lists and items with drag-and-drop
- **Dark Mode** — Full dark theme support with system, light, or dark toggle
- **Accent Colors** — Choose from 8 accent color palettes
- **Offline Support** — Changes sync automatically when you reconnect
- **Haptic Feedback** — Subtle haptics on interactions (toggleable)
- **Category Management** — Hide, show, and reorder grocery categories
- **Item History** — Frequently added items appear as suggestions

## Tech Stack

| Layer      | Technology                                                                                       |
| ---------- | ------------------------------------------------------------------------------------------------ |
| Framework  | [Expo](https://expo.dev) (SDK 55) with [Expo Router](https://docs.expo.dev/router/introduction/) |
| Language   | TypeScript (strict mode)                                                                         |
| Styling    | [NativeWind](https://www.nativewind.dev/) (Tailwind CSS for React Native)                        |
| Backend    | [Firebase](https://firebase.google.com/) (Auth + Firestore)                                      |
| Forms      | [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/)                        |
| Storage    | [MMKV](https://github.com/mrousavy/react-native-mmkv) (local persistence)                        |
| Animations | [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/)                   |
| Gestures   | [React Native Gesture Handler](https://docs.swmansion.com/react-native-gesture-handler/)         |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Yarn](https://yarnpkg.com/) (v4 — included via Corepack)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- A [Firebase project](https://console.firebase.google.com/) with Authentication and Firestore enabled
- For iOS: Xcode 15+ and CocoaPods
- For Android: Android Studio with SDK 34+

### 1. Clone & Install

```bash
git clone https://github.com/zacharyfmarion/cartful.git
cd cartful
corepack enable
yarn install
```

### 2. Configure Firebase

Create a `.env.local` file in the project root with your Firebase credentials:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

You can find these values in your [Firebase Console](https://console.firebase.google.com/) under **Project Settings > General > Your apps > Web app**.

### 3. Set Up Firestore

Enable **Email/Password** authentication in Firebase Console under **Authentication > Sign-in method**.

Deploy the security rules:

```bash
firebase deploy --only firestore:rules
```

Or copy the rules from `firestore.rules` into the Firebase Console manually under **Firestore > Rules**.

### 4. Run the App

```bash
# Start the development server
yarn start

# Run on iOS simulator
yarn ios

# Run on Android emulator
yarn android
```

> **Note:** This app uses native modules (MMKV, Reanimated, Gesture Handler) that require a [development build](https://docs.expo.dev/develop/development-builds/introduction/). Expo Go is not supported.

### Building a Development Client

```bash
# Install EAS CLI
npm install -g eas-cli

# Build for iOS simulator
eas build --profile development --platform ios

# Build for Android emulator
eas build --profile development --platform android
```

## Project Structure

```
app/                    # File-based routing (Expo Router)
  (auth)/               #   Login & registration screens
  (app)/                #   Main app screens (lists, detail, settings)
components/
  ui/                   #   Reusable primitives (Button, TextInput, BottomSheet, etc.)
hooks/                  # Firebase data hooks (useLists, useItems, usePreferences)
lib/                    # Contexts, utilities, Firebase config
types/                  # Shared TypeScript interfaces
```

## Scripts

| Command          | Description              |
| ---------------- | ------------------------ |
| `yarn start`     | Start Expo dev server    |
| `yarn ios`       | Run on iOS simulator     |
| `yarn android`   | Run on Android emulator  |
| `yarn typecheck` | TypeScript type checking |
| `yarn lint`      | Run ESLint               |
| `yarn lint:fix`  | Auto-fix lint issues     |
| `yarn format`    | Format with Prettier     |
| `yarn check`     | Run typecheck + lint     |
| `yarn jest`      | Run test suite           |

## Data Model

```
Firestore
  ├── users/{uid}                    # User profiles (email, displayName)
  ├── lists/{listId}                 # Grocery lists (name, owner, members)
  │   └── items/{itemId}             # List items (name, quantity, category, checked)
  ├── userPreferences/{uid}          # Sort order, haptics, category config
  └── userHistory/{uid}/items/{id}   # Item usage history for suggestions
```

## License

Private — All rights reserved.

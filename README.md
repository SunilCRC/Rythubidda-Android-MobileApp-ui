# Rythu Bidda — Mobile App (Android + iOS)

A cross-platform React Native app that consumes the existing Rythu Bidda Spring Boot backend (`https://rythubidda.com`) and mirrors every feature of the web frontend. Built to run on both Android and iOS from a single codebase — Android is the primary target for phase 1, iOS is project-ready for building on a Mac.

> **Stack:** React Native 0.85 · TypeScript · React Navigation v7 · Zustand · React Query · Axios · React Hook Form + Zod · Keychain · Razorpay · FastImage · Vector Icons · WebView

---

## Table of contents

- [Prerequisites](#prerequisites)
- [Quick start](#quick-start)
- [Project structure](#project-structure)
- [Environment configuration](#environment-configuration)
- [API integration](#api-integration)
- [Running on Android](#running-on-android)
- [Running on iOS (when you switch to Mac)](#running-on-ios-when-you-switch-to-mac)
- [Building releases](#building-releases)
- [Features](#features)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

| Tool | Version |
| --- | --- |
| Node.js | **≥ 22.11** (you have `v24.15`) |
| npm | ≥ 10 |
| Java JDK | **17 or 21** (matches Gradle / RN 0.85) |
| Android Studio | Latest (for SDK + emulator) |
| Android SDK | Compile SDK 36, Build-Tools 36, Min SDK 24 |
| Xcode *(iOS only)* | ≥ 16 (on Mac) |
| CocoaPods *(iOS only)* | Latest (`sudo gem install cocoapods`) |

Ensure `ANDROID_HOME` is set:
```bash
# Windows (bash / Git Bash)
export ANDROID_HOME="$HOME/AppData/Local/Android/Sdk"
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
```

---

## Quick start

```bash
cd Rythubidda-Android-MobileApp
npm install --legacy-peer-deps

# .env is already present — edit if your API_BASE_URL differs
# (defaults to https://rythubidda.com)

# Terminal 1 — Metro bundler
npm start

# Terminal 2 — install & launch on Android
npm run android
```

---

## Project structure

```
Rythubidda-Android-MobileApp/
├── android/                 # Android native project
├── ios/                     # iOS native project (ready for Mac)
├── src/
│   ├── api/
│   │   ├── client.ts        # Axios instance + JWT interceptor + error normalisation
│   │   └── services/        # One file per backend domain
│   ├── assets/
│   │   ├── fonts/           # Montserrat (from web app)
│   │   └── images/          # Logo
│   ├── components/
│   │   ├── common/          # Atomic: Button, Input, Card, Text, StarRating, …
│   │   ├── layout/          # ScreenHeader, Container
│   │   ├── ProductCard.tsx
│   │   └── HeroCarousel.tsx
│   ├── constants/           # config, endpoints, storage keys
│   ├── hooks/
│   ├── navigation/          # React Navigation stacks + bottom tabs
│   ├── screens/             # One folder per feature area
│   │   ├── auth/
│   │   ├── home/
│   │   ├── catalog/
│   │   ├── cart/
│   │   ├── orders/
│   │   ├── profile/
│   │   └── static/
│   ├── store/               # Zustand stores (auth, cart)
│   ├── theme/               # Colors, typography, spacing (mirrors web)
│   ├── types/               # TypeScript domain types
│   └── utils/               # format, image URL, toast, validation, authStorage
├── App.tsx                  # Root: providers + navigation
├── index.js                 # RN entry
├── .env / .env.production   # API base URL + environment flags
├── react-native.config.js   # Font auto-linking
├── babel.config.js          # Reanimated plugin
└── package.json
```

---

## Environment configuration

Environment variables are loaded by [`react-native-config`](https://github.com/luggit/react-native-config) from `.env` at build time.

| Variable | Default | Purpose |
| --- | --- | --- |
| `API_BASE_URL` | `https://rythubidda.com` | Base URL for all backend calls |
| `API_TIMEOUT_MS` | `30000` | Axios request timeout |
| `ENV` | `development` | Arbitrary env label (read in `src/constants/config.ts`) |

For release builds, values in `.env.production` override `.env` when building the release variant:
```bash
ENVFILE=.env.production npm run android
```

---

## API integration

All endpoints live in [`src/constants/endpoints.ts`](src/constants/endpoints.ts) and are consumed through domain services in [`src/api/services/`](src/api/services). Nothing on the backend is modified — we speak the exact same JSON envelopes the web frontend uses.

The axios client (`src/api/client.ts`) automatically:
- attaches `Authorization: Bearer <jwt>` from the Keychain
- unwraps `{ success, message, data }` envelopes
- on `401` → clears the token and navigates to the login screen (via `setOnUnauthorized`)

**Authentication flow** (mirrors the web):
1. `POST /api/v1/customer/signup` → OTP sent via MSG91 SMS
2. `POST /api/v1/customer/verify-otp?customerId=X&otp=Y` → receive JWT
3. Token stored in device Keychain, attached to every protected request
4. `GET /api/v1/customer/profile` re-fetched on app launch to validate token
5. `POST /api/v1/customer/logout` + local Keychain clear

**Razorpay checkout flow** (via `react-native-razorpay`):
1. `POST /shop/razorpay/create-order?cartId=...` → returns `{ key_id, amount, order_id }`
2. Native Razorpay checkout opens
3. On success → `POST /shop/razorpay/verify` → order moves to `VERIFIED`, cart cleared
4. On cancel/fail → `POST /shop/razorpay/{cancel,fail}`

---

## Running on Android

### Option A — Emulator
1. Open Android Studio → **Device Manager** → **Create virtual device** → pick a Pixel 6 (API 34).
2. Start the emulator.
3. Run:
   ```bash
   npm start         # terminal 1
   npm run android   # terminal 2
   ```

### Option B — Physical device
1. Enable **Developer options** + **USB debugging** on your phone.
2. Connect via USB, run `adb devices` to confirm it's recognised.
3. Run `npm run android`.

### Option C — Wireless physical device
```bash
adb pair <ip>:<port>           # scan pairing code in Wireless debugging
adb connect <ip>:<port>
npm run android
```

---

## Running on iOS (when you switch to Mac)

See [`IOS_SETUP.md`](./IOS_SETUP.md) for the full step-by-step. Short version:
```bash
cd ios && pod install && cd ..
npm run ios
```

All code in `src/` is 100% cross-platform. You should not need to touch any TypeScript when switching to Mac — only platform-specific native config (signing, capabilities, Info.plist).

---

## Building releases

### Android — signed APK / AAB

1. Generate a keystore (one-time):
   ```bash
   keytool -genkeypair -v -storetype PKCS12 \
     -keystore rythubidda.keystore -alias rythubidda \
     -keyalg RSA -keysize 2048 -validity 10000
   ```
   Move the file to `android/app/rythubidda.keystore`.

2. Add to `~/.gradle/gradle.properties` (NEVER commit these):
   ```
   RYTHUBIDDA_UPLOAD_STORE_FILE=rythubidda.keystore
   RYTHUBIDDA_UPLOAD_KEY_ALIAS=rythubidda
   RYTHUBIDDA_UPLOAD_STORE_PASSWORD=<your-password>
   RYTHUBIDDA_UPLOAD_KEY_PASSWORD=<your-password>
   ```

3. Update `android/app/build.gradle` `signingConfigs` — add a `release` block and point `buildTypes.release.signingConfig` at it.

4. Build:
   ```bash
   npm run build:android:release   # APK -> android/app/build/outputs/apk/release/
   npm run bundle:android:release  # AAB -> android/app/build/outputs/bundle/release/
   ```

5. Upload the `.aab` to the **Google Play Console**.

### iOS (on Mac)
See `IOS_SETUP.md`.

---

## Features

A complete feature checklist lives in [`FEATURES.md`](./FEATURES.md). Short form:

- **Auth** — login, signup + OTP, forgot password + OTP + reset, change password, auto-login
- **Catalog** — home with hero carousel, best sellers, new arrivals, featured; category browse; product detail with qty options, reviews, quantity stepper; search with recent searches
- **Cart** — persistent backend cart, qty updates, remove items, subtotal + shipping
- **Checkout** — address selector, pincode validation, dynamic shipping, Razorpay + Pay-after-delivery
- **Orders** — list with status badges; detail with items, address, bill summary; invoice view with share-as-text
- **Reviews** — write multiple reviews per order, star rating
- **Profile** — view / edit profile, change password, manage addresses
- **Policies** — About, Contact, Terms, Privacy, Refund, Shipping (policies via WebView on the main website)

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `SDK location not found` | Create `android/local.properties` with `sdk.dir=<absolute path to Android SDK>` |
| `Could not find react-native-config` | Ensure `android/settings.gradle` includes the `react-native-config` project stanza (present by default). |
| Vector icons show as `?` | Verify `android/app/src/main/assets/fonts/*.ttf` exists. Running the Gradle build should create these via the fonts.gradle script. |
| Metro port in use | `npx react-native start --reset-cache --port 8082` and set `RCT_METRO_PORT` env var. |
| `error: EPERM: operation not permitted` on Windows | Close Android Studio / emulator and retry; Gradle holds file locks. |
| Razorpay payment modal doesn't open | Ensure `react-native-razorpay` is listed in package.json and autolinking ran. `npm run android -- --active-arch-only` can help. |

---

## Design system & component library

### Theme tokens (`src/theme/`)
- **`colors.ts`** — palette + semantic colors + shimmer + **gradients**. Brand is green primary × warm-gold secondary × terracotta accent (mirrors the web app's updated agri palette).
- **`typography.ts`** — Montserrat font, size scale `xs → 6xl`, weight scale `thin → black`, and pre-defined text variants (`h1…h6`, `body`, `bodyBold`, `caption`, `button`, `label`).
- **`spacing.ts`** — 4-pt base scale `xs(4) sm(8) md(12) base(16) lg(20) xl(24) 2xl(32) 3xl(40) 4xl(48) 5xl(64) 6xl(80)`, radius scale, and shadow presets (`sm / md / lg / xl`).

Always import theme tokens — **never hard-code colors, sizes, or radii**:
```ts
import { colors, spacing, radius, shadows } from './theme';
```

### Reusable UI components (`src/components/common/`)

| Component | Purpose |
| --- | --- |
| `Text` | Typography wrapper with `variant` + `color` props |
| `Button` | `primary / secondary / outline / ghost / danger` with `size` + `loading` |
| `Input` | Floating-label input with `isPassword`, `leftIcon`, `rightIcon`, error + helper text |
| `Card` | Elevated / bordered surface |
| `Badge` | Small pill (primary / secondary / success / warning / error / neutral) |
| `Price` | Formatted `₹` amount + strikethrough MRP + % OFF |
| `StarRating` | Read-only or interactive star row |
| `Skeleton` | **Shimmer** loading placeholder (reanimated gradient sweep) |
| `EmptyState` | Icon + title + subtitle + CTA |
| `LoadingScreen` | Full-screen spinner with message |
| `Divider` | Hairline separator |
| `SignInPrompt` | Guest-mode placeholder for tabs that require login |
| `ErrorBoundary` | Catches render-phase errors and shows a retry screen |
| **`QuantityStepper`** | **NEW** `- qty +` control with haptics, primary / surface tones, loading state |
| **`VariantPicker`** | **NEW** Bottom-sheet modal that lists product variants (weight + price) for selection |

### Product card (`src/components/ProductCard.tsx`)
Mirrors the web `ProductCard` 1:1:
- Image with **discount pill** top-right (e.g. `13% OFF`) and ribbon top-left (`Best Seller` / `New`)
- Variant **dropdown row** that opens the `VariantPicker` bottom-sheet
- Price row: `₹ current` + strikethrough `₹ MRP` + unit label
- **Add button ↔ QuantityStepper** swap on add, backed by the global cart store (updates reflect everywhere in the app instantly)
- Haptic feedback on add / inc / dec

```tsx
<ProductCard
  product={p}
  onPress={() => navigation.navigate('ProductDetail', { productId: p.id })}
  width={180}                // optional fixed width for horizontal rails
  hideBestSellerBadge        // use inside the Best Sellers section
  hideNewArrivalBadge        // use inside the New Arrivals section
/>
```

### Cart state (`src/store/cartStore.ts`)
- `useCartStore()` — Zustand store with `cart`, `loading`, `hydrated`
- `useCartItemCount()` — sum of line quantities (used for the tab badge)
- `useCartLineFor(productId, qtyOptionId)` — returns the line item for a specific variant so cards can show the live count
- Persisted to AsyncStorage (`rb_guest_cart`) so cart survives app restarts
- Backend-synced after login via `/api/v1/shop/cart`

### Haptics (`src/utils/haptics.ts`)
Silent no-op if the VIBRATE permission isn't granted. Use `haptics.tap()`, `.success()`, `.error()`, `.select()` at the top of interaction handlers.

## License

Proprietary — © Rythu Bidda.

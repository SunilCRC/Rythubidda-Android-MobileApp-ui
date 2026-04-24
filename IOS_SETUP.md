# iOS Setup (When You Switch to Mac)

This app is fully cross-platform — nothing in `src/` is Android-only. When you're ready to build for iOS, follow these steps. All native config you need is already in the `ios/` folder; the only things that require a Mac are CocoaPods installation, Xcode signing, and the actual build.

---

## 1. Prerequisites on your Mac

| Tool | Version | Install |
| --- | --- | --- |
| macOS | 14+ | — |
| Xcode | 16+ | App Store |
| Xcode Command Line Tools | latest | `xcode-select --install` |
| Node.js | 22.11+ | `brew install node` or nvm |
| Ruby | 3.x (system or rbenv) | — |
| CocoaPods | latest | `sudo gem install cocoapods` |
| Watchman (optional, speeds Metro) | latest | `brew install watchman` |

## 2. One-time setup

```bash
# clone / copy the repo to your Mac
cd Rythubidda-Android-MobileApp
npm install --legacy-peer-deps

# install CocoaPods native dependencies
cd ios
pod install
cd ..
```

If `pod install` fails with `Ruby version` errors, either use rbenv to match `ios/.ruby-version`, or:
```bash
cd ios && gem install cocoapods-activate && bundle install && bundle exec pod install && cd ..
```

## 3. Configure signing in Xcode

1. Open `ios/RythubiddaMobile.xcworkspace` (workspace, NOT the project file).
2. Select the **RythubiddaMobile** target → **Signing & Capabilities**.
3. Under **Signing**, choose your Apple Developer team. Xcode will auto-manage provisioning profiles for development.
4. Set a unique **Bundle Identifier** — suggested: `com.rythubidda.mobile` (needs to be unique in your Apple Developer account).
5. Update the **Display Name** under **General** to `Rythu Bidda`.

## 4. Permissions — Info.plist

Add these entries to `ios/RythubiddaMobile/Info.plist` if/when you use the features (none are strictly required today, but future-proof):

```xml
<key>NSPhotoLibraryUsageDescription</key>
<string>We use your photos to upload profile pictures.</string>

<key>NSCameraUsageDescription</key>
<string>We use the camera to capture product images.</string>

<key>NSFaceIDUsageDescription</key>
<string>Use Face ID to securely unlock the app.</string>
```

## 5. Fonts (auto-linked)

Montserrat fonts are already present in `src/assets/fonts/` and listed in `react-native.config.js`. During the first `pod install`, they will be copied into the Xcode project and registered in `Info.plist`. If for some reason icons show as `?`:

```bash
npx react-native-asset
```

This re-runs the font copy step for both platforms.

## 6. Running on iOS

```bash
# simulator
npm run ios

# specific simulator
npx react-native run-ios --simulator="iPhone 15 Pro"

# physical device (make sure it's connected and trusted)
npx react-native run-ios --device "Your iPhone Name"
```

## 7. Building for App Store

1. In Xcode → **Product** → **Scheme** → **Edit Scheme** → Build Configuration → **Release**.
2. **Product** → **Archive** (requires a real device target, not a simulator).
3. Window → **Organizer** → select archive → **Distribute App** → **App Store Connect**.
4. Sign in with your Apple Developer account and follow the wizard.
5. On App Store Connect: submit for review.

## 8. Optional — Splash & App icon

Generate matching iOS + Android splash and icon from a single source image:
```bash
npx react-native-bootsplash generate --platforms=android,ios ./src/assets/images/logo.png --background="#f9f4ec" --logo-width=180
```

## 9. When push notifications are added later

Already-cross-platform code in `src/services/pushNotificationService.ts` (added in Phase H) will work on iOS once you:
1. Drop `GoogleService-Info.plist` into the Xcode project at the iOS target root.
2. Enable **Push Notifications** capability in Xcode.
3. Enable **Background Modes** → check **Remote notifications**.
4. Configure an APNs Authentication Key in Firebase Console → Project Settings → Cloud Messaging.

Done. The same FCM token flow used on Android works unchanged on iOS.

---

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `Command PhaseScriptExecution failed` during build | Clear derived data: `rm -rf ~/Library/Developer/Xcode/DerivedData` and rebuild |
| Hermes linking errors | `cd ios && pod deintegrate && pod install` |
| "Multiple commands produce..." for fonts | Remove duplicate font entries in `ios/<app>/Info.plist` → `UIAppFonts` |
| Simulator shows white screen | `npm start -- --reset-cache` and rebuild |
| `react-native-keychain` requires privacy info | Apple may ask for a privacy manifest; a stub is included with the pod |

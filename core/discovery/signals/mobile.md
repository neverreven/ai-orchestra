# Signal: mobile (Mobile native + cross-platform)

> Generic detection in v1. Stack pack content arrives in v1.1+. Mobile is **always a secondary signal** — typically coexists with `js-ts` (React Native, Capacitor, Cordova), `dotnet` (MAUI, Xamarin), or appears alone (Android Java/Kotlin, iOS Swift/Objective-C, Flutter).

**Stack id:** `mobile`
**Stack pack:** _none in v1; `core/stack-packs/mobile/` reserved for v1.1+_

## Strong signals (weight 3 each)

| Signal | Match | Notes |
|--------|-------|-------|
| `android/app/src/main/AndroidManifest.xml` present | File presence | Android project. |
| `ios/<AppName>.xcodeproj/` or `ios/<AppName>.xcworkspace/` present | Directory presence | iOS Xcode project. |
| `pubspec.yaml` present at root | File presence | Flutter / Dart project. |
| `package.json#dependencies` or `devDependencies` contains `react-native` | JSON inspection | React Native. |
| `package.json#dependencies` contains `@capacitor/core` | JSON inspection | Capacitor. |
| `MAUI` or `Xamarin.Forms` references in any `*.csproj` | XML inspection | .NET cross-platform mobile. |

## Medium signals (weight 2 each)

| Signal | Match |
|--------|-------|
| `android/build.gradle` or `android/build.gradle.kts` present | Gradle Android build. |
| `ios/Podfile` present | CocoaPods (iOS dependencies). |
| `Cartfile` present | Carthage (legacy iOS dependencies). |
| `metro.config.js` present | React Native Metro bundler. |
| `capacitor.config.{ts,js,json}` present | Capacitor configuration. |
| `expo.json` or `app.json` with `"expo"` key | Expo (React Native flavour). |

## Weak signals (weight 1 each)

| Signal | Match |
|--------|-------|
| Any `*.kt` (Kotlin) file under `android/` | Android Kotlin source. |
| Any `*.swift` file under `ios/` | iOS Swift source. |
| Any `*.dart` file in tracked code | Flutter Dart source. |
| Any `*.m` (Objective-C) file under `ios/` | iOS Objective-C source. |
| `Info.plist` files under `ios/` | iOS app metadata. |

## Detected sub-flavours

| Sub-flavour | Indicators |
|-------------|------------|
| `react-native` | `react-native` package + `android/`/`ios/` folders. |
| `capacitor` | `@capacitor/core` + native folders. |
| `flutter` | `pubspec.yaml` + `lib/main.dart`. |
| `android-native` | `android/` with Kotlin/Java source, no JS/Dart frontend. |
| `ios-native` | `ios/` with Swift/Objective-C source, no JS/Dart frontend. |
| `maui` / `xamarin` | .NET project with MAUI / Xamarin packages. |

Sub-flavours are recorded in `profile.frameworks`.

## Notes

- A mobile detection almost always co-occurs with another stack (JS/TS for RN/Capacitor, Dart for Flutter, .NET for MAUI). Polyglot mode is the norm here.
- A web-only repo with an `android/` folder unrelated to mobile (rare) can yield false positives. The strong signals (manifest files) protect against this.

## References

- [DETECTION.md](../DETECTION.md) — overall probe procedure.

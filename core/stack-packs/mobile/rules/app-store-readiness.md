# App store readiness

## When this applies

Apply when preparing a mobile app for submission to Google Play Store, Apple App Store, or any distribution channel that requires binary review. Adapter glob: `**/android/app/build.gradle*`, `**/android/app/src/main/AndroidManifest.xml`, `**/ios/**/*.pbxproj`, `**/ios/**/Info.plist`, `**/capacitor.config.*`, `**/app.json`, `**/pubspec.yaml`, and any CI/CD workflow files referencing signing, bundling, or store upload.

The agent should consult this file when preparing a release build, updating app metadata, or troubleshooting store-submission rejections.

## Patterns to follow

- **Semantic versioning with platform-specific build numbers.** Use `MAJOR.MINOR.PATCH` for the user-facing version string. Increment the build number (Android `versionCode`, iOS `CFBundleVersion`) on every submitted build — stores reject duplicate build numbers.
- **Signing credentials in CI secrets, never in source.** Keystore files, provisioning profiles, and their passwords belong in encrypted CI secrets or a dedicated signing service (Play App Signing, Apple Cloud Signing). Never commit `.jks`, `.p12`, or `.mobileprovision` files.
- **App icons at all required resolutions.** Android: adaptive icons (`ic_launcher.xml` foreground + background layers) at `mdpi` through `xxxhdpi`. iOS: `AppIcon.appiconset` with all required sizes (1024x1024 store icon mandatory). Missing sizes cause submission rejection.
- **Splash screen that matches the app theme.** Android 12+: use the Splash Screen API (`<item name="android:windowSplashScreenBackground">`). iOS: `LaunchScreen.storyboard` or static images. Avoid jarring color transitions between splash and first screen.
- **Permissions declared with usage descriptions.** iOS: every `NS*UsageDescription` key in `Info.plist` must have a human-readable sentence explaining why the app needs the permission. Android: `<uses-permission>` entries in `AndroidManifest.xml` with optional `maxSdkVersion` to drop deprecated permissions on newer APIs.
- **Target SDK meets store minimums.** Google Play: `targetSdkVersion` must meet the current-year minimum (API 34+ as of 2026). Apple: build against the latest stable Xcode SDK.
- **ProGuard / R8 rules for release builds (Android).** Ensure obfuscation does not strip classes referenced by reflection (common with serialization libraries, native bridges). Test the release APK/AAB, not just debug.
- **App Transport Security (iOS).** `NSAppTransportSecurity` exceptions are minimized. HTTPS-only is the default; any HTTP exception requires a specific domain allowlist and a justification that reviewers may question.
- **Privacy manifest (iOS, required since 2024).** `PrivacyInfo.xcprivacy` declares all "required reason" API usage and data collection types. Missing manifest causes automatic rejection.
- **Store listing metadata prepared.** Screenshots (phone + tablet for Android; 6.7" + 6.5" + 5.5" for iOS), short description (80 chars), full description (4000 chars), feature graphic (Android), and privacy policy URL. All must be ready before the binary review completes.
- **No debug code in release builds.** Strip `console.log`, `debugPrint`, debug banners, and test API endpoints. Feature flags gate unreleased features; they are not conditional on build type.

## Anti-patterns to avoid

- **Submitting debug builds.** Debug builds are larger, slower, and may include development servers or test credentials. Always submit release-mode builds.
- **Requesting unnecessary permissions.** Reviewers reject apps that request Camera + Microphone + Location + Contacts without clear feature justification. Request only what is demonstrably used.
- **Hardcoded API base URLs per environment.** Use build-time configuration or environment variables to switch between staging and production. A submission with staging URLs will either fail review or leak internal infrastructure.
- **Ignoring store-specific content policies.** User-generated content requires a reporting mechanism. In-app purchases require the platform's billing API (no third-party payment for digital goods on iOS). Ads require COPPA/GDPR compliance declarations.
- **Single large AAB/IPA without modularization.** Apps exceeding 150MB (Android) or 200MB (iOS over cellular) trigger download warnings. Use Android App Bundles (split APKs), on-demand delivery, or asset packs for large resources.
- **Skipping the pre-launch report (Android).** Google Play provides automated testing on real devices before review. Check the pre-launch report for crashes, accessibility warnings, and security alerts.

## When to deviate

- **Enterprise / internal distribution.** Apps distributed via MDM (Apple Business Manager, Managed Google Play) skip most store-listing requirements. Signing is still mandatory.
- **Progressive Web Apps (PWA) with native wrapper.** Capacitor apps that are primarily web may skip some native-specific requirements (adaptive icons, splash screen API) if the WebView handles them.
- **Beta / TestFlight / internal track.** Pre-release tracks have relaxed metadata requirements. Still enforce signing, version numbering, and permission declarations — these are hard to fix later.

## References

- [Google Play — App content requirements](https://support.google.com/googleplay/android-developer/answer/9859152).
- [Apple — App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/).
- [Android — App signing](https://developer.android.com/studio/publish/app-signing).
- [Apple — Distribution overview](https://developer.apple.com/documentation/xcode/distributing-your-app-for-beta-testing-and-releases).
- [`native-plugin-lifecycle.md`](native-plugin-lifecycle.md) — permission request patterns that affect store review outcomes.
- [`../../../skills/mobile/build-config-review/SKILL.md`](../../../skills/mobile/build-config-review/SKILL.md) — universal skill for build-config review; mobile-specific addenda in [`../skills.md`](../skills.md).

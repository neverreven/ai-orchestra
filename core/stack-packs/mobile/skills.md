# mobile — skills addenda

## Layering principle

These addenda are added on top of the universal skills under [`../../skills/`](../../skills/). They do not replace the universal procedure; they extend it with mobile-specific checklist items, gotchas, and refinements that apply when the project targets mobile platforms (Capacitor, React Native, Flutter, MAUI, or native Android/iOS). The agent runs the universal skill's process and consults this file to expand any step that has a mobile-specific consideration.

If a universal skill is not listed here, run it as-is.

## Per-skill addenda

### platform-parity-check

Extends [`../../skills/mobile/platform-parity-check/SKILL.md`](../../skills/mobile/platform-parity-check/SKILL.md).

Mobile-specific checks:
- **Feature matrix across platforms.** Build a comparison table of features available on each target platform (Android, iOS, web fallback). Flag any feature that works on one platform but is broken or absent on another.
- **Permission parity.** Verify that permission requests match across platforms — a feature requiring Camera on iOS must also declare Camera on Android and handle the web fallback.
- **Visual parity.** Safe area handling, status bar styling, and navigation bar treatment differ between platforms. Test that the app looks intentional (not broken) on each.
- **Performance parity.** Low-end Android devices are significantly slower than iPhones at the same price point. Profile on a budget Android device (not just the emulator) to catch jank.
- **Plugin availability.** Verify that every native plugin used has implementations for all target platforms. Capacitor plugins without an iOS or Android implementation are web-only stubs that silently no-op.
- **Push notification parity.** APNs (iOS) and FCM (Android) have different payload structures, token registration flows, and foreground behaviour. Test both paths end-to-end.

### build-config-review

Extends [`../../skills/mobile/build-config-review/SKILL.md`](../../skills/mobile/build-config-review/SKILL.md).

Mobile-specific checks:
- **Signing configuration per environment.** Debug builds use a debug keystore/provisioning; release builds use production signing. Verify CI separates these and never exposes release credentials in debug contexts.
- **Version code / build number auto-increment.** Stores reject duplicate build numbers. CI should auto-increment or derive from the commit count / tag.
- **Target SDK level meets store minimum.** Google Play enforces a minimum `targetSdkVersion` that increases annually. Verify the current value meets the current-year requirement.
- **Bundle configuration (Android).** Verify the app uses Android App Bundle (AAB) format for Play Store distribution, not raw APK. Split APKs for language, density, and ABI are enabled.
- **Bitcode and architecture (iOS).** Verify the build targets `arm64` for device and includes the simulator architecture only in debug builds. Bitcode is deprecated since Xcode 14 — ensure it is not accidentally enabled.
- **ProGuard / R8 rules tested.** Run the release build through its obfuscation step and verify no runtime crashes from stripped classes (especially serialization, reflection-based DI, and native bridge callbacks).
- **Capacitor native project sync.** After any `capacitor.config.*` change, verify `npx cap sync` was run and the native projects reflect the new configuration.

### performance-audit

Extends [`../../skills/quality/performance-audit/SKILL.md`](../../skills/quality/performance-audit/SKILL.md).

Mobile-specific checks:
- **Cold-start time.** Measure time from tap to first interactive frame. Target: < 2s on mid-range devices. Profile with Android Studio Profiler or Xcode Instruments Time Profiler.
- **Memory pressure handling.** Test app behaviour when the OS sends memory warnings. The app should release caches and non-visible resources without crashing.
- **Battery drain during idle.** Profile with Battery Historian (Android) or Energy Impact (Xcode). An idle app should have near-zero CPU usage. Wake locks, persistent connections, and rapid timer fires are red flags.
- **Scroll performance (60fps target).** Profile list/feed scrolling with the GPU profiler overlay. Dropped frames during scroll are the most user-visible jank. Virtualize long lists (FlatList, RecyclerView, ListView.builder).
- **Network payload size.** Mobile networks have higher latency and lower throughput. Audit API responses for unnecessary fields; compress payloads; paginate large datasets.
- **Image loading strategy.** Use thumbnails for list views, load full-resolution on demand. Cache aggressively. Decode images off the main thread.

### security-baseline

Extends [`../../skills/quality/security-baseline/SKILL.md`](../../skills/quality/security-baseline/SKILL.md).

Mobile-specific checks:
- **Sensitive data in secure storage.** Tokens, passwords, and encryption keys use platform secure storage (Keychain on iOS, EncryptedSharedPreferences / Keystore on Android). Never store in plain SharedPreferences, UserDefaults, or unencrypted SQLite.
- **Certificate pinning for sensitive APIs.** Pin the server's public key or certificate for authentication and payment endpoints. Accept the maintenance cost (certificate rotation requires app update) for critical paths.
- **No sensitive data in screenshots / task switcher.** The OS captures a snapshot for the app switcher. Blur or hide sensitive screens on `pause`/`inactive` state.
- **Root / jailbreak detection (when appropriate).** Banking and health apps should detect compromised devices and warn (or restrict). General apps should not — it creates false-positive friction for power users.
- **Clipboard data clearing.** If the app copies sensitive data (passwords, tokens) to the clipboard, clear it after a timeout (30–60s).
- **Debug logging stripped in release.** Ensure no sensitive values (tokens, user data, API keys) appear in release-mode logs. Android: use ProGuard to strip `Log.d` / `Log.v`. iOS: use `#if DEBUG` guards.

### deployment-checklist

Extends [`../../skills/platform/deployment-checklist/SKILL.md`](../../skills/platform/deployment-checklist/SKILL.md).

Mobile-specific checks:
- **Staged rollout configured.** Google Play and App Store Connect support percentage-based rollouts. Never go 100% immediately on a major release.
- **Crash monitoring active.** Firebase Crashlytics, Sentry, or Bugsnag SDK integrated and verified to report crashes from the release build.
- **Remote feature flags operational.** Critical features gated by remote config so they can be disabled without a store update if a bug is found post-release.
- **Rollback plan documented.** If the release is catastrophic, what is the procedure? (Halt rollout, promote previous version, or hotfix?) Document before submission.
- **Store listing updated.** Screenshots, description, and "What's new" text reflect the current release content.
- **Legal compliance for target markets.** GDPR, CCPA, COPPA age gates, data-deletion capability, privacy policy URL — all required by both stores.

## References

- [`../../skills/mobile/platform-parity-check/SKILL.md`](../../skills/mobile/platform-parity-check/SKILL.md) — universal platform-parity skill.
- [`../../skills/mobile/build-config-review/SKILL.md`](../../skills/mobile/build-config-review/SKILL.md) — universal build-config skill.
- [`../../skills/quality/performance-audit/SKILL.md`](../../skills/quality/performance-audit/SKILL.md) — universal performance audit.
- [`../../skills/quality/security-baseline/SKILL.md`](../../skills/quality/security-baseline/SKILL.md) — universal security baseline.
- [`../../skills/platform/deployment-checklist/SKILL.md`](../../skills/platform/deployment-checklist/SKILL.md) — universal deployment checklist.
- [`rules/app-store-readiness.md`](rules/app-store-readiness.md) — store-submission patterns.
- [`rules/native-plugin-lifecycle.md`](rules/native-plugin-lifecycle.md) — plugin lifecycle considerations relevant to security and performance.

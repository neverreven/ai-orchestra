# mobile — roles addenda

## Layering principle

These addenda are added on top of the universal roles under [`../../roles/`](../../roles/). They do not replace the universal role description; they add mobile-specific non-negotiables, primary outputs, and skill-set extensions that apply when the project targets mobile platforms. The agent uses the universal role file to understand the role's mission and triggers, then consults this file to apply mobile-specific expectations.

If a universal role is not listed here, use it as-is.

## Per-role addenda

### mobile-engineer

Extends [`../../roles/mobile-engineer.md`](../../roles/mobile-engineer.md).

Stack-specific non-negotiables:
- **Platform-native feel.** The app must feel native to each platform it targets — platform navigation conventions, system gestures, and interaction patterns respected. A mobile app that feels like a desktop website in a frame fails.
- **Offline-first by default.** Every data-driven screen must render meaningful content from cache before waiting for network responses. See [`rules/offline-and-sync.md`](rules/offline-and-sync.md).
- **Touch target compliance.** All interactive elements meet the 44pt (iOS) / 48dp (Android) minimum. See [`rules/touch-and-viewport.md`](rules/touch-and-viewport.md).
- **Permission discipline.** Permissions requested lazily, contextually, with rationale screens. Never blanket-request at startup. See [`rules/native-plugin-lifecycle.md`](rules/native-plugin-lifecycle.md).
- **Store-ready at all times.** The main branch can produce a submittable store build at any commit. Version codes auto-increment in CI; signing is automated; metadata is maintained. See [`rules/app-store-readiness.md`](rules/app-store-readiness.md).
- **Battery awareness.** Background work respects OS battery-saving constraints. No wake locks, no aggressive polling, no unnecessary GPS tracking.

Primary outputs (additional, beyond universal):
- Platform-parity matrix maintained and updated with each feature.
- Per-platform test evidence (real-device screenshots or automated visual regression).
- Store submission checklist completed before every release.

Skill set additions:
- Deep familiarity with [`../../skills/mobile/platform-parity-check/SKILL.md`](../../skills/mobile/platform-parity-check/SKILL.md) — addenda in [`skills.md`](skills.md).
- Deep familiarity with [`../../skills/mobile/build-config-review/SKILL.md`](../../skills/mobile/build-config-review/SKILL.md) — addenda in [`skills.md`](skills.md).
- Working knowledge of native build tooling (Gradle, Xcode build settings, CocoaPods/SPM) regardless of the hybrid framework in use.

### devops-sre

Extends [`../../roles/devops-sre.md`](../../roles/devops-sre.md).

Stack-specific non-negotiables:
- **Mobile CI separate from web CI.** Mobile builds are slow (5–20 min) and require platform-specific runners (macOS for iOS builds). Separate pipelines prevent blocking web PRs.
- **Signing in CI secrets.** Keystores, provisioning profiles, and service-account JSON live in encrypted CI secrets. The pipeline never logs signing passwords or certificate contents.
- **Build number automation.** CI auto-increments the build number (from tag, commit count, or a counter) so manual bumps are never needed and duplicates are impossible.
- **Artifact archival.** Every release build (AAB, IPA, dSYM, source maps) is archived with its version tag. Crash symbolication requires matching dSYMs; losing them makes production crashes unreadable.
- **Staged rollout enforcement.** The pipeline's store-upload step defaults to a percentage rollout (e.g., 10%) rather than full release. Full release requires a manual gate or explicit override.
- **Over-the-air update strategy (when applicable).** Capacitor/RN apps using Appflow or CodePush must version-lock OTA bundles to native binary versions to prevent incompatibility crashes.

Primary outputs (additional):
- Mobile-specific CI pipeline definitions (one per platform, or a matrix strategy).
- Signing and credential documentation (what secrets are stored where, rotation schedule).
- Release checklist automation (pre-flight script that validates version, metadata, and signing before submission).

### qa-engineer

Extends [`../../roles/qa-engineer.md`](../../roles/qa-engineer.md).

Stack-specific non-negotiables:
- **Real-device testing is mandatory.** Emulators miss touch timing, GPU rendering, network transitions, and camera/sensor behaviour. At minimum, test on one budget Android device and one iPhone.
- **Platform-specific test plans.** Android and iOS have different failure modes (memory pressure behaviour, permission UX, background task killing). Test plans must name platform-specific scenarios.
- **Accessibility testing on-device.** Enable TalkBack (Android) and VoiceOver (iOS) and navigate the full app. Focus order, labels, and announcements that work in emulators often break on real devices.
- **Network-condition simulation.** Test on 3G-equivalent throttled connections, complete offline, and transition-while-loading scenarios. Charles Proxy, Android Network Profiler, or iOS Network Link Conditioner.
- **Upgrade testing.** Install the previous production version, use the app (create data), then upgrade to the new version. Verify data migration, no crashes, and no UI regressions.
- **Deep-link and notification testing.** Verify every registered deep link and push notification type opens the correct screen with the correct data, from both cold-start and backgrounded states.

Primary outputs (additional):
- Per-platform test evidence (screenshots, video recordings, accessibility audit output).
- Device matrix defining the minimum devices tested per release.
- Regression suite covering the platform-specific scenarios named above.

### security-engineer

Extends [`../../roles/security-engineer.md`](../../roles/security-engineer.md).

Stack-specific non-negotiables:
- **Secure storage audit.** Tokens and keys in Keychain / Keystore only — never in UserDefaults, SharedPreferences, or unencrypted SQLite. Verify with a file-system inspection on a rooted/jailbroken test device.
- **Transport security enforced.** iOS ATS enabled with minimal exceptions; Android `cleartextTrafficPermitted="false"` in network security config. Certificate pinning on critical endpoints.
- **Binary hardening.** Release builds are obfuscated (ProGuard/R8 on Android, bitcode compilation + symbol stripping on iOS). No debug symbols ship in the store binary.
- **Third-party SDK privacy audit.** Every SDK with network access must be justified and its data-collection practices documented (required by both stores' privacy manifests).
- **App-switcher screenshot protection.** Sensitive screens (account, payments, health data) are blanked or blurred in the task-switcher snapshot.

Primary outputs (additional):
- Mobile-specific threat model (device compromise, physical access, clipboard attacks, intent/URL-scheme hijacking).
- Secure-storage usage map: which secrets live where, with rotation and expiry documented.
- Privacy manifest / data safety form maintained and version-controlled.

## References

- [`../../roles/mobile-engineer.md`](../../roles/mobile-engineer.md) — universal mobile-engineer role.
- [`../../roles/devops-sre.md`](../../roles/devops-sre.md) — universal devops-sre role.
- [`../../roles/qa-engineer.md`](../../roles/qa-engineer.md) — universal qa-engineer role.
- [`../../roles/security-engineer.md`](../../roles/security-engineer.md) — universal security-engineer role.
- [`rules/touch-and-viewport.md`](rules/touch-and-viewport.md) — touch-target and viewport rules.
- [`rules/native-plugin-lifecycle.md`](rules/native-plugin-lifecycle.md) — plugin lifecycle rules.
- [`rules/offline-and-sync.md`](rules/offline-and-sync.md) — offline-first patterns.
- [`rules/app-store-readiness.md`](rules/app-store-readiness.md) — store-submission readiness.
- [`skills.md`](skills.md) — skill addenda referenced from role addenda above.

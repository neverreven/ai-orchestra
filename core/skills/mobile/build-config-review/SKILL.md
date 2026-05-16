# Build config review

> Review mobile build configuration — signing, entitlements, capabilities, schemes, flavours, manifest declarations — for correctness, security, and store-readiness.

## Trigger

- "review the build config"
- "signing setup"
- "entitlements check"
- "manifest review"
- "is the build store-ready?"

## When to use

- Initial mobile project setup.
- After adding a new capability (push, file sharing, background tasks, biometrics, deep links).
- Before a store submission.
- After upgrading the build toolchain (Xcode, Gradle, AGP, RN, Capacitor, Flutter).

## When NOT to use

- Pure application-code review (use [code-review](../../code/code-review/SKILL.md) and [platform-parity-check](../platform-parity-check/SKILL.md)).
- Server-side build / CI configuration (use [ci-pipeline-audit](../../platform/ci-pipeline-audit/SKILL.md)).

## Process

1. **iOS pass** — `*.xcodeproj` / `*.xcworkspace` settings, deployment target, bundle id, code-signing entitlements, capabilities (push, background modes, app groups, keychain), Info.plist permissions strings present and human-meaningful.
2. **Android pass** — `build.gradle` (app + project), `applicationId`, `minSdk` / `targetSdk` / `compileSdk` consistent with policy, signing config (release uses keystore, never debug for release builds), `AndroidManifest.xml` permissions justified.
3. **React Native / Capacitor / Expo / Flutter / MAUI specifics** — platform native projects regenerated cleanly, build hooks not silently mutating native code in ways that confuse rebuilds.
4. **Permissions audit** — every requested permission has a concrete reason; missing rationales are flagged.
5. **Security pass** — debug code stripped from release builds, no secrets in Info.plist or AndroidManifest, certificate pinning if applicable, ATS exceptions justified.
6. **Versioning** — `CFBundleShortVersionString` / `CFBundleVersion`, `versionName` / `versionCode` follow a documented scheme; never decrease.
7. **Store-readiness** — icons + launch screens present at all sizes; locale list realistic; metadata consistent with store-listing copy.
8. **Findings** — categorised `must-fix` (broken signing, security gap, store-blocker), `should-fix` (rationale missing, version drift), `nit`.

## Output

A build-config review with:
- iOS section, Android section, cross-platform section (if applicable).
- Per-finding entry: file, severity, what to change, why.
- Pre-submission checklist with explicit pass/fail per item.

## References

- [_schema.md](../../_schema.md)
- [platform-parity-check/SKILL.md](../platform-parity-check/SKILL.md)
- [../../platform/ci-pipeline-audit/SKILL.md](../../platform/ci-pipeline-audit/SKILL.md)
- [../../quality/secrets-scan/SKILL.md](../../quality/secrets-scan/SKILL.md)
- [../../audit/pre-release/SKILL.md](../../audit/pre-release/SKILL.md)
- [../../../roles/mobile-engineer.md](../../../roles/mobile-engineer.md)
- [../../../roles/devops-sre.md](../../../roles/devops-sre.md)

# Mobile — stack pack

## Identity

- **Pack id:** `mobile`
- **Pack version:** `1.0.0`
- **Compatible orchestra versions:** `1.3.x`
- **Primary detection signal:** [`../../discovery/signals/mobile.md`](../../discovery/signals/mobile.md)
- **Frameworks covered:** Capacitor, React Native, Flutter, MAUI / Xamarin, Android native (Kotlin/Java), iOS native (Swift/ObjC)

## What this pack adds

Mobile development has unique constraints that web-only stacks never encounter: constrained device resources, platform permission models, app-store submission rules, offline-first networking, touch-based interaction, and deep integration with OS-level services. This pack captures patterns that apply across the major mobile frameworks — from WebView hybrids (Capacitor) to compiled native (Flutter, Android/iOS native) to cross-platform .NET (MAUI). Framework-specific subsections handle differences where they exist; the majority of guidance is framework-agnostic and focuses on the mobile platform surface itself.

The pack is always a companion to another stack (JS/TS for Capacitor/RN, Dart for Flutter, .NET for MAUI). It layers onto the primary stack's rules without conflicting.

## File index

- [`_overview.md`](_overview.md) — this file (pack identity and layering).
- [`rules/touch-and-viewport.md`](rules/touch-and-viewport.md) — touch targets, safe areas, viewport, pointer-coarse patterns.
- [`rules/native-plugin-lifecycle.md`](rules/native-plugin-lifecycle.md) — plugin init, permission flows, platform-specific conditionals, bridge etiquette.
- [`rules/offline-and-sync.md`](rules/offline-and-sync.md) — offline-first patterns, pull-to-refresh, background sync, network-status gating.
- [`rules/app-store-readiness.md`](rules/app-store-readiness.md) — signing, versioning, icons/splash, permissions, store-submission checklist.
- [`skills.md`](skills.md) — mobile-specific addenda for universal skills.
- [`roles.md`](roles.md) — mobile-specific addenda for universal roles.

## Detection

The pack is selected when [`../../discovery/signals/mobile.md`](../../discovery/signals/mobile.md) reports a positive match. The signal is positive when any strong signal fires (weight 3: Android manifest, iOS Xcode project, `pubspec.yaml`, `react-native` dep, `@capacitor/core` dep, or MAUI/Xamarin references) OR when two or more medium signals fire concurrently.

## Layering rules

This pack follows the universal layering rules in [`../_overview.md`](../_overview.md) §3 without exception:

- Roles in [`../../roles/`](../../roles/) are unchanged. [`roles.md`](roles.md) supplies mobile-specific non-negotiables for roles that interact with mobile code.
- Skills in [`../../skills/`](../../skills/) are unchanged. [`skills.md`](skills.md) lists per-skill addenda the agent applies when running a universal skill against mobile code.
- Each [`rules/<topic>.md`](rules/) is rendered into the IDE's rule location with the file-glob declared in the rule's `## When this applies` section as the activation condition.

When a project has both the `js-ts` pack and the `mobile` pack active (e.g., a Capacitor project), all rules from both packs apply to their matching globs. Overlaps are resolved by specificity: mobile rules govern files under `android/`, `ios/`, `capacitor.config.*`, `app.json`; the JS/TS pack governs the web source code.

## What this pack does NOT include

- Native build system internals for individual platforms (Gradle DSL, Xcode build settings, CocoaPods repo management). These are too vendor-specific for a universal pack.
- Game-engine mobile (Unity, Unreal, Godot). Mobile-game patterns are a separate domain.
- Enterprise MDM (Mobile Device Management) integration. That belongs to a future enterprise pack.
- CI/CD pipeline specifics for each platform (Fastlane lanes, App Center builds, EAS pipelines). The `deployment-checklist` skill addenda cover the principles; pipeline specifics are project-level.
- Platform-specific UI design guidelines (Material You, Human Interface Guidelines). Design guidelines are subjective and version-fast; this pack sticks to engineering patterns.

## References

- [`../_overview.md`](../_overview.md) — stack-packs framework overview.
- [`../_schema.md`](../_schema.md) — stack-pack file shape this pack conforms to.
- [`../../discovery/signals/mobile.md`](../../discovery/signals/mobile.md) — detection signals that select this pack.
- [`../../roles/mobile-engineer.md`](../../roles/mobile-engineer.md) — universal role that [`roles.md`](roles.md) extends.
- [`../../roles/devops-sre.md`](../../roles/devops-sre.md) — universal role that [`roles.md`](roles.md) extends.
- [`../../roles/qa-engineer.md`](../../roles/qa-engineer.md) — universal role that [`roles.md`](roles.md) extends.
- [`../../skills/mobile/platform-parity-check/SKILL.md`](../../skills/mobile/platform-parity-check/SKILL.md) — universal skill that [`skills.md`](skills.md) extends.
- [`../../skills/mobile/build-config-review/SKILL.md`](../../skills/mobile/build-config-review/SKILL.md) — universal skill that [`skills.md`](skills.md) extends.

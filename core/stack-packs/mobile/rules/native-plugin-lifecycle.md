# Native plugin lifecycle

## When this applies

Apply when working with native plugins, platform channels, or bridge code that connects the web/JS/Dart layer to native platform APIs. Adapter glob: `**/capacitor.config.*`, `**/android/app/src/**`, `**/ios/**/*.swift`, `**/ios/**/*.m`, `**/*.kt` under `android/`, `**/plugins/**`, and any file importing from `@capacitor/*`, `react-native` native modules, or Flutter platform channels.

The agent should consult this file when adding, configuring, or debugging native plugin integrations regardless of the hybrid framework in use.

## Patterns to follow

- **Init order matters.** Plugins that depend on device state (network, auth, storage) must initialize after the platform is ready. Capacitor: after `Capacitor.isNativePlatform()` confirms native context. React Native: after `AppState` reports `active`. Flutter: after `WidgetsFlutterBinding.ensureInitialized()`.
- **Permission requests are lazy and contextual.** Never request all permissions at app startup. Request each permission at the moment the user triggers the feature that needs it, with a pre-prompt explanation screen (rationale dialog) before the system prompt fires.
- **Platform-specific conditionals are explicit.** Guard platform code with `Capacitor.getPlatform() === 'android'`, `Platform.OS === 'android'` (RN), or `defaultTargetPlatform == TargetPlatform.android` (Flutter). Never rely on user-agent sniffing for platform detection in native contexts.
- **Plugin errors are caught and surfaced.** Native calls can fail for reasons the JS/Dart layer cannot predict (permission denied after grant, hardware unavailable, OS killed background service). Wrap every plugin call in try/catch and surface meaningful error states to the UI.
- **Native callbacks run on the main thread (mostly).** UI updates triggered by native events must dispatch to the main/UI thread. Capacitor handles this automatically; React Native's `NativeEventEmitter` does not always; Flutter's `MethodChannel` does.
- **Plugin version pinning.** Pin plugin versions in the project manifest (Capacitor: `package.json`, RN: `package.json`, Flutter: `pubspec.yaml`). Unpinned plugins break on every `pod install` or Gradle sync.
- **Graceful degradation on web.** Capacitor plugins with web fallbacks should degrade gracefully when running in a browser. Check `Capacitor.isNativePlatform()` and provide a web-safe alternative or a "not available on this platform" message.
- **App state lifecycle awareness.** Handle `pause`, `resume`, `inactive` states properly. Release expensive resources on pause; reacquire on resume. Save drafts on pause in case the OS kills the app.
- **Deep-link and universal-link registration.** Register deep-link schemes and associated domains at build time (Android: `AndroidManifest.xml` intent filters; iOS: `Associated Domains` entitlement + `apple-app-site-association`). Handle incoming links in a central router, not scattered across components.
- **Background task limits.** Mobile OSes aggressively kill background work. Use platform-sanctioned APIs (WorkManager on Android, BGTaskScheduler on iOS) for deferred tasks. Never assume a timer or interval survives backgrounding.

## Anti-patterns to avoid

- **Requesting all permissions on first launch.** Users deny blanket permission requests reflexively. The app then cannot use the feature at all, and recovering from a denied permission requires sending the user to system settings.
- **Calling native APIs before platform ready.** Invoking Capacitor plugins before `Plugins` are registered, or RN native modules before bridge init, throws cryptic errors or silently no-ops.
- **Swallowing native errors.** `try { await Camera.getPhoto() } catch {}` hides critical failures (no camera hardware, storage full, permission revoked). Always handle and surface.
- **Hardcoding platform paths.** `/data/data/com.app/files/` will not work on every Android device or version. Use platform APIs to resolve paths (`getFilesDir()`, `FileManager.default.urls`).
- **UI blocking on native calls.** Synchronous bridges (deprecated in most frameworks) freeze the UI thread. All native interactions must be async with loading indicators.
- **Mixing plugin versions across a monorepo.** If `@capacitor/camera` is v5 in one package and v6 in another, the native binary can only link one. Pin uniformly.

## When to deviate

- **Single-platform apps.** A pure Android-native or iOS-native app can skip cross-platform guards entirely — there is no second platform to condition on.
- **Kiosk / locked-down devices.** When the app is the only thing running on the device (MDM-managed, single-app mode), aggressive permission requests at startup are acceptable because the user has no choice context anyway.
- **Development / debug builds.** Requesting all permissions upfront in a debug build to reduce friction during development is acceptable. Gate with `__DEV__` or equivalent.

## References

- [Capacitor docs — Plugin API](https://capacitorjs.com/docs/plugins).
- [React Native docs — Native Modules](https://reactnative.dev/docs/native-modules-intro).
- [Flutter docs — Platform channels](https://docs.flutter.dev/platform-integration/platform-channels).
- [Android docs — Permissions best practices](https://developer.android.com/training/permissions/usage-notes).
- [Apple docs — Requesting access to protected resources](https://developer.apple.com/documentation/uikit/protecting_the_user_s_privacy).
- [`touch-and-viewport.md`](touch-and-viewport.md) — viewport and safe-area patterns that depend on native plugin presence.
- [`app-store-readiness.md`](app-store-readiness.md) — store-readiness requires correct permission declarations.

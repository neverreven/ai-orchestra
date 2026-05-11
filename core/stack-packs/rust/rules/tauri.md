# Tauri v2 patterns

## When this applies

Apply when working on a Tauri v2 desktop or mobile application. Adapter glob: `src-tauri/**/*.rs`, `src-tauri/tauri.conf.json`, `src-tauri/capabilities/**`. Consult alongside the JS/TS pack rules for the frontend WebView code.

Tauri v2 is a Rust framework for building desktop and mobile apps with a web frontend. The Rust backend (the "core" in Tauri terms) handles system-level operations; the frontend (React, Vue, Svelte, etc.) runs in a WebView. The IPC bridge between them is the critical surface this rule covers.

## Patterns to follow

### Commands (IPC)

- **Commands are the API between frontend and backend.** Define them with `#[tauri::command]` and register them in `Builder::invoke_handler(tauri::generate_handler![...])`. Each command is a function the frontend can call via `invoke('command_name', { arg: value })`.
- **Commands are async by default in v2.** Return `Result<T, String>` or `Result<T, CustomError>` where `CustomError` implements `serde::Serialize`. The frontend receives the `Ok` value or the serialised error.
- **Keep commands thin.** A command parses input, calls a service function, and returns the result. Business logic belongs in plain Rust modules, not in command functions — this makes the logic testable without Tauri's runtime.
- **Typed arguments, not `serde_json::Value`.** Each command parameter should have a concrete type that derives `Deserialize`. Accepting raw JSON defeats type safety and moves validation to runtime.
- **Return types derive `Serialize`.** The frontend receives the return value as JSON. Use structs with `#[serde(rename_all = "camelCase")]` to match JavaScript naming conventions.

### State management

- **`tauri::State<T>` for shared app state.** Register state via `Builder::manage(MyState::default())`. Access it in commands with `state: tauri::State<'_, MyState>`. Tauri manages the lifetime; you get an immutable reference.
- **Interior mutability for mutable state.** Since `State<T>` gives `&T`, wrap mutable fields in `Mutex<T>` or `RwLock<T>`: `struct AppState { db: Mutex<Database> }`. Lock briefly; never hold a lock across `.await` (use `tokio::sync::Mutex` if you must).
- **One state struct or a few domain-scoped structs.** Don't register 20 separate state objects. Group related state into structs: `AppState`, `AuthState`, `DbPool`.

### Plugins

- **Use Tauri's official plugins before rolling your own.** `@tauri-apps/plugin-sql`, `plugin-store`, `plugin-shell`, `plugin-dialog`, `plugin-fs` — these are maintained, security-reviewed, and handle platform differences.
- **Plugin permissions in `capabilities/`.** Tauri v2 uses a capability-based security model. Each plugin's permissions must be declared in `src-tauri/capabilities/default.json` (or per-window capability files). Don't use `"permissions": ["*"]` — declare the minimum set.
- **Custom plugins: `tauri::plugin::Builder`.** When you need platform-specific Rust functionality that no official plugin provides, create a plugin. Implement `tauri::plugin::Plugin` for the Rust side; expose commands the frontend can invoke.

### Security

- **Capabilities are the security boundary.** Every IPC command and plugin API the frontend can call must be explicitly allowed in a capability file. An unlisted command is inaccessible from the WebView.
- **CSP in `tauri.conf.json`.** Set a Content Security Policy that restricts the WebView's ability to load external scripts, connect to arbitrary origins, and inline scripts. Default to strict; loosen only with justification.
- **No `shell:allow-execute` without audit.** The shell plugin's `execute` permission lets the frontend run arbitrary system commands. This is a remote-code-execution surface if the frontend is ever compromised. Gate it behind a custom command that validates the input.
- **`allowlist` replaced by `capabilities` in v2.** If migrating from Tauri v1, the `tauri.conf.json` `allowlist` section is replaced by `src-tauri/capabilities/`. Don't leave v1 allowlist entries; they're ignored and misleading.
- **Validate all IPC input on the Rust side.** The frontend is untrusted (it runs in a WebView that could be manipulated). Every command that performs file I/O, database access, or system operations must validate paths, IDs, and permissions in Rust, not rely on frontend guards.

### Configuration

- **`tauri.conf.json` is the single source of truth.** Window configuration (size, title, decorations, URL), bundle settings (identifier, icons, signing), and plugin permissions all live here. Don't hardcode values in Rust that belong in the config.
- **Platform-specific config via `tauri.conf.json` overrides.** Use `"bundle": { "windows": { ... }, "macOS": { ... } }` for platform-specific settings rather than `cfg!(target_os)` conditionals in Rust for things that are config-level.
- **Signing: never commit signing keys.** Tauri's updater and bundle signing use private keys. These belong in CI secrets, not in the repo. The `TAURI_SIGNING_PRIVATE_KEY` environment variable feeds the build.

### Window management

- **Multi-window: create windows via Tauri's API, not raw WebView.** `app.create_window("label", ...)` ensures Tauri's IPC bridge is wired to the new window. Creating raw WebView instances bypasses security.
- **Window labels are unique identifiers.** Don't create two windows with the same label — Tauri panics. Use dynamic labels for multi-instance windows (`format!("editor-{}", id)`).
- **System tray: `tauri::tray::TrayIconBuilder`.** Register the tray in the `setup` hook or as a plugin. Keep tray logic in a dedicated module — it gets complex with context menus and event handlers.

### Build and distribution

- **`cargo tauri build` for production.** Don't use `cargo build --release` directly — `tauri build` handles the WebView bundling, icon generation, installer creation, and code signing.
- **CI/CD: `tauri-action` GitHub Action.** Cross-platform builds (Windows NSIS/MSI, macOS DMG, Linux AppImage/deb) in one workflow. Pin the action version.
- **Auto-updater: `tauri::updater`.** Use Tauri's built-in updater with a signed update manifest. The manifest URL in `tauri.conf.json` points to a server (or GitHub Releases). Never skip signature verification.

## Anti-patterns to avoid

- **Business logic in `#[tauri::command]` functions.** Commands should be 5–15 lines: parse, call service, return. Testable logic belongs in plain Rust modules.
- **Exposing file-system paths from the frontend.** The frontend sends a user-chosen path; the backend opens it without validation. This is a path-traversal vulnerability. Validate that the path is within the user's expected directory.
- **`permissions: ["*"]` in capabilities.** Grants the frontend access to everything. Use the minimum required permissions for each window's capability.
- **Blocking the main thread in `setup`.** The `setup` hook runs on Tauri's main thread. Long-running initialisation (database migrations, network calls) should be spawned into an async task. Otherwise the window takes seconds to appear.
- **Ignoring `AppHandle` vs `Window`.** `AppHandle` is app-global; `Window` is per-window. Don't store `Window` handles in global state — they become invalid when the window closes. Use `AppHandle` to access windows dynamically.
- **Hardcoded platform checks.** `#[cfg(target_os = "windows")]` is fine for platform-specific code paths. But `if std::env::consts::OS == "windows"` is a runtime check that Rust can evaluate at compile time — prefer `#[cfg()]`.

## References

- `ownership-and-borrowing.md` — `State<T>` borrowing patterns
- `async-tokio.md` — Tauri commands are async; Tokio patterns apply
- `error-handling.md` — command error types must be `Serialize`-able
- JS/TS pack `react.md` — frontend patterns for the WebView side

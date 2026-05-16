# Rust — skill addenda

> Per-skill additions when a universal skill is executed in a Rust project. The skill's core process is unchanged; the addenda inject Rust-specific checks, patterns, and vocabulary.

## code-review

When reviewing Rust code, add these checks to the universal code-review process:

- **`unsafe` blocks.** Every `unsafe` block must have a `// SAFETY:` comment explaining why the invariant holds. If the comment is missing or unconvincing, flag it. Count the total `unsafe` surface area; a growing count without justification is a trend to surface.
- **`.unwrap()` and `.expect()` outside tests.** In library code, `.unwrap()` is almost always a bug. In application code, `.expect("reason")` is acceptable when the reason proves the unwrap is infallible. Bare `.unwrap()` with no context is always flaggable.
- **Clippy compliance.** The project should have `#![warn(clippy::all, clippy::pedantic)]` (or a `clippy.toml` equivalent). Clippy findings are not noise — they catch real bugs (e.g., `clippy::manual_map`, `clippy::needless_borrow`).
- **`#[must_use]` on functions that return `Result` or meaningful values.** The compiler warns when a `#[must_use]` return is ignored. Public functions returning `Result<T, E>` should carry the attribute (Rust already applies it to `Result` itself; the attribute on the function adds a custom message).
- **Dependency audit with `cargo audit`.** Check for known vulnerabilities in the dependency tree. Surface any advisory.
- **Feature flags coherence.** If the crate uses `[features]` in `Cargo.toml`, verify that the default feature set is minimal and that optional features don't introduce unexpected dependencies.

## security-baseline

When running the security baseline on a Rust project:

- **`unsafe` census.** List every `unsafe` block and its justification. Flag unjustified blocks as `high` severity.
- **FFI boundaries.** Check all `extern "C"` functions and `#[no_mangle]` exports. These are the surfaces where Rust's safety guarantees don't apply.
- **Deserialization surface.** `serde::Deserialize` on user-facing types is a trust boundary. Check for: unbounded `Vec` / `String` fields (denial-of-service via memory exhaustion), `#[serde(default)]` on security-sensitive fields (attacker omits the field and gets a permissive default), and `#[serde(deny_unknown_fields)]` on API input types (to catch unexpected fields early).
- **Cryptography.** Check for `ring`, `rustls`, `rcgen`, or `openssl` usage. Prefer `ring` or `rustls` (pure Rust, audited) over `openssl-sys` (C bindings, larger attack surface). Flag any hand-rolled crypto.

## dependency-audit

When auditing Rust dependencies:

- **`cargo audit` is the primary tool.** Run it and report all advisories.
- **`cargo deny` for license and duplicate detection.** `cargo deny check licenses` verifies no dependency introduces a viral license. `cargo deny check bans` flags duplicate crate versions.
- **`cargo tree -d` for duplicate dependencies.** Multiple versions of the same crate inflate the binary and increase the auditable surface. Surface duplicates and suggest resolution (update, pin, or `[patch]`).
- **Build-time vs runtime.** `[build-dependencies]` and `proc-macro` crates run at compile time with the developer's full permissions. An advisory on a build-time crate is as serious as one on a runtime crate.

## performance-audit

When auditing Rust performance:

- **Allocation profile.** Rust's zero-cost abstractions rely on stack allocation. Look for unnecessary `Box`, `Vec::clone`, and `String::clone` in hot paths. `cargo flamegraph` is the standard profiling tool.
- **`Arc` contention.** `Arc::clone` is cheap; `Arc` + `Mutex` under contention is not. If a shared `Arc<Mutex<T>>` is accessed in a tight loop from multiple threads, consider sharding, lock-free structures (`crossbeam`), or channels.
- **Async task overhead.** Spawning thousands of short-lived `tokio::spawn` tasks has overhead (scheduling, waking). For batch processing, consider `FuturesUnordered` or `JoinSet` with bounded concurrency.

## deployment-checklist

When running the deployment checklist for a Rust binary / Tauri app:

- **Release profile optimisations.** `[profile.release]` should include `opt-level = 3` (or `"z"` for size-optimised), `lto = true` (link-time optimisation), `strip = "symbols"` (smaller binary). Tauri projects should also set `codegen-units = 1` for maximum optimisation.
- **Target triple explicit.** CI should build with an explicit `--target` (e.g., `x86_64-pc-windows-msvc`, `aarch64-apple-darwin`). Relying on the host default is fragile when cross-compiling.
- **`cargo audit` in CI.** The deployment pipeline should fail if `cargo audit` finds active advisories.
- **Code signing.** Tauri apps must be code-signed for distribution. Verify that the signing key is in CI secrets, not in the repo. macOS requires notarisation; Windows requires an EV or standard certificate.

## References

- [`../../skills/code/code-review/SKILL.md`](../../skills/code/code-review/SKILL.md)
- [`../../skills/quality/security-baseline/SKILL.md`](../../skills/quality/security-baseline/SKILL.md)
- [`../../skills/code/dependency-audit/SKILL.md`](../../skills/code/dependency-audit/SKILL.md)
- [`../../skills/quality/performance-audit/SKILL.md`](../../skills/quality/performance-audit/SKILL.md)
- [`../../skills/platform/deployment-checklist/SKILL.md`](../../skills/platform/deployment-checklist/SKILL.md)

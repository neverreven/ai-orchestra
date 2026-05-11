# Rust — role addenda

> Role-level additions when universal roles are applied to a Rust project. Each section augments a universal role with Rust-specific non-negotiables.

## backend-engineer

When the project has Rust backend code (Axum, Actix-web, Rocket, or any HTTP service):

- **Ownership-driven API design.** Request handlers own the request data; response builders own the response data. Avoid shared mutable state between handlers — use `Arc<T>` with interior mutability or channel-based architectures.
- **`tower` middleware for cross-cutting concerns.** Axum uses `tower::Service` and `tower::Layer` for middleware. Compression, tracing, rate-limiting, CORS — all are tower layers. Don't re-implement middleware inside handlers.
- **Connection pooling with `sqlx` or `diesel`.** Database connections are expensive. Use a pool (e.g., `sqlx::PgPool`) managed as Tauri/Axum/Actix state. Size the pool to `max_connections / num_workers`.
- **Structured logging with `tracing`.** The `tracing` crate is the Rust ecosystem standard. Use `tracing::instrument` on async functions for automatic span creation. Output structured JSON in production (`tracing-subscriber` with `json` layer).

## frontend-engineer

When the project has a Tauri frontend (WebView-based):

- **The Rust side is the system boundary, not the UI layer.** Frontend engineers working on Tauri need to understand that Rust commands are the API — treat them like REST endpoints. Validate inputs, handle errors, return typed responses.
- **IPC serialisation cost.** Every `invoke` call serialises arguments as JSON, sends them across the IPC bridge, deserialises in Rust, processes, serialises the result, and returns. Batch related operations into a single command rather than making N sequential `invoke` calls.
- **Window management is Rust-side.** Creating, closing, and configuring windows happens via Tauri's Rust API. The frontend requests actions; the Rust side performs them.

## devops-sre

When the project's CI/CD involves Rust builds:

- **Cache `target/` and the Cargo registry.** Rust builds are slow from scratch (minutes for a medium crate graph). CI should cache `~/.cargo/registry`, `~/.cargo/git`, and `target/`. Use `actions/cache` or equivalent.
- **Separate `check`, `clippy`, `test`, and `build` steps.** `cargo check` catches compilation errors fast; `cargo clippy` catches lint issues; `cargo test` runs the suite; `cargo build --release` produces the binary. Running them as separate CI steps gives granular failure signals.
- **Cross-compilation for distribution.** Tauri apps need Windows, macOS, and Linux builds. Use `cross` (Docker-based cross-compiler) or GitHub Actions matrix with per-OS runners.
- **`cargo deny` in CI.** License compliance and duplicate detection should fail the build before it reaches production.

## qa-engineer

When the project has Rust code to test:

- **`#[test]` is the built-in framework.** No external test runner needed for unit tests. `cargo test` runs everything annotated with `#[test]` or `#[tokio::test]`.
- **Integration tests in `tests/`.** Files in the `tests/` directory at the crate root are compiled as separate crates. They test the public API. Unit tests (`#[cfg(test)]` modules inside `src/`) test private internals.
- **Property-based testing with `proptest`.** For functions with large input spaces (parsers, serialisers, validators), `proptest` generates random inputs and verifies invariants — more coverage per test.
- **`cargo tarpaulin` or `cargo llvm-cov` for coverage.** Coverage tooling in Rust is less mature than in JS/Python but sufficient. Target 70%+ line coverage for application crates.

## References

- [`../../roles/backend-engineer.md`](../../roles/backend-engineer.md)
- [`../../roles/frontend-engineer.md`](../../roles/frontend-engineer.md)
- [`../../roles/devops-sre.md`](../../roles/devops-sre.md)
- [`../../roles/qa-engineer.md`](../../roles/qa-engineer.md)

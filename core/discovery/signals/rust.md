# Signal: rust (Rust)

> Full detection with stack pack content.

**Stack id:** `rust`
**Stack pack:** [`core/stack-packs/rust/`](../../stack-packs/rust/_overview.md) — ownership, error handling, async/Tokio, Tauri v2 patterns, skill addenda, role addenda.

## Strong signals (weight 3 each)

| Signal | Match | Notes |
|--------|-------|-------|
| `Cargo.toml` exists at root | File presence | Definitive Cargo project marker. |

## Medium signals (weight 2 each)

| Signal | Match |
|--------|-------|
| `Cargo.lock` exists at root | Cargo lockfile. |
| `src/main.rs` or `src/lib.rs` present | Conventional Cargo project layout. |
| `target/` directory present | Cargo build output (excluded from scans). |

## Weak signals (weight 1 each)

| Signal | Match |
|--------|-------|
| Any `*.rs` file in tracked code | Excluding `target/`. |
| `rust-toolchain.toml` or `rust-toolchain` present | Toolchain pin. |
| `.cargo/config.toml` present | Cargo configuration. |
| `clippy.toml` present | Clippy lint config. |

## Detected frameworks (informational)

| Framework | Match |
|-----------|-------|
| `axum` | `axum` in `[dependencies]`. |
| `actix-web` | `actix-web` in `[dependencies]`. |
| `rocket` | `rocket` in `[dependencies]`. |
| `tokio` | `tokio` in `[dependencies]`. |
| `serde` | `serde` in `[dependencies]`. |
| `tauri` | `tauri` in `[dependencies]` (raises desktop relevance). |
| `bevy` | `bevy` in `[dependencies]` (game / engine). |
| `wasm-bindgen` | `wasm-bindgen` in `[dependencies]` (raises JS/TS interop relevance). |

## Test framework detection

Rust's standard library provides `#[test]`. Detect it by presence of `#[test]` annotations or `#[cfg(test)]` modules.

## Notes

A Rust project receives the `rust` stack pack (ownership, errors, async, Tauri). Tauri-flavoured Rust often coexists with a JS/TS frontend; in that case the `js-ts` stack pack is also installed. Rules are scoped by glob — no overlap between `*.rs` and `*.{js,ts,jsx,tsx}`.

## References

- [DETECTION.md](../DETECTION.md) — overall probe procedure.

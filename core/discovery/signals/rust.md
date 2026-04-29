# Signal: rust (Rust)

> Generic detection in v1. Stack pack content arrives in v1.1+.

**Stack id:** `rust`
**Stack pack:** _none in v1; `core/stack-packs/rust/` reserved for v1.1+_

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

In v1, a Rust project receives the universal core. Tauri-flavoured Rust often coexists with a JS/TS frontend; in that case the `js-ts` stack pack is also installed.

## References

- [DETECTION.md](../DETECTION.md) — overall probe procedure.

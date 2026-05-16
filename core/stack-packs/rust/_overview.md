# Rust — stack pack

## Identity

- **Pack id:** `rust`
- **Pack version:** `1.0.0`
- **Compatible orchestra versions:** `1.4.x`
- **Primary detection signal:** [`../../discovery/signals/rust.md`](../../discovery/signals/rust.md)
- **Frameworks covered:** Rust (general), Tokio async runtime, Axum / Actix-web / Rocket web frameworks, Serde serialisation, Tauri v2 desktop/mobile apps, WASM / wasm-bindgen

## What this pack adds

Rust is unlike every other first-class stack in the orchestra. The compiler enforces ownership, borrowing, and lifetimes at compile time — bugs that crash Python or segfault C simply don't compile. The pack's job is therefore different: it captures the *idiomatic* patterns that the compiler allows but that the community and the ecosystem have converged on as best practice. It also covers the async model (Tokio), error handling (the `?` operator, `thiserror`, `anyhow`), and the Tauri v2 desktop/mobile integration pattern that coexists with a JS/TS frontend.

Projects that use Tauri will typically also have the `js-ts` stack pack installed for the frontend. The two packs layer without conflict — Rust rules apply to `*.rs` files; JS/TS rules apply to `*.{js,jsx,ts,tsx}`.

## File index

- [`_overview.md`](_overview.md) — this file (pack identity and layering).
- [`rules/ownership-and-borrowing.md`](rules/ownership-and-borrowing.md) — ownership, borrowing, lifetimes, and clone discipline.
- [`rules/error-handling.md`](rules/error-handling.md) — error types, the `?` operator, `thiserror` vs `anyhow`, panic policy.
- [`rules/async-tokio.md`](rules/async-tokio.md) — async Rust with Tokio: spawning, cancellation, blocking, channels.
- [`rules/tauri.md`](rules/tauri.md) — Tauri v2 patterns: commands, state, plugins, IPC bridge, security.
- [`skills.md`](skills.md) — Rust-specific addenda for universal skills.
- [`roles.md`](roles.md) — Rust-specific addenda for universal roles.

## Detection

The pack is selected when [`../../discovery/signals/rust.md`](../../discovery/signals/rust.md) reports a positive match. The signal is positive when `Cargo.toml` exists at the project root or `src/main.rs` / `src/lib.rs` is present. Framework-level detection (Tokio, Axum, Tauri, etc.) is performed by inspecting `[dependencies]` in `Cargo.toml`.

## Layering rules

This pack follows the universal layering rules in [`../_overview.md`](../_overview.md) §3:

- Roles in [`../../roles/`](../../roles/) are unchanged. [`roles.md`](roles.md) supplies Rust-specific non-negotiables. Rust engineers combine traits of backend, systems, and (when Tauri is involved) frontend engineers. The role addenda clarify which universal role patterns bend to fit Rust's ownership model.
- Skills in [`../../skills/`](../../skills/) are unchanged. [`skills.md`](skills.md) lists per-skill addenda (e.g., code review for Rust has additional checks around `unsafe`, `unwrap`, and lifetime annotations).
- Each [`rules/<topic>.md`](rules/) is rendered with the file-glob declared in `## When this applies`.

When a project is a Tauri app with a JS/TS frontend, both the `rust` and `js-ts` packs are installed. Rules are scoped by glob — no overlap.

## What this pack does NOT include

- Embedded systems / no_std patterns. The pack assumes std-capable Rust. Embedded Rust (cortex-m, RTIC, embassy) is tracked for a future pack.
- Game engine patterns (Bevy, macroquad). Detected by signals but not first-class in v1.
- WASM deep patterns beyond basic wasm-bindgen. Full WASM worker patterns tracked for v1.x.
- Specific web framework opinions (Axum vs Actix vs Rocket). Patterns reference web-server traits generically; framework-specific guidance is a future depth rule.
- Nightly-only features. The pack assumes stable Rust (latest stable channel).
- Project-specific code or domain-specific crate opinions.

## References

- [`../_overview.md`](../_overview.md) — stack-packs framework overview.
- [`../_schema.md`](../_schema.md) — stack-pack file shape this pack conforms to.
- [`../../discovery/signals/rust.md`](../../discovery/signals/rust.md) — detection signals that select this pack.
- [`../../roles/backend-engineer.md`](../../roles/backend-engineer.md) — universal role that [`roles.md`](roles.md) extends.
- [`../../roles/frontend-engineer.md`](../../roles/frontend-engineer.md) — universal role that [`roles.md`](roles.md) extends (Tauri frontend).
- [`../../roles/devops-sre.md`](../../roles/devops-sre.md) — universal role that [`roles.md`](roles.md) extends (CI/CD, release engineering).
- [`../../skills/code/code-review/SKILL.md`](../../skills/code/code-review/SKILL.md) — universal skill that [`skills.md`](skills.md) extends.
- [`../../skills/quality/security-baseline/SKILL.md`](../../skills/quality/security-baseline/SKILL.md) — universal skill that [`skills.md`](skills.md) extends.

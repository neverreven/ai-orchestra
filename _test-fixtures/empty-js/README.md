# Fixture: empty-js

A fresh React + TypeScript + Vite project with **zero existing agentic infrastructure**. The cleanest possible target for the orchestra: nothing to preserve, no conflicts to resolve, just a full universal-core install with the `js-ts` stack pack layered on top.

## What this fixture exercises

- **Detection:**
  - `js-ts` stack at high confidence (strong signals: `package.json` + `tsconfig.json` present).
  - Frameworks: `react`, `vite` (medium signals: deps + config files).
  - Test framework: none in this fixture (the dependency table is intentionally minimal).
- **Existing infra:** none.
- **Install path:** the simple, no-conflict path. Every adapter action is `create` (no `extend-section`, no `suffix-rename`).
- **Stack pack layering:** `core/stack-packs/js-ts/` rules + skills + roles addenda are applied per [`../../core/stack-packs/_overview.md`](../../core/stack-packs/_overview.md) §3.
- **Adapter coverage:** every v1 adapter (Cursor, Claude Code, Codex, VS Code) should produce a sensible plan for this fixture.

## Source files

| File | Purpose |
|------|---------|
| [`package.json`](package.json) | Strong `js-ts` signal; declares React + Vite as dependencies. |
| [`tsconfig.json`](tsconfig.json) | Strong `js-ts` signal; TypeScript project marker. |
| [`vite.config.ts`](vite.config.ts) | Medium signal: Vite config file. |
| [`index.html`](index.html) | Vite entry HTML. |
| [`src/main.tsx`](src/main.tsx) | TypeScript+React entry. |
| [`src/App.tsx`](src/App.tsx) | Minimal React component. |

The fixture has no `node_modules/`, no lockfile, no real source-of-truth — just enough to make the discovery probe certain about the stack.

## What is NOT in this fixture (deliberately)

- No prior `AGENTS.md`, `CLAUDE.md`, or `.cursor/rules/`. (The `ongoing-python-web` fixture covers existing-infra preservation.)
- No `package-lock.json` / `pnpm-lock.yaml` — the lockfile-presence signal is intentionally absent so the fixture stays minimal. Detection should still cross threshold without it.
- No test framework dependency. The `jest` / `vitest` skills exist in the universal core; the install plan should still register them as available, but the test-framework detection field should be empty.
- No CI workflow.
- No `.gitignore`. The fixture's hosting inside the host project means git ignores are inherited from the parent.
- No real dependency versions in `package.json`. Versions are placeholder strings (`"^99.0.0"`) so the fixture cannot be confused for a runnable project.

## Expected outcome

See [`EXPECTED.md`](EXPECTED.md) for the contract.

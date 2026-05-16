# JS/TS web — stack pack

## Identity

- **Pack id:** `js-ts`
- **Pack version:** `1.1.0`
- **Compatible orchestra versions:** `1.0.x`
- **Primary detection signal:** [`../../discovery/signals/js-ts.md`](../../discovery/signals/js-ts.md)
- **Frameworks covered:** React, Vue, Svelte, Next, Vite, Node, plain JavaScript, TypeScript

## What this pack adds

JS/TS web is the broadest first-class pack in v1. It provides patterns, anti-patterns, and skill addenda for the most common front-end, full-stack, and Node-server combinations: React with hooks and state libraries, Vue 3 with the Composition API, Svelte / SvelteKit, Next.js, Vite-built single-page apps, and Node-side HTTP services. TypeScript guidance applies orthogonally — most projects in this pack's scope use TS in 2026.

The pack does not pick a side between framework variants of the same family. It captures the patterns most projects benefit from regardless of state-management library or styling approach.

## File index

- [`_overview.md`](_overview.md) — this file (pack identity and layering).
- [`rules/react.md`](rules/react.md) — React component, hook, and state patterns.
- [`rules/typescript.md`](rules/typescript.md) — TypeScript discipline (strict mode, narrowing, generics).
- [`rules/vite.md`](rules/vite.md) — Vite build, config, and dev-server conventions.
- [`rules/node-server.md`](rules/node-server.md) — Node HTTP service patterns (Express / Fastify / Hono).
- [`rules/next-rsc.md`](rules/next-rsc.md) — Next.js App Router and React Server Component patterns.
- [`rules/node-api.md`](rules/node-api.md) — Node.js API service depth rules (routing, async, security, observability).
- [`rules/testing.md`](rules/testing.md) — JS/TS testing patterns (structure, mocks, coverage, E2E).
- [`skills.md`](skills.md) — JS/TS-specific addenda for universal skills.
- [`roles.md`](roles.md) — JS/TS-specific addenda for universal roles.

## Detection

The pack is selected when [`../../discovery/signals/js-ts.md`](../../discovery/signals/js-ts.md) reports a positive match. The signal is positive when any of the following are present in the project root: `package.json`, `tsconfig.json`, `pnpm-lock.yaml` / `yarn.lock` / `package-lock.json`, or a `vite.config.{js,ts,mjs}`.

## Layering rules

This pack follows the universal layering rules in [`../_overview.md`](../_overview.md) §3 without exception:

- Roles in [`../../roles/`](../../roles/) are unchanged. [`roles.md`](roles.md) supplies stack-specific non-negotiables that adapters render alongside the universal role content.
- Skills in [`../../skills/`](../../skills/) are unchanged. [`skills.md`](skills.md) lists per-skill addenda the agent applies when running a universal skill against JS/TS code.
- Each [`rules/<topic>.md`](rules/) is rendered into the IDE's rule location with the file-glob declared in the rule's `## When this applies` section as the rule's activation condition (Cursor: `globs:` frontmatter; other adapters: prose in the consolidated context file).

When a project legitimately mixes frameworks (e.g., React in the SPA, Vue in a legacy admin), all rules apply to their matching globs. The agent's job is to scope its actions to the right rule per file.

## What this pack does NOT include

- Build-system documentation for esbuild, Webpack, Rollup as primary bundlers (Vite is the v1 reference build).
- React Native, Expo, or other mobile-React variants — those are tracked under the future `mobile` pack.
- Specific state-management library opinions (Redux vs Zustand vs Jotai vs MobX). Patterns reference state shape and selectors generically.
- Specific styling approaches (CSS-in-JS vs CSS Modules vs Tailwind). Where a pattern depends on a styling choice, both flavors are mentioned.
- Specific testing-framework opinions on tool selection (Vitest vs Jest vs node:test). `testing.md` covers framework-agnostic patterns that apply regardless of tool choice.
- Project-specific code, scaffolding generators, or code-mod scripts.

## References

- [`../_overview.md`](../_overview.md) — stack-packs framework overview.
- [`../_schema.md`](../_schema.md) — stack-pack file shape this pack conforms to.
- [`../../discovery/signals/js-ts.md`](../../discovery/signals/js-ts.md) — detection signals that select this pack.
- [`../../roles/frontend-engineer.md`](../../roles/frontend-engineer.md) — universal role that [`roles.md`](roles.md) extends.
- [`../../roles/backend-engineer.md`](../../roles/backend-engineer.md) — universal role that [`roles.md`](roles.md) extends.
- [`../../skills/code/code-review/SKILL.md`](../../skills/code/code-review/SKILL.md) — universal skill that [`skills.md`](skills.md) extends.
- [`../../skills/quality/accessibility-audit/SKILL.md`](../../skills/quality/accessibility-audit/SKILL.md) — universal skill that [`skills.md`](skills.md) extends.
- [`../../skills/quality/performance-audit/SKILL.md`](../../skills/quality/performance-audit/SKILL.md) — universal skill that [`skills.md`](skills.md) extends.
- [`../../skills/code/dependency-audit/SKILL.md`](../../skills/code/dependency-audit/SKILL.md) — universal skill that [`skills.md`](skills.md) extends.

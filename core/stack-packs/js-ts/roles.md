# js-ts — roles addenda

## Layering principle

These addenda are added on top of the universal roles under [`../../roles/`](../../roles/). They do not replace the universal role description; they add stack-specific non-negotiables, primary outputs, and skill-set extensions that apply when the project's source is JavaScript or TypeScript. The agent uses the universal role file to understand the role's mission and triggers, then consults this file to apply stack-specific expectations.

If a universal role is not listed here, use it as-is.

## Per-role addenda

### frontend-engineer

Extends [`../../roles/frontend-engineer.md`](../../roles/frontend-engineer.md).

Stack-specific non-negotiables:
- **Hooks lint clean.** `eslint-plugin-react-hooks` rules `rules-of-hooks` and `exhaustive-deps` are not bypassed. Disabling either requires an inline comment explaining why.
- **TypeScript strict.** New code is fully typed; `any` requires justification. See [`rules/typescript.md`](rules/typescript.md).
- **Accessibility-first JSX.** Semantic elements over generic `<div>`s. See [`skills.md#accessibility-audit`](skills.md#accessibility-audit) and [`rules/react.md`](rules/react.md).
- **Style isolation.** Whatever the project's styling system (CSS Modules, CSS-in-JS, utility CSS), styles are co-located with their component and do not leak globally without explicit intent.
- **Bundle awareness.** Every new dependency is justified in terms of bundle size impact. Heavy deps are lazy-loaded.

Primary outputs (additional, beyond universal):
- React/Vue/Svelte component contracts (props typed, events documented).
- Custom hooks documented with `@example` JSDoc when reusable across the app.
- Storybook / Histoire / equivalent story for any reusable component.

Skill set additions:
- Strong familiarity with [`../../skills/quality/accessibility-audit/SKILL.md`](../../skills/quality/accessibility-audit/SKILL.md) — addenda in [`skills.md`](skills.md).
- Strong familiarity with [`../../skills/quality/performance-audit/SKILL.md`](../../skills/quality/performance-audit/SKILL.md) — addenda in [`skills.md`](skills.md).
- Comfort reading the production bundle output and tracing a regression to its source (sourcemaps, profiler).

### backend-engineer

Extends [`../../roles/backend-engineer.md`](../../roles/backend-engineer.md).

Stack-specific non-negotiables:
- **Twelve-factor config.** No hard-coded URLs, secrets, or feature flags. See [`rules/node-server.md`](rules/node-server.md).
- **Typed errors at module boundaries.** Errors crossing async boundaries carry a stable code; HTTP 5xx without details is a bug, not a design.
- **Structured logging.** JSON logs from a real logger, not `console.log`. Request id propagated through async context (AsyncLocalStorage).
- **Validated inputs.** Every external input parsed and validated before use. Schema library (Zod, valibot, arktype) preferred over manual `if (typeof === ...)` checks.
- **Graceful shutdown.** Production process handles SIGTERM, drains in-flight requests, then exits.

Primary outputs (additional):
- OpenAPI / typed-client SDK from the schema source of truth (Zod → OpenAPI, ts-rest, tRPC).
- Per-route input/output types exported from the server package.
- Health-check endpoints (`/healthz`, `/readyz`).

Skill set additions:
- Comfort with [`../../skills/code/api-design-review/SKILL.md`](../../skills/code/api-design-review/SKILL.md) — REST and (where used) GraphQL conventions.
- Comfort with [`../../skills/code/db-migration-review/SKILL.md`](../../skills/code/db-migration-review/SKILL.md) — Prisma, Knex, Drizzle migrations as common JS/TS-stack patterns.
- Familiarity with Node performance profiling — `--prof`, `clinic.js`, V8 heap snapshots.

### qa-engineer

Extends [`../../roles/qa-engineer.md`](../../roles/qa-engineer.md).

Stack-specific non-negotiables:
- **Test runner is fast and isolated.** Vitest / Jest / node:test with parallel execution and isolated environments. Tests must not depend on order.
- **Component tests focus on behaviour.** Testing Library (`@testing-library/react` etc.) over Enzyme. Query by accessible role / label, not by class name or test-id-everywhere.
- **No real network in unit tests.** MSW (Mock Service Worker) or fetch-mock for HTTP. No `localhost` endpoints. End-to-end tests live in their own suite.
- **Snapshot tests minimal.** Only for genuinely structural output (rendered HTML of a stable component). Avoid for free-form prose, error messages, or anything regenerable.
- **End-to-end tests deterministic.** Playwright / Cypress tests with explicit waits on conditions, not on time.

Primary outputs (additional):
- Test plans aligned with [`../../skills/docs/write-test-plan/SKILL.md`](../../skills/docs/write-test-plan/SKILL.md), with stack-specific test types named (unit, component, integration, E2E).
- Coverage reports (Vitest's `--coverage`, Jest's `--coverage`) with target thresholds documented.
- Visual regression baseline (where applicable; Chromatic, Percy).

### devops-sre

Extends [`../../roles/devops-sre.md`](../../roles/devops-sre.md).

Stack-specific non-negotiables:
- **Node version pinned.** `.nvmrc` / `package.json` `engines.node`. CI / Docker / production runtime all use the same.
- **CI install from lockfile.** `npm ci` / `pnpm install --frozen-lockfile` / `yarn install --immutable`. Never `npm install` in CI.
- **Cached node_modules between CI jobs.** Keyed on lockfile hash.
- **Production builds reproducible.** Same input → same output. Confirm with two consecutive builds matching the bundle hash.
- **Build artefacts include source maps.** Either bundled or uploaded to error-tracker.

Primary outputs (additional):
- Dockerfile that copies the lockfile, installs deps, then copies source — for layer-cache friendliness.
- CI pipeline (GitHub Actions / GitLab / etc.) defined in code, not in UI clicks.
- Health-check probes wired in the deployment platform (Kubernetes liveness/readiness, ECS health checks, etc.).

Skill set additions:
- Comfort with [`../../skills/platform/ci-pipeline-audit/SKILL.md`](../../skills/platform/ci-pipeline-audit/SKILL.md) — addenda for npm/pnpm/yarn caching and Node-version matrix.
- Comfort with [`../../skills/platform/deployment-checklist/SKILL.md`](../../skills/platform/deployment-checklist/SKILL.md).

### security-engineer

Extends [`../../roles/security-engineer.md`](../../roles/security-engineer.md).

Stack-specific non-negotiables:
- **CSP enforced in production.** No `'unsafe-inline'` script-src. Nonces or hashes for inline scripts when unavoidable.
- **`npm audit` / `pnpm audit` integrated into CI at high severity.** Build fails on high or critical advisories.
- **Dependency provenance.** No transitive deps from unmaintained / single-author packages on the critical path. Use `socket.dev` or similar for supply-chain checks.
- **Secrets in env or platform secret stores only.** Never in lockfile, source, or container image layers.
- **Auth cookies properly flagged.** `Secure`, `HttpOnly`, `SameSite=Lax` minimum.

Primary outputs (additional):
- CSP header configuration documented and reviewed before each release.
- `.env.example` describing every secret the app reads.
- Threat model that addresses XSS, CSRF, and supply-chain attacks specifically.

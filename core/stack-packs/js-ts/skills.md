# js-ts — skills addenda

## Layering principle

These addenda are added on top of the universal skills under [`../../skills/`](../../skills/). They do not replace the universal procedure; they extend it with stack-specific checklist items, gotchas, and refinements that apply when the project's source is JavaScript or TypeScript. The agent runs the universal skill's process and consults this file to expand any step that has a stack-specific consideration.

If a universal skill is not listed here, run it as-is.

## Per-skill addenda

### code-review

Extends [`../../skills/code/code-review/SKILL.md`](../../skills/code/code-review/SKILL.md).

Stack-specific checks:
- **Hooks deps array completeness.** Run `eslint-plugin-react-hooks` mentally on each `useEffect` / `useMemo` / `useCallback`. Missing dependencies are bugs; over-listed dependencies are not, but trigger unnecessary work.
- **Selector identity.** Redux / Zustand / Jotai selectors that return new object/array references on every call cause re-renders downstream. Memoize with `reselect`, library-equivalent selectors, or `useMemo`.
- **`any` density.** Count `any` usages added by the diff. Any introduction of new `any` requires explicit justification in the PR description.
- **Cross-runtime imports.** Browser code importing Node-only modules (`fs`, `path`, `child_process`) is a build error waiting to happen. Flag and reroute through a runtime abstraction.
- **Mutation of props / Redux state.** React props and Redux state are immutable in their consumer's eyes. Direct assignment is a bug that often passes tests because of reference equality.
- **Error swallowing.** `try { ... } catch {}` (or `catch (e) {}` with no use) hides failures. The reviewer must justify every empty catch.
- **Async without `await` or `.then`.** A function that returns a Promise but is invoked without awaiting it is a fire-and-forget. Sometimes intentional; usually a bug. Flag every instance.

### dependency-audit

Extends [`../../skills/code/dependency-audit/SKILL.md`](../../skills/code/dependency-audit/SKILL.md).

Stack-specific checks:
- **Lockfile in repo.** `package-lock.json`, `pnpm-lock.yaml`, or `yarn.lock` present and committed; CI installs from the lockfile (`npm ci`, `pnpm install --frozen-lockfile`, `yarn install --immutable`).
- **`npm audit` / `pnpm audit` clean at high severity.** Lower severities tracked but not blocking. Document any allow-listed advisories with rationale.
- **No multiple versions of React, React DOM, or the framework.** `npm ls react` (and equivalent) returns one version. Duplicate React causes hook errors and silent breakage.
- **No deprecated packages on the critical path.** `npm outdated` flags deprecation; a deprecated transitive dep is acceptable, a deprecated direct dep is not.
- **Bundle size budget.** Use `vite-plugin-visualizer` or `rollup-plugin-visualizer` to confirm new dependencies fit the bundle budget. Heavy deps (charts, editors, PDF) should be lazy-loaded.

### accessibility-audit

Extends [`../../skills/quality/accessibility-audit/SKILL.md`](../../skills/quality/accessibility-audit/SKILL.md).

Stack-specific checks:
- **Semantic JSX.** `<button>` for actions, `<a href>` for navigation, `<div onClick>` is an anti-pattern (no keyboard, no role).
- **`aria-*` attributes spelled and valued correctly.** TypeScript's React types catch most, but `aria-label` and `aria-labelledby` content is not type-checked — review by hand.
- **Focus management on route change.** SPAs do not re-focus on navigation by default. Either focus the main heading or use a library that does.
- **Keyboard reachability.** Every interactive element reachable via Tab, with a visible focus indicator. Use `:focus-visible` not `:focus` to avoid the click-focus visual.
- **Screen-reader testing of dynamic content.** `aria-live` regions for status updates; `aria-busy` for loading states.

### performance-audit

Extends [`../../skills/quality/performance-audit/SKILL.md`](../../skills/quality/performance-audit/SKILL.md).

Stack-specific checks:
- **Bundle size and code splitting.** Audit the production bundle. Vendor chunks, route-level code splits, lazy components for heavy features.
- **Re-render counts.** Use the React DevTools Profiler on user flows. Identify components that render more than they should and trace the prop/state chain.
- **Long tasks and main-thread blocking.** Chrome DevTools Performance tab. CPU-heavy work belongs in a worker, not in render or event handlers.
- **Hydration mismatches (SSR/SSG).** Server- and client-rendered output must match. Mismatches cause re-render of the entire tree.
- **Image and font loading.** `loading="lazy"`, `decoding="async"`, `fetchpriority="high"` for above-the-fold critical assets, web-font `font-display: swap`.
- **Network waterfall.** API calls in series that could be parallel. `Promise.all` where independence permits.

### security-baseline

Extends [`../../skills/quality/security-baseline/SKILL.md`](../../skills/quality/security-baseline/SKILL.md).

Stack-specific checks:
- **CSP headers configured.** Content-Security-Policy header set in production with no `'unsafe-inline'` for scripts. `'unsafe-inline'` for styles is acceptable but should be tightened over time.
- **`dangerouslySetInnerHTML` usage justified.** Every instance reviewed; sanitiser library used for user content.
- **`target="_blank"` paired with `rel="noopener noreferrer"`.** Otherwise `window.opener` exposes the parent.
- **Cookies set with `Secure`, `HttpOnly`, `SameSite=Lax` (or `Strict`).** Auth cookies in particular.
- **Postmessage / window-message handlers verify origin.** Otherwise any cross-origin window can call into the app.

### secrets-scan

Extends [`../../skills/quality/secrets-scan/SKILL.md`](../../skills/quality/secrets-scan/SKILL.md).

Stack-specific checks:
- **`.env*` files gitignored except `.env.example`.** `.env.example` is committed with placeholder values; real `.env` is local only.
- **No `VITE_`-prefixed secrets.** Anything prefixed `VITE_` ships to the browser. Confirm none are sensitive.
- **No `process.env.*` leaking server-only values to client builds.** Vite / Next clearly delineate; ensure the build doesn't accidentally inline a server secret.

# Vite patterns

## When this applies

Apply when working with `vite.config.{js,ts,mjs}`, `.env*` files at the project root, or any code that depends on Vite-specific features (`import.meta.env`, `import.meta.glob`, public/static asset handling). Adapter glob: `vite.config.{js,ts,mjs}`, `.env*`, `index.html` at project root.

## Patterns to follow

- **One config file, in TypeScript.** `vite.config.ts` (not `.js`). Lint and type-check it like any other source file.
- **Env vars are typed.** Add `vite-env.d.ts` declaring `interface ImportMetaEnv` with every variable the app reads. Refuse to use untyped `import.meta.env.X` access.
- **`VITE_` prefix for client-exposed env vars.** Vite only exposes vars prefixed `VITE_` to client code. Server-side secrets must NOT have this prefix.
- **`base` configured for non-root deployments.** If the app deploys to `https://example.com/myapp/`, set `base: '/myapp/'` in the config. Otherwise asset paths break in production.
- **`server.proxy` for development backend integration.** When the dev server needs to call a backend on a different port, configure `server.proxy` instead of CORS hacks. Production routing is the deployment platform's job.
- **Aliases via `resolve.alias` consistent with `tsconfig`.** If `tsconfig.json` has `paths`, mirror them in `resolve.alias`. Out-of-sync aliases cause "works in IDE, fails in build."
- **`build.rollupOptions.output.manualChunks` for known-large vendor splits.** When the app reliably uses heavy libraries (rich-text editors, code editors, drawing/canvas libraries, flow/diagram libraries, charting), explicitly chunk them so the main bundle stays small. Audit the bundle with `rollup-plugin-visualizer`.
- **Source maps in production.** Generate them and either ship them with the bundle (if size is fine) or upload them to your error-tracking service. Stack traces are useless without maps.
- **`public/` for never-processed assets only.** Files in `public/` are copied as-is. Anything that needs hashing for cache-busting belongs in `src/` and is imported as a module.
- **Sass / PostCSS configured at the Vite layer, not duplicated.** A single source of truth for preprocessor config. Project-specific Sass options go in `vite.config.ts` under `css.preprocessorOptions`.

## Anti-patterns to avoid

- **`process.env.X` in client code.** That is Webpack-era. Use `import.meta.env.X` (or, ideally, a typed wrapper module).
- **`require()` calls anywhere.** Vite is ESM-native. CommonJS interop exists for vendor packages but should never appear in source code.
- **Aliases pointing into `node_modules`.** Causes phantom dependency resolution. If you need to override a vendor module, use Vite's `resolve.alias` carefully and document the reason.
- **Side-effectful imports of CSS in random files.** A CSS import has order-dependent side effects. Centralise in entry files (`main.tsx` or `App.tsx`); do not sprinkle.
- **Disabling the manifest in production builds.** Without `build.manifest`, the deployment platform cannot map hashed asset names back to source. Keep it on.
- **Setting `define` to inline secrets.** `define: { 'process.env.SECRET': JSON.stringify(secret) }` ships secrets to the browser. Never do this for anything not already public.

## When to deviate

- **Library mode (`build.lib`).** When publishing the package as a library rather than an app, several rules invert: no `index.html`, multiple entry points, externals.
- **Monorepo with multiple Vite apps.** Multiple `vite.config.ts` files are fine. Share common config via a workspace utility, not via copy-paste.
- **Migrating from Webpack.** A grace period of mixed patterns is expected. Document the migration plan; rip out the Webpack vestiges incrementally.
- **SSR / SSG via Vite.** Adds its own constraints; defer to the SSR framework's docs (Vike, Astro, SvelteKit, etc.) before applying these rules.

## References

- [Vite docs — Configuration reference](https://vitejs.dev/config/).
- [Vite docs — Env Variables and Modes](https://vitejs.dev/guide/env-and-mode).
- [`react.md`](react.md) — React-specific concerns when paired with Vite.
- [`typescript.md`](typescript.md) — TypeScript discipline that applies to `vite.config.ts`.
- [`../skills.md`](../skills.md) — JS/TS skill addenda; bundle-size and performance checks reference Vite output.
- [`../../../skills/quality/performance-audit/SKILL.md`](../../../skills/quality/performance-audit/SKILL.md) — universal performance audit.
- [`../../../skills/code/dependency-audit/SKILL.md`](../../../skills/code/dependency-audit/SKILL.md) — universal dependency audit (npm/pnpm/yarn).

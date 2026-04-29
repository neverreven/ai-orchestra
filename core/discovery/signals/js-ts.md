# Signal: js-ts (JavaScript / TypeScript web)

> First-class stack in v1. Detects JavaScript and TypeScript codebases, with framework sub-detection for the dominant runtimes and bundlers.

**Stack id:** `js-ts`
**Stack pack:** `core/stack-packs/js-ts/` (PR 6)

## Strong signals (weight 3 each)

| Signal | Match | Notes |
|--------|-------|-------|
| `package.json` exists at root | File presence | Single most reliable indicator. |
| `tsconfig.json` exists at root | File presence | Strong indicator of TypeScript. |

## Medium signals (weight 2 each)

| Signal | Match |
|--------|-------|
| Lockfile present | Any of: `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `bun.lockb`. |
| `node_modules/` directory exists at root | Indicates an installed JS project. |
| Bundler config present | Any of: `vite.config.{js,ts,mjs}`, `webpack.config.{js,ts}`, `rollup.config.{js,ts,mjs}`, `esbuild.config.{js,mjs}`, `parcel.config.{js,json}`. |

## Weak signals (weight 1 each)

| Signal | Match |
|--------|-------|
| Any `*.ts` or `*.tsx` file in tracked code | Excluding `node_modules/`, `dist/`, `build/`. |
| Any `*.js`, `*.jsx`, or `*.mjs` file in tracked code | Same exclusions. |
| `.npmrc` or `.nvmrc` present | Project pins Node version. |
| `.eslintrc.{js,cjs,mjs,json,yml,yaml}` or `eslint.config.{js,mjs,ts}` | Lint configuration. |
| `.prettierrc{,.js,.json,.yml}` or `prettier.config.{js,mjs,ts}` | Formatter configuration. |

## Detected frameworks

For projects clearing the `0.6` confidence threshold, additionally detect:

| Framework | Match |
|-----------|-------|
| `react` | `package.json#dependencies` or `devDependencies` includes `react`. |
| `vue` | `vue` package present. |
| `svelte` | `svelte` package or `svelte.config.{js,ts}` present. |
| `solid` | `solid-js` package present. |
| `next` | `next` package or `next.config.{js,ts,mjs}` present. |
| `nuxt` | `nuxt` package or `nuxt.config.{js,ts}` present. |
| `remix` | `@remix-run/*` packages present. |
| `astro` | `astro` package or `astro.config.{js,mjs,ts}` present. |
| `vite` | `vite` package or `vite.config.{js,ts,mjs}` present. |
| `webpack` | `webpack` package or `webpack.config.{js,ts}` present. |
| `electron` | `electron` package present. |
| `react-native` | `react-native` package present. (Also raises `mobile` stack score.) |
| `nestjs` | `@nestjs/*` packages present. |
| `express` | `express` package present. |
| `fastify` | `fastify` package present. |

Add each detected framework to `profile.frameworks`.

## Test framework detection

Scan dependencies for: `vitest`, `jest`, `mocha`, `jasmine`, `playwright`, `cypress`, `puppeteer`, `@testing-library/*`. Add each to `profile.testFrameworks`.

## Known false positives / refinements

- A repo containing only `node_modules/` (e.g., a vendored dependencies cache) without `package.json` should not be classified as a JS/TS project. The strong signal protects against this.
- A documentation-only repo with a single `package.json` declaring `markdownlint-cli` does not need the JS/TS stack pack treatment. The plan should note low framework count and recommend the universal core only.

## References

- [DETECTION.md](../DETECTION.md) — overall probe procedure.
- `core/stack-packs/js-ts/` — stack-specific content (PR 6).

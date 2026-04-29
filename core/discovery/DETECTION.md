# DETECTION.md — How the Discovery Probe Works

> Read by an agent during Phase 2 of [RUN.md](../../RUN.md). Produces a **project profile** that drives every downstream decision (which stack packs to install, which roles are relevant, which rules to render).

The probe is **read-only**. It must never modify the target project.

---

## 1. Inputs

- **Target project root** — the directory containing `ai-orchestra/`. Commonly the same as the repository root.
- **No network** unless absolutely necessary (e.g., resolving a single ambiguous dependency from a public registry). Default to fully offline.

## 2. Output: the project profile

The probe produces a **project profile** in this shape:

```json
{
  "root": "<absolute path>",
  "stacks": [
    { "id": "js-ts",        "confidence": 0.97, "evidence": [ "package.json", "tsconfig.json", "vite.config.js" ] },
    { "id": "python-web",   "confidence": 0.0,  "evidence": [] },
    { "id": "salesforce",   "confidence": 0.0,  "evidence": [] }
  ],
  "frameworks": ["react", "vite"],
  "packageManagers": ["npm"],
  "lockfiles": ["package-lock.json"],
  "testFrameworks": ["vitest"],
  "ciSystems": ["github-actions"],
  "documentationFiles": ["README.md", "AGENTS.md", "CONTRIBUTING.md"],
  "isPolyglot": false,
  "openQuestions": []
}
```

The profile is the single artefact passed forward to Phases 3–5.

## 3. Procedure

Run these phases in order. Each phase reads more deeply than the previous.

### 3.1 Stack detection (per-signal)

For each detector file in `ai-orchestra/core/discovery/signals/`:

1. Read the detector's signals list.
2. Check each signal against the target project (file existence, file content patterns, dependency entries, etc.).
3. Sum the matched signals' weights. Divide by the detector's max possible weight to compute a **confidence score** between 0.0 and 1.0.
4. If `confidence >= 0.6`, the stack is **detected**. Otherwise it is **considered absent** (but still listed in the profile with its score for transparency).

### 3.2 Framework detection (only for detected stacks)

For each detected stack, the detector file lists which frameworks to look for and how. Examples:

- For `js-ts`: presence of `react`/`vue`/`svelte`/`next`/`nuxt`/`remix` in `package.json#dependencies`; presence of `vite.config.*`/`webpack.config.*`/`rollup.config.*`.
- For `python-web`: presence of `django`/`flask`/`fastapi`/`starlette`/`tornado` in `requirements.txt`/`pyproject.toml`.
- For `salesforce`: presence of `cartridges/` (SFRA) vs `force-app/` (sfdx) vs `pwa-kit*` packages (PWA Kit).

Frameworks are added to `profile.frameworks` as identifier strings.

### 3.3 Auxiliary detection (always run)

Regardless of stack:

- **Package manager**: detect from lockfile presence (`package-lock.json` → npm, `yarn.lock` → yarn, `pnpm-lock.yaml` → pnpm, `bun.lockb` → bun, `poetry.lock` → poetry, `Pipfile.lock` → pipenv, `uv.lock` → uv, `Cargo.lock` → cargo, `go.sum` → go modules, `Gemfile.lock` → bundler).
- **Test framework**: scan dependency lists and config files for known test runners (`vitest`, `jest`, `mocha`, `playwright`, `cypress`, `pytest`, `unittest`, `jasmine`, `karma`, `apex` test classes via `@isTest` annotations).
- **CI system**: presence of `.github/workflows/`, `.gitlab-ci.yml`, `.circleci/config.yml`, `azure-pipelines.yml`, `Jenkinsfile`, `bitbucket-pipelines.yml`.
- **Documentation files at root**: any `*.md` file at the repository root, especially `README.md`, `AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, files matching `PROJECT_DOC_*.md`, `*-DESIGN.md`, etc.

### 3.4 Polyglot resolution

If two or more stacks pass the 0.6 confidence threshold, set `profile.isPolyglot = true`. The install plan should pull stack packs for **every detected stack** (not just the highest-scoring one).

### 3.5 Open questions

Anything below threshold but with non-zero evidence is potentially interesting. For each such case, append an entry to `profile.openQuestions`:

```json
{
  "topic": "salesforce",
  "score": 0.4,
  "evidence": ["one Apex file found"],
  "question": "Found a single Apex file but no sfdx-project.json or force-app/. Is this a Salesforce project?"
}
```

The install plan presents these to the user for disambiguation.

## 4. Confidence scoring rules

- Each signal in a detector file declares a `weight` (a positive number).
- The detector's **max weight** is the sum of all signal weights. Confidence = matched signal weights / max weight.
- Signals can be **strong** (weight >= 3 — e.g., a unique config file like `sfdx-project.json` for Salesforce) or **weak** (weight 1 — e.g., a generic file extension that overlaps multiple stacks).
- A single strong signal is enough to clear threshold by itself. Multiple weak signals are required if no strong signal matches.

## 5. Determinism and reproducibility

The probe is deterministic. Two consecutive runs against the same project must produce the same profile. Do not introduce timestamps, randomness, or network-dependent values into the profile.

## 6. Performance budget

The probe should complete in **under 5 seconds** on a typical project (< 10k files). Avoid recursive scans of large dependency directories (`node_modules/`, `vendor/`, `.venv/`, `target/`, `dist/`, `build/`, `_test-fixtures/`); they should be excluded by default.

## 7. Logging

The probe must emit a brief structured log with:

- Each detector run, its score, and which signals matched.
- Each auxiliary detection result.
- Any open question raised.

The log is shown in the install plan's "How discovery decided" appendix, so users can audit why a particular stack was selected.

## 8. References

- [signals/](signals/) — detector definitions.
- [existing-infra.md](existing-infra.md) — existing-infra inventory (Phase 3 in RUN.md).
- [../registry/install.schema.md](../registry/install.schema.md) — install marker schema.
- [../../RUN.md](../../RUN.md) — overall bootstrap procedure.

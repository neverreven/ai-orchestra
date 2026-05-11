# Test fixtures — overview

> Sample projects the orchestra is dry-run against to validate that the discovery probe, role library, skills, adapters, and stack packs all compose correctly into a sensible install plan. Fixtures are not real applications; they exist solely as **inputs to the orchestra's bootstrap procedure** ([`../RUN.md`](../RUN.md)).

The validation harness is **agent-driven**: an external agent reads [`VALIDATION.md`](VALIDATION.md), executes the procedure against each fixture, and compares the produced dry-run plan to the fixture's `EXPECTED.md`. There is no runtime test runner in v1; agents are the executors.

---

## 1. v1 fixture set

Three fixtures cover the v1 surface area:

| Fixture | Stack | Tests | Existing infra |
|---------|-------|-------|----------------|
| [`empty-js/`](empty-js/) | `js-ts` (React + Vite + TypeScript) | Detection, framework sub-detection, full install with stack pack layered, no-conflict path | None |
| [`ongoing-python-web/`](ongoing-python-web/) | `python-web` (FastAPI) | Detection, existing-infra preservation (existing `AGENTS.md`, existing `.cursor/rules/`), conflict-resolution actions (`extend-section`, `suffix-rename`), idempotent re-run | Existing `AGENTS.md`, existing Cursor rule |
| [`salesforce-cartridge/`](salesforce-cartridge/) | `salesforce` (sfdx + SFRA polyglot) + `js-ts` overlay | Multi-stack detection, Apex + LWC + SFRA + sfdx rule activation, multi-pack layering | None |

## 1.1 Adversarial fixture set (v1.3.0+)

Three adversarial fixtures target error-handling and upgrade paths — scenarios the v1 fixtures do not cover because they use only the happy path:

| Fixture | Stack | Tests | Adversarial scenario |
|---------|-------|-------|---------------------|
| [`broken-markers/`](broken-markers/) | `python-web` (FastAPI) | Malformed managed-section marker detection; critical-conflict blocking; partial-install plan for unblocked artifacts | Pre-existing `CLAUDE.md` (unclosed start marker), `AGENTS.md` (nested markers), `.github/copilot-instructions.md` (transposed markers) |
| [`name-collision/`](name-collision/) | `js-ts` (React + Vite + TypeScript) | Skill name overlap detection; suffix-rename disambiguation; `[Orchestra]` prefix in renamed copies; overlap report in post-install summary | Pre-existing `cleanup` skill in `.cursor/skills/`, `.claude/commands/`, and `.github/prompts/` — all collide with orchestra's `cleanup` skill |
| [`upgrade-from-v1/`](upgrade-from-v1/) | `js-ts` (React + TypeScript) | Version mismatch detection; upgrade mode; stale rule + skill proposals; additive new-skill install; schema migration (v1→v2 marker); learnings doc preservation; history append; global registry update | Pre-existing v1.0.0 install marker with stale rule and skill files; user-edited learnings doc |

Fixtures are intentionally minimal — each has exactly enough source code to trigger the matching detection signals from [`../core/discovery/signals/`](../core/discovery/signals/). They do not need to compile, run, or pass tests.

---

## 2. Fixture folder shape

Every fixture under `_test-fixtures/<fixture-id>/` has the following shape:

```
<fixture-id>/
├── README.md             # human-readable description of the fixture and what it tests
├── EXPECTED.md           # golden detections, expected install plan summary, verification criteria
└── <project source>      # minimal source files that trigger the relevant detection signals
```

The `EXPECTED.md` is the **contract** — it declares what the orchestra **must** produce when run against the fixture. The validation harness diff-checks the agent-produced plan against this contract.

The `<project source>` files are the inputs the discovery probe operates on. They mimic real-project shapes:

- For `empty-js/`: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`.
- For `ongoing-python-web/`: `pyproject.toml`, `app/main.py`, `app/models.py`, `tests/test_main.py`, plus pre-existing agentic files (`AGENTS.md`, `.cursor/rules/python-style.mdc`).
- For `salesforce-cartridge/`: `sfdx-project.json`, `package.xml`, `force-app/main/default/classes/AccountController.cls` (+ meta sidecar), `force-app/main/default/lwc/accountList/` bundle, `cartridges/int_my_storefront/` cartridge.

Source files are **not exercised as code**. They contain just enough structure for the discovery signals to fire. They are deliberately excluded from the host project's lint, test, and build configuration (see [§5](#5-host-project-isolation)).

---

## 3. What fixtures verify

Each fixture is a forcing function for one or more orchestra capabilities:

### Detection coverage

- Strong / medium / weak signals from [`../core/discovery/signals/`](../core/discovery/signals/) all fire correctly.
- Confidence scores cross thresholds.
- Sub-flavour resolution (e.g., `salesforce-sfdx` + `salesforce-sfra` simultaneously) is correct.
- Polyglot detections (Salesforce + JS/TS overlay) produce two stack entries.

### Install plan correctness

- Universal core (Director rule + project-context + role list + skill catalog) is included.
- Detected stack packs (per [`../core/stack-packs/_overview.md`](../core/stack-packs/_overview.md) §3) are layered on.
- Adapter mappings are honoured (Cursor: `.mdc` files; Claude Code: `CLAUDE.md` managed section; etc.).
- The install marker schema (`stacks[].stackPack`, `hooks.<event>.contractVersion`) is populated.

### Existing-infra respect

- Pre-existing `AGENTS.md` content is preserved (the orchestra extends a managed section, never overwrites).
- Pre-existing `.cursor/rules/python-style.mdc` (project-specific rule) is preserved untouched.
- Conflict actions (`extend-section`, `append`, `suffix-rename`) trigger correctly.

### Idempotency

- Running the orchestra twice on the same fixture produces a stable diff (zero non-`skip` actions on the second run, except where the audit reports drift).
- The marker's `history[]` records both runs.

### Honesty about gaps

- Adapter declared gaps (e.g., Codex stop-hook) appear in the install plan with `action: skip-with-gap`.
- Below-threshold detections surface as questions to the user.

---

## 4. Out of scope for v1 fixtures

The v1 fixture set deliberately does NOT cover:

- **CI runtime validation.** No GitHub Actions workflow runs the harness on every push. Validation is agent-driven on demand. v2 backlog.
- **Stacks without a first-class pack.** Go, Rust, .NET, mobile native — these have signal files but no fixtures in v1. The infrastructure to add them is in place; v1.x or v2 will grow the set.
- **Adapter-specific fixtures.** Each fixture is run through the **detected** adapter for the IDE the validating agent is using. There is no per-adapter fixture matrix in v1; the same fixture validates against any adapter.
- **Runtime behaviour.** Fixtures don't compile or execute. The orchestra is markdown-only in v1; runtime work is v2.
- **Failure injection (partial).** Adversarial fixtures covering broken markers, name collisions, and v1→v2 upgrades are now in the v1.3.0 set (see [§1.1](#11-adversarial-fixture-set-v130)). Fixtures with deliberately broken *source code* metadata (malformed `package.json`, missing `force-app/`) are still v2 backlog.
- **Real production codebases.** The post-v1 pilot dry-runs the orchestra against a host project on a separate experiment branch — that's the real-world validation.

---

## 5. Host-project isolation

When the fixtures live inside a host project (any repository where the orchestra is currently embedded; after a future extraction to a standalone orchestra repo this concern disappears), the host's tooling must NOT process fixture source code as if it were host code.

The orchestra's release notes for the host include:

- Add `ai-orchestra/_test-fixtures/` to the host's lint ignore list (e.g., the host's `eslint.config.js` for JS/TS, `pyproject.toml` for Python, etc.).
- Confirm the host's test runner is scoped to the host's own test directories (e.g., a `vitest.config.js` with an `include: 'src/tests/**'` pattern), so fixture files are not auto-discovered.
- Confirm the host's bundler / build does NOT attempt to compile fixture entry points.

These adjustments are tracked in [`../CHANGELOG.md`](../CHANGELOG.md) under the PR 7 entry. After the orchestra extracts to a standalone repo, the host coupling disappears and the fixtures remain self-contained.

---

## 6. Adding a new fixture (v1.x or v2)

To add a fixture that exercises a new capability:

1. Create `_test-fixtures/<fixture-id>/` following the shape in [§2](#2-fixture-folder-shape).
2. Populate the minimal source files that trigger the detection signals you want to test.
3. Write `EXPECTED.md` declaring the expected detections, install plan summary, and verification criteria.
4. Update this file's [§1](#1-v1-fixture-set) table.
5. Update [`../CHANGELOG.md`](../CHANGELOG.md).

The validation harness ([`VALIDATION.md`](VALIDATION.md)) does not require updates — it iterates over every fixture under `_test-fixtures/` automatically.

---

## 7. References

- [`VALIDATION.md`](VALIDATION.md) — agent-driven procedure for running the orchestra against each fixture and verifying the result.
- [`../RUN.md`](../RUN.md) — the orchestra bootstrap procedure that fixtures exercise.
- [`../core/discovery/DETECTION.md`](../core/discovery/DETECTION.md) — discovery probe documentation.
- [`../core/discovery/signals/`](../core/discovery/signals/) — per-stack detection signal specifications.
- [`../core/stack-packs/_overview.md`](../core/stack-packs/_overview.md) — stack-pack layering rules that fixtures verify.
- [`../adapters/_contract.md`](../adapters/_contract.md) — adapter contract that fixture validations check against.
- [`../adapters/cursor/post-install-checks.md`](../adapters/cursor/post-install-checks.md) — Cursor's post-install checks; fixture validation reuses many of these.
- [`../core/skills/audit/ai-infra-audit/SKILL.md`](../core/skills/audit/ai-infra-audit/SKILL.md) — audit skill that runs against every install (including fixture installs).

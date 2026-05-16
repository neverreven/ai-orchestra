# Fixture `ongoing-python-web` — expected outcome

Contract for the [validation harness](../VALIDATION.md). The orchestra dry-run plan against this fixture must satisfy the criteria below.

The defining behaviour for this fixture: **the orchestra preserves the pre-existing `AGENTS.md` and `.cursor/rules/python-style.mdc` and integrates around them.** Any plan that proposes to overwrite either file is a critical bug.

---

## 1. Expected detection

### Stack profile

| Stack id | Confidence | Notes |
|----------|------------|-------|
| `python-web` | ≥ 0.8 | Strong: `pyproject.toml` (weight 3); `app/main.py` with `from fastapi import FastAPI` (medium framework signal); pytest in dev-deps. Total weight ≥ 6. |

No other stacks should detect (no JS/TS file presence, no Salesforce metadata).

### Sub-projects

`profile.subProjects` must be an **empty array**. This fixture has no top-level subdirectories with manifest files.

### Frameworks

The `python-web` stack's framework list (recorded in `profile.frameworks`) must include:

- `fastapi` — from `pyproject.toml#dependencies` and the `from fastapi import` statement in `app/main.py`.

The list must NOT include:

- `django`, `flask`, `tornado`, `pyramid`, `aiohttp`, `litestar`, `starlette` — none have signals in this fixture.

### Test frameworks

`profile.testFrameworks` must include `pytest` (from `pyproject.toml#optional-dependencies.dev` or equivalent).

### Existing-infra inventory

Per [`../../core/discovery/existing-infra.md`](../../core/discovery/existing-infra.md), the inventory must report:

| Item | Status |
|------|--------|
| Existing `AGENTS.md` | Present at fixture root. **Must be preserved.** |
| Existing Cursor rules | One rule found: `.cursor/rules/python-style.mdc`. **Must be preserved untouched.** |
| Existing `.claude/` | Absent. |
| Existing `.github/copilot-instructions.md` | Absent. |
| Existing `.codex/` | Absent. |
| Existing `.ai-orchestra/install.json` | Absent (this is a fresh install, not an upgrade). |
| Existing learnings document | Absent. |
| Existing MCP configuration | Absent. |

---

## 2. Expected install plan

### Universal core

For Cursor (the v1 reference adapter):

| Path | Action | Rationale |
|------|--------|-----------|
| `.cursor/rules/orchestra-context.mdc` | `create` | Orchestra always-on context rule. New file. |
| `.cursor/rules/orchestra-director.mdc` | `create` | Director rule. New file. |
| `.cursor/rules/python-style.mdc` | `skip` | **Pre-existing project rule. Do not touch.** |
| `_documentation/AI_LEARNINGS.md` | `create` | Learnings template. New file. |
| `AGENTS.md` | `extend-section` | **Pre-existing file. Insert orchestra managed section between `<!-- ai-orchestra: managed-section start -->` / `<!-- ai-orchestra: managed-section end -->` markers per [`../../adapters/cursor/mappings.md`](../../adapters/cursor/mappings.md) §3. Project content above and below the markers is preserved verbatim.** |
| `.cursor/skills/<category>/<skill-id>/SKILL.md` × 30 | `create` | One per universal skill. |
| `.cursor/hooks.json` | `create` | New file with the orchestra stop-hook entry. |
| `.cursor/mcp.json` | `create` | New file with v1 default slot registrations. |
| `.ai-orchestra/install.json` | `create` | New install marker. |

### Stack pack layer (python-web)

| Path | Action | Rationale |
|------|--------|-----------|
| `.cursor/rules/python-web-python.mdc` | `create` | Pack rule — passes glob filter (`.py` files present). |
| `.cursor/rules/python-web-django.mdc` | `create` | Pack rule (rendered even though Django isn't detected — pack ships all rule files; the rule's own glob scopes activation). |
| `.cursor/rules/python-web-flask.mdc` | `create` | Pack rule (same reasoning). |
| `.cursor/rules/python-web-fastapi.mdc` | `create` | Pack rule — passes glob filter (FastAPI dep + `.py` files). |
| `.cursor/rules/python-web-skills-addenda.mdc` | `create` | Pack skills addenda. |

`python-web-django.mdc` and `python-web-flask.mdc` are **not created** — skipped by the v1.3.0 glob filter (no `manage.py`, no `django`/`flask` dep in this fixture).

The pack's `roles.md` content is appended into the orchestra-managed section of `AGENTS.md` under `### Stack roles addenda`. (This is part of the same `extend-section` action on `AGENTS.md`, not a separate plan entry.)

### Conflict actions

The plan must contain:

- One `extend-section` on `AGENTS.md`. The action description includes the marker insertion strategy.
- One `skip` on `.cursor/rules/python-style.mdc` with rationale "pre-existing project rule, not orchestra-owned".
- Zero `suffix-rename` actions (no orchestra file would collide with the pre-existing project rule's filename).
- Zero blind overwrites.

### Pack rule glob filter (v1.3.0)

The python-web pack's rules are evaluated against the fixture's file tree:

| Rule file | Glob | Match? | Action |
|-----------|------|--------|--------|
| `rules/python.md` | `**/*.py` | Yes (`app/main.py`) | Install |
| `rules/fastapi.md` | `**/*.py` + `fastapi` dep | Yes | Install |
| `rules/django.md` | `manage.py` or `django` dep | No | **Skip** |
| `rules/flask.md` | `flask` dep | No | **Skip** |

`skippedPackRules` must contain `["rules/django.md", "rules/flask.md"]`.
`installedPackRules` must contain `["rules/python.md", "rules/fastapi.md"]`.

If the plan proposes to write to `AGENTS.md` with action `create` (instead of `extend-section`) or to `.cursor/rules/python-style.mdc` with any action other than `skip`, **validation fails**.

### Adapter gaps

For Cursor: none.

For Claude Code / Codex / VS Code: the existing-infra inventory finds no IDE-specific files for those adapters, so this fixture validates them in their fresh-install paths. Their declared gaps (Codex stop-hook, etc.) still surface.

### Registry marker

`stacks[]` must contain exactly one entry:

```json
{
  "id": "python-web",
  "stackPack": "core/stack-packs/python-web",
  "stackPackVersion": "1.0.0-alpha",
  "frameworks": ["fastapi"],
  "installedPackRules": ["rules/python.md", "rules/fastapi.md"],
  "skippedPackRules": ["rules/django.md", "rules/flask.md"]
}
```

`subProjects` must be present as `"subProjects": []` (no sub-package manifests in this fixture).

`hooks.stop` must be populated with `contractVersion: "1.0"` and `lastRun: null`.

`history[]` must contain one entry — the install run.

`existingInfraDetected` (or equivalent field per the marker schema) must record:

- `agentsmd: true`
- `cursorRulesProjectOwned: ["python-style.mdc"]`

### MCP slots

Standard v1 default slot registrations per the adapter's `mcp.md`. The python-web pack does not add stack-specific MCP slots in v1.

---

## 3. Idempotency expectation

A synthetic second run must produce a plan where:

- All universal core `create` entries from §2 become `skip` (rendered content byte-identical).
- All stack pack rule files become `skip`.
- `.cursor/skills/<category>/<skill-id>/SKILL.md` × 30: all `skip`.
- `_documentation/AI_LEARNINGS.md`: `skip` (template seed unchanged; user-added entries are preserved by managed-section logic).
- `AGENTS.md`: `skip` (managed section content unchanged; project-owned content above/below markers preserved).
- `.cursor/rules/python-style.mdc`: still `skip` (project-owned, never touched).
- `.cursor/hooks.json`: `skip` (orchestra-owned entry unchanged; deduplicated via `metadata.orchestra: true`).
- `.cursor/mcp.json`: `skip`.
- `.ai-orchestra/install.json`: `extend-section` on `history[]` only.

Zero `create`, zero non-history `extend-section`, zero conflict-handling actions on the synthetic re-run = idempotency PASS.

The most subtle re-run check: if the rendering algorithm's iteration order changed (e.g., skill folders enumerated in a different order), the rendered managed-section content in `AGENTS.md` would diff and trigger an `extend-section`. The validator confirms the order is stable.

---

## 4. Honesty expectations

- The plan must explicitly mention the pre-existing `AGENTS.md` and the pre-existing rule, and state how each is being handled.
- Adapter gaps from §2 surface for non-Cursor adapters.
- No silent skips.

A plan that does not acknowledge the pre-existing files (even if the plan happens to be functionally correct) is a **failure of communication** and counts as a soft-fail (`PASS-with-notes`) — the agent should be transparent about what's there and what it's doing about each item.

---

## 5. Verification criteria summary

| Check | Pass condition |
|-------|---------------|
| Stack detection | `python-web` only, confidence ≥ 0.8. |
| Framework list | `fastapi`, no extras. |
| Existing-infra inventory | `AGENTS.md` and `.cursor/rules/python-style.mdc` reported as present. |
| Universal core install | All entries from §2 present with correct actions. |
| `AGENTS.md` handling | `extend-section`, never `create`. |
| `.cursor/rules/python-style.mdc` handling | `skip`, never any other action. |
| Sub-project scan | `subProjects: []` (no top-level manifest dirs). |
| Stack pack install | python-web: `python.mdc` + `fastapi.mdc` installed; `django.mdc` + `flask.mdc` skipped (glob filter); skills addenda rendered; roles addenda merged into `AGENTS.md` managed section. |
| Pack rule marker | `installedPackRules` = `["rules/python.md","rules/fastapi.md"]`; `skippedPackRules` = `["rules/django.md","rules/flask.md"]`. |
| Always-on ceiling | Count of always-on `.mdc` files ≤ 4 → no warning. |
| Conflicts | Exactly one `extend-section` on `AGENTS.md`, one `skip` on the pre-existing rule. |
| Adapter gaps | None for Cursor; declared gaps surfaced for the others. |
| Registry marker | One `python-web` stack entry; existing-infra recorded; hook contractVersion populated. |
| Idempotency | Synthetic re-run produces zero non-trivial changes. |
| Honesty | Pre-existing files explicitly acknowledged in the plan. |

If every criterion passes, the fixture's validation result is `PASS`.

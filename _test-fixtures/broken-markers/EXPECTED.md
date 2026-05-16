# Fixture `broken-markers` — expected outcome

Contract for the [validation harness](../VALIDATION.md). The orchestra dry-run plan against this fixture must satisfy the criteria below.

---

## 1. Expected detection

### Stack profile

| Stack id | Confidence | Notes |
|----------|------------|-------|
| `python-web` | ≥ 0.8 | Strong signals: `pyproject.toml` (weight 4) + `app/main.py` + `tests/test_health.py` (weight 4). FastAPI dependency triggers `python-web` confidence ≥ 0.8. |

No other stacks should detect.

### Sub-projects

`profile.subProjects` must be an **empty array** — no top-level subdirectories contain manifests.

### Frameworks

The `python-web` stack's framework list must include:

- `fastapi` — from `pyproject.toml#project.dependencies`.
- `uvicorn` — from `pyproject.toml#project.dependencies`.

### Existing-infra inventory

The existing-infra probe must detect all three malformed files:

| File | Probe result |
|------|-------------|
| `CLAUDE.md` | Present, markers: `start-only` (start marker found, no end marker). |
| `AGENTS.md` | Present, markers: `nested` (two start markers before a close). |
| `.github/copilot-instructions.md` | Present, markers: `transposed` (end marker precedes start marker). |

---

## 2. Expected install plan

### Critical conflict blocks

The plan **must** contain exactly three critical-conflict rows — one per malformed file:

| # | File | Conflict type | Action | Severity |
|---|------|--------------|--------|----------|
| 1 | `CLAUDE.md` | `markers.start-only` — start marker present but no corresponding end marker. | `block` (no write until user resolves) | critical |
| 2 | `AGENTS.md` | `markers.nested` — second start marker appears before end of first block. | `block` | critical |
| 3 | `.github/copilot-instructions.md` | `markers.transposed` — end marker precedes start marker. | `block` | critical |

The plan must NOT attempt `extend-section` or `create` on any of these three files.

### Install plan for non-conflicting artifacts

Despite the three critical blocks, the orchestra must still plan `create` actions for all artifacts that target NEW paths. For the Cursor adapter (v1 reference), the expected create actions are:

| Path | Source | Action |
|------|--------|--------|
| `.cursor/rules/orchestra-context.mdc` | rendered from orchestrator context | `create` |
| `.cursor/rules/orchestra-director.mdc` | rendered from `../../core/director/RULE.md` | `create` |
| `_documentation/AI_LEARNINGS.md` | rendered from `../../core/director/learnings-template.md` | `create` |
| `.cursor/skills/...` × all installed skills | each `SKILL.md` | `create` |
| `.cursor/hooks.json` (entry registered) | stop-hook | `create` or `extend-section` |
| `.cursor/mcp.json` (slot registrations) | per `mcp.md` | `create` |
| `.ai-orchestra/install.json` | install marker | `create` |
| `.cursor/rules/python-web-*.mdc` (pack rules) | `python-web` stack pack | `create` |

Note: the Cursor adapter's rule files are NEW paths — they do not conflict with `CLAUDE.md`, `AGENTS.md`, or `.github/copilot-instructions.md`. The conflict blocks only prevent writes to those specific three files.

For Claude Code, Codex, and VS Code adapters: the three blocked files ARE each adapter's primary managed-section target. The plan for those adapters must therefore include:
- All three file conflict blocks (as above).
- A `create` action for `.ai-orchestra/install.json` and learnings doc (these do not use managed-section markers).
- All skill file creates (Claude Code: `.claude/commands/`; VS Code: `.github/prompts/`; Codex: no skill file creates, but the catalog is blocked because it goes into `AGENTS.md`).

The plan must include a top-level **installation status** entry:
```
status: partial-blocked
blocked: 3 critical conflicts require user resolution before managed sections can be written
action_required: Resolve the malformed markers in CLAUDE.md, AGENTS.md, and .github/copilot-instructions.md, then re-run the orchestra.
```

### Resolution instructions

The plan must include per-file resolution guidance:

| File | User resolution options |
|------|------------------------|
| `CLAUDE.md` | Option A: Add the missing `<!-- ai-orchestra: managed-section end -->` after the existing managed content. Option B: Remove the orphaned start marker (orchestra will treat the file as marker-absent and append a fresh section). |
| `AGENTS.md` | Option A: Remove the inner start marker (consolidate to one start/end pair). Option B: Remove both start markers and the end marker (orchestra will treat as marker-absent). |
| `.github/copilot-instructions.md` | Option A: Swap the markers so start precedes end. Option B: Remove both markers (orchestra will treat as marker-absent). |

The plan must NOT offer auto-repair on any of these — all three require user judgement about content ownership.

### Registry marker

`.ai-orchestra/install.json` must record:

```json
{
  "orchestra": {
    "status": "partial-blocked",
    "blockedFiles": [
      { "path": "CLAUDE.md", "issue": "markers.start-only" },
      { "path": "AGENTS.md", "issue": "markers.nested" },
      { "path": ".github/copilot-instructions.md", "issue": "markers.transposed" }
    ]
  }
}
```

The `history[]` entry for this run must include `"status": "partial-blocked"`.

---

## 3. Idempotency expectation

A synthetic second run (with the malformed files still present) must produce an identical plan — same three critical blocks, same `create` rows for unblocked artifacts. No action may degrade on re-run.

---

## 4. Honesty expectations

- All three critical conflicts must be surfaced in plain language, naming the specific file and the specific marker anomaly.
- The conflict blocks must NOT be surfaced as `warning` — they must be `critical` because writing into an ambiguous or transposed range could silently corrupt user content.
- The plan must explain what a passing re-run looks like after the user resolves each conflict.

---

## 5. Verification criteria summary

| Check | Pass condition |
|-------|---------------|
| Stack detection | `python-web` only, confidence ≥ 0.8. |
| Malformed marker detection | All 3 corrupted files detected with correct `issue` type. |
| Conflict blocks | Exactly 3 `block` rows in plan, one per file. |
| No auto-repair | None of the 3 files are written or patched by the orchestrator. |
| Unblocked creates | All non-conflicting artifacts have `create` actions in plan. |
| Resolution guidance | Per-file options documented in plan, minimum 2 options per file. |
| Registry marker | `status: partial-blocked`, 3 entries in `blockedFiles`. |
| Idempotency | Re-run with same inputs produces same plan. |
| Severity | All 3 marker conflicts at `critical` level. |

If every criterion passes, the fixture's validation result is `PASS`.

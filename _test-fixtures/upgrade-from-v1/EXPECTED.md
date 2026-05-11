# Fixture `upgrade-from-v1` — expected outcome

Contract for the [validation harness](../VALIDATION.md). The orchestra dry-run plan against this fixture must satisfy the criteria below.

---

## 1. Expected detection

### Version mismatch

The orchestra must detect the existing `.ai-orchestra/install.json` and compare `orchestra.version: "1.0.0"` against the current core version. Result: **upgrade mode** (Phase 7 re-run).

The plan must begin with:
```
Mode: upgrade
Previous version: 1.0.0
Current version: <current core VERSION file value>
Action: re-render changed artifacts, add new artifacts, migrate marker schema
```

### Stack profile

| Stack id | Confidence | Notes |
|----------|------------|-------|
| `js-ts` | ≥ 0.8 | Preserved from v1.0.0 marker + re-confirmed by source file signals. |

### Sub-projects

`profile.subProjects` must be `[]` — no top-level subdirectories with manifests.

---

## 2. Expected upgrade plan

### Rule file upgrades

Both existing orchestra rule files are stale (their content differs from what the current adapter would render). The plan must:

| File | Content status | Action |
|------|---------------|--------|
| `.cursor/rules/orchestra-context.mdc` | Stale (v1.0.0 content; current version adds stack-pack section, updated version tag) | `propose` — offer to replace with current rendering |
| `.cursor/rules/orchestra-director.mdc` | Stale (missing Scheduler section added in v1.2.0) | `propose` — offer to replace with current rendering |

Rules are `propose` (not silent `create`) because the existing files are orchestra-owned but may have been hand-edited by the user after installation. The upgrade must not silently overwrite.

### Skill file upgrades

| File | Content status | Action |
|------|---------------|--------|
| `.cursor/skills/cleanup/SKILL.md` | Stale (missing `## Output` section; contains old-version comment) | `propose` — offer to replace with current orchestra source |
| `.cursor/skills/pre-release/SKILL.md` | Absent (not in fixture) | `create` — install fresh |

New skills added since v1.0.0 (e.g., `ai-infra-audit`) must be installed as `create` actions. The set of "new since v1.0.0" skills is determined by comparing the current `core/skills/` inventory against the `skills[]` array in the v1.0.0 marker.

### AGENTS.md managed section

The existing managed section is **valid** (correct marker pair, no corruption). The content is stale (missing new skills, missing Scheduler section, old version tag).

Action: `extend-section` — replace content **between** the markers with the current rendering. Content **outside** the markers (the `## Team notes` section) must be **preserved untouched**.

### AI_LEARNINGS.md

The existing `_documentation/AI_LEARNINGS.md` has user-added entries (three sections with custom content).

Action: `skip` — the learnings doc is user-owned after the initial seed. The upgrade must NOT overwrite it. The audit skill may propose additions if it identifies learnings drift, but the upgrade phase itself skips this file.

### New artifacts

All artifacts that exist in the current orchestra but were absent from the v1.0.0 install must be installed:

| Path | Action | Notes |
|------|--------|-------|
| `.cursor/skills/ai-infra-audit/SKILL.md` (or current path convention) | `create` | New skill added post-v1.0.0. |
| `.cursor/rules/js-ts-next-rsc.mdc` (V3 depth rule, if applicable) | `create` | New stack pack depth rule (post-v1.0.0 pack content). |
| Scheduler-related marker fields | marker migration (see §3) | Not a file; part of schema migration. |

### Pack rule glob filtering (upgrade)

Re-run glob filtering for newly added stack pack rules:
- `rules/node-api.md` (V3 depth rule) — glob: `server/**/*.{js,ts}`. If no server files in fixture: `skipped`, recorded in `stacks[].skippedPackRules[]`.
- Other V3 rules — apply same filtering logic.

---

## 3. Marker schema migration

The existing v1.0.0 marker lacks several fields introduced in later versions. After upgrade, the marker must contain:

| Field | v1.0.0 status | Post-upgrade value |
|-------|---------------|-------------------|
| `_schema` | `"ai-orchestra/install/v1"` | `"ai-orchestra/install/v2"` |
| `stacks[].installedPackRules` | absent | Array of installed pack rule paths (from current glob filtering run). |
| `stacks[].skippedPackRules` | absent | Array of skipped pack rule paths. |
| `rules[].sourceAlwaysApply` | absent | `true` for both rule entries (source RULE.md has `alwaysApply: true`). |
| `subProjects` | absent | `[]` (empty — no sub-projects detected). |
| `scheduler` | absent | `{ "jobs": [{ "id": "periodic-audit", ... }] }` (default job from `core/scheduler/jobs/periodic-audit.job.json`). |
| `history[]` last entry | `1.0.0` install | New entry: `{ "at": "<now>", "action": "upgrade", "fromVersion": "1.0.0", "toVersion": "<current>", "status": "success" }` |

The existing `history[0]` entry (the v1.0.0 install) must be **preserved**. The upgrade appends a new entry.

All pre-existing fields in the marker must be preserved with their original values unless explicitly updated by the schema migration rules above.

---

## 4. Global registry update

After upgrade, `~/.ai-orchestra/projects.json` must be updated:

- The project entry's `orchestraVersion` changes from `"1.0.0"` to `<current>`.
- `lastSeenAt` updates to the current timestamp.
- All other project entry fields are preserved.

---

## 5. Idempotency expectation

A synthetic second run after the upgrade (with all `propose` actions resolved to `accepted`) must produce:

- `.cursor/rules/orchestra-context.mdc`: `action: skip`.
- `.cursor/rules/orchestra-director.mdc`: `action: skip`.
- `.cursor/skills/cleanup/SKILL.md`: `action: skip`.
- All other skill files: `action: skip`.
- `AGENTS.md`: `action: skip` (managed section content unchanged).
- `_documentation/AI_LEARNINGS.md`: `action: skip`.
- `.ai-orchestra/install.json`: `action: extend-section` (history[] gets a new entry for the re-run, which is the idempotency run itself).

Zero `create` or `propose` actions = idempotency PASS.

---

## 6. Honesty expectations

- The plan must clearly state it is operating in **upgrade mode**, not fresh-install mode.
- Every `propose` action must state the reason (stale: which section changed, what version added it).
- The AI_LEARNINGS.md skip must be explained (user-owned after seed; upgrade does not touch it).
- The schema migration must be described in the plan, listing each added field.

---

## 7. Verification criteria summary

| Check | Pass condition |
|-------|---------------|
| Upgrade mode detected | Plan begins with `Mode: upgrade`, previous/current versions stated. |
| Stack re-confirmed | `js-ts` confidence ≥ 0.8; no new stacks detected. |
| Stale rule files | Both `.mdc` files get `propose` (not silent overwrite). |
| Stale skill file | `.cursor/skills/cleanup/SKILL.md` gets `propose`. |
| New skill added | `ai-infra-audit` (and any other post-v1.0.0 skills) get `create`. |
| AGENTS.md managed section | `extend-section` replaces managed content; team notes untouched. |
| AI_LEARNINGS.md | `action: skip`; user entries preserved. |
| Marker schema migration | v2 schema; `subProjects`, `installedPackRules`, `skippedPackRules`, `scheduler`, `rules[].sourceAlwaysApply` all populated. |
| History preserved + appended | Original v1.0.0 install entry present; new upgrade entry added. |
| Global registry | Project entry updated with new version and timestamp. |
| Idempotency | Post-upgrade re-run produces zero non-trivial changes. |
| Transparency | Plan explains all `propose` rationale and schema migration changes. |

If every criterion passes, the fixture's validation result is `PASS`.

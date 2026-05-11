# Cursor adapter — post-install-checks.md

> Phase 8 of [`INSTALL.md`](INSTALL.md). After the install applies, the adapter runs every check in this file. Each check is **deterministic**, file-only, and machine-verifiable. No check requires network access or a running Cursor instance.

If any check fails, the adapter must report the failure in the closing message (Phase 9). The audit skill ([`../../core/skills/audit/ai-infra-audit/SKILL.md`](../../core/skills/audit/ai-infra-audit/SKILL.md)) re-runs these checks on every audit.

---

## 1. Check format

Every check has:

- **id** — stable, dotted lowercase (e.g., `cursor.rules.director-exists`).
- **what** — one-line statement of what this check validates.
- **how** — concrete file operation(s) the agent performs.
- **pass** — observable condition that means the check passed.
- **fail** — observable condition that means the check failed.
- **severity** — `critical` (block the closing message until reported), `warning` (report but do not block), `info` (logged for audit).

Results aggregate into a structured report:

```
{
  "checks": {
    "<id>": { "status": "pass" | "fail" | "skipped", "detail": "<text>" }
  },
  "summary": { "pass": N, "fail": N, "skipped": N }
}
```

Render the structured result to the user as a numbered list, with failures grouped first.

---

## 2. Filesystem-presence checks

| id | what | how | pass | fail | severity |
|----|------|-----|------|------|----------|
| `cursor.dir.exists` | `.cursor/` exists in project root. | Check directory presence. | Directory exists. | Directory absent. | critical |
| `cursor.rules.dir.exists` | `.cursor/rules/` exists. | Check directory presence. | Exists. | Absent. | critical |
| `cursor.skills.dir.exists` | `.cursor/skills/` exists when at least one skill installed. | Read marker `skills[]`. | Directory exists when skills > 0. | Skills > 0 but directory absent. | critical |
| `marker.exists` | `.ai-orchestra/install.json` exists at project root. | Check file presence. | Exists. | Absent. | critical |
| `agents.exists` | `AGENTS.md` exists at project root. | Check file presence. | Exists. | Absent. | critical |
| `learnings.exists` | Learnings file exists at the path recorded in the marker. | Read marker `learnings.path`; check file. | Exists. | Absent. | critical |
| `hooks.exists` | `.cursor/hooks.json` exists if marker recorded the stop-hook registered. | Read marker `hooks.stop.registered`. | File exists when `registered: true`. | Marker says registered but file absent. | critical |
| `mcp.exists` | `.cursor/mcp.json` exists if any slots were registered. | Read marker `mcpSlots[]`. | File exists when slots > 0. | Slots > 0 but file absent. | critical |

---

## 3. JSON-validity checks

| id | what | how | pass | fail | severity |
|----|------|-----|------|------|----------|
| `marker.json.valid` | `.ai-orchestra/install.json` is valid JSON. | Parse. | Parses. | Parse error. | critical |
| `marker.schema.matches` | Marker validates against [`../../core/registry/install.schema.md`](../../core/registry/install.schema.md). | Verify required fields present and types correct. | Validates. | Schema violation. | critical |
| `hooks.json.valid` | `.cursor/hooks.json` is valid JSON (when present). | Parse. | Parses or absent. | Parse error. | critical |
| `mcp.json.valid` | `.cursor/mcp.json` is valid JSON (when present). | Parse. | Parses or absent. | Parse error. | critical |

---

## 4. Frontmatter / structural checks

| id | what | how | pass | fail | severity |
|----|------|-----|------|------|----------|
| `rules.director.frontmatter` | `ai-director.mdc` frontmatter has `description`, `alwaysApply: true`, and no `globs`. | Parse YAML frontmatter. | Matches. | Mismatch. | critical |
| `rules.director.placeholders` | Director rule body has no remaining `{{...}}` placeholders. | Regex search. | Zero matches. | One or more matches. | critical |
| `rules.context.frontmatter` | `orchestra-context.mdc` frontmatter has `description`, `alwaysApply: true`, no `globs`. | Parse YAML. | Matches. | Mismatch. | critical |
| `rules.context.identity` | The body's `## Identity` section names the project, stacks, frameworks, and orchestra version recorded in the marker. | String checks. | All present. | Any missing. | warning |
| `agents.section.markers` | `AGENTS.md` contains the marker pair (start + end) exactly once. | Regex match. | Exactly one pair. | Zero or multiple pairs. | critical |
| `agents.section.body` | Content between markers includes the **Identity**, **Roles installed**, **Skills installed**, **How to invoke the orchestra**, **Pointers** subheadings (per [`target-schema.md`](target-schema.md) §3). | Heading regex. | All present. | Any missing. | warning |
| `learnings.sections` | Learnings doc has the six fixed sections from [`../../core/director/learnings-template.md`](../../core/director/learnings-template.md). | Heading regex. | All six present. | Any missing. | warning |
| `learnings.budget` | Learnings doc is under the standard size budget. | Line count vs the `Document Health` budget declared in [`../../core/director/_overview.md`](../../core/director/_overview.md). | Within budget. | Over by > 10%. | warning |

---

## 4.1 Suffix-renamed always-on downgrade checks

When the install marker's `rules[]` includes any entry with `action: "suffix-rename"` whose source artifact was always-on (the Director rule or orchestra-context rule), these checks verify the downgrade was applied correctly per [`render-rules.md`](render-rules.md) §5.6 and [`mappings.md`](mappings.md) §6.1:

| id | what | how | pass | fail | severity |
|----|------|-----|------|------|----------|
| `rules.suffix-renamed.downgraded` | Every suffix-renamed copy of an always-on source has `alwaysApply: false` in its frontmatter. | For each `marker.rules[]` entry where `action == "suffix-rename"` AND `sourceAlwaysApply == true`: parse the frontmatter of the file at `path`. | `alwaysApply` is `false`. | `alwaysApply` is `true` or missing. | critical |
| `rules.suffix-renamed.description-prefix` | The renamed copy's `description` starts with `[Orchestra — manual trigger] `. | Parse frontmatter `description`. | Prefix present. | Prefix missing. | warning |
| `rules.suffix-renamed.body-comment` | The renamed copy has the explanatory HTML comment on the first line after the closing `---` fence. | Read first non-blank line after frontmatter. | Comment present. | Comment missing. | warning |
| `rules.suffix-renamed.no-double-always-on` | No two rules of the same orchestra kind (Director or context) are both `alwaysApply: true`. | Enumerate all `.mdc` files in `.cursor/rules/`; for each pair sharing an orchestra kind (matched by description substring), at most one has `alwaysApply: true`. | At most one per kind. | Two or more always-on of the same kind. | warning |

Checks in this section are **skipped** when no suffix-renamed always-on rules exist in the marker. The audit re-runs them on every invocation (the fourth check catches manual re-promotion after install).

---

## 5. Skill-folder checks

For every entry in `marker.skills[]`:

| id | what | how | pass | fail | severity |
|----|------|-----|------|------|----------|
| `skills.<id>.folder.exists` | `.cursor/skills/<skill-id>/` exists. | Directory check. | Exists. | Absent. | critical |
| `skills.<id>.SKILL.exists` | `.cursor/skills/<skill-id>/SKILL.md` exists. | File check. | Exists. | Absent. | critical |
| `skills.<id>.frontmatter.name` | Frontmatter `name` matches folder name. | Parse YAML. | Match. | Mismatch. | critical |
| `skills.<id>.frontmatter.description` | Frontmatter `description` is non-empty and includes at least one trigger phrase from the source SKILL.md. | Parse YAML; regex search. | Match. | Missing. | warning |
| `skills.<id>.body.required-sections` | Body has `## Trigger`, `## When to use`, `## When NOT to use`, `## Process`, `## Output`, `## References`. | Heading regex. | All present. | Any missing. | critical |

---

## 5.1 Skill name overlap checks

When the install marker's `skills[]` includes any entry with `action: "suffix-rename"` (a skill was renamed because the project already had a folder of the same name at `.cursor/skills/<skill-id>/`), these checks verify the disambiguation was applied correctly per [`render-rules.md`](render-rules.md) §5.5:

| id | what | how | pass | fail | severity |
|----|------|-----|------|------|----------|
| `skills.overlap.description-prefix` | Every suffix-renamed orchestra skill has `[Orchestra]` at the start of its `description` frontmatter. | Parse YAML frontmatter of each renamed skill file. | Prefix present. | Prefix missing. | warning |
| `skills.overlap.disambiguation-note` | The description includes the disambiguation note pointing at the project skill's path. | Substring search in `description`. | Note present. | Note missing. | warning |
| `skills.overlap.report` | The post-install report contains an `## Overlapping skills` section listing each overlap. | Check that the Phase 9 closing message (or the install marker's `history[]` install entry `summary`) contains the string "Overlapping skills". | Present when overlaps exist. | Missing when `marker.skills[]` has suffix-renamed entries. | warning |

Checks in this section are **skipped** when no suffix-renamed skills exist in the marker.

---

## 6. Hook checks

| id | what | how | pass | fail | severity |
|----|------|-----|------|------|----------|
| `hooks.stop.entry.exists` | `.cursor/hooks.json` has at least one entry under `hooks.stop` whose `metadata.orchestra` is `true`. | Parse + filter. | Exactly one. | Zero or more than one. | critical |
| `hooks.stop.entry.contract` | The orchestra entry's `metadata.contractVersion` matches `marker.hooks.stop.contractVersion`. | Compare. | Match. | Mismatch. | critical |
| `hooks.stop.entry.prompt` | The orchestra entry's `prompt` references the learnings path (substring match). | Substring search. | Found. | Missing. | warning |
| `hooks.start.preserved` | If `hooks.start` existed prior to install, every prior entry is still present. | Diff vs Phase 3 inventory. | All preserved. | Any removed. | critical |

---

## 7. MCP checks

| id | what | how | pass | fail | severity |
|----|------|-----|------|------|----------|
| `mcp.slots.placeholder` | Every slot the orchestra registered has `metadata.orchestra: true` AND a non-empty placeholder body (per [`mcp.md`](mcp.md) §5). | Parse + check. | All slots conform. | Any non-conforming. | critical |
| `mcp.user.preserved` | Pre-existing user MCP entries are preserved verbatim. | Diff vs Phase 3 inventory. | All preserved. | Any altered. | critical |
| `mcp.slots.recorded` | Every slot in `.cursor/mcp.json` with `metadata.orchestra: true` is also in `marker.mcpSlots[]` (matched by `name`). | Set comparison. | Equal. | Drift. | warning |

---

## 8. Marker consistency checks

| id | what | how | pass | fail | severity |
|----|------|-----|------|------|----------|
| `marker.ide.id` | `marker.ide.id == "cursor"`. | Field check. | Equal. | Other. | critical |
| `marker.ide.adapterVersion.matches.core` | `marker.ide.adapterVersion == marker.orchestra.version` in v1. | Field equality. | Equal. | Drift. | warning |
| `marker.rules.paths.exist` | Every `marker.rules[].path` resolves to a real file. | File checks per entry. | All exist. | Any missing. | critical |
| `marker.skills.paths.exist` | Every `marker.skills[].source` is a path under the orchestra core that exists; every installed skill folder under `.cursor/skills/<id>/` exists. | File checks per entry. | All exist. | Any missing. | critical |
| `marker.timestamps.sane` | `marker.orchestra.installedAt` ≤ now; `marker.history[*].at` is monotonic non-decreasing. | Date math. | Sane. | Out of order. | warning |
| `marker.contract.versions` | `marker.hooks.stop.contractVersion == "1.0"`, `marker.scheduler.contractVersion == 1`, `marker.notifications.contractVersion == 1`. | Field check. | All match. | Any mismatch. | critical |
| `marker.history.coherent` | Exactly one `action: "install"` entry exists in `history[]`; subsequent entries are `audit` or `upgrade`. | Filter + count. | Conforms. | Multiple installs or unknown action. | critical |

---

## 8.5 Stop-hook overlap resolution checks (introduced in v1.2.0)

These checks verify the orchestra honoured the user's choice for the F4 stop-hook overlap (per [`../../core/conflict/stop-hook-overlap.md`](../../core/conflict/stop-hook-overlap.md)).

| id | what | how | pass | fail | severity |
|----|------|-----|------|------|----------|
| `cursor.hooks.overlap.recorded` | The marker has an `installScope.stopHookOverlapResolution` object with `value`, `detectedAt`, `decidedAt`, `decidedBy` fields. | JSON path check. | All four fields present. | Any field missing. | critical |
| `cursor.hooks.overlap.skip-honoured` | When `stopHookOverlapResolution.value === "skip-orchestra"`, the file `.cursor/hooks.json` does NOT contain any orchestra-tagged entry under `hooks.stop`. | Read the hook config; filter `hooks.stop` for `metadata.orchestra === true`; expect zero. | Zero orchestra entries. | One or more orchestra entries present. | critical |
| `cursor.hooks.overlap.replace-honoured` | When `stopHookOverlapResolution.value === "replace-with-orchestra"`, exactly one orchestra-tagged entry exists under `hooks.stop` AND no other entry's prompt body matches the original `replacedEntryEvidence` snippet (verifies the project hook was actually removed). | Read the hook config; check tag count + scan remaining entry bodies. | One orchestra entry, no echoes of the replaced entry. | Zero or 2+ orchestra entries, OR replaced entry's snippet still present. | critical |
| `cursor.hooks.overlap.adopt-honoured` | When `stopHookOverlapResolution.value === "adopt-existing"`, the entry referenced by `evidence.entryIndex` carries `metadata.orchestra: true` AND its prompt body's SHA-256 matches `adoptedEntryDigest`. | Read the entry; compute SHA-256; compare. | Tag present, digest match. | Tag missing, digest mismatch (drift), or entry removed. | warning (drift) / critical (missing) |
| `cursor.hooks.overlap.no-overlap-clean` | When `stopHookOverlapResolution.value === null`, no overlap detection re-run produces a different verdict against the current `hooks.stop`. | Re-run the §3.11 detector against the current hook config. | Detection still reports no overlap. | Detection now reports overlap (a new project hook was added since install). | warning |

If `cursor.hooks.overlap.adopt-honoured` reports a digest mismatch, the audit follows [`../../core/conflict/stop-hook-overlap.md`](../../core/conflict/stop-hook-overlap.md) §6: surface the drift, ask whether to re-adopt the new content or revert to the orchestra default. The check itself does not auto-resolve.

---

## 8.8 Pack rule glob filter checks (introduced in v1.3.0)

For each detected stack that has a pack applied (i.e., `stacks[].stackPack` is non-null in the marker):

| id | what | how | pass | fail | severity |
|----|------|-----|------|------|----------|
| `packs.<stack>.installed-rules.files-exist` | Every rule file listed in `stacks[].installedPackRules[]` has a corresponding `.cursor/rules/<stack-id>-<topic>.mdc` file. | File check per entry. | All exist. | Any missing. | critical |
| `packs.<stack>.skipped-rules.no-files` | No rule file listed in `stacks[].skippedPackRules[]` has a corresponding file in `.cursor/rules/`. | Negative file check per entry. | None found. | A skipped rule's file is present (it was manually created or not properly filtered). | warning |
| `packs.<stack>.filter.recorded` | The marker has both `installedPackRules[]` and `skippedPackRules[]` for each applied pack (both may be empty arrays, but both must be present). | JSON path check. | Both present. | Either absent. | warning |

Checks in this section are **skipped** for stacks that have no pack applied (`stacks[].stackPack === null`).

---

## 8.7 Always-on rule ceiling check (introduced in v1.3.0)

This check is **informational and non-blocking** — it makes the always-on rule count visible before context-window pressure bites. The audit re-runs it on every invocation.

| id | what | how | pass | fail | severity |
|----|------|-----|------|------|----------|
| `cursor.rules.always-on.count` | Count all `.mdc` files in `.cursor/rules/` that have `alwaysApply: true` in their frontmatter. | Enumerate `.cursor/rules/*.mdc`; parse each frontmatter; count `alwaysApply: true` entries. | Count ≤ 4. | Count > 4: emit `warning` listing each always-on rule with its `description`. | warning |

When the count exceeds 4, the post-install report MUST list each always-on rule (file path + `description` value) so the user can decide which, if any, to demote to manual-trigger. The check does not auto-demote any rule.

**Soft threshold rationale.** The orchestra itself installs at most 2 always-on rules (`ai-director.mdc` + `orchestra-context.mdc`). Projects with 1–2 hand-authored always-on rules will land at 3–4 total — comfortably within the threshold. Projects that already have 3+ always-on rules before the install are likely to cross the threshold; they are the primary audience for this warning.

---

## 8.6 Sub-project detection check (introduced in v1.3.0)

Verifies that the secondary scan in [`../../core/discovery/DETECTION.md`](../../core/discovery/DETECTION.md) §3.4 ran and its results are recorded in the marker:

| id | what | how | pass | fail | severity |
|----|------|-----|------|------|----------|
| `marker.subprojects.scanned` | When top-level subdirectories with manifest files exist in the project, the marker contains a `subProjects[]` field (even if empty). | Check for `subProjects` key in marker JSON. | Field present. | Field absent (marker was written by a pre-v1.3 adapter). | info |
| `marker.subprojects.paths-valid` | Every `subProjects[].path` in the marker is a real subdirectory of the project root. | File check per entry. | All exist. | Any missing. | warning |

This check runs on every install and audit. Pre-v1.3 markers without `subProjects` fail only the first check at `info` severity — not an error; the audit proposes adding the field on the next upgrade.

---

## 9. Idempotency check (only on re-run)

When the adapter detects an existing marker with the current orchestra version (Phase 3 of RUN.md), one extra check runs:

| id | what | how | pass | fail | severity |
|----|------|-----|------|------|----------|
| `idempotency.zero-diff` | Re-running the install produced only `skip` actions (or `propose` for user-edited content). | Inspect Phase 5's plan output. | Zero non-skip actions. | Any unexpected `create` / `extend-section` / `merge-json`. | critical |

If this check fails on an idempotent re-run, the adapter has a bug. Surface it explicitly.

---

## 10. Reporting

The adapter's closing message (Phase 9) MUST include:

- The summary line: `<pass>/<total> checks passed`.
- The full list of any failed `critical` checks.
- A short list of any failed `warning` checks.
- A pointer to `marker.history[]` for historical comparison (the audit skill appends `action: "audit"` entries on every run).

The audit skill consumes the same check list — running it later regenerates this report against current state.

---

## 11. References

- [`INSTALL.md`](INSTALL.md) §4 (Phase 8) — invocation point.
- [`target-schema.md`](target-schema.md) — the truth this file checks against.
- [`mappings.md`](mappings.md) — actions that produce the state being checked.
- [`mcp.md`](mcp.md) — MCP-specific schema for §7.
- [`render-rules.md`](render-rules.md) — frontmatter shapes for §4.
- [`../_contract.md`](../_contract.md) §2 — `post-install-checks.md` is a required adapter file.
- [`../../core/registry/install.schema.md`](../../core/registry/install.schema.md) — marker schema for §8.
- [`../../core/conflict/stop-hook-overlap.md`](../../core/conflict/stop-hook-overlap.md) — F4 contract verified by §8.5.
- [`../../core/skills/audit/ai-infra-audit/SKILL.md`](../../core/skills/audit/ai-infra-audit/SKILL.md) — re-runs these checks on every audit.

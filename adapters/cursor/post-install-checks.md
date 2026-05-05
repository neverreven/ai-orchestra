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

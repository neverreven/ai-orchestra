# Codex adapter — post-install-checks.md

> Phase 8 of [`INSTALL.md`](INSTALL.md). After the install applies, the adapter runs every check in this file. Each check is **deterministic**, file-only, and machine-verifiable.

If any check fails, the adapter must report the failure in the closing message (Phase 9). The audit skill ([`../../core/skills/audit/ai-infra-audit/SKILL.md`](../../core/skills/audit/ai-infra-audit/SKILL.md)) re-runs these checks on every audit.

---

## 1. Check format

Same as the Cursor adapter (per [`../cursor/post-install-checks.md`](../cursor/post-install-checks.md) §1): id / what / how / pass / fail / severity.

---

## 2. Filesystem-presence checks

| id | what | how | pass | fail | severity |
|----|------|-----|------|------|----------|
| `marker.exists` | `.ai-orchestra/install.json` exists. | File check. | Exists. | Absent. | critical |
| `agents.md.exists` | `AGENTS.md` exists in project root. | File check. | Exists. | Absent. | critical |
| `learnings.exists` | Learnings file exists at the path recorded in the marker. | Read marker `learnings.path`; check file. | Exists. | Absent. | critical |
| `mcp.exists` | `.codex/mcp.json` exists if any slots registered. | Read marker `mcpSlots[]`. | File exists when slots > 0. | Slots > 0 but file absent. | critical |
| `core.preserved` | `ai-orchestra/` directory remains in the project root. | Directory check. | Exists. | Absent. | critical |
| `core.skills.preserved` | For every entry in `marker.skills[]`, the source SKILL.md still exists at `marker.skills[].source`. | File check per entry. | All exist. | Any missing. | critical |

The last two are unique to the Codex adapter — they exist because the Codex install relies on the orchestra core remaining in the repo. Removing it breaks skill execution.

---

## 3. JSON-validity checks

| id | what | how | pass | fail | severity |
|----|------|-----|------|------|----------|
| `marker.json.valid` | `.ai-orchestra/install.json` is valid JSON. | Parse. | Parses. | Parse error. | critical |
| `marker.schema.matches` | Marker validates against [`../../core/registry/install.schema.md`](../../core/registry/install.schema.md). | Verify required fields present and types correct. | Validates. | Schema violation. | critical |
| `mcp.json.valid` | `.codex/mcp.json` is valid JSON when present. | Parse. | Parses or absent. | Parse error. | critical |

---

## 4. Managed-section checks

| id | what | how | pass | fail | severity |
|----|------|-----|------|------|----------|
| `agents.section.markers` | `AGENTS.md` contains the marker pair (start + end) exactly once. | Regex match. | Exactly one pair. | Zero or multiple pairs. | critical |
| `agents.section.body` | Content between markers includes Identity, Director protocol, Roles installed, Skill catalog, Critical non-negotiables, Pointers, Declared gaps subheadings (per [`target-schema.md`](target-schema.md) §2). | Heading regex. | All present. | Any missing. | warning |
| `agents.section.placeholders` | No `{{...}}` patterns remain in the rendered managed section. | Regex search. | Zero matches. | One or more matches. | critical |

---

## 4.1 Suffix-renamed always-on downgrade checks

When the install produced a `suffix-rename` for the `AGENTS.md` managed content (resulting in `AGENTS.orchestra.md`), these checks verify the downgrade was applied correctly per [`mappings.md`](mappings.md) §6.1:

| id | what | how | pass | fail | severity |
|----|------|-----|------|------|----------|
| `codex.suffix-renamed.downgrade-note` | `AGENTS.orchestra.md` (if present) contains the leading blockquote note explaining it is NOT auto-loaded. | Regex match for `> **Note:** This file is a suffix-renamed orchestra copy`. | Present. | Missing. | warning |
| `codex.suffix-renamed.marker-not-always-on` | The install marker's corresponding `rules[]` entry has `alwaysOn: false`. | JSON path check on marker. | `false`. | `true` or missing. | critical |
| `codex.suffix-renamed.no-double-load` | `AGENTS.md` and `AGENTS.orchestra.md` do not both contain the orchestra managed-section markers. | Check for marker pair in both files. | At most one file has the markers. | Both files have the marker pair. | warning |

Checks in this section are **skipped** when no suffix-renamed always-on artifacts exist in the marker.

---

## 5. Skill catalog checks

For every entry in `marker.skills[]`:

| id | what | how | pass | fail | severity |
|----|------|-----|------|------|----------|
| `catalog.<id>.heading.exists` | `AGENTS.md` Skill catalog has a heading for `<skill-id>`. | Heading regex. | Present. | Absent. | critical |
| `catalog.<id>.triggers` | Heading entry lists at least one trigger phrase. | Bullet regex. | Non-empty. | Empty. | critical |
| `catalog.<id>.source.link` | Heading entry has a link to the orchestra core's source SKILL.md whose target resolves to a real file. | Markdown link parse + file check. | Resolves. | Broken. | critical |
| `catalog.<id>.source.body.required-sections` | The linked source SKILL.md has `## Trigger`, `## When to use`, `## When NOT to use`, `## Process`, `## Output`, `## References`. | Heading regex. | All present. | Any missing. | warning |

The Codex adapter's skill checks operate against the orchestra core's source files (since skills are referenced, not copied) — different from Cursor and Claude Code, which check rendered files in the project.

---

## 5.1 Skill name overlap checks

When the install marker's `skills[]` includes any entry with a `disambiguated: true` flag (a skill catalog entry was disambiguated because the project already had conflicting trigger phrases outside the managed section), these checks verify the disambiguation was applied:

| id | what | how | pass | fail | severity |
|----|------|-----|------|------|----------|
| `codex.catalog.overlap.description-prefix` | Every disambiguated skill catalog entry has `[Orchestra]` prefix in its description text. | Search the managed section's catalog entries. | Prefix present for each flagged entry. | Prefix missing. | warning |
| `codex.catalog.overlap.disambiguation-note` | Disambiguated entries include the "Note: the project also defines…" text. | Substring search in the catalog entry. | Note present. | Note missing. | warning |
| `codex.catalog.overlap.report` | The post-install report contains an `## Overlapping skills` section listing each overlap. | Check Phase 9 closing message or marker install-entry `summary`. | Present when overlaps exist. | Missing when disambiguated entries exist. | warning |

Checks in this section are **skipped** when no disambiguated skill entries exist in the marker.

---

## 6. Stop-hook gap check

The Codex adapter declares the stop-hook as a gap (per [`INSTALL.md`](INSTALL.md) §6). The check confirms the gap is recorded:

| id | what | how | pass | fail | severity |
|----|------|-----|------|------|----------|
| `hooks.stop.gap.declared` | `marker.hooks.Stop.registered == false` AND `marker.hooks.Stop.gapReason` is non-empty. | Field check. | Match. | Mismatch. | critical |
| `hooks.stop.gap.documented` | `AGENTS.md` Declared-gaps section names the stop-hook gap with its user-facing fallback. | Substring search. | Present. | Missing. | warning |

---

## 7. MCP checks

| id | what | how | pass | fail | severity |
|----|------|-----|------|------|----------|
| `mcp.slots.placeholder` | Every slot the orchestra registered has `metadata.orchestra: true` AND a non-empty placeholder body (per [`mcp.md`](mcp.md) §5). | Parse + check. | All slots conform. | Any non-conforming. | critical |
| `mcp.user.preserved` | Pre-existing user MCP entries are preserved verbatim. | Diff vs Phase 3 inventory. | All preserved. | Any altered. | critical |
| `mcp.slots.recorded` | Every slot in `.codex/mcp.json` with `metadata.orchestra: true` is also in `marker.mcpSlots[]` (matched by `name`). | Set comparison. | Equal. | Drift. | warning |

---

## 8. Marker consistency checks

| id | what | how | pass | fail | severity |
|----|------|-----|------|------|----------|
| `marker.ide.id` | `marker.ide.id == "codex"`. | Field check. | Equal. | Other. | critical |
| `marker.ide.adapterVersion.matches.core` | `marker.ide.adapterVersion == marker.orchestra.version` in v1. | Field equality. | Equal. | Drift. | warning |
| `marker.skills.paths.exist` | Every `marker.skills[].source` resolves to a real file. | File checks. | All exist. | Any missing. | critical |
| `marker.timestamps.sane` | `marker.orchestra.installedAt` ≤ now; `marker.history[*].at` is monotonic non-decreasing. | Date math. | Sane. | Out of order. | warning |
| `marker.contract.versions` | `marker.scheduler.contractVersion == 1`, `marker.notifications.contractVersion == 1`. (`hooks.Stop.contractVersion` is `null` per the declared gap.) | Field check. | All match. | Any mismatch. | critical |
| `marker.history.coherent` | Exactly one `action: "install"` entry exists; subsequent entries are `audit` or `upgrade`. | Filter + count. | Conforms. | Multiple installs or unknown action. | critical |
| `marker.gaps.declared` | The marker has a `history[]` install entry whose `summary` enumerates the declared gaps. | Substring search. | Present. | Missing. | warning |

---

## 8.5 Stop-hook overlap resolution checks (introduced in v1.2.0)

Verify the orchestra honoured the user's choice for the F4 stop-hook overlap (per [`../../core/conflict/stop-hook-overlap.md`](../../core/conflict/stop-hook-overlap.md)). Codex has no native session-end hook, so these checks operate against any user-adopted fallback (project `AGENTS.md` "session protocol" passage, saved system prompt, etc.) detected by [`../../core/discovery/existing-infra.md`](../../core/discovery/existing-infra.md) §3.11. When no fallback is detected (`value: null`), only the recorded-marker check runs.

| id | what | how | pass | fail | severity |
|----|------|-----|------|------|----------|
| `codex.hooks.overlap.recorded` | Marker has `installScope.stopHookOverlapResolution` with `value`, `detectedAt`, `decidedAt`, `decidedBy`. | JSON path check. | All four fields present. | Any field missing. | critical |
| `codex.hooks.overlap.skip-honoured` | When `value === "skip-orchestra"`, the orchestra has not introduced any new "session-end audit" passage into `AGENTS.md`. | Search the marker's `agentsDoc` managed section for orchestra-added session-end content. | Absent. | Present. | warning |
| `codex.hooks.overlap.replace-degraded` | When `value === "replace-with-orchestra"`, the marker carries `evidence.degradedTo: "propose"` (Codex cannot rewrite a fallback automatically — see [`mappings.md`](mappings.md) §5). | Field check. | Present. | Missing. | warning |
| `codex.hooks.overlap.adopt-honoured` | When `value === "adopt-existing"`, the SHA-256 of the adopted fallback content matches `adoptedEntryDigest`. | Re-read the fallback location; compute SHA-256; compare. | Match. | Mismatch (drift) or fallback removed. | warning (drift) / critical (missing) |
| `codex.hooks.overlap.no-overlap-clean` | When `value === null`, re-running detection still reports no overlap. | Re-run §3.11 detector. | No overlap. | Detection now reports overlap. | warning |

---

## 8.8 Pack rule glob filter checks (introduced in v1.3.0)

For each detected stack with a pack applied (`stacks[].stackPack` non-null):

| id | what | how | pass | fail | severity |
|----|------|-----|------|------|----------|
| `codex.packs.<stack>.filter.recorded` | Both `installedPackRules[]` and `skippedPackRules[]` are present for each applied pack. | JSON path check. | Both present (arrays, possibly empty). | Either absent. | warning |
| `codex.packs.<stack>.skipped-rules.not-in-managed-section` | No rule content from `skippedPackRules[]` appears in the `AGENTS.md` managed section. | Search managed-section headings for rule topic names. | Absent. | Present (filter was not applied). | warning |

Checks skipped when no pack is applied.

---

## 8.7 Always-on context ceiling check (introduced in v1.3.0)

Codex reads `AGENTS.md` at session start. Like the Cursor adapter's always-on rule check, this check counts total always-on context sources:

| id | what | how | pass | fail | severity |
|----|------|-----|------|------|----------|
| `codex.context.always-on.count` | Count distinct auto-loaded context sources: project-root `AGENTS.md` + any `AGENTS.md` in parent directories (up to 3 levels) + `~/.codex/AGENTS.md` if present. | Check file existence at each path. | Count ≤ 4. | Count > 4: emit `warning` listing each file and its approximate size. | warning |

When the count exceeds 4, the post-install report lists each auto-loaded file. Non-blocking — the user decides which content to consolidate.

---

## 8.6 Sub-project detection check (introduced in v1.3.0)

Same as the Cursor adapter (per [`../cursor/post-install-checks.md`](../cursor/post-install-checks.md) §8.6):

| id | what | how | pass | fail | severity |
|----|------|-----|------|------|----------|
| `marker.subprojects.scanned` | Marker contains `subProjects[]` field when sub-directories with manifests exist. | Key presence check. | Present. | Absent. | info |
| `marker.subprojects.paths-valid` | Every `subProjects[].path` is a real subdirectory of the project root. | File check per entry. | All exist. | Any missing. | warning |

---

## 9. Idempotency check (only on re-run)

Re-render the managed section from the same inputs and compare against the content currently between the markers in `AGENTS.md`.

| id | what | how | pass | fail | severity |
|----|------|-----|------|------|----------|
| `idempotency.zero-diff` | Every rendered artifact is byte-identical to the file on disk. | Re-render via `render-rules.md` with the inputs from the install marker. Compare. | Zero diff. | Report which file and which section diverged. | critical |
| `idempotency.history-stable` | `history[]` did not grow. | Read the marker; the last `history[]` entry's `at` timestamp should match the install/upgrade timestamp, not now. | Unchanged. | Extra `history[]` entry means a re-run wrote to the marker unintentionally. | warning |

A zero-diff result proves the determinism contract from [`render-rules.md`](render-rules.md) §8. If it fails, either the rendering has a source of non-determinism (bug) or a file was edited externally (expected — the audit surfaces this as drift).

---

## 10. Reporting

Same as Cursor (per [`../cursor/post-install-checks.md`](../cursor/post-install-checks.md) §10). The Codex closing message places extra emphasis on:

- The orchestra core's continued presence in the repo (Codex skills depend on it).
- The declared stop-hook gap and its manual fallbacks.
- The MCP slot caveat (the user may need to copy entries into Codex's runtime config).

---

## 11. References

- [`INSTALL.md`](INSTALL.md) §4 (Phase 8) — invocation point.
- [`target-schema.md`](target-schema.md) — the truth this file checks against.
- [`mappings.md`](mappings.md) — actions that produce the state being checked.
- [`mcp.md`](mcp.md) — MCP-specific schema for §7.
- [`../cursor/post-install-checks.md`](../cursor/post-install-checks.md) — full-adapter reference.
- [`../claude-code/post-install-checks.md`](../claude-code/post-install-checks.md) — sibling baseline.
- [`../_contract.md`](../_contract.md) §2 — `post-install-checks.md` is a required adapter file.
- [`../_stop-hook.md`](../_stop-hook.md) — stop-hook contract (declared gap for Codex).
- [`../../core/registry/install.schema.md`](../../core/registry/install.schema.md) — marker schema for §8.
- [`../../core/conflict/stop-hook-overlap.md`](../../core/conflict/stop-hook-overlap.md) — F4 contract verified by §8.5.
- [`../../core/skills/audit/ai-infra-audit/SKILL.md`](../../core/skills/audit/ai-infra-audit/SKILL.md) — re-runs these checks on every audit.

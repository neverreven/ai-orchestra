# Claude Code adapter — post-install-checks.md

> Phase 8 of [`INSTALL.md`](INSTALL.md). After the install applies, the adapter runs every check in this file. Each check is **deterministic**, file-only, and machine-verifiable.

If any check fails, the adapter must report the failure in the closing message (Phase 9). The audit skill ([`../../core/skills/audit/ai-infra-audit/SKILL.md`](../../core/skills/audit/ai-infra-audit/SKILL.md)) re-runs these checks on every audit.

---

## 1. Check format

Same as the Cursor adapter (per [`../cursor/post-install-checks.md`](../cursor/post-install-checks.md) §1): each check has id / what / how / pass / fail / severity. Results aggregate into a structured report.

---

## 2. Filesystem-presence checks

| id | what | how | pass | fail | severity |
|----|------|-----|------|------|----------|
| `claude.dir.exists` | `.claude/` exists in project root. | Directory check. | Exists. | Absent. | critical |
| `claude.commands.dir.exists` | `.claude/commands/` exists when at least one skill installed. | Directory check + marker `skills[]` length. | Exists when skills > 0. | Skills > 0 but directory absent. | critical |
| `marker.exists` | `.ai-orchestra/install.json` exists. | File check. | Exists. | Absent. | critical |
| `claude.md.exists` | `CLAUDE.md` exists in project root. | File check. | Exists. | Absent. | critical |
| `agents.md.exists` | `AGENTS.md` exists in project root. | File check. | Exists. | Absent. | critical |
| `learnings.exists` | Learnings file exists at the path recorded in the marker. | Read marker `learnings.path`; check file. | Exists. | Absent. | critical |
| `claude.settings.exists` | `.claude/settings.json` exists if marker recorded the stop-hook registered. | Read marker `hooks.Stop.registered`. | File exists when `registered: true`; file absence allowed when `registered: false`. | Marker says registered but file absent. | critical |
| `mcp.exists` | `.mcp.json` exists in project root if any slots registered. | Read marker `mcpSlots[]`. | File exists when slots > 0. | Slots > 0 but file absent. | critical |

---

## 3. JSON-validity checks

| id | what | how | pass | fail | severity |
|----|------|-----|------|------|----------|
| `marker.json.valid` | `.ai-orchestra/install.json` is valid JSON. | Parse. | Parses. | Parse error. | critical |
| `marker.schema.matches` | Marker validates against [`../../core/registry/install.schema.md`](../../core/registry/install.schema.md). | Verify required fields present and types correct. | Validates. | Schema violation. | critical |
| `claude.settings.json.valid` | `.claude/settings.json` is valid JSON when present. | Parse. | Parses or absent. | Parse error. | critical |
| `mcp.json.valid` | `.mcp.json` is valid JSON when present. | Parse. | Parses or absent. | Parse error. | critical |

---

## 4. Managed-section checks

For both `CLAUDE.md` and `AGENTS.md`:

| id | what | how | pass | fail | severity |
|----|------|-----|------|------|----------|
| `claude.section.markers` | `CLAUDE.md` contains the marker pair (start + end) exactly once. | Regex match. | Exactly one pair. | Zero or multiple pairs. | critical |
| `claude.section.body` | Content between markers includes Identity, Director protocol, Roles installed, Skills installed, Pointers subheadings (per [`target-schema.md`](target-schema.md) §2). | Heading regex. | All present. | Any missing. | warning |
| `claude.section.placeholders` | No `{{...}}` patterns remain in the rendered Director protocol body. | Regex search. | Zero matches. | One or more matches. | critical |
| `agents.section.markers` | `AGENTS.md` contains the marker pair (start + end) exactly once. | Regex match. | Exactly one pair. | Zero or multiple pairs. | critical |
| `agents.section.parity` | Content between `AGENTS.md` markers byte-equals content between `CLAUDE.md` markers. | Hash compare. | Equal. | Drift. | warning |

---

## 4.1 Suffix-renamed always-on downgrade checks

When the install produced a `suffix-rename` for an always-on artifact (the `CLAUDE.md` managed content, resulting in `CLAUDE.orchestra.md`), these checks verify the downgrade was applied correctly per [`mappings.md`](mappings.md) §6.1:

| id | what | how | pass | fail | severity |
|----|------|-----|------|------|----------|
| `claude.suffix-renamed.downgrade-note` | `CLAUDE.orchestra.md` (if present) contains the leading blockquote note explaining it is NOT auto-loaded. | Regex match for `> **Note:** This file is a suffix-renamed orchestra copy`. | Present. | Missing. | warning |
| `claude.suffix-renamed.marker-not-always-on` | The install marker's corresponding `rules[]` entry has `alwaysOn: false`. | JSON path check on marker. | `false`. | `true` or missing. | critical |
| `claude.suffix-renamed.no-double-load` | `CLAUDE.md` and `CLAUDE.orchestra.md` do not both contain the orchestra managed-section markers. | Check for marker pair in both files. | At most one file has the markers. | Both files have the marker pair. | warning |

Checks in this section are **skipped** when no suffix-renamed always-on artifacts exist in the marker.

---

## 5. Skill-file checks

For every entry in `marker.skills[]`:

| id | what | how | pass | fail | severity |
|----|------|-----|------|------|----------|
| `skills.<id>.file.exists` | `.claude/commands/<skill-id>.md` exists. | File check. | Exists. | Absent. | critical |
| `skills.<id>.frontmatter.description` | Frontmatter has a non-empty `description` that includes at least one trigger phrase from the source SKILL.md. | Parse YAML; regex search. | Match. | Missing or no triggers. | warning |
| `skills.<id>.body.required-sections` | Body has `## Trigger`, `## When to use`, `## When NOT to use`, `## Process`, `## Output`, `## References`. | Heading regex. | All present. | Any missing. | critical |

---

## 5.1 Skill name overlap checks

When the install marker's `skills[]` includes any entry with `action: "suffix-rename"` (a skill was renamed because the project already had a same-named command at `.claude/commands/<skill-id>.md`), these checks verify the disambiguation was applied correctly per [`mappings.md`](mappings.md) §4:

| id | what | how | pass | fail | severity |
|----|------|-----|------|------|----------|
| `claude.skills.overlap.description-prefix` | Every suffix-renamed orchestra skill has `[Orchestra]` at the start of its `description` frontmatter. | Parse YAML frontmatter of each renamed skill file. | Prefix present. | Prefix missing. | warning |
| `claude.skills.overlap.disambiguation-note` | The description includes the disambiguation note pointing at the project skill's path. | Substring search in `description`. | Note present. | Note missing. | warning |
| `claude.skills.overlap.report` | The post-install report contains an `## Overlapping skills` section listing each overlap. | Check that the Phase 9 closing message or marker install-entry `summary` contains "Overlapping skills". | Present when overlaps exist. | Missing when `marker.skills[]` has suffix-renamed entries. | warning |

Checks in this section are **skipped** when no suffix-renamed skills exist in the marker.

---

## 6. Hook checks (when supported)

Run these only when `marker.hooks.Stop.registered == true`:

| id | what | how | pass | fail | severity |
|----|------|-----|------|------|----------|
| `hooks.stop.entry.exists` | `.claude/settings.json` has at least one entry under `hooks.Stop` whose `metadata.orchestra` is `true`. | Parse + filter. | Exactly one. | Zero or more than one. | critical |
| `hooks.stop.entry.contract` | The orchestra entry's `metadata.contractVersion` matches `marker.hooks.Stop.contractVersion`. | Compare. | Match. | Mismatch. | critical |
| `hooks.stop.entry.prompt` | The orchestra entry's `prompt` references the learnings path (substring match). | Substring search. | Found. | Missing. | warning |
| `hooks.others.preserved` | If other hook entries existed prior to install, every prior entry is still present. | Diff vs Phase 3 inventory. | All preserved. | Any removed. | critical |

When `marker.hooks.Stop.registered == false`, the post-install report names this as a declared gap (per [`INSTALL.md`](INSTALL.md) §6) and skips the hook checks. The check `hooks.stop.gap.declared` runs instead:

| id | what | how | pass | fail | severity |
|----|------|-----|------|------|----------|
| `hooks.stop.gap.declared` | `marker.hooks.Stop.gapReason` is non-empty. | Field check. | Non-empty string. | Empty or missing. | critical |

---

## 7. MCP checks

| id | what | how | pass | fail | severity |
|----|------|-----|------|------|----------|
| `mcp.slots.placeholder` | Every slot the orchestra registered has `metadata.orchestra: true` AND a non-empty placeholder body (per [`mcp.md`](mcp.md) §5). | Parse + check. | All slots conform. | Any non-conforming. | critical |
| `mcp.user.preserved` | Pre-existing user MCP entries are preserved verbatim. | Diff vs Phase 3 inventory. | All preserved. | Any altered. | critical |
| `mcp.slots.recorded` | Every slot in `.mcp.json` with `metadata.orchestra: true` is also in `marker.mcpSlots[]` (matched by `name`). | Set comparison. | Equal. | Drift. | warning |

---

## 8. Marker consistency checks

| id | what | how | pass | fail | severity |
|----|------|-----|------|------|----------|
| `marker.ide.id` | `marker.ide.id == "claude-code"`. | Field check. | Equal. | Other. | critical |
| `marker.ide.adapterVersion.matches.core` | `marker.ide.adapterVersion == marker.orchestra.version` in v1. | Field equality. | Equal. | Drift. | warning |
| `marker.skills.paths.exist` | Every `marker.skills[].source` exists; every `.claude/commands/<id>.md` exists. | File checks. | All exist. | Any missing. | critical |
| `marker.timestamps.sane` | `marker.orchestra.installedAt` ≤ now; `marker.history[*].at` is monotonic non-decreasing. | Date math. | Sane. | Out of order. | warning |
| `marker.contract.versions` | `marker.scheduler.contractVersion == 1`, `marker.notifications.contractVersion == 1`. (`hooks.Stop.contractVersion` is checked in §6 conditionally.) | Field check. | All match. | Any mismatch. | critical |
| `marker.history.coherent` | Exactly one `action: "install"` entry exists in `history[]`; subsequent entries are `audit` or `upgrade`. | Filter + count. | Conforms. | Multiple installs or unknown action. | critical |
| `marker.gaps.declared` | When the adapter declared any gap (per [`INSTALL.md`](INSTALL.md) §6), the marker has a `history[]` entry summarising the declared gaps. | Substring search in `history[].summary`. | Present. | Missing. | warning |

---

## 8.5 Stop-hook overlap resolution checks (introduced in v1.2.0)

Verify the orchestra honoured the user's choice for the F4 stop-hook overlap (per [`../../core/conflict/stop-hook-overlap.md`](../../core/conflict/stop-hook-overlap.md)). Skipped entirely on Claude Code versions where the hook gap applies (`hooks.Stop.registered === false`).

| id | what | how | pass | fail | severity |
|----|------|-----|------|------|----------|
| `claude.hooks.overlap.recorded` | Marker has `installScope.stopHookOverlapResolution` with `value`, `detectedAt`, `decidedAt`, `decidedBy`. | JSON path check. | All four fields present. | Any field missing. | critical |
| `claude.hooks.overlap.skip-honoured` | When `value === "skip-orchestra"`, `.claude/settings.json` `hooks.Stop` contains zero orchestra-tagged entries. | Read `hooks.Stop`; filter for `metadata.orchestra === true`. | Zero. | One or more. | critical |
| `claude.hooks.overlap.replace-honoured` | When `value === "replace-with-orchestra"`, exactly one orchestra entry under `hooks.Stop` AND no other entry's body matches the original `replacedEntryEvidence` snippet. | Tag count + body scan. | One entry, replaced snippet absent. | Any other state. | critical |
| `claude.hooks.overlap.adopt-honoured` | When `value === "adopt-existing"`, the entry at `evidence.entryIndex` carries `metadata.orchestra: true` AND its prompt body's SHA-256 matches `adoptedEntryDigest`. | Read entry; compute SHA-256; compare. | Tag present, digest matches. | Tag missing, digest mismatch (drift), or entry removed. | warning (drift) / critical (missing) |
| `claude.hooks.overlap.no-overlap-clean` | When `value === null`, re-running detection still reports no overlap. | Re-run §3.11 detector. | No overlap. | Detection now reports overlap. | warning |

---

## 8.8 Pack rule glob filter checks (introduced in v1.3.0)

For each detected stack with a pack applied (`stacks[].stackPack` non-null):

| id | what | how | pass | fail | severity |
|----|------|-----|------|------|----------|
| `claude.packs.<stack>.filter.recorded` | Both `installedPackRules[]` and `skippedPackRules[]` are present for each applied pack. | JSON path check. | Both present (arrays, possibly empty). | Either absent. | warning |
| `claude.packs.<stack>.skipped-rules.not-in-managed-section` | No rule content from `skippedPackRules[]` appears in the `CLAUDE.md` managed section. | Search managed-section headings for rule topic names. | Absent. | Present (filter was not applied). | warning |

Checks skipped when no pack is applied.

---

## 8.7 Always-on context ceiling check (introduced in v1.3.0)

Claude Code auto-loads `CLAUDE.md` (and any `CLAUDE.md` found in parent directories). The orchestra contributes one managed section to `CLAUDE.md`. This check counts how many distinct always-on context sources are active after install:

| id | what | how | pass | fail | severity |
|----|------|-----|------|------|----------|
| `claude.context.always-on.count` | Count distinct auto-loaded context files: project-root `CLAUDE.md` + any parent `CLAUDE.md` files (up to 3 levels) + `~/.claude/CLAUDE.md` if present. | Check file existence at each path. | Count ≤ 4 total auto-loaded files. | Count > 4: emit `warning` listing each file and its approximate size. | warning |

When the count exceeds 4, the post-install report lists each auto-loaded file so the user can decide which content to consolidate or move to on-demand commands.

---

## 8.6 Sub-project detection check (introduced in v1.3.0)

Same as the Cursor adapter (per [`../cursor/post-install-checks.md`](../cursor/post-install-checks.md) §8.6). Check ids use prefix `claude.*` instead of `cursor.*`:

| id | what | how | pass | fail | severity |
|----|------|-----|------|------|----------|
| `marker.subprojects.scanned` | Marker contains `subProjects[]` field when sub-directories with manifests exist. | Key presence check. | Present. | Absent. | info |
| `marker.subprojects.paths-valid` | Every `subProjects[].path` is a real subdirectory of the project root. | File check per entry. | All exist. | Any missing. | warning |

---

## 9. Idempotency check (only on re-run)

| id | what | how | pass | fail | severity |
|----|------|-----|------|------|----------|
| `idempotency.zero-diff` | Re-running the install produced only `skip` actions (or `propose` for user-edited content). | Inspect Phase 5's plan output. | Zero non-skip actions. | Any unexpected `create` / `extend-section` / `merge-json`. | critical |

---

## 10. Reporting

Same as Cursor (per [`../cursor/post-install-checks.md`](../cursor/post-install-checks.md) §10). The closing message names declared gaps explicitly and points to `marker.history[]` for historical comparison.

---

## 11. References

- [`INSTALL.md`](INSTALL.md) §4 (Phase 8) — invocation point.
- [`target-schema.md`](target-schema.md) — the truth this file checks against.
- [`mappings.md`](mappings.md) — actions that produce the state being checked.
- [`mcp.md`](mcp.md) — MCP-specific schema for §7.
- [`../cursor/post-install-checks.md`](../cursor/post-install-checks.md) — full-adapter reference.
- [`../_contract.md`](../_contract.md) §2 — `post-install-checks.md` is a required adapter file.
- [`../_stop-hook.md`](../_stop-hook.md) — stop-hook contract validated by §6.
- [`../../core/registry/install.schema.md`](../../core/registry/install.schema.md) — marker schema for §8.
- [`../../core/conflict/stop-hook-overlap.md`](../../core/conflict/stop-hook-overlap.md) — F4 contract verified by §8.5.
- [`../../core/skills/audit/ai-infra-audit/SKILL.md`](../../core/skills/audit/ai-infra-audit/SKILL.md) — re-runs these checks on every audit.

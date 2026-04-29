# VS Code (Copilot) adapter — post-install-checks.md

> Phase 8 of [`INSTALL.md`](INSTALL.md). After the install applies, the adapter runs every check in this file. Each check is **deterministic**, file-only, and machine-verifiable.

If any check fails, the adapter must report the failure in the closing message (Phase 9). The audit skill ([`../../core/skills/audit/ai-infra-audit/SKILL.md`](../../core/skills/audit/ai-infra-audit/SKILL.md)) re-runs these checks on every audit.

---

## 1. Check format

Same as the Cursor adapter (per [`../cursor/post-install-checks.md`](../cursor/post-install-checks.md) §1): id / what / how / pass / fail / severity.

---

## 2. Filesystem-presence checks

| id | what | how | pass | fail | severity |
|----|------|-----|------|------|----------|
| `github.dir.exists` | `.github/` exists in project root. | Directory check. | Exists. | Absent. | critical |
| `github.prompts.dir.exists` | `.github/prompts/` exists when at least one skill installed. | Directory check + marker `skills[]` length. | Exists when skills > 0. | Skills > 0 but directory absent. | critical |
| `vscode.dir.exists` | `.vscode/` exists when MCP slots registered. | Directory check + marker `mcpSlots[]` length. | Exists when slots > 0. | Slots > 0 but directory absent. | critical |
| `marker.exists` | `.ai-orchestra/install.json` exists. | File check. | Exists. | Absent. | critical |
| `copilot.instructions.exists` | `.github/copilot-instructions.md` exists. | File check. | Exists. | Absent. | critical |
| `agents.md.exists` | `AGENTS.md` exists in project root. | File check. | Exists. | Absent. | critical |
| `learnings.exists` | Learnings file exists at the path recorded in the marker. | Read marker `learnings.path`; check file. | Exists. | Absent. | critical |
| `mcp.exists` | `.vscode/mcp.json` exists if any slots registered. | Read marker `mcpSlots[]`. | File exists when slots > 0. | Slots > 0 but file absent. | critical |

---

## 3. JSON-validity checks

| id | what | how | pass | fail | severity |
|----|------|-----|------|------|----------|
| `marker.json.valid` | `.ai-orchestra/install.json` is valid JSON. | Parse. | Parses. | Parse error. | critical |
| `marker.schema.matches` | Marker validates against [`../../core/registry/install.schema.md`](../../core/registry/install.schema.md). | Verify required fields present and types correct. | Validates. | Schema violation. | critical |
| `mcp.json.valid` | `.vscode/mcp.json` is valid JSON when present. | Parse. | Parses or absent. | Parse error. | critical |
| `mcp.toplevel.key` | `.vscode/mcp.json` uses the `servers` top-level key (per [`mcp.md`](mcp.md) §1). | Field check. | Present. | Missing or `mcpServers` only. | warning |

---

## 4. Managed-section checks

For both `.github/copilot-instructions.md` and `AGENTS.md`:

| id | what | how | pass | fail | severity |
|----|------|-----|------|------|----------|
| `copilot.section.markers` | `copilot-instructions.md` contains the marker pair (start + end) exactly once. | Regex match. | Exactly one pair. | Zero or multiple pairs. | critical |
| `copilot.section.body` | Content between markers includes Identity, Director protocol, Roles installed, Skills installed, Critical non-negotiables, Pointers, Declared gaps subheadings (per [`target-schema.md`](target-schema.md) §2). | Heading regex. | All present. | Any missing. | warning |
| `copilot.section.placeholders` | No `{{...}}` patterns remain in the rendered managed section. | Regex search. | Zero matches. | One or more matches. | critical |
| `agents.section.markers` | `AGENTS.md` contains the marker pair (start + end) exactly once. | Regex match. | Exactly one pair. | Zero or multiple pairs. | critical |
| `agents.section.parity` | Content between `AGENTS.md` markers byte-equals content between `copilot-instructions.md` markers. | Hash compare. | Equal. | Drift. | warning |

---

## 5. Skill-prompt checks

For every entry in `marker.skills[]`:

| id | what | how | pass | fail | severity |
|----|------|-----|------|------|----------|
| `skills.<id>.file.exists` | `.github/prompts/<skill-id>.prompt.md` exists. | File check. | Exists. | Absent. | critical |
| `skills.<id>.frontmatter.mode` | Frontmatter has `mode: 'agent'`. | Parse YAML. | Match. | Other or missing. | critical |
| `skills.<id>.frontmatter.description` | Frontmatter has a non-empty `description` that includes at least one trigger phrase from the source SKILL.md. | Parse YAML; regex search. | Match. | Missing or no triggers. | warning |
| `skills.<id>.body.required-sections` | Body has `## Trigger`, `## When to use`, `## When NOT to use`, `## Process`, `## Output`, `## References`. | Heading regex. | All present. | Any missing. | critical |

---

## 6. Stop-hook gap check

The VS Code adapter declares the stop-hook as a gap (per [`INSTALL.md`](INSTALL.md) §6):

| id | what | how | pass | fail | severity |
|----|------|-----|------|------|----------|
| `hooks.stop.gap.declared` | `marker.hooks.Stop.registered == false` AND `marker.hooks.Stop.gapReason` is non-empty. | Field check. | Match. | Mismatch. | critical |
| `hooks.stop.gap.documented` | `copilot-instructions.md` Declared-gaps section names the stop-hook gap with its user-facing fallback. | Substring search. | Present. | Missing. | warning |

---

## 7. MCP checks

| id | what | how | pass | fail | severity |
|----|------|-----|------|------|----------|
| `mcp.slots.placeholder` | Every slot the orchestra registered is under `servers` and has `metadata.orchestra: true` AND a non-empty placeholder body (per [`mcp.md`](mcp.md) §5). | Parse + check. | All slots conform. | Any non-conforming. | critical |
| `mcp.user.preserved` | Pre-existing user MCP entries (under `servers` and any legacy `mcpServers` key) are preserved verbatim. | Diff vs Phase 3 inventory. | All preserved. | Any altered. | critical |
| `mcp.slots.recorded` | Every slot in `.vscode/mcp.json` with `metadata.orchestra: true` is also in `marker.mcpSlots[]` (matched by `name`). | Set comparison. | Equal. | Drift. | warning |

---

## 8. Marker consistency checks

| id | what | how | pass | fail | severity |
|----|------|-----|------|------|----------|
| `marker.ide.id` | `marker.ide.id == "vscode"`. | Field check. | Equal. | Other. | critical |
| `marker.ide.adapterVersion.matches.core` | `marker.ide.adapterVersion == marker.orchestra.version` in v1. | Field equality. | Equal. | Drift. | warning |
| `marker.skills.paths.exist` | Every `marker.skills[].source` exists; every `.github/prompts/<id>.prompt.md` exists. | File checks. | All exist. | Any missing. | critical |
| `marker.timestamps.sane` | `marker.orchestra.installedAt` ≤ now; `marker.history[*].at` is monotonic non-decreasing. | Date math. | Sane. | Out of order. | warning |
| `marker.contract.versions` | `marker.scheduler.contractVersion == 1`, `marker.notifications.contractVersion == 1`. (`hooks.Stop.contractVersion` is `null` per the declared gap.) | Field check. | All match. | Any mismatch. | critical |
| `marker.history.coherent` | Exactly one `action: "install"` entry exists; subsequent entries are `audit` or `upgrade`. | Filter + count. | Conforms. | Multiple installs or unknown action. | critical |
| `marker.gaps.declared` | The marker has a `history[]` install entry whose `summary` enumerates the declared gaps. | Substring search. | Present. | Missing. | warning |

---

## 9. Idempotency check (only on re-run)

| id | what | how | pass | fail | severity |
|----|------|-----|------|------|----------|
| `idempotency.zero-diff` | Re-running the install produced only `skip` actions (or `propose` for user-edited content). | Inspect Phase 5's plan output. | Zero non-skip actions. | Any unexpected `create` / `extend-section` / `merge-json`. | critical |

---

## 10. Reporting

Same as Cursor (per [`../cursor/post-install-checks.md`](../cursor/post-install-checks.md) §10). The VS Code closing message places extra emphasis on:

- The user may need to restart VS Code or run "MCP: Reload Servers" command to pick up `.vscode/mcp.json` changes.
- Custom prompts at `.github/prompts/<id>.prompt.md` are loaded by Copilot Chat at extension start; a reload may be needed to surface new prompts.
- The declared stop-hook gap and its manual fallbacks.

---

## 11. References

- [`INSTALL.md`](INSTALL.md) §4 (Phase 8) — invocation point.
- [`target-schema.md`](target-schema.md) — the truth this file checks against.
- [`mappings.md`](mappings.md) — actions that produce the state being checked.
- [`mcp.md`](mcp.md) — MCP-specific schema for §7.
- [`../cursor/post-install-checks.md`](../cursor/post-install-checks.md) — full-adapter reference.
- [`../claude-code/post-install-checks.md`](../claude-code/post-install-checks.md) — sibling baseline.
- [`../codex/post-install-checks.md`](../codex/post-install-checks.md) — sibling baseline.
- [`../_contract.md`](../_contract.md) §2 — `post-install-checks.md` is a required adapter file.
- [`../_stop-hook.md`](../_stop-hook.md) — stop-hook contract (declared gap for VS Code).
- [`../../core/registry/install.schema.md`](../../core/registry/install.schema.md) — marker schema for §8.
- [`../../core/skills/audit/ai-infra-audit/SKILL.md`](../../core/skills/audit/ai-infra-audit/SKILL.md) — re-runs these checks on every audit.

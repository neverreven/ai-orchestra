# Codex adapter — mappings.md

> The full mapping table for the Codex baseline adapter. The Codex baseline differs from Cursor and Claude Code in skill installation strategy — skills are **referenced** from `AGENTS.md`, not copied into a per-project commands directory.

This file is the authoritative reference for Phase 5 (build dry-run) and Phase 7 (apply) of [`INSTALL.md`](INSTALL.md). The adapter never installs anything outside this table.

---

## 1. Master mapping table

| # | Core artifact | Target path | Action | Conflict policy |
|---|---------------|-------------|--------|-----------------|
| 1 | [Director rule](../../core/director/RULE.md) + [project context](../../core/director/_overview.md) (consolidated) + skill catalog | `AGENTS.md` (project root) — orchestra-managed section | `create` or `extend-section` | See §3. |
| 2 | [Director learnings template](../../core/director/learnings-template.md) | `_documentation/AI_LEARNINGS.md` (or detected equivalent) | `create` | If target exists, `merge-missing-sections` (do not touch existing sections). |
| 3 | Each installed skill (from [core/skills/](../../core/skills/)) | (No file written.) Referenced by id + trigger phrases inside the AGENTS.md skill catalog. | `register-only` | Trigger phrases recorded in marker `skills[].triggers`. |
| 4 | Stop-hook | (No file written — declared gap, see [`INSTALL.md`](INSTALL.md) §6.) | `skip-with-gap` | Manual fallback documented in `AGENTS.md`. |
| 5 | MCP slots | `.codex/mcp.json` (entries under `mcpServers`) | `merge-json` | See [`mcp.md`](mcp.md). |
| 6 | Install marker | `.ai-orchestra/install.json` | `create` (always overwrite) | Always overwrite; orchestra-owned. |
| 7 | Global registry | `~/.ai-orchestra/projects.json` | `merge-json` | Append entry if absent; update if `path` matches; never duplicate. |

---

## 2. Path conventions

Project-relative paths from the target project root. User-home paths use `~`. The adapter resolves every path relative to the project root before writing.

The orchestra core (`ai-orchestra/` at the project root) is **also** referenced — Codex skills point INTO the core directory rather than copying its files. This requires the orchestra core to remain checked into the repo for the install to work. Removing `ai-orchestra/` after install breaks the skill-execution chain. The audit detects and warns when the core is missing.

---

## 3. AGENTS.md — managed section

The orchestra owns **a section** of `AGENTS.md`. Marker pair (HTML comments, Markdown-safe):

```markdown
<!-- ai-orchestra: managed-section start -->
... orchestra-managed content ...
<!-- ai-orchestra: managed-section end -->
```

### Rules

| Situation | Action |
|-----------|--------|
| File does not exist | `create` it; place the orchestra-managed section as the only content. |
| File exists; markers absent | `extend-section` — append the markers + content at end-of-file with one blank line of separation from prior content. |
| File exists; markers present | Replace content **between** the markers verbatim with the new rendered content. Leave content outside the markers untouched. |
| Markers present but malformed | Critical conflict — surface to user. Do not auto-repair. |

### Section content (specific to Codex)

The Codex managed-section content includes one section that other adapters do not have a "Skill catalog" section listing every installed skill with:

- Skill id.
- Category.
- Trigger phrases (verbatim from the source SKILL.md `## Trigger` section).
- Path to the source `SKILL.md` (e.g., `ai-orchestra/core/skills/audit/ai-infra-audit/SKILL.md`).

Codex matches user input against the trigger phrases and follows the path link to execute the skill. Full content shape is in [`target-schema.md`](target-schema.md) §2.

---

## 4. `register-only` action — skill installation

Unlike Cursor (`create` per `.cursor/skills/<skill-id>/SKILL.md`) or Claude Code (`create` per `.claude/commands/<skill-id>.md`), the Codex baseline does NOT copy skill content into the project. Instead:

- Each skill installed is **registered** in the AGENTS.md skill catalog (id + triggers + source path).
- Each skill is also recorded in `marker.skills[]` per [`../../core/registry/install.schema.md`](../../core/registry/install.schema.md).
- The skill's `source` path resolves to the orchestra core (`ai-orchestra/core/skills/<category>/<skill-id>/SKILL.md`).
- When the user types a trigger phrase, the agent reads AGENTS.md, finds the matching skill entry, and follows the source path to execute the skill.

Benefits:

- No content duplication. The skill exists in exactly one place: the orchestra core.
- Skill updates flow to the project automatically when the user updates the orchestra core (no re-install needed).

Costs:

- The orchestra core MUST remain in the repo. Deleting `ai-orchestra/` breaks skill execution. The audit warns when the core is missing.
- Some Codex sessions may not load AGENTS.md eagerly enough — the agent must be reminded to consult AGENTS.md at session start.

---

## 5. Stop-hook (declared gap)

Codex CLI has no documented session-end hook in v1. The adapter declares this as a gap (per [`INSTALL.md`](INSTALL.md) §6) and provides three manual fallbacks the user can invoke:

1. Saying "audit AI infra" → triggers `ai-infra-audit`, which includes a learnings review.
2. Saying "review this session for learnings" → instructs the agent to walk the conversation and propose entries for the learnings doc.
3. The user runs the audit skill on a schedule (their own cron / launchd / systemd timer).

The marker records `hooks.Stop.registered: false` and `hooks.Stop.gapReason: "codex-no-session-end-hook"`.

---

## 6. Conflict-handling actions

Codex uses the same action set as Cursor and Claude Code:

| Action | When it triggers |
|--------|------------------|
| `create` | Target absent. |
| `skip` | Target present and identical to template (byte match). |
| `extend-section` | Marker block found in target. |
| `merge-json` | Target is a JSON file managed by the orchestra (`.codex/mcp.json`). |
| `merge-missing-sections` | Learnings doc, sections-only addition. |
| `register-only` | No file written; entry recorded in marker only. (Codex-specific.) |
| `skip-with-gap` | Adapter cannot satisfy a clause for this IDE/version; recorded in `gaps[]`. |
| `propose` | Critical decision required. |

Every action is logged in the install marker per [`../../core/registry/install.schema.md`](../../core/registry/install.schema.md) §1.4.

---

## 7. Stack packs

When the project profile detected one or more first-class stacks, the Codex adapter would apply stack-pack content from `core/stack-packs/<stack-id>/` (deferred to PR 6). Stack-pack content lands as additional sections inside the AGENTS.md managed area, since Codex lacks per-rule files.

---

## 8. Idempotency contract

- Re-running on a project where `.ai-orchestra/install.json` exists with the current core version produces only `skip` actions (or `propose` for user-edited content).
- The marker's `history[]` array is **not** appended on idempotent re-runs that produce zero changes.
- The marker's `history[]` IS appended whenever the audit skill runs and detects either drift it auto-fixes or change proposals.

---

## 9. References

- [`INSTALL.md`](INSTALL.md) — top-level procedure that drives this file.
- [`target-schema.md`](target-schema.md) — exact file shapes referenced from this table.
- [`mcp.md`](mcp.md) — MCP-specific merge logic.
- [`post-install-checks.md`](post-install-checks.md) — checks that validate the actions in this table actually produced what was intended.
- [`../_contract.md`](../_contract.md) §6 — gap declaration framework that §5 above implements.
- [`../cursor/mappings.md`](../cursor/mappings.md) — full-adapter reference; Codex diverges on skill installation strategy.
- [`../claude-code/mappings.md`](../claude-code/mappings.md) — sibling baseline that copies skills.
- [`../../core/registry/install.schema.md`](../../core/registry/install.schema.md) — schema of the marker entries this file produces.

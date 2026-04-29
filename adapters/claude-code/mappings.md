# Claude Code adapter — mappings.md

> The full mapping table for the Claude Code baseline adapter: every orchestra core artifact, the target path in a Claude Code project, the action used when applying it, and the conflict-handling rule when a target already exists.

This file is the authoritative reference for Phase 5 (build dry-run) and Phase 7 (apply) of [`INSTALL.md`](INSTALL.md). The adapter never installs anything outside this table.

---

## 1. Master mapping table

| # | Core artifact | Target path | Action | Conflict policy |
|---|---------------|-------------|--------|-----------------|
| 1 | [Director rule](../../core/director/RULE.md) + [project context](../../core/director/_overview.md) (consolidated) | `CLAUDE.md` (project root) — orchestra-managed section | `create` or `extend-section` | See §3. |
| 2 | [Director learnings template](../../core/director/learnings-template.md) | `_documentation/AI_LEARNINGS.md` (or detected equivalent) | `create` | If target exists, `merge-missing-sections` (do not touch existing sections). |
| 3 | Project context mirror | `AGENTS.md` (project root) — same managed-section content | `create` or `extend-section` | See §3. |
| 4 | Each installed skill (from [core/skills/](../../core/skills/)) | `.claude/commands/<skill-id>.md` | `create` per skill | `suffix-rename` per file if a file of the same name exists with non-orchestra content. |
| 5 | Stop-hook | `.claude/settings.json` (entry under `hooks.Stop`) | `merge-json` (when supported) or `skip-with-gap` | See §5. |
| 6 | MCP slots | `.mcp.json` (entries under `mcpServers`) | `merge-json` | See [`mcp.md`](mcp.md). |
| 7 | Install marker | `.ai-orchestra/install.json` | `create` (always overwrite) | Always overwrite; orchestra-owned. |
| 8 | Global registry | `~/.ai-orchestra/projects.json` | `merge-json` | Append entry if absent; update if `path` matches; never duplicate. |

---

## 2. Path conventions

Project-relative paths are written from the target project's root. User-home paths use `~`. The adapter resolves every path relative to the project root before writing, so the install is portable across machines.

---

## 3. Managed-section convention (`CLAUDE.md` and `AGENTS.md`)

The orchestra owns **a section** of each file, never the whole file. Marker pair (HTML comments, Markdown-safe):

```markdown
<!-- ai-orchestra: managed-section start -->
... orchestra-managed content ...
<!-- ai-orchestra: managed-section end -->
```

### Rules (apply identically to `CLAUDE.md` and `AGENTS.md`)

| Situation | Action |
|-----------|--------|
| File does not exist | `create` it; place the orchestra-managed section as the only content. |
| File exists; markers absent | `extend-section` — append the markers + content at end-of-file with one blank line of separation from prior content. |
| File exists; markers present | Replace content **between** the markers verbatim with the new rendered content. Leave content outside the markers untouched. |
| Markers present but malformed | Critical conflict — surface to user. Do not auto-repair. |

### Why two files

Claude Code reads `CLAUDE.md` automatically at every session start. Many projects also keep `AGENTS.md` for tool-agnostic context (Codex, VS Code with Copilot, manual reference). The orchestra writes both with identical managed-section content, so projects that use either or both stay consistent.

If the user prefers only one file, they can delete the other after install — the orchestra will recreate the missing one on the next run unless explicitly opted out in Phase 5.

---

## 4. Skill rendering — `.claude/commands/<skill-id>.md`

Each orchestra skill becomes a Claude Code slash-command file. Frontmatter shape (Claude Code's convention):

```yaml
---
description: <short description shown in /<skill-id> help>
---
```

The body is the source `SKILL.md` content from the first `# <Skill Name>` heading onward, with relative links rewritten from orchestra-relative to project-relative (the source file lives at `ai-orchestra/core/skills/<category>/<skill-id>/SKILL.md`; the rendered file lives at `.claude/commands/<skill-id>.md`).

After install, the user invokes the skill in Claude Code with `/<skill-id>` (e.g., `/ai-infra-audit`, `/cleanup`).

### Folder mirroring

Auxiliary files in the source skill folder (`template.md`, `checklist.md`, `examples/`) are NOT copied for Claude Code in v1 — slash commands are single files. Skills that depend on auxiliary content reference those files via path inside `ai-orchestra/core/skills/<category>/<skill-id>/`, and the rendered command body explains how the agent should fetch them. This is a deliberate v1 simplification; v2 may introduce a per-command directory convention if Claude Code's command system gains folder support.

---

## 5. `.claude/settings.json` — merge logic

Claude Code's `settings.json` schema (recent versions):

```json
{
  "hooks": {
    "Stop": [ /* hook entries */ ],
    "<other-event>": [ /* hook entries */ ]
  }
}
```

### Merge rules

| Situation | Action |
|-----------|--------|
| Claude Code version supports hooks AND file does not exist | `create` with the orchestra's `Stop` entry under `hooks`. |
| Claude Code version supports hooks AND file exists, no `hooks.Stop` | Add `hooks.Stop` array with the orchestra's entry. |
| Claude Code version supports hooks AND `hooks.Stop` already has the orchestra entry (matched by `metadata.orchestra: true`) | Replace **only** the orchestra's entry; preserve all other entries verbatim. |
| Claude Code version supports hooks AND `hooks.Stop` exists but no orchestra entry | **Append** the orchestra's entry. Existing entries are preserved. |
| Claude Code version does NOT support hooks | `skip-with-gap` — do not touch `settings.json`. Record the gap in the install marker and the post-install report (per [`INSTALL.md`](INSTALL.md) §6). |
| File exists but invalid JSON | Critical conflict — surface to user. Do not auto-repair. |

### Orchestra `Stop` hook entry

```json
{
  "type": "prompt",
  "metadata": { "orchestra": true, "contractVersion": "1.0" },
  "prompt": "<rendered prompt — see target-schema.md §4>",
  "loop_limit": 1
}
```

The `metadata.orchestra: true` field is the dedup key the adapter uses to recognise its own entry on re-run. **Claude Code does not look at metadata** — the field is purely for the adapter's identity check.

### Stable serialisation

After merge, the adapter writes the file with 2-space indentation, alphabetically sorted top-level keys, and a trailing newline. Idempotent re-runs produce zero diff.

---

## 6. Conflict-handling actions

The Claude Code adapter uses the same action set as Cursor:

| Action | When it triggers |
|--------|------------------|
| `create` | Target absent. |
| `skip` | Target present and identical to template (byte match). |
| `extend-section` | Marker block found in target. |
| `append` | Target present, no markers, append safe (rare for this adapter). |
| `merge-json` | Target is a JSON file managed by Claude Code (`settings.json`, `.mcp.json`). |
| `merge-missing-sections` | Learnings doc, sections-only addition. |
| `suffix-rename` | Target present with non-orchestra content; preserve user file under `<basename>.orchestra.<ext>`. |
| `propose` | Critical decision required. Add to `proposals[]`; do not write. |
| `skip-with-gap` | Adapter cannot satisfy a clause for this IDE/version; record in `gaps[]`. |

Every action is logged in the install marker per [`../../core/registry/install.schema.md`](../../core/registry/install.schema.md) §1.4.

---

## 7. Stack packs

When the project profile detected one or more first-class stacks (JS/TS web, Python web, Salesforce — see [`../../core/discovery/signals/`](../../core/discovery/signals/)), the adapter would apply stack-pack content from `core/stack-packs/<stack-id>/` (deferred to PR 6). For Claude Code, stack-pack content lands as additional sections inside the `CLAUDE.md` managed area, since Claude Code lacks per-rule files.

The marker reserves `stacks[].stackPack` per detected stack so a future orchestra-upgrade run can layer in the actual content without a fresh install.

---

## 8. Idempotency contract

- Re-running on a project where `.ai-orchestra/install.json` exists with the current core version produces only `skip` actions (or `propose` for user-edited content).
- The marker's `history[]` array is **not** appended on idempotent re-runs that produce zero changes.
- The marker's `history[]` IS appended whenever the audit skill runs and detects either drift it auto-fixes or change proposals — using `action: "audit"`.

---

## 9. References

- [`INSTALL.md`](INSTALL.md) — top-level procedure that drives this file.
- [`target-schema.md`](target-schema.md) — exact file shapes referenced from this table.
- [`mcp.md`](mcp.md) — MCP-specific merge logic.
- [`post-install-checks.md`](post-install-checks.md) — checks that validate the actions in this table actually produced what was intended.
- [`../_contract.md`](../_contract.md) — adapter contract; §5 (conflict-handling framework) and §6 (gap declaration) are the abstract versions of §6 / [`INSTALL.md`](INSTALL.md) §6.
- [`../../core/registry/install.schema.md`](../../core/registry/install.schema.md) — schema of the marker entries this file produces.

# VS Code (Copilot) adapter — mappings.md

> The full mapping table for the VS Code baseline adapter: every orchestra core artifact, the target path in a VS Code project, the action used when applying it, and the conflict-handling rule when a target already exists.

This file is the authoritative reference for Phase 5 (build dry-run) and Phase 7 (apply) of [`INSTALL.md`](INSTALL.md). The adapter never installs anything outside this table.

---

## 1. Master mapping table

| # | Core artifact | Target path | Action | Conflict policy |
|---|---------------|-------------|--------|-----------------|
| 1 | [Director rule](../../core/director/RULE.md) + [project context](../../core/director/_overview.md) (consolidated) | `.github/copilot-instructions.md` — orchestra-managed section | `create` or `extend-section` | See §3. |
| 2 | [Director learnings template](../../core/director/learnings-template.md) | `_documentation/AI_LEARNINGS.md` (or detected equivalent) | `create` | If target exists, `merge-missing-sections` (do not touch existing sections). |
| 3 | Project context mirror | `AGENTS.md` (project root) — same managed-section content | `create` or `extend-section` | See §3. |
| 4 | Each installed skill (from [core/skills/](../../core/skills/)) | `.github/prompts/<skill-id>.prompt.md` (or shared/hybrid path — see §8) | `create` per skill | `suffix-rename` per file if a file of the same name exists with non-orchestra content. |
| 5 | Stop-hook | (No file written — declared gap, see [`INSTALL.md`](INSTALL.md) §6.) | `skip-with-gap` | Manual fallback documented in `copilot-instructions.md`. |
| 6 | MCP slots | `.vscode/mcp.json` (entries under `servers`) | `merge-json` | See [`mcp.md`](mcp.md). |
| 7 | Install marker | `.ai-orchestra/install.json` | `create` (always overwrite) | Always overwrite; orchestra-owned. |
| 8 | Global registry | `~/.ai-orchestra/projects.json` | `merge-json` | Append entry if absent; update if `path` matches; never duplicate. |

---

## 2. Path conventions

Project-relative paths from the target project root. User-home paths use `~`. The adapter resolves every path relative to the project root before writing.

The adapter writes inside `.github/` (Copilot's convention) and `.vscode/` (the workspace settings folder, but only `mcp.json`, never `settings.json` / `tasks.json` / `launch.json`).

---

## 3. Managed-section convention (`.github/copilot-instructions.md` and `AGENTS.md`)

The orchestra owns **a section** of each file, never the whole file. Marker pair (HTML comments, Markdown-safe):

```markdown
<!-- ai-orchestra: managed-section start -->
... orchestra-managed content ...
<!-- ai-orchestra: managed-section end -->
```

### Rules (apply identically to both files)

| Situation | Action |
|-----------|--------|
| File does not exist | `create` it; place the orchestra-managed section as the only content. |
| File exists; markers absent | `extend-section` — append the markers + content at end-of-file with one blank line of separation from prior content. |
| File exists; markers present | Replace content **between** the markers verbatim with the new rendered content. Leave content outside the markers untouched. |
| Markers present but malformed | Critical conflict — surface to user. Do not auto-repair. |

### Why two files

`.github/copilot-instructions.md` is what Copilot reads automatically. `AGENTS.md` is the tool-agnostic equivalent that other agents (Codex CLI, manual review) understand. The orchestra writes both with identical managed-section content so the project stays consistent across tools.

If the user prefers only one file, they can delete the other after install — the orchestra recreates the missing one on the next run unless explicitly opted out in Phase 5.

---

## 4. Skill rendering — `.github/prompts/<skill-id>.prompt.md`

Each orchestra skill becomes a Copilot custom-prompt file. Frontmatter shape (Copilot's convention):

```yaml
---
mode: 'agent'
description: <short description shown in Copilot Chat>
---
```

The body is a near-verbatim render of the source SKILL.md content from the first `# <Skill Name>` heading onward, with relative links rewritten to point into `ai-orchestra/core/...` from the project root.

After install, the user invokes the skill in Copilot Chat with `/<skill-id>` (e.g., `/ai-infra-audit`, `/cleanup`).

### Mode selection

The default `mode: 'agent'` is correct for all v1 orchestra skills (they coordinate file edits, run checks, and produce structured output). Future skills that are pure ask-mode reviews could use `mode: 'ask'`, but no v1 skill needs it.

### No folder mirroring

`.github/prompts/<id>.prompt.md` is a flat single file per skill. Auxiliary files in the source skill folder (`template.md`, `checklist.md`, `examples/`) are NOT copied — the rendered prompt body references them by path inside `ai-orchestra/core/skills/<category>/<skill-id>/`. This is a deliberate v1 simplification that mirrors the Claude Code adapter.

---

## 5. Stop-hook (declared gap)

VS Code + Copilot has no documented session-end hook for the agent in v1. The adapter declares this as a gap (per [`INSTALL.md`](INSTALL.md) §6) and provides three manual fallbacks:

1. Saying "audit AI infra" or `/ai-infra-audit` in Copilot Chat → triggers the audit, which includes a learnings review.
2. Saying "review this session for learnings" → instructs the agent to walk the conversation and propose entries for the learnings doc.
3. The user runs the audit skill on a schedule (their own task scheduler).

The marker records `hooks.Stop.registered: false` and `hooks.Stop.gapReason: "vscode-copilot-no-session-end-hook"`.

---

## 6. Conflict-handling actions

VS Code uses the same action set as Cursor:

| Action | When it triggers |
|--------|------------------|
| `create` | Target absent. |
| `skip` | Target present and identical to template (byte match). |
| `extend-section` | Marker block found in target. |
| `append` | Target present, no markers, append safe. |
| `merge-json` | Target is a JSON file managed by the orchestra (`.vscode/mcp.json`). |
| `merge-missing-sections` | Learnings doc, sections-only addition. |
| `suffix-rename` | Target present with non-orchestra content; preserve user file under `<basename>.orchestra.<ext>`. |
| `propose` | Critical decision required. |
| `skip-with-gap` | Adapter cannot satisfy a clause for this IDE/version; recorded in `gaps[]`. |

Every action is logged in the install marker per [`../../core/registry/install.schema.md`](../../core/registry/install.schema.md) §1.4.

---

## 7. Stack packs

When the project profile detects one or more first-class stacks, the adapter applies stack-pack content from [`../../core/stack-packs/<stack-id>/`](../../core/stack-packs/) per the layering rules in [`../../core/stack-packs/_overview.md`](../../core/stack-packs/_overview.md) §3. Stack-pack rule and roles content lands as additional sections inside the `.github/copilot-instructions.md` managed area; pack skills addenda are wired into the per-skill prompt files under `.github/prompts/`. The applied pack is recorded in `stacks[].stackPack` and `stacks[].stackPackVersion`.

In a future v1.x, this adapter may switch to using `.github/instructions/<stack>.instructions.md` (Copilot's per-stack instruction-file convention) with `applyTo` glob patterns — see [`INSTALL.md`](INSTALL.md) §6 for the v1 limitation.

---

## 8. Skill placement strategy

The adapter's row 4 (skills) defaults to writing skill files at `.github/prompts/<skill-id>.prompt.md`. When the discovery probe in [`../../core/discovery/existing-infra.md`](../../core/discovery/existing-infra.md) §3.7 detects one or more candidate **shared skill folders**, the install plan exposes a placement decision the user resolves in Phase 6 of [`../../RUN.md`](../../RUN.md). The chosen strategy is recorded in the install marker as `skillPlacementStrategy` per [`../../core/registry/install.schema.md`](../../core/registry/install.schema.md) §1.2.

### Strategies

| `type` | Where portable skills land | Where IDE-specific behaviour lands | When this applies |
|--------|----------------------------|-------------------------------------|-------------------|
| `ide-specific` | `.github/prompts/<skill-id>.prompt.md` | `.github/copilot-instructions.md`, `.vscode/mcp.json`, `AGENTS.md` managed section | Default. Applied automatically when no candidate shared folder is detected. `decidedBy: "default"`. |
| `shared` | `<sharedPath>/<skill-id>/SKILL.md` (full skill spec) | `.github/copilot-instructions.md`, `.vscode/mcp.json`, `AGENTS.md` (unchanged) | User explicitly nominates a candidate during Phase 6. `decidedBy: "user"`. |
| `hybrid` | `<sharedPath>/<skill-id>/SKILL.md` (canonical) **and** `.github/prompts/<skill-id>.prompt.md` (Copilot prompt-file stub pointing to the canonical file) | `.github/copilot-instructions.md`, `.vscode/mcp.json`, `AGENTS.md` (unchanged) | User wants Copilot prompt-file discoverability AND a tool-agnostic skill home. `decidedBy: "user"`. |

### Stub format (hybrid only)

When `type` is `hybrid`, the file written under `.github/prompts/<skill-id>.prompt.md` is a Copilot prompt-file stub that defers to the canonical skill spec:

```markdown
# <Skill Display Name>

This prompt is a stub. The full skill specification is canonically defined at `<sharedPath>/<skill-id>/SKILL.md`. Read that file and follow its instructions exactly.

See: [<sharedPath>/<skill-id>/SKILL.md](<relative-path-to-canonical>)
```

The stub is regenerated on every install / audit run. The canonical file is never touched by the adapter beyond the initial write.

### Conflict policy under shared / hybrid

When `type` is `shared` or `hybrid`:

- If the user-nominated `<sharedPath>` already contains a folder named `<skill-id>`, the adapter applies its standard `suffix-rename` policy and writes `<skill-id>.orchestra/SKILL.md`. The hybrid stub follows suit.
- If `<sharedPath>` does not exist at install time, the adapter creates it. The post-install report notes "created shared skill home: `<sharedPath>`".

### Idempotency under shared / hybrid

Re-running the orchestra with `skillPlacementStrategy.type` already recorded:

- `ide-specific` (default) → unchanged behaviour from §1 row 4.
- `shared` → the adapter compares the canonical file to the source skill template and produces `skip` actions when identical.
- `hybrid` → both canonical and stub are checked; the stub regenerates only when the canonical path or skill display name changed.

### Recording the decision

The adapter writes the chosen strategy to `.ai-orchestra/install.json`:

```json
"skillPlacementStrategy": {
  "type": "shared",
  "sharedPath": ".agents",
  "decidedAt": "<ISO 8601>",
  "decidedBy": "user"
}
```

Subsequent audits read this field to know where to look for canonical skill files.

---

## 9. Idempotency contract

- Re-running on a project where `.ai-orchestra/install.json` exists with the current core version produces only `skip` actions (or `propose` for user-edited content).
- The marker's `history[]` array is **not** appended on idempotent re-runs that produce zero changes.
- The marker's `history[]` IS appended whenever the audit skill runs and detects either drift it auto-fixes or change proposals.

---

## 10. References

- [`INSTALL.md`](INSTALL.md) — top-level procedure that drives this file.
- [`target-schema.md`](target-schema.md) — exact file shapes referenced from this table.
- [`mcp.md`](mcp.md) — MCP-specific merge logic.
- [`post-install-checks.md`](post-install-checks.md) — checks that validate the actions in this table actually produced what was intended.
- [`../_contract.md`](../_contract.md) §6 — gap declaration framework that §5 above implements.
- [`../cursor/mappings.md`](../cursor/mappings.md) — full-adapter reference.
- [`../claude-code/mappings.md`](../claude-code/mappings.md) — sibling baseline.
- [`../codex/mappings.md`](../codex/mappings.md) — sibling baseline.
- [`../../core/discovery/existing-infra.md`](../../core/discovery/existing-infra.md) — §3.7 defines candidate shared-folder detection that drives §8.
- [`../../core/registry/install.schema.md`](../../core/registry/install.schema.md) — schema of the marker entries this file produces (including `skillPlacementStrategy`).

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
| 4 | Each installed skill (from [core/skills/](../../core/skills/)) | `.claude/commands/<skill-id>.md` (or shared/hybrid path — see §8) | `create` per skill | `suffix-rename` per file if a file of the same name exists with non-orchestra content. Filtered by `installScope.selectedSkills` — see §9. |
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

### Description disambiguation on skill suffix-rename

When a skill undergoes `suffix-rename` because `.claude/commands/<skill-id>.md` already exists with non-orchestra content, the adapter MUST modify the renamed copy's `description` frontmatter:

1. Prepend `[Orchestra] ` to the synthesised description.
2. Append the note: ` The project also defines a skill named '<skill-id>' at '.claude/commands/<skill-id>.md' — read both and choose the one that fits.`

The project's original command file is never modified. The post-install report includes an `## Overlapping skills` section listing every such overlap side-by-side.

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
| Claude Code version supports hooks AND `hooks.Stop` exists, no orchestra entry, **no overlap detected** | **Append** the orchestra's entry. Existing entries are preserved. |
| Claude Code version supports hooks AND `hooks.Stop` exists, no orchestra entry, **overlap detected per [`../../core/discovery/existing-infra.md`](../../core/discovery/existing-infra.md) §3.11** | **Do not append by default.** Route through [`../../core/conflict/stop-hook-overlap.md`](../../core/conflict/stop-hook-overlap.md) §3 / §4 — three-choice question form in Phase 6 (`skip-orchestra` / `replace-with-orchestra` / `adopt-existing`). Decision recorded under `installScope.stopHookOverlapResolution` per [`../../core/registry/install.schema.md`](../../core/registry/install.schema.md) §1.2. |
| Claude Code version does NOT support hooks | `skip-with-gap` — do not touch `settings.json`. Record the gap in the install marker and the post-install report (per [`INSTALL.md`](INSTALL.md) §6). |
| File exists but invalid JSON | Critical conflict — surface to user. Do not auto-repair. |

### Overlap branch (introduced in v1.2.0)

When the inventory in [`../../core/discovery/existing-infra.md`](../../core/discovery/existing-infra.md) §3.11 has classified one or more `hooks.Stop` entries as `overlap`, the adapter follows the contract in [`../../core/conflict/stop-hook-overlap.md`](../../core/conflict/stop-hook-overlap.md). Per choice:

| User choice (Phase 6) | What this adapter writes |
|---|---|
| `skip-orchestra` | No orchestra entry is appended; existing project entry preserved. Marker: `stopHookOverlapResolution.value: "skip-orchestra"`. |
| `replace-with-orchestra` | Matched project entry removed from `hooks.Stop`; orchestra entry appended. Marker: `stopHookOverlapResolution.value: "replace-with-orchestra"` plus `replacedEntryEvidence`. |
| `adopt-existing` | Matched project entry rewritten in place with `metadata.orchestra: true` + `metadata.contractVersion: "1.0"`; orchestra entry NOT appended. Marker: `stopHookOverlapResolution.value: "adopt-existing"` plus `adoptedEntryDigest`. |

When Claude Code's hook gap applies (`skip-with-gap` row above), the overlap branch does not execute — there is no `settings.json` to merge into. The audit will re-evaluate overlap on every audit invocation (per the contract §6) so a future Claude Code version with hook support automatically triggers the question on the next install / upgrade.

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
| `suffix-rename` | Target present with non-orchestra content; preserve user file under `<basename>.orchestra.<ext>`. When the source artifact would have been rendered with always-on semantics (Director context in `CLAUDE.md`), the renamed copy is downgraded — see §6.1. |
| `propose` | Critical decision required. Add to `proposals[]`; do not write. |
| `skip-with-gap` | Adapter cannot satisfy a clause for this IDE/version; record in `gaps[]`. |

Every action is logged in the install marker per [`../../core/registry/install.schema.md`](../../core/registry/install.schema.md) §1.4.

### 6.1 Always-on downgrade on suffix-rename

Claude Code renders the Director rule and project context as a managed section of `CLAUDE.md` (always loaded). When a suffix-rename conflict occurs on `CLAUDE.md` itself (because the project already has a hand-written `CLAUDE.md` with existing content that the adapter cannot safely extend), the adapter writes the orchestra's version to `CLAUDE.orchestra.md`. In this scenario:

1. The renamed copy (`CLAUDE.orchestra.md`) MUST include a leading note at the top of the managed section: `> **Note:** This file is a suffix-renamed orchestra copy. It is NOT auto-loaded by Claude Code. To use the orchestra's session protocol, copy the content below into your main `CLAUDE.md` managed section or rename this file to `CLAUDE.md` after removing the original.`
2. The adapter MUST NOT record `CLAUDE.orchestra.md` as having `alwaysApply: true` equivalence in the install marker — the marker field `rules[].alwaysOn` is set to `false` for renamed copies.

For **skill** suffix-renames (§4 row conflicts), no downgrade applies — skills are not always-on in Claude Code (they are on-demand slash commands).

**Post-install report.** Same as the Cursor adapter (per [`../cursor/mappings.md`](../cursor/mappings.md) §6.1): when a downgrade fires, Part A names the renamed file and explains the user's options.

**Audit behaviour.** The audit checks whether the `CLAUDE.orchestra.md` file has been promoted (renamed to `CLAUDE.md`) while the old `CLAUDE.md` still exists; if both are present, it surfaces a `warning`.

---

## 7. Stack packs

When the project profile detected one or more first-class stacks (JS/TS web, Python web, Salesforce, mobile — see [`../../core/discovery/signals/`](../../core/discovery/signals/)), the adapter applies stack-pack content from [`../../core/stack-packs/<stack-id>/`](../../core/stack-packs/) per the layering rules in [`../../core/stack-packs/_overview.md`](../../core/stack-packs/_overview.md) §3. For Claude Code, since Claude Code lacks per-rule files with glob activation, stack-pack content lands as additional sections inside the `CLAUDE.md` managed area: pack rules and roles addenda inline; pack skills addenda referenced from the skill catalog. The applied pack is recorded in `stacks[].stackPack` and `stacks[].stackPackVersion`.

### Pack rule glob filtering (introduced in v1.3.0)

Before including any pack rule section in the `CLAUDE.md` managed area, the adapter evaluates whether the rule is relevant by testing its `## When this applies` globs against the project's tracked files. Rules whose globs match zero files are **omitted** from the managed-section content and recorded in `stacks[].skippedPackRules[]`. Installed rules are recorded in `stacks[].installedPackRules[]`. The audit re-evaluates skipped rules and proposes adding newly-relevant ones on the next upgrade.

Pack rules with no explicit glob in `## When this applies` are always included.

The marker reserves `stacks[].stackPack` per detected stack so a future orchestra-upgrade run can layer in the actual content without a fresh install.

---

## 8. Skill placement strategy

The adapter's row 4 (skills) defaults to writing skill files at `.claude/commands/<skill-id>.md`. When the discovery probe in [`../../core/discovery/existing-infra.md`](../../core/discovery/existing-infra.md) §3.7 detects one or more candidate **shared skill folders**, the install plan exposes a placement decision the user resolves in Phase 6 of [`../../RUN.md`](../../RUN.md). The chosen strategy is recorded in the install marker as `skillPlacementStrategy` per [`../../core/registry/install.schema.md`](../../core/registry/install.schema.md) §1.2.

### Strategies

| `type` | Where portable skills land | Where IDE-specific behaviour lands | When this applies |
|--------|----------------------------|-------------------------------------|-------------------|
| `ide-specific` | `.claude/commands/<skill-id>.md` | `.claude/settings.json`, `.mcp.json`, `CLAUDE.md` managed section | Default. Applied automatically when no candidate shared folder is detected. `decidedBy: "default"`. |
| `shared` | `<sharedPath>/<skill-id>/SKILL.md` (full skill spec) | `.claude/settings.json`, `.mcp.json`, `CLAUDE.md` managed section (unchanged) | User explicitly nominates a candidate during Phase 6. `decidedBy: "user"`. |
| `hybrid` | `<sharedPath>/<skill-id>/SKILL.md` (canonical) **and** `.claude/commands/<skill-id>.md` (slash-command stub pointing to the canonical file) | `.claude/settings.json`, `.mcp.json`, `CLAUDE.md` (unchanged) | User wants slash-command discoverability AND a tool-agnostic skill home. `decidedBy: "user"`. |

### Stub format (hybrid only)

When `type` is `hybrid`, the file written under `.claude/commands/<skill-id>.md` is a slash-command stub that tells Claude Code to read the canonical file:

```markdown
# <Skill Display Name>

This skill is canonically defined at `<sharedPath>/<skill-id>/SKILL.md`. Read that file and follow its instructions exactly.

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

## 9. Install scope handling

The Claude Code adapter renders only the artifacts implied by `installScope.mode` plus the resolver's `selectedRoles` and `selectedSkills` per [`../../core/install-scope.md`](../../core/install-scope.md) §2 / §3. The mode does not change *how* an artifact is written — it changes *which* artifacts the adapter writes.

### 9.1 Per-mode rendering matrix

| Artifact | `full-kit` | `selected-roles` | `primary-plus-collaborators` | `core-only` |
|----------|------------|------------------|------------------------------|-------------|
| `CLAUDE.md` managed section (rows 1, 3) | rendered (lists every role) | rendered (lists `selectedRoles` only) | rendered (lists `primaryRole` + collaborators + universals) | rendered (notes "no role library installed (core-only mode)") |
| Learnings doc (row 2) | rendered | rendered | rendered | rendered |
| Per-skill slash commands under `.claude/commands/` (row 4) | every skill from every role | union of skills for `selectedRoles` ∪ universals | union of skills for the resolved set ∪ universals | universals only (`cleanup`, `pre-release`, `ai-infra-audit`) |
| Stop-hook entry in `.claude/settings.json` (row 5) | rendered (when supported) | rendered (when supported) | rendered (when supported) | rendered (when supported) |
| Install marker (row 7) | rendered | rendered | rendered | rendered |
| Stack-pack additions to `CLAUDE.md` (§7) | rendered (unaffected by scope) | rendered (unaffected by scope) | rendered (unaffected by scope) | rendered (unaffected by scope) |

Stack packs are deliberately unaffected — they are determined by the project's detected stacks, not by the role scope. A `core-only` install on a `python-web` project still receives the Python rule pack inside the `CLAUDE.md` managed section.

### 9.2 The `improve` action

When Phase 6 §4.6 resolves a quality issue with `proposedAction: "improve"`, the adapter performs an in-place block rewrite of the target file. Preconditions:

- The target file MUST contain a managed marker pair (the same `<!-- ai-orchestra: managed-section start -->` / `... end -->` convention from §3), OR be one of the orchestra-wholly-owned files (the learnings doc sections that match the template, `.ai-orchestra/install.json`, the orchestra's own `.claude/commands/<skill-id>.md` files).
- If neither precondition holds, the action degrades to `propose` and the user is asked one more time before any write.

When `improve` fires, the row's `targetIssue` column references the originating `issue.id` from [`../../core/discovery/existing-infra.md`](../../core/discovery/existing-infra.md) §3.10.

### 9.3 The `replace` proposal (rendered as `suffix-rename`)

When Phase 6 §4.6 resolves a quality issue with `proposedAction: "replace"`, the adapter writes the orchestra's version under `<basename>.orchestra.<ext>` next to the original, leaves the original untouched, and records the row with `action: suffix-rename` and `targetIssue: <issue.id>`. The post-install report explicitly tells the user "your `<basename>.<ext>` is recommended for replacement; once you've reviewed both files, delete whichever one you don't want — the orchestra will not delete files for you."

The next audit run after a `replace` proposal checks whether the original is still present. If both files exist after one full audit cycle, the audit reports `replace.unresolved`.

### 9.4 Recording the scope decision

The adapter writes `installScope` to the install marker exactly once per install or upgrade per the schema in [`../../core/registry/install.schema.md`](../../core/registry/install.schema.md) §1.2.

### 9.5 Idempotency under scope changes

Re-running the orchestra with a different `installScope.mode` than what is recorded in the marker is treated as an upgrade, not an idempotent re-run. The adapter computes the diff between the previous resolved set and the new resolved set:

- Skills newly added by the scope change → rendered as `create` (or `skip` if a previous install left the file in place).
- Skills no longer in scope → the adapter does NOT delete the corresponding `.claude/commands/<skill-id>.md` file automatically. It surfaces them as `propose` rows ("`<file>` is no longer in scope under `<new-mode>`. Delete? Keep? Mark obsolete?") and the user resolves each one.

This conservative deletion policy preserves the orchestra's "never silently destroys user work" promise even across scope transitions.

---

## 10. Idempotency contract

- Re-running on a project where `.ai-orchestra/install.json` exists with the current core version produces only `skip` actions (or `propose` for user-edited content).
- The marker's `history[]` array is **not** appended on idempotent re-runs that produce zero changes.
- The marker's `history[]` IS appended whenever the audit skill runs and detects either drift it auto-fixes or change proposals — using `action: "audit"`.

---

## 11. References

- [`INSTALL.md`](INSTALL.md) — top-level procedure that drives this file.
- [`target-schema.md`](target-schema.md) — exact file shapes referenced from this table.
- [`mcp.md`](mcp.md) — MCP-specific merge logic.
- [`post-install-checks.md`](post-install-checks.md) — checks that validate the actions in this table actually produced what was intended.
- [`../_contract.md`](../_contract.md) — adapter contract; §5 (conflict-handling framework) and §6 (gap declaration) are the abstract versions of §6 / [`INSTALL.md`](INSTALL.md) §6.
- [`../../core/install-scope.md`](../../core/install-scope.md) — install-scope modes, resolver, and the recommendation engine that drive §9.
- [`../../core/discovery/existing-infra.md`](../../core/discovery/existing-infra.md) — §3.7 defines candidate shared-folder detection that drives §8; §3.9 / §3.10 produce the inventory inputs that drive §9 quality handling.
- [`../../core/install-plan-template.md`](../../core/install-plan-template.md) — Part B's `targetIssue` column conventions used by §9.2 / §9.3.
- [`../../core/registry/install.schema.md`](../../core/registry/install.schema.md) — schema of the marker entries this file produces (including `installScope` and `skillPlacementStrategy`).

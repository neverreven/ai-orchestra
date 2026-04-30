# Cursor adapter — mappings.md

> The full mapping table: every orchestra core artifact, the target path in a Cursor project, the action used when applying it, and the conflict-handling rule when a target already exists. Every entry references the source file in `ai-orchestra/core/`.

This file is the authoritative reference for Phase 5 (build dry-run) and Phase 7 (apply) of [`INSTALL.md`](INSTALL.md). The adapter never installs anything outside this table.

---

## 1. Path conventions

Throughout this file, project-relative paths are written from the target project's root (the directory containing `.cursor/`). User-home paths use `~`.

The adapter MUST resolve every path relative to the project root before writing, so the install is portable across machines.

---

## 2. Master mapping table

| # | Core artifact | Target path | Action | Conflict policy |
|---|---------------|-------------|--------|-----------------|
| 1 | [Director rule](../../core/director/RULE.md) | `.cursor/rules/ai-director.mdc` | `create` (or `skip` on idempotent re-run) | `suffix-rename` if target exists with non-orchestra content. |
| 2 | [Director learnings template](../../core/director/learnings-template.md) | `_documentation/AI_LEARNINGS.md` (or detected equivalent — see §4) | `create` | If target exists, `merge-missing-sections` (do not touch existing sections). |
| 3 | Project context (consolidated) | `AGENTS.md` (project root) | `create` or `extend-section` | See §3. |
| 4 | Per-role and per-skill always-on context rule | `.cursor/rules/orchestra-context.mdc` | `create` | `suffix-rename` if target exists. Skipped entirely when `installScope.mode` is `core-only` — see §9. |
| 5 | Each installed skill (from [core/skills/](../../core/skills/)) | `.cursor/skills/<skill-id>/SKILL.md` (or shared/hybrid path — see §8) | `create` per skill | `suffix-rename` per-folder if a folder of the same name exists. Filtered by `installScope.selectedSkills` — see §9. |
| 6 | Stop-hook | `.cursor/hooks.json` (entry under `hooks.stop`) | `merge-json` | See §5. |
| 7 | MCP slots | `.cursor/mcp.json` (entries under `mcpServers`) | `merge-json` | See [`mcp.md`](mcp.md). |
| 8 | Install marker | `.ai-orchestra/install.json` | `create` (always overwrite — this file is owned by the orchestra) | Always overwrite; the orchestra never assumes user edits in this file. |
| 9 | Global registry | `~/.ai-orchestra/projects.json` | `merge-json` | Append entry if absent; update if `path` matches; never duplicate. |

The action `create` produces a new file. The action `merge-json` parses, merges, and re-serialises a JSON file under the rules in §5 (hooks) or [`mcp.md`](mcp.md) (mcp). The action `extend-section` operates on text files using the marker convention in §3.

---

## 3. AGENTS.md — managed-section convention

The orchestra owns **a section** of `AGENTS.md`, never the whole file. This lets a project keep its hand-written `AGENTS.md` content while the orchestra adds and maintains its own block.

### Marker pair

The marker pair is HTML comments (Markdown-safe):

```markdown
<!-- ai-orchestra: managed-section start -->
... orchestra-managed content ...
<!-- ai-orchestra: managed-section end -->
```

### Rules

| Situation | Action |
|-----------|--------|
| `AGENTS.md` does not exist | `create` it; place the orchestra-managed section as the only content; the user can add their own content above or below later. |
| `AGENTS.md` exists; markers absent | `extend-section` — append the markers + content at end-of-file with one blank line of separation from the prior content. |
| `AGENTS.md` exists; markers present | Replace the content **between** the markers verbatim with the new rendered content. Leave content outside the markers untouched. |
| Markers present but malformed (one missing, mismatched, etc.) | Critical conflict — surface to user. Do not auto-repair. |

### Content rendered into the managed section

The managed section's content is generated from:

- The project profile (Phase 2 of RUN.md) — name, detected stacks, frameworks.
- The role list selected for this project (Phase 5).
- The skill list installed.
- The orchestra version + adapter version.
- A short "How to ask the orchestra to do X" cheat sheet referencing the audit skill and the Director rule.

The exact template lives in [`target-schema.md`](target-schema.md) §3.

---

## 4. Learnings doc — path resolution

Default path: `_documentation/AI_LEARNINGS.md`.

Override order (first hit wins):

1. User explicitly provided a path in Phase 5 input.
2. Existing `AI_LEARNINGS.md` file detected anywhere under `_documentation/` or `docs/` — adapter uses that path.
3. Project profile names a "documentation root" different from `_documentation/` — adapter uses `<doc-root>/AI_LEARNINGS.md`.
4. Default — `_documentation/AI_LEARNINGS.md`. Adapter creates `_documentation/` if absent.

The chosen path is recorded in the install marker (`learnings.path` per [`../../core/registry/install.schema.md`](../../core/registry/install.schema.md) §1.2) and the rendered Director rule (substituting `{{LEARNINGS_PATH}}`).

### Conflict policy when existing learnings doc found

If a learnings doc already exists, it almost certainly has structure (the project bootstrapped manually or via a previous orchestra version). The adapter:

1. Parses the existing file looking for the six fixed sections from [`learnings-template.md`](../../core/director/learnings-template.md).
2. **Does not touch** any section that already exists.
3. **Adds** any of the six fixed sections that are missing, with their default empty bodies.
4. Surfaces a summary of "what we added vs. left alone" in the post-install report.

The adapter never reorders existing entries or rewrites existing content under the missing-section heuristic.

---

## 5. `.cursor/hooks.json` — merge logic

Cursor's `hooks.json` schema (v1):

```json
{
  "version": 1,
  "hooks": {
    "start": [ /* hook entries */ ],
    "stop":  [ /* hook entries */ ],
    "<other-event>": [ /* hook entries */ ]
  }
}
```

### Merge rules

| Situation | Action |
|-----------|--------|
| File does not exist | `create` with `version: 1` and the orchestra's stop-hook entry under `hooks.stop`. No `start` entries are added by the orchestra. |
| File exists, valid JSON, no `hooks.stop` array | Add `hooks.stop` with the orchestra's entry. |
| File exists, `hooks.stop` array present, no orchestra entry | **Append** the orchestra's entry. Existing entries are preserved. |
| File exists, `hooks.stop` array present, orchestra entry already present (matched by `metadata.orchestra: true`) | Replace **only** the orchestra's entry; preserve all other entries verbatim. |
| File exists but invalid JSON | Critical conflict — surface to user. Do not auto-repair. |

### Orchestra stop-hook entry

The adapter writes this entry shape (per [`../_stop-hook.md`](../_stop-hook.md)):

```json
{
  "type": "prompt",
  "metadata": { "orchestra": true, "contractVersion": "1.0" },
  "prompt": "<rendered prompt — see target-schema.md §5>",
  "loop_limit": 1
}
```

The `metadata.orchestra: true` field is the dedup key the adapter uses to recognise its own entry on re-run. **Cursor does not look at metadata** — the field is purely for the adapter's identity check.

### `start` hooks

The orchestra does NOT install any `start` hooks in v1. If the project's existing `hooks.json` has start hooks (for example, environment-check hooks that verify a dev server is running), the adapter preserves them verbatim.

### Stable serialisation

After merge, the adapter writes the file with:

- 2-space indentation.
- Keys in this order at the top: `version`, `hooks`. Inside `hooks`: `start`, `stop`, then any other events alphabetically.
- Inside each event array: orchestra-managed entries first (sorted by `metadata.orchestra` then `metadata.id`), user entries preserved in their original order.
- Trailing newline.

This stability is what makes idempotent re-runs produce zero diff.

---

## 6. Conflict-handling actions in detail

| Action | When it triggers | What the adapter does | History summary phrase |
|--------|------------------|------------------------|------------------------|
| `create` | Target absent. | Write the rendered content. | `created` |
| `skip` | Target present and identical to template (byte match). | No write. | `unchanged` |
| `extend-section` | Marker block found in target. | Replace content between markers. | `managed-section refreshed` |
| `append` | Target present, no markers, append safe. | Append with separator. (Used for the learnings missing-sections case.) | `appended` |
| `merge-json` | Target is a JSON file managed by Cursor (`hooks.json`, `mcp.json`). | Parse, merge per file's specific rules, re-serialise. | `merged` |
| `merge-missing-sections` | Learnings doc, sections-only addition. | Add only sections that are missing. | `seeded missing sections` |
| `suffix-rename` | Target present, content non-orchestra, conflict policy says preserve. | Write the orchestra's version under `<basename>.orchestra.<ext>`. | `suffix-renamed: <new path>` |
| `propose` | Critical decision required. | Add to `proposals[]` in the install plan; do not write. User decides post-confirmation. | (no marker entry until applied) |

The adapter MUST aggregate the per-artifact actions into a single `history[]` entry on the install marker (per [`../../core/registry/install.schema.md`](../../core/registry/install.schema.md) §1.4). The phrase from the right column above is included in the entry's `summary` field. Per-artifact paths are recorded in the marker's parallel arrays — `rules[]`, `skills[]`, `mcpSlots[]` — so the audit can always reconstruct what was touched without parsing free-form summary text.

---

## 7. Stack packs

When the project profile detected one or more first-class stacks (JS/TS web, Python web, Salesforce — see [`../../core/discovery/signals/`](../../core/discovery/signals/)), the adapter applies stack-pack content from [`../../core/stack-packs/<stack-id>/`](../../core/stack-packs/) per the layering rules in [`../../core/stack-packs/_overview.md`](../../core/stack-packs/_overview.md) §3.

The Cursor adapter materialises pack content as follows:

- **Pack rule files** (`core/stack-packs/<stack-id>/rules/<topic>.md`) — each rule file becomes a `.cursor/rules/<stack-id>-<topic>.mdc` always-on rule with `globs:` derived from the rule's `## When this applies` section. Rendering follows [`render-rules.md`](render-rules.md) for `.mdc` files.
- **Pack `skills.md`** — an addendum file `.cursor/rules/<stack-id>-skills-addenda.mdc` is created (manual-trigger rule) with the pack's per-skill addenda. The agent consults it when invoking the matching universal skill.
- **Pack `roles.md`** — appended into the `AGENTS.md` managed section under a `### Stack roles addenda` subsection so the role guidance is visible to all agents that read `AGENTS.md`.

The adapter records every applied pack in the install marker under `stacks[].stackPack` per [`../../core/registry/install.schema.md`](../../core/registry/install.schema.md) §1.2 (e.g., `"core/stack-packs/js-ts"`) and `stacks[].stackPackVersion` (the pack's declared version). Re-running the adapter against a project where a pack has been updated triggers re-rendering of the pack's `.mdc` files; the post-install checks include drift detection for stack-pack content.

If a project's profile detects a stack that does not have a first-class pack in v1 (Go, Rust, .NET, generic mobile), the adapter records the detection in the install marker but does not write any pack-derived rule files; the audit reports this as `info`-severity drift, not a failure.

---

## 8. Skill placement strategy

The adapter's row 5 (skills) defaults to writing skills under `.cursor/skills/<skill-id>/SKILL.md`. When the discovery probe in [`../../core/discovery/existing-infra.md`](../../core/discovery/existing-infra.md) §3.7 detects one or more candidate **shared skill folders** (tool-agnostic locations like `.agents/`, `.ai/`, `prompts/`, or any folder the user nominates), the install plan exposes a placement decision the user resolves in Phase 6 of [`../../RUN.md`](../../RUN.md). The chosen strategy is recorded in the install marker as `skillPlacementStrategy` per [`../../core/registry/install.schema.md`](../../core/registry/install.schema.md) §1.2.

### Strategies

| `type` | Where portable skills land | Where IDE-specific behaviour lands | When this applies |
|--------|----------------------------|-------------------------------------|-------------------|
| `ide-specific` | `.cursor/skills/<skill-id>/SKILL.md` | `.cursor/rules/`, `.cursor/hooks.json`, `.cursor/mcp.json` | Default. Applied automatically when the inventory finds no candidate shared folder. `decidedBy: "default"`. |
| `shared` | `<sharedPath>/<skill-id>/SKILL.md` | `.cursor/rules/`, `.cursor/hooks.json`, `.cursor/mcp.json` (unchanged) | User explicitly nominates a candidate during Phase 6. Portable skills are written under the user's existing convention so the project does not gain a duplicate skill home. `decidedBy: "user"`. |
| `hybrid` | `<sharedPath>/<skill-id>/SKILL.md` (canonical) **and** `.cursor/skills/<skill-id>/SKILL.md` (one-line stub pointing to the canonical file) | `.cursor/rules/`, `.cursor/hooks.json`, `.cursor/mcp.json` (unchanged) | User wants portable skills discoverable via the IDE's native skill listing AND under their cross-IDE convention. `decidedBy: "user"`. |

### Stub format (hybrid only)

When `type` is `hybrid`, the file written under `.cursor/skills/<skill-id>/SKILL.md` is a single-section stub:

```markdown
# <Skill Display Name>

> This skill is canonically defined at `<sharedPath>/<skill-id>/SKILL.md`. It is mirrored here so Cursor's skill listing surfaces it. Do not edit this file — edits go to the canonical path.

See [<sharedPath>/<skill-id>/SKILL.md](<relative-path-to-canonical>) for the full skill specification.
```

The stub is regenerated on every install / audit run. The canonical file is never touched by the adapter beyond the initial write.

### What is "portable" vs. "IDE-specific"

A skill is **portable** when its `## Triggers` and `## Process` sections do not depend on Cursor-specific UI affordances (e.g., the skill does not require Cursor's command palette, model picker, or rule loader). Every skill in [`../../core/skills/`](../../core/skills/) is portable by design — they are markdown specs an agent reads and follows. So in v1 **all installed skills follow the active strategy** uniformly.

If a future skill is genuinely IDE-specific, the skill spec marks itself with a `## Portability` section reading `IDE-specific: cursor`, and the adapter places that skill under `.cursor/skills/` regardless of strategy. v1 has no such skills.

### Conflict policy under shared / hybrid

When `type` is `shared` or `hybrid`:

- If the user-nominated `<sharedPath>` already contains a folder named `<skill-id>`, the adapter applies its standard `suffix-rename` policy to write `<skill-id>.orchestra/SKILL.md` under the shared path. The IDE-folder stub (hybrid) follows suit and points to the suffix-renamed canonical path.
- If `<sharedPath>` does not exist at install time, the adapter creates it. The post-install report notes "created shared skill home: `<sharedPath>`".

### Idempotency

Re-running the orchestra with `skillPlacementStrategy.type` already recorded:

- Default `ide-specific` → unchanged behaviour from §2 row 5.
- `shared` or `hybrid` → the adapter compares each canonical file's content to the source skill template and produces `skip` actions when identical, `extend-section` only on managed-section drift. The hybrid stub regenerates only when the canonical path or skill display name changed.

### Recording the decision

The adapter writes the chosen strategy to `.ai-orchestra/install.json` exactly once per install or upgrade:

```json
"skillPlacementStrategy": {
  "type": "shared",
  "sharedPath": ".agents",
  "decidedAt": "<ISO 8601>",
  "decidedBy": "user"
}
```

Subsequent audits read this field to know where to look for canonical skill files. If the user moves the shared folder by hand, the audit surfaces the drift as a `propose` action (not auto-fixed) — moving a skill home is a deliberate decision, not a routine cleanup.

---

## 9. Install scope handling

The Cursor adapter renders only the artifacts implied by `installScope.mode` plus the resolver's `selectedRoles` and `selectedSkills` per [`../../core/install-scope.md`](../../core/install-scope.md) §2 / §3. The mode does not change *how* an artifact is written — it changes *which* artifacts the adapter writes.

### 9.1 Per-mode rendering matrix

| Artifact | `full-kit` | `selected-roles` | `primary-plus-collaborators` | `core-only` |
|----------|------------|------------------|------------------------------|-------------|
| Director rule (`.cursor/rules/ai-director.mdc`) | rendered | rendered | rendered | rendered |
| Learnings doc | rendered | rendered | rendered | rendered |
| Install marker (`.ai-orchestra/install.json`) | rendered | rendered | rendered | rendered |
| Universal audit skills (`cleanup`, `pre-release`, `ai-infra-audit`) | rendered | rendered | rendered | rendered |
| `orchestra-context.mdc` (row 4) | rendered (lists every role) | rendered (lists `selectedRoles` only) | rendered (lists `primaryRole` + collaborators + universals) | **skipped** |
| Per-skill files (row 5) | every skill from every role | union of skills for `selectedRoles` ∪ universals | union of skills for the resolved set ∪ universals | universals only |
| `AGENTS.md` managed section role list (§3) | every role | `selectedRoles` only | resolved set only | "no role library installed (core-only mode)" |
| Stack-pack rules (§7) | rendered (unaffected by scope) | rendered (unaffected by scope) | rendered (unaffected by scope) | rendered (unaffected by scope) |

Stack packs are deliberately unaffected — they are determined by the project's detected stacks, not by the role scope. A `core-only` install on a `js-ts` project still installs the JS/TS rule pack so the agent has stack guidance even without a role library.

### 9.2 The `improve` action

When Phase 6 §4.6 resolves a quality issue with `proposedAction: "improve"`, the adapter performs an in-place block rewrite of the target file. Preconditions:

- The target file MUST contain a managed marker pair (the same `<!-- ai-orchestra: managed-section start -->` / `... end -->` convention from §3), OR be one of the orchestra-wholly-owned files (`_documentation/AI_LEARNINGS.md` sections that match the template, `.ai-orchestra/install.json`, the orchestra's own `.cursor/rules/ai-director.mdc` or `orchestra-context.mdc`).
- If neither precondition holds, the action degrades to `propose` and the user is asked one more time before any write.

When `improve` fires, the row's `targetIssue` column references the originating `issue.id` from [`../../core/discovery/existing-infra.md`](../../core/discovery/existing-infra.md) §3.10 so the post-install report and the audit can reconstruct why the rewrite happened.

### 9.3 The `replace` proposal (rendered as `suffix-rename`)

When Phase 6 §4.6 resolves a quality issue with `proposedAction: "replace"`, the adapter writes the orchestra's version under `<basename>.orchestra.<ext>` next to the original, leaves the original untouched, and records the row with `action: suffix-rename` and `targetIssue: <issue.id>`. The post-install report explicitly tells the user "your `<basename>.<ext>` is recommended for replacement; once you've reviewed both files, delete whichever one you don't want — the orchestra will not delete files for you."

The next audit run after a `replace` proposal checks whether the original is still present. If both files exist after a configurable grace period (one full audit cycle by default), the audit reports it as a `warning` `replace.unresolved` so the user is reminded to act.

### 9.4 Recording the scope decision

The adapter writes `installScope` to the install marker exactly once per install or upgrade per the schema in [`../../core/registry/install.schema.md`](../../core/registry/install.schema.md) §1.2. Subsequent audits read this field to know which roles and skills the adapter is responsible for. If the user manually deletes a role-derived rule or skill file, the audit surfaces the drift as a `propose` action — re-installing a deliberately-deleted artifact is a decision the user must confirm.

### 9.5 Idempotency under scope changes

Re-running the orchestra with a different `installScope.mode` than what is recorded in the marker is treated as an upgrade, not an idempotent re-run. The adapter computes the diff between the previous resolved set and the new resolved set:

- Roles or skills newly added by the scope change → rendered as `create` (or `skip` if a previous install left the file in place).
- Roles or skills no longer in scope → the adapter does NOT delete files automatically. It surfaces them as `propose` rows ("`<file>` is no longer in scope under `<new-mode>`. Delete? Keep? Mark obsolete?") and the user resolves each one.

This conservative deletion policy preserves the orchestra's "never silently destroys user work" promise even across scope transitions.

---

## 10. Idempotency contract

Concretely, the Cursor adapter guarantees:

- Re-running the orchestra on a project where `.ai-orchestra/install.json` exists with the current core version produces only `skip` actions, except for any user-edited files (which produce `propose` or `suffix-rename` per the table).
- The marker's `history[]` array is **not** appended on idempotent re-runs that produce zero changes.
- The marker's `history[]` IS appended whenever the audit skill runs and detects either drift it auto-fixes or change proposals — using `action: "audit"` per [`../../core/registry/install.schema.md`](../../core/registry/install.schema.md) §1.4. This is a separate concern from install.

---

## 11. References

- [`INSTALL.md`](INSTALL.md) — top-level procedure that drives this file.
- [`target-schema.md`](target-schema.md) — exact file shapes referenced from this table.
- [`render-rules.md`](render-rules.md) — rule frontmatter rendering details.
- [`mcp.md`](mcp.md) — MCP-specific merge logic.
- [`post-install-checks.md`](post-install-checks.md) — checks that validate the actions in this table actually produced what was intended.
- [`../_contract.md`](../_contract.md) — adapter contract; section 5 (conflict-handling framework) is the abstract version of §6 here.
- [`../../core/install-scope.md`](../../core/install-scope.md) — install-scope modes, resolver, and the recommendation engine that drive §9.
- [`../../core/discovery/existing-infra.md`](../../core/discovery/existing-infra.md) — §3.7 defines candidate shared-folder detection that drives §8; §3.9 / §3.10 produce the inventory inputs that drive §9 quality handling.
- [`../../core/install-plan-template.md`](../../core/install-plan-template.md) — Part B's `targetIssue` column conventions used by §9.2 / §9.3.
- [`../../core/registry/install.schema.md`](../../core/registry/install.schema.md) — schema of the marker entries this file produces (including `installScope` and `skillPlacementStrategy`).

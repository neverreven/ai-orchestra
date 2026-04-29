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
| 4 | Per-role and per-skill always-on context rule | `.cursor/rules/orchestra-context.mdc` | `create` | `suffix-rename` if target exists. |
| 5 | Each installed skill (from [core/skills/](../../core/skills/)) | `.cursor/skills/<skill-id>/SKILL.md` | `create` per skill | `suffix-rename` per-folder if a folder of the same name exists. |
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

The orchestra does NOT install any `start` hooks in v1. If the project's existing `hooks.json` has start hooks, the adapter preserves them verbatim. (host-project's environment-check start hook is one such case — the orchestra never touches it.)

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

## 8. Idempotency contract

Concretely, the Cursor adapter guarantees:

- Re-running the orchestra on a project where `.ai-orchestra/install.json` exists with the current core version produces only `skip` actions, except for any user-edited files (which produce `propose` or `suffix-rename` per the table).
- The marker's `history[]` array is **not** appended on idempotent re-runs that produce zero changes.
- The marker's `history[]` IS appended whenever the audit skill runs and detects either drift it auto-fixes or change proposals — using `action: "audit"` per [`../../core/registry/install.schema.md`](../../core/registry/install.schema.md) §1.4. This is a separate concern from install.

---

## 9. References

- [`INSTALL.md`](INSTALL.md) — top-level procedure that drives this file.
- [`target-schema.md`](target-schema.md) — exact file shapes referenced from this table.
- [`render-rules.md`](render-rules.md) — rule frontmatter rendering details.
- [`mcp.md`](mcp.md) — MCP-specific merge logic.
- [`post-install-checks.md`](post-install-checks.md) — checks that validate the actions in this table actually produced what was intended.
- [`../_contract.md`](../_contract.md) — adapter contract; section 5 (conflict-handling framework) is the abstract version of §6 here.
- [`../../core/registry/install.schema.md`](../../core/registry/install.schema.md) — schema of the marker entries this file produces.

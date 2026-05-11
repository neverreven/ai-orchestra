# VS Code (Copilot) adapter — render-rules.md

> The exact rendering rules for `.github/copilot-instructions.md` managed-section content, `.github/prompts/<skill-id>.prompt.md` custom-prompt files, and the managed-section mirror in `AGENTS.md`. This file spells out the marker convention, placeholder substitution, prompt frontmatter, description synthesis, and the idempotency contract.

---

## 1. Why this is its own file

`mappings.md` is a quick-reference table; `target-schema.md` is the after-state. Neither has room to spell out:

- The exact content written between the managed-section markers in `copilot-instructions.md` and `AGENTS.md`.
- Placeholder substitution rules.
- The VS Code custom-prompt frontmatter convention (`mode`, `description`).
- Description-line synthesis for prompt files.
- The determinism rules that make idempotent re-runs produce zero diff.

This file fills that gap. The post-install checks ([`post-install-checks.md`](post-install-checks.md)) verify the **outcomes** described here.

---

## 2. Managed-section marker conventions

The orchestra owns a section of `.github/copilot-instructions.md` and a mirror of the same content in `AGENTS.md`. Markers are HTML comments — invisible in Markdown renders but unambiguous in raw files:

```markdown
<!-- ai-orchestra: managed-section start -->
...orchestra-managed content...
<!-- ai-orchestra: managed-section end -->
```

These markers apply identically to both `copilot-instructions.md` and `AGENTS.md`.

### Rules

| Situation | Action |
|-----------|--------|
| File does not exist | `create` it; the managed section is the only content. |
| File exists; markers absent | `extend-section` — append the markers + content at end-of-file, one blank line of separation. |
| File exists; markers present | Replace content **between** the markers verbatim. Leave content outside the markers untouched. |
| Markers present but malformed (missing close, nested, overlapping) | Critical conflict — surface to user. Do not auto-repair. |

### `.github/` directory

The adapter creates `.github/` and `.github/prompts/` if absent. It does NOT touch `.github/workflows/`, `.github/CODEOWNERS`, or any other `.github/` file.

---

## 3. Director rule rendering

Source: [`../../core/director/RULE.md`](../../core/director/RULE.md).

VS Code + Copilot has no per-rule files in v1. The Director rule body is **embedded** inside the managed section of `copilot-instructions.md`.

### 3.1 Extraction

The rendered Director body is the content inside the markdown code fence in `RULE.md` — the block starting with ` ```markdown ` and ending before the closing ` ``` `. Fence lines are stripped; the content between them is the renderable body.

### 3.2 Placeholder substitution

Substitution is top-to-bottom, single-pass. Each substitution is independent.

| Placeholder | Source | Default if absent |
|-------------|--------|-------------------|
| `{{PROJECT_NAME}}` | Project profile (Phase 2). | Repository folder name. |
| `{{LEARNINGS_PATH}}` | Install plan (Phase 5), per [`mappings.md`](mappings.md) §4. | `_documentation/AI_LEARNINGS.md` |
| `{{PROJECT_CONTEXT_PATH}}` | `.github/copilot-instructions.md` (the managed section IS the context). | `.github/copilot-instructions.md` |
| `{{ARCHITECTURE_DOC_PATH}}` | Detected or asked during Phase 5 (optional). | (empty — see §3.3) |
| `{{INSTALL_MARKER_PATH}}` | Always `.ai-orchestra/install.json`. | Same. |
| `{{LEARNINGS_LINE_BUDGET}}` | Static: `300`. | `300`. |

The adapter MUST verify, after substitution, that **no `{{...}}` patterns remain**. If any do, install fails.

### 3.3 Conditional rendering for `{{ARCHITECTURE_DOC_PATH}}`

When `{{ARCHITECTURE_DOC_PATH}}` resolves to empty, the bullet referencing it is **omitted** and surrounding step numbering is reflowed. This is the only conditional rendering rule.

### 3.4 Body verbatim

Outside placeholders, the body is rendered byte-for-byte. The adapter MUST NOT re-flow paragraphs, trim whitespace inside code blocks, re-order sections, or add or remove blank lines.

### 3.5 Placement in managed section

The rendered Director body is placed as a `## Director protocol (always-on)` sub-section within the managed section, after the Identity block and before the Roles section. See [`target-schema.md`](target-schema.md) §2 for the full managed-section layout.

---

## 4. Project-context rendering

The managed section includes an Identity block:

```markdown
## Identity

- **Project:** {{PROJECT_NAME}}
- **Stacks detected:** {{STACK_LIST}}
- **Frameworks:** {{FRAMEWORK_LIST}}
- **Orchestra version:** {{ORCHESTRA_VERSION}}
- **VS Code adapter version:** {{ADAPTER_VERSION}}
- **Installed:** {{INSTALL_DATE}}
```

### 4.1 Placeholder sources

| Placeholder | Source / construction |
|-------------|-----------------------|
| `{{STACK_LIST}}` | Comma-separated `<stack-id> (confidence <0.NN>)`. Sorted alphabetically by stack-id. |
| `{{FRAMEWORK_LIST}}` | Comma-separated framework ids. Sorted alphabetically. If empty, render `(none detected)`. |
| `{{ORCHESTRA_VERSION}}` | From `ai-orchestra/VERSION`. |
| `{{ADAPTER_VERSION}}` | This adapter's version (matches core in v1). |
| `{{INSTALL_DATE}}` | ISO 8601 timestamp from the install plan — copied to the marker's `orchestra.installedAt`. Never re-rendered after first install. |

### 4.2 Roles section

```markdown
## Roles installed

- **<display name>** — <first sentence of role file's `## Mission`>
```

One bullet per installed role. Sorted alphabetically by display name.

### 4.3 Skills section

```markdown
## Skills installed

### <category title>
- <skill-id> — `/<skill-id>`
```

Grouped by category (alphabetically). Within each category, skills sorted alphabetically by `skill-id`.

### 4.4 Pointers section

```markdown
## Pointers

- Project context: `.github/copilot-instructions.md` (and `AGENTS.md` mirror)
- Skills: `.github/prompts/<skill-id>.prompt.md` (invoke as `/<skill-id>` in Copilot Chat)
- Learnings: {{LEARNINGS_PATH}}
- Install marker: `.ai-orchestra/install.json`
```

---

## 5. Skill rendering — `.github/prompts/<skill-id>.prompt.md`

Source: any installed `core/skills/<category>/<skill-id>/SKILL.md`.

### 5.1 Frontmatter

VS Code Copilot custom-prompt frontmatter:

```yaml
---
mode: "agent"
description: >-
  <synthesised description; see §5.2>
---
```

`mode: "agent"` makes the prompt available as a slash command in Copilot Chat (`/<skill-id>`). The `tools` key is omitted in v1 — the orchestra does not declare tools in its prompts.

### 5.2 Description synthesis

Identical to the Cursor adapter ([`../cursor/render-rules.md`](../cursor/render-rules.md) §5.2):

1. **Summary line** — the source SKILL.md's blockquote first paragraph, line breaks normalised to spaces. Truncated to 200 characters max (no mid-word cuts).
2. **Trigger phrases** — bullets under `## Trigger`. Joined by `, `, wrapped in single-quoted form.
3. **Use clause** — ` Use when the user says ` between summary and triggers.

Final shape:
```
<summary line>. Use when the user says <trigger phrases>.
```

The `>-` folded-block scalar collapses internal newlines.

### 5.3 Body

The body is the source SKILL.md from the first `# <Skill Name>` heading onward, with:

| Transformation | Applied to |
|----------------|------------|
| Rewrite relative links from orchestra-relative to project-relative. | Every link whose target starts with `../../core/`. The adapter computes the path from `.github/prompts/<skill-id>.prompt.md` to the orchestra core file. |
| Strip `## References` cross-links to schema files (`_schema.md`). | Infrastructure-internal. |
| Preserve all other sections verbatim. | Trigger / When to use / Process / Output / remaining References. |

### 5.4 Auxiliary files

VS Code custom prompts are single files. Auxiliary files from the source skill folder are NOT copied in v1. Skills that need auxiliary content reference paths inside `ai-orchestra/core/skills/<category>/<skill-id>/` from within the prompt body. This is a declared gap; see [`INSTALL.md`](INSTALL.md) §6.

### 5.5 Description disambiguation on suffix-rename

When a skill undergoes `suffix-rename` because `.github/prompts/<skill-id>.prompt.md` already exists with non-orchestra content:

1. Prepend `[Orchestra] ` to the synthesised description.
2. Append: ` The project also defines a prompt named '<skill-id>' at '.github/prompts/<skill-id>.prompt.md' — read both and choose the one that fits.`

The project's original prompt file is never modified. The post-install report includes an `## Overlapping skills` section when any overlaps are detected.

---

## 6. Stop-hook — declared gap

VS Code + Copilot has no documented session-end hook for the agent in v1. The stop-hook is a declared gap. See [`INSTALL.md`](INSTALL.md) §6 and [`mappings.md`](mappings.md) §5 for the manual fallbacks.

The Director rule body embedded in §3 includes the Session-End Behaviour section, which instructs the agent to review the session for learnings on user request. Manual fallback: "review this session for learnings" or `/ai-infra-audit`.

No prompt body is rendered for this adapter in v1.

> **v2 note.** If VS Code gains a session-end hook via an extension API or the agent framework, the adapter will add a `hooks` section to the managed area per [`../_stop-hook.md`](../_stop-hook.md) and populate this section.

---

## 7. Stack-pack content rendering

When the project profile detected one or more first-class stacks, stack-pack rules are added as `## Stack: <stack-id>` sub-sections inside the managed section of `copilot-instructions.md`, after the Pointers section.

### 7.1 Glob filtering

Before including a pack rule, the adapter tests its `## When this applies` globs against the project's tracked files. Rules whose globs match zero files are omitted and recorded in `stacks[].skippedPackRules[]`. Installed rules are recorded in `stacks[].installedPackRules[]`. Pack rules with no explicit glob are always included.

### 7.2 Pack rule inline format

Each included pack rule becomes an `### <rule title>` sub-section. Its `## Patterns to follow` and `## Anti-patterns to avoid` content is inlined verbatim. The `## When this applies` and `## References` sections are stripped.

### 7.3 Ordering

Stacks alphabetically by stack-id. Pack rules within a stack alphabetically by rule filename.

### 7.4 v2 path

If VS Code stabilises the `.github/instructions/<name>.instructions.md` convention with `applyTo` glob patterns, the adapter may move stack-pack rules to per-pack instruction files. In that model each pack rule file would map to one `.github/instructions/<stack>-<rule>.instructions.md` with `applyTo: <glob>` in the frontmatter, enabling true file-scoped activation. The v1 consolidated approach is a conservative choice pending that convention's stability.

---

## 8. Stable rendering and idempotency

Every step in this file is **deterministic**. On re-run, the adapter re-renders each artifact from the same inputs and compares byte-for-byte. Identical bytes → `skip`. Different bytes → `propose` (user content) or update managed section (orchestra content).

Sources of non-determinism the adapter MUST avoid:

- Map iteration order in any language without explicit sorting.
- System time anywhere except the marker's `orchestra.installedAt` and `history[].at`.
- Random ids — the orchestra never generates them.
- Locale-dependent string operations.

The adapter MUST sort every iteration over roles, skills, stacks, frameworks, and pack rules alphabetically by their stable id before rendering.

---

## 9. References

- [`INSTALL.md`](INSTALL.md) §4 (Phase 7) — invocation point.
- [`mappings.md`](mappings.md) — table that points here for rendering details.
- [`target-schema.md`](target-schema.md) — what each rendered file looks like at rest.
- [`post-install-checks.md`](post-install-checks.md) §5 + §9 — checks that validate the outcomes of this file.
- [`mcp.md`](mcp.md) — MCP entries (separate from managed-section rendering).
- [`../../core/director/RULE.md`](../../core/director/RULE.md) — source for §3.
- [`../../core/director/learnings-template.md`](../../core/director/learnings-template.md) — source for the learnings doc.
- [`../_stop-hook.md`](../_stop-hook.md) — stop-hook contract; declared as a gap for VS Code v1.
- [`../cursor/render-rules.md`](../cursor/render-rules.md) — full-adapter reference; description-synthesis formula (§5.2) applies verbatim.
- [`../claude-code/render-rules.md`](../claude-code/render-rules.md) — sibling baseline (same managed-section pattern).

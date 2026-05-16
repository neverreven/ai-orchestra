# Claude Code adapter — render-rules.md

> The exact rendering rules for `CLAUDE.md` managed-section content, `.claude/commands/<skill-id>.md` skill files, and the stop-hook prompt body. This is the deepest Claude Code-specific doc — it spells out the managed-section marker convention, placeholder substitution, description synthesis, and the idempotency contract.

---

## 1. Why this is its own file

`mappings.md` is a quick-reference table; `target-schema.md` is the after-state. Neither has room to spell out:

- The exact content that gets written between the managed-section markers in `CLAUDE.md` and `AGENTS.md`.
- Placeholder substitution rules.
- Description-line synthesis for skill command files.
- The full stop-hook prompt body.
- The determinism rules that make idempotent re-runs produce zero diff.

This file fills that gap. The post-install checks ([`post-install-checks.md`](post-install-checks.md)) verify the **outcomes** described here.

---

## 2. Managed-section marker conventions

The orchestra owns a section of `CLAUDE.md` and a mirror of the same content in `AGENTS.md`. Markers are HTML comments, which are invisible in Markdown renders but unambiguous in raw files:

```markdown
<!-- ai-orchestra: managed-section start -->
...orchestra-managed content...
<!-- ai-orchestra: managed-section end -->
```

### Rules

| Situation | Action |
|-----------|--------|
| File does not exist | `create` it; the managed section is the only content. |
| File exists; markers absent | `extend-section` — append the markers + content at end-of-file, one blank line of separation. |
| File exists; markers present | Replace content **between** the markers verbatim. Leave content outside the markers untouched. |
| Markers present but malformed (missing close, nested, overlapping) | Critical conflict — surface to user. Do not auto-repair. |

### Stable marker placement

The adapter writes the exact marker strings — no extra spaces, no variation in casing. The idempotency check (§8) verifies the markers are byte-identical on re-run.

---

## 3. Director rule rendering

Source: [`../../core/director/RULE.md`](../../core/director/RULE.md).

Claude Code has no separate rules directory. The Director rule body is **embedded** inside the managed section under its own heading.

### 3.1 Extraction

The rendered Director body is the content inside the markdown code fence in `RULE.md` — the block that starts with ` ```markdown ` and ends before ` ``` `. The opening fence line and closing fence line are stripped; everything between them is the renderable content.

### 3.2 Placeholder substitution

Substitution order is top-to-bottom, single-pass. Each substitution is independent — later substitutions cannot affect earlier results.

| Placeholder | Source | Default if absent |
|-------------|--------|-------------------|
| `{{PROJECT_NAME}}` | Project profile (Phase 2). | Repository folder name. |
| `{{LEARNINGS_PATH}}` | Install plan (Phase 5), per [`mappings.md`](mappings.md) §4. | `_documentation/AI_LEARNINGS.md` |
| `{{PROJECT_CONTEXT_PATH}}` | `CLAUDE.md` (the managed section IS the context for Claude Code). | `CLAUDE.md` |
| `{{ARCHITECTURE_DOC_PATH}}` | Detected or asked during Phase 5 (optional). | (empty — see §3.3) |
| `{{INSTALL_MARKER_PATH}}` | Always `.ai-orchestra/install.json`. | Same. |
| `{{INSTALLED_FOLDER}}` | `installedFolder` field from `.ai-orchestra/install.json`. | `score` |
| `{{LEARNINGS_LINE_BUDGET}}` | Static: `300`. | `300`. |

The adapter MUST verify, after substitution, that **no `{{...}}` patterns remain**. If any do, install fails.

### 3.3 Conditional rendering for `{{ARCHITECTURE_DOC_PATH}}`

When `{{ARCHITECTURE_DOC_PATH}}` resolves to empty, the entire bullet that references it (Step 3: "If applicable, read `{{ARCHITECTURE_DOC_PATH}}`...") is **omitted** from the output, and surrounding step numbering is reflowed. This is the only conditional rendering rule.

### 3.4 Body verbatim

Outside placeholders, the body is rendered byte-for-byte. The adapter MUST NOT re-flow paragraphs, trim whitespace inside code blocks, re-order sections, or add or remove blank lines.

### 3.5 Placement in managed section

The rendered Director body is placed as a `## Director protocol (always-on)` sub-section within the managed section, after the Identity block and before the Roles section. See [`target-schema.md`](target-schema.md) §2 for the full managed-section layout.

### 3.6 Suffix-rename downgrade

When a `CLAUDE.md` suffix-rename conflict fires (the file exists with user content the adapter cannot extend via markers), the adapter writes `CLAUDE.orchestra.md`. The renamed copy's managed section begins with a `> **Note:**` blockquote:

> **Note:** This file is a suffix-renamed orchestra copy. It is NOT auto-loaded by Claude Code. To use the orchestra's session protocol, copy the content below into your main `CLAUDE.md` managed section, or rename this file to `CLAUDE.md` after removing the original.

The install marker records this copy as `alwaysOn: false` (not auto-loaded). See [`mappings.md`](mappings.md) §6.1 for the full conflict policy.

---

## 4. Project-context rendering

Source: this adapter (no core template; the context block is Claude Code-specific).

The managed section includes an Identity block rendered from the install plan:

```markdown
## Identity

- **Project:** {{PROJECT_NAME}}
- **Stacks detected:** {{STACK_LIST}}
- **Frameworks:** {{FRAMEWORK_LIST}}
- **Orchestra version:** {{ORCHESTRA_VERSION}}
- **Claude Code adapter version:** {{ADAPTER_VERSION}}
- **Installed:** {{INSTALL_DATE}}
```

### 4.1 Placeholder sources

| Placeholder | Source / construction |
|-------------|-----------------------|
| `{{STACK_LIST}}` | Comma-separated `<stack-id> (confidence <0.NN>)` per Phase 2 detection. Sorted alphabetically by stack-id. |
| `{{FRAMEWORK_LIST}}` | Comma-separated framework ids per Phase 2 detection. Sorted alphabetically. If empty, render `(none detected)`. |
| `{{ORCHESTRA_VERSION}}` | From `{{INSTALLED_FOLDER}}/VERSION`. |
| `{{ADAPTER_VERSION}}` | This adapter's version (matches core in v1). |
| `{{INSTALL_DATE}}` | ISO 8601 timestamp from the install plan — copied to the marker's `orchestra.installedAt`. Never re-rendered after first install (the managed section updates use the stored value). |

### 4.2 Roles section

```markdown
## Roles installed

- **<display name>** — <first sentence of role file's `## Mission`>
```

One bullet per installed role. Sorted alphabetically by display name. Display name is the role file's first `# ` heading, stripped of the `# ` prefix.

### 4.3 Skills section

```markdown
## Skills installed

### <category title>
- <skill-id> — `/<skill-id>`
```

Grouped by category (alphabetically). Within each category, skills sorted alphabetically by `skill-id`. Category title is the category directory name, title-cased (e.g., `audit` → `Audit`, `code` → `Code`).

### 4.4 Pointers section

```markdown
## Pointers

- Project context (this file): `CLAUDE.md` (and `AGENTS.md` mirror)
- Skills: `.claude/commands/<skill-id>.md`
- Learnings: {{LEARNINGS_PATH}}
- Install marker: `.ai-orchestra/install.json`
```

---

## 5. Skill rendering — `.claude/commands/<skill-id>.md`

Source: any installed `core/skills/<category>/<skill-id>/SKILL.md`.

### 5.1 Frontmatter

```yaml
---
description: >-
  <synthesised description; see §5.2>
---
```

### 5.2 Description synthesis

The `description` is built from three pieces, identical to the Cursor adapter ([`../cursor/render-rules.md`](../cursor/render-rules.md) §5.2):

1. **Summary line** — the source SKILL.md's blockquote first paragraph, with line breaks normalised to spaces. Truncated to 200 characters max (no mid-word cuts).
2. **Trigger phrases** — the bullets under `## Trigger`. Joined by `, `, wrapped in single-quoted form: `'phrase one', 'phrase two'`.
3. **Use clause** — the literal string ` Use when the user says ` between summary and triggers.

Final shape:
```
<summary line>. Use when the user says <trigger phrases>.
```

The folded-block scalar `>-` collapses internal newlines.

### 5.3 Body

The body is the source SKILL.md from the first `# <Skill Name>` heading onward, with these transforms:

| Transformation | Applied to |
|----------------|------------|
| Rewrite relative links from orchestra-relative to project-relative. | Every Markdown link whose target starts with `../../core/`. The adapter computes the path from `.claude/commands/<skill-id>.md` to the orchestra core file and writes the new relative path. |
| Strip the source SKILL's `## References` cross-links to schema files (`_schema.md`). | Infrastructure-internal; the skill engine doesn't navigate to them. |
| Preserve all other sections verbatim. | Trigger / When to use / When NOT to use / Process / Output / remaining References. |

### 5.4 Auxiliary files

Claude Code slash-command files are single files. Auxiliary files (`template.md`, `checklist.md`, `examples/`) from the source skill folder are NOT copied in v1. Skills that depend on auxiliary content reference those paths inside `{{INSTALLED_FOLDER}}/core/skills/<category>/<skill-id>/` from within the command body. This is a declared gap; see [`INSTALL.md`](INSTALL.md) §6.

### 5.5 Description disambiguation on suffix-rename

When a skill undergoes `suffix-rename` because `.claude/commands/<skill-id>.md` already exists with non-orchestra content, the adapter MUST modify the renamed copy's `description` frontmatter:

1. Prepend `[Orchestra] ` to the synthesised description.
2. Append: ` The project also defines a skill named '<skill-id>' at '.claude/commands/<skill-id>.md' — read both and choose the one that fits.`

**Final shape:**
```
[Orchestra] <summary line>. Use when the user says <trigger phrases>. The project also defines a skill named '<skill-id>' at '.claude/commands/<skill-id>.md' — read both and choose the one that fits.
```

The project's original command file is never modified. The post-install report includes an `## Overlapping skills` section when any overlaps are detected.

---

## 6. Stop-hook prompt rendering

Source: [`../_stop-hook.md`](../_stop-hook.md).

The exact `prompt` field for the orchestra entry in `.claude/settings.json`:

```
First, evaluate the scheduler: read score/core/scheduler/RUNNER.md §0–§3 and run any overdue jobs. If all jobs are up to date, continue immediately without surfacing the check. Then, review this conversation for any new project-specific learning. A learning qualifies if it is: a pattern the team should keep doing (Established Patterns), a problem the team should stop doing (Anti-Patterns), a user preference stated explicitly (User Preferences), an architecture or product decision (Decision Log), or an environment quirk (Environment Notes). If none qualify, do nothing — empty is the common case. Otherwise: read {{LEARNINGS_PATH}}, follow the Update Mechanics in {{DIRECTOR_RULE_PATH}}, append the new entry to the appropriate section, and update the document's Last updated date. Never overwrite existing entries; ask the user if a contradiction is found. Stop-hook contract version: {{STOP_HOOK_CONTRACT_VERSION}}.
```

### 6.1 Placeholder substitution

| Placeholder | Source |
|-------------|--------|
| `{{LEARNINGS_PATH}}` | Same as in the Director rule. |
| `{{DIRECTOR_RULE_PATH}}` | Always `CLAUDE.md` for the Claude Code adapter (the Director's location). |
| `{{STOP_HOOK_CONTRACT_VERSION}}` | `1.0` in v1. |

### 6.2 Length budget

The orchestra targets ≤ 800 characters after substitution. The template above is approximately 760 characters with default substitutions. If a substitution causes it to exceed 800 characters, the adapter falls back to a shorter form and records the truncation in the marker.

### 6.3 Older Claude Code versions

When the detected Claude Code version does not support hooks, this prompt is not written. The install marker records `hooks.Stop.registered: false` and `hooks.Stop.gapReason: "claude-code-version-no-hooks"`. See [`INSTALL.md`](INSTALL.md) §6.

---

## 7. Stack-pack content rendering

When the project profile detected one or more first-class stacks, stack-pack rules are added as additional `## Stack: <stack-id>` sub-sections inside the managed section, after the Pointers section.

### 7.1 Glob filtering

Before including a pack rule, the adapter tests its `## When this applies` globs against the project's tracked files. Rules whose globs match zero files are omitted and recorded in `stacks[].skippedPackRules[]`. Installed rules are recorded in `stacks[].installedPackRules[]`. Pack rules with no explicit glob are always included.

### 7.2 Pack rule inline format

Each included pack rule becomes an `### <rule title>` sub-section, with its `## Patterns to follow` and `## Anti-patterns to avoid` content inlined verbatim. The `## When this applies` and `## References` sections are stripped (they are meta-content, not agent-facing guidance).

### 7.3 Ordering

Stacks are ordered alphabetically by stack-id. Pack rules within a stack are ordered alphabetically by rule filename. This ordering is deterministic and produces stable managed-section content across re-runs.

---

## 8. Stable rendering and idempotency

Every step in this file is **deterministic**. On re-run, the adapter re-renders each artifact from the same inputs and compares against the file at the target path byte-for-byte. Identical bytes → `skip`. Different bytes → `propose` (user content) or `create`/`extend-section` (orchestra content).

Sources of non-determinism the adapter MUST avoid:

- Map iteration order in any language without explicit sorting.
- System time anywhere except the marker's `orchestra.installedAt` and `history[].at` (recorded once, never re-rendered into managed-section content).
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
- [`../_stop-hook.md`](../_stop-hook.md) — stop-hook contract whose prompt body §6 implements for Claude Code.
- [`../cursor/render-rules.md`](../cursor/render-rules.md) — full-adapter reference; §5.2 description synthesis applies verbatim.

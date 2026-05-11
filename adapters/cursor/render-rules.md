# Cursor adapter — render-rules.md

> The exact rendering rules for `.mdc` rule files, `SKILL.md` skill files, and the stop-hook prompt. This is the deepest of the Cursor-specific docs — it spells out frontmatter shapes, placeholder substitution, and content transformations.

---

## 1. Why this is its own file

`mappings.md` is a quick-reference table; `target-schema.md` is the after-state. Neither has room to spell out:

- Exact YAML frontmatter rendering for each rule.
- Placeholder substitution rules.
- Description-line synthesis for skills.
- The full stop-hook prompt body.

This file fills that gap. The post-install checks ([`post-install-checks.md`](post-install-checks.md)) verify the **outcomes** described here.

---

## 2. Frontmatter conventions

Cursor reads YAML frontmatter delimited by triple-dash lines. The adapter MUST:

- Use exactly three dashes (`---`) on lines by themselves to open and close.
- Place a single newline immediately after the closing fence, then the rule/skill body.
- Use double-quoted strings for any value containing characters that would otherwise need escaping (commas, colons, quotes).
- Use YAML's folded-block scalar (`>-`) for multi-line description text in skills.

Example shape:

```yaml
---
description: One-line description.
alwaysApply: true
---

# Body starts here
```

The adapter never emits four-dash openers, never indents the fences, never adds inline comments to the frontmatter.

---

## 3. Director rule rendering — `ai-director.mdc`

Source: [`../../core/director/RULE.md`](../../core/director/RULE.md).

### 3.1 Frontmatter

```yaml
---
description: AI Director — session protocol for context continuity. Reads accumulated learnings at session start; captures new ones during and at session end.
alwaysApply: true
---
```

The `description` is fixed at this string in v1 (the audit's `rules.director.frontmatter` check enforces it). Future versions may localise but never make it user-editable.

### 3.2 Placeholder substitution

The Director rule template uses these placeholders. The adapter substitutes them in this order (each substitution is single-pass; later substitutions cannot affect earlier results):

| Placeholder | Source | Default if absent |
|-------------|--------|-------------------|
| `{{PROJECT_NAME}}` | Project profile (Phase 2). | Repository folder name. |
| `{{LEARNINGS_PATH}}` | Install plan (Phase 5), per [`mappings.md`](mappings.md) §4. | `_documentation/AI_LEARNINGS.md` |
| `{{PROJECT_CONTEXT_PATH}}` | Detected during Phase 3 (existing-infra inventory). | `AGENTS.md` |
| `{{ARCHITECTURE_DOC_PATH}}` | Detected or asked during Phase 5 (optional). | (empty — when absent, the line in the rendered rule that mentions architecture is rendered without a path; see §3.3). |
| `{{INSTALL_MARKER_PATH}}` | Always `.ai-orchestra/install.json`. | Same. |
| `{{LEARNINGS_LINE_BUDGET}}` | Static for v1: `300`. | `300`. |

The adapter MUST verify, after substitution, that **no `{{...}}` patterns remain** anywhere in the rendered file. If any do, install fails (caught by the `rules.director.placeholders` check).

### 3.3 Conditional rendering for missing optional placeholders

When `{{ARCHITECTURE_DOC_PATH}}` resolves to empty:

- The line "(If applicable) Read `{{ARCHITECTURE_DOC_PATH}}` for the full architecture reference." is **omitted** from the rendered output (the entire bullet is removed, with surrounding numbering re-flowed).
- The downstream "Step 4" still exists; only the architecture-reference bullet (between Steps 2 and 3 in the source) is removed.

This is the only conditional rendering rule in v1. All other placeholders are always non-empty after default-fallback.

### 3.4 Body verbatim

Outside placeholders, the body is rendered byte-for-byte. The adapter MUST NOT:

- Re-flow paragraphs.
- Trim whitespace inside code blocks.
- Re-order sections.
- Add or remove blank lines.

The post-install check `rules.director.frontmatter` enforces this implicitly via hash comparison against the substituted template.

---

## 4. Orchestra-context rule rendering — `orchestra-context.mdc`

Source: this adapter (no core template; the rule is Cursor-specific).

### 4.1 Frontmatter

```yaml
---
description: Always-on orchestra-managed context. Roles, stacks, and non-negotiables. Update via 'audit AI infra'.
alwaysApply: true
---
```

### 4.2 Body template

```markdown
# {{PROJECT_NAME}} — Orchestra context (auto-generated)

> This rule is managed by ai-orchestra. Edits are overwritten on the next orchestra run. To extend the project context, edit `AGENTS.md` outside the marker pair.

## Identity

- **Project:** {{PROJECT_NAME}}
- **Detected stacks:** {{STACK_LIST}}
- **Detected frameworks:** {{FRAMEWORK_LIST}}
- **Orchestra version:** {{ORCHESTRA_VERSION}}
- **Cursor adapter version:** {{ADAPTER_VERSION}}

## Roles installed

{{ROLES_BULLET_LIST}}

## Skills installed

{{SKILLS_GROUPED_LIST}}

## Critical non-negotiables

{{NON_NEGOTIABLES}}

## Pointers

- Director rule: `.cursor/rules/ai-director.mdc`
- Project context: `AGENTS.md` (managed section + your hand-written content)
- Skills: `.cursor/skills/<skill-id>/SKILL.md`
- Learnings: {{LEARNINGS_PATH}}
- Install marker: `.ai-orchestra/install.json`

## How to update this rule

The orchestra regenerates this file on every run of "run the orchestra" and on every audit that detects drift. To force a re-render, run "audit AI infra" and accept the proposed diff.
```

### 4.3 Building each placeholder

| Placeholder | Source / construction |
|-------------|-----------------------|
| `{{STACK_LIST}}` | Comma-separated `<stack-id> (confidence <0.NN>)` per Phase 2 detection. |
| `{{FRAMEWORK_LIST}}` | Comma-separated framework ids per Phase 2 detection. If empty, render `(none detected)`. |
| `{{ORCHESTRA_VERSION}}` | From `ai-orchestra/VERSION`. |
| `{{ADAPTER_VERSION}}` | This adapter's version (matches core in v1). |
| `{{ROLES_BULLET_LIST}}` | One bullet per installed role: `- **<display name>** — <first sentence of role file's `## Mission`>`. Sorted alphabetically by display name. |
| `{{SKILLS_GROUPED_LIST}}` | Grouped by category. Per category: `### <category title>` then a bullet list of skill ids. Sorted alphabetically within each category. |
| `{{NON_NEGOTIABLES}}` | Bullet list of one-line statements derived from each role's `## Mission` paragraph (the sentence that begins with "Cares about"). When the role file does not have one, the bullet is omitted rather than synthesised. |

The adapter MUST guarantee deterministic ordering and stable wording, so idempotent re-runs produce zero diff.

---

## 5. Skill rendering — `.cursor/skills/<skill-id>/SKILL.md`

Source: any installed `core/skills/<category>/<skill-id>/SKILL.md`.

### 5.1 Frontmatter

```yaml
---
name: <skill-id>
description: >-
  <synthesised description; see §5.2>
---
```

### 5.2 Description synthesis

The `description` is built from three pieces:

1. **Summary line** — the source SKILL.md's blockquote first paragraph, with line breaks normalised to spaces. Truncated to 200 characters max (no mid-word cuts).
2. **Trigger phrases** — the bullets under `## Trigger` in the source. Joined by `, `, wrapped in single-quoted form: `'phrase one', 'phrase two'`.
3. **Use clause** — the literal string ` Use when the user says ` between summary and triggers.

Final shape:

```
<summary line>. Use when the user says <trigger phrases>.
```

The folded-block scalar `>-` is used so YAML preserves spaces but collapses newlines.

### 5.3 Body

The body is the source SKILL.md content from the first `# <Skill Name>` heading onward, with these adjustments:

| Transformation | Applied to |
|----------------|------------|
| Rewrite relative links from orchestra-relative to project-relative. | Every Markdown link whose target starts with `../../core/`. The adapter computes the path from `.cursor/skills/<skill-id>/SKILL.md` to the orchestra core file and writes the new relative path. |
| Strip the source SKILL's `## References` cross-links to schema files (`_schema.md`). | The skill engine in Cursor doesn't navigate to schema files; they are infrastructure-internal. |
| Preserve all other sections verbatim. | Trigger / When to use / When NOT to use / Process / Output / and remaining References. |

### 5.4 Auxiliary files

If the source skill folder includes `template.md`, `checklist.md`, or `examples/`:

- Files in `examples/` are copied verbatim with their relative structure.
- `template.md` and `checklist.md` are copied verbatim.

The folder structure mirrors the source, except all live as siblings of `SKILL.md` in `.cursor/skills/<skill-id>/`.

### 5.5 Description disambiguation on skill suffix-rename

When a skill undergoes `suffix-rename` because `.cursor/skills/<skill-id>/` already exists with non-orchestra content (per [`mappings.md`](mappings.md) §6), the adapter MUST modify the renamed copy's `description` frontmatter field before writing. This prevents the two skills' trigger phrases from being indistinguishable in Cursor's skill listing.

**Procedure:**

1. Read the `description` field (or the first `## When to use` / blockquote paragraph as fallback) from the **existing project skill's** `SKILL.md`.
2. Extract a short label from it: the first sentence, truncated to 60 characters, stripped of Markdown.
3. Prepend the orchestra skill's synthesised description (per §5.2) with:
   `[Orchestra] `
4. Append a disambiguation note after the trigger phrases:
   ` The project also defines a skill named '<skill-id>' at '.cursor/skills/<skill-id>/SKILL.md' — read both and choose the one that fits.`

**Final shape for the renamed copy's description:**

```
[Orchestra] <summary line>. Use when the user says <trigger phrases>. The project also defines a skill named '<skill-id>' at '.cursor/skills/<skill-id>/SKILL.md' — read both and choose the one that fits.
```

The `>-` folded-block scalar still applies; YAML collapses internal newlines.

**The project's original skill is never modified.** Only the orchestra's renamed copy gets the disambiguation prefix.

---

## 5.6 Frontmatter transformation on suffix-rename (always-on downgrade)

When a rule file with `alwaysApply: true` undergoes `suffix-rename` (per [`mappings.md`](mappings.md) §6.1), the adapter transforms the frontmatter of the **renamed copy only** (the project's original file is never touched):

### Source frontmatter (before transformation)

```yaml
---
description: AI Director — session protocol for context continuity. Reads accumulated learnings at session start; captures new ones during and at session end.
alwaysApply: true
---
```

### Transformed frontmatter (what gets written to the renamed copy)

```yaml
---
description: "[Orchestra — manual trigger] AI Director — session protocol for context continuity. Reads accumulated learnings at session start; captures new ones during and at session end."
alwaysApply: false
---
```

### Rules

| Aspect | Behaviour |
|--------|-----------|
| `alwaysApply` | Always set to `false` on the renamed copy. |
| `description` prefix | `[Orchestra — manual trigger] ` prepended. Use double-quoted YAML string when the prefix introduces characters that need escaping. |
| Body comment | Insert `<!-- This rule was suffix-renamed because the project already owns a rule at the original path. It is NOT always-on to avoid double-loading with the project's version. To use it, invoke it manually or change alwaysApply back to true after removing the project's version. -->` on the first line after the closing `---` fence, followed by one blank line before the body content. |
| `globs` | If the source would have had `globs` (e.g., a stack-pack rule), preserve the globs unchanged on the renamed copy — they are harmless when `alwaysApply: false` (manual-trigger rules ignore globs). |
| Body content | Unchanged from the source rendering. Placeholder substitution still applies. |

### Which artifacts can trigger this

In v1, only two orchestra artifacts are rendered with `alwaysApply: true`:

1. **Director rule** (`ai-director.mdc` → renamed to `ai-director.orchestra.mdc` on conflict).
2. **Orchestra-context rule** (`orchestra-context.mdc` → renamed to `orchestra-context.orchestra.mdc` on conflict).

Stack-pack rules are **not** always-on — they use `globs:` for conditional activation — so this transformation does not apply to them even if they undergo `suffix-rename`.

### Determinism

The transformation is deterministic: the prefix is a fixed string, the `alwaysApply` flip is unconditional, and the body comment is static. Idempotent re-runs that encounter the same conflict produce byte-identical renamed copies.

---

## 6. Stop-hook prompt rendering

The exact `prompt` field for the orchestra entry in `.cursor/hooks.json`:

```
First, evaluate the scheduler: read ai-orchestra/core/scheduler/RUNNER.md §0–§3 and run any overdue jobs. If all jobs are up to date, continue immediately without surfacing the check. Then, review this conversation for any new project-specific learning. A learning qualifies if it is: a pattern the team should keep doing (Established Patterns), a problem the team should stop doing (Anti-Patterns), a user preference stated explicitly (User Preferences), an architecture or product decision (Decision Log), or an environment quirk (Environment Notes). If none qualify, do nothing — empty is the common case. Otherwise: read {{LEARNINGS_PATH}}, follow the Update Mechanics in {{DIRECTOR_RULE_PATH}}, append the new entry to the appropriate section, and update the document's Last updated date. Never overwrite existing entries; ask the user if a contradiction is found. Stop-hook contract version: {{STOP_HOOK_CONTRACT_VERSION}}.
```

### 6.1 Placeholder substitution

| Placeholder | Source |
|-------------|--------|
| `{{LEARNINGS_PATH}}` | Same as in the Director rule. |
| `{{DIRECTOR_RULE_PATH}}` | Always `.cursor/rules/ai-director.mdc` for the Cursor adapter. |
| `{{STOP_HOOK_CONTRACT_VERSION}}` | `1.0` in v1. |

### 6.2 Length budget

Cursor's hook prompt has no documented hard limit, but the orchestra targets ≤ 800 characters after substitution. The above template is 750 characters with default substitutions.

If a future placeholder substitution exceeds 800 characters, the adapter falls back to a shorter form (a single sentence + reference) and records the truncation in the marker.

---

## 7. Stable rendering and idempotency

Every step in this file is **deterministic**. On re-run the adapter re-renders each artifact from the same inputs and compares against the file at the target path byte-for-byte. Identical bytes → `skip`. Different bytes → `propose` (user content) or `create`/`extend-section` (orchestra content). The audit's `idempotency.zero-diff` check ([`post-install-checks.md`](post-install-checks.md) §9) is what proves the determinism holds in practice.

Sources of non-determinism the adapter must avoid:

- Map iteration order in any language without explicit sorting.
- System time anywhere except the marker's `orchestra.installedAt` and `history[].at` (which are recorded once and never re-rendered into rule/skill content).
- Random ids — the orchestra never generates them.
- Locale-dependent string operations.

The adapter MUST sort every iteration over roles, skills, slots, frameworks, and stacks alphabetically by stable id before rendering.

> **v2 enhancement.** Persisting per-artifact `contentHash` values in the install marker (e.g., `rules[].contentHash`, `skills[].contentHash`) is on the v2 backlog. v1 relies on byte-identity comparison against the freshly re-rendered template, which is sufficient when the template + inputs are deterministic. The schema does not yet declare the `contentHash` field; that is intentional.

---

## 8. References

- [`INSTALL.md`](INSTALL.md) §4 (Phase 7) — invocation point.
- [`mappings.md`](mappings.md) — table that points here for rendering details.
- [`target-schema.md`](target-schema.md) — what each rendered file looks like at rest.
- [`post-install-checks.md`](post-install-checks.md) §4 + §5 — checks that validate the outcomes of this file.
- [`mcp.md`](mcp.md) — sibling schema for MCP entries (separate from rule/skill rendering).
- [`../../core/director/RULE.md`](../../core/director/RULE.md) — source for §3.
- [`../../core/director/learnings-template.md`](../../core/director/learnings-template.md) — source for the learnings doc rendering (covered in [`target-schema.md`](target-schema.md) §6).
- [`../_stop-hook.md`](../_stop-hook.md) — contract whose prompt body §6 implements for Cursor.

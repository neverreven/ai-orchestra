# Codex adapter — render-rules.md

> The exact rendering rules for `AGENTS.md` managed-section content. The Codex adapter writes no per-rule files and no per-skill files — everything lands inside the managed section. This file spells out the marker convention, placeholder substitution, the skill catalog format, and the idempotency contract.

---

## 1. Why this is its own file

`mappings.md` is a quick-reference table; `target-schema.md` is the after-state. Neither has room to spell out:

- The exact content that gets written between the managed-section markers in `AGENTS.md`.
- Placeholder substitution rules.
- The skill catalog entry format (trigger phrases, source paths).
- The determinism rules that make idempotent re-runs produce zero diff.

This file fills that gap. The post-install checks ([`post-install-checks.md`](post-install-checks.md)) verify the **outcomes** described here.

---

## 2. Managed-section marker conventions

The orchestra owns a section of `AGENTS.md`. Markers are HTML comments — invisible in Markdown renders but unambiguous in raw files:

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

The adapter writes the exact marker strings with no extra spaces, no casing variation. The idempotency check (§8) verifies byte-identity on re-run.

---

## 3. Director rule rendering

Source: [`../../core/director/RULE.md`](../../core/director/RULE.md).

Codex has no separate rules directory. The Director rule body is **embedded** inside the managed section under its own heading.

### 3.1 Extraction

The rendered Director body is the content inside the markdown code fence in `RULE.md` — the block that starts with ` ```markdown ` and ends before the closing ` ``` `. Fence lines are stripped; the content between them is the renderable body.

### 3.2 Placeholder substitution

Substitution is top-to-bottom, single-pass. Each substitution is independent.

| Placeholder | Source | Default if absent |
|-------------|--------|-------------------|
| `{{PROJECT_NAME}}` | Project profile (Phase 2). | Repository folder name. |
| `{{LEARNINGS_PATH}}` | Install plan (Phase 5), per [`mappings.md`](mappings.md) §4. | `_documentation/AI_LEARNINGS.md` |
| `{{PROJECT_CONTEXT_PATH}}` | `AGENTS.md` (the managed section IS the context for Codex). | `AGENTS.md` |
| `{{ARCHITECTURE_DOC_PATH}}` | Detected or asked during Phase 5 (optional). | (empty — see §3.3) |
| `{{INSTALL_MARKER_PATH}}` | Always `.ai-orchestra/install.json`. | Same. |
| `{{INSTALLED_FOLDER}}` | `installedFolder` field from `.ai-orchestra/install.json`. | `score` |
| `{{LEARNINGS_LINE_BUDGET}}` | Static: `300`. | `300`. |

The adapter MUST verify, after substitution, that **no `{{...}}` patterns remain**. If any do, install fails.

### 3.3 Conditional rendering for `{{ARCHITECTURE_DOC_PATH}}`

When `{{ARCHITECTURE_DOC_PATH}}` resolves to empty, the entire bullet referencing it is **omitted** and surrounding step numbering is reflowed. This is the only conditional rendering rule.

### 3.4 Body verbatim

Outside placeholders, the body is rendered byte-for-byte. The adapter MUST NOT re-flow paragraphs, trim whitespace inside code blocks, re-order sections, or add or remove blank lines.

### 3.5 Placement in managed section

The rendered Director body is placed as a `## Director protocol` sub-section within the managed section, after the Identity block and before the Roles section. See [`target-schema.md`](target-schema.md) §2 for the full managed-section layout.

---

## 4. Project-context rendering

The managed section includes an Identity block rendered from the install plan:

```markdown
## Identity

- **Project:** {{PROJECT_NAME}}
- **Stacks detected:** {{STACK_LIST}}
- **Frameworks:** {{FRAMEWORK_LIST}}
- **Orchestra version:** {{ORCHESTRA_VERSION}}
- **Codex adapter version:** {{ADAPTER_VERSION}}
- **Installed:** {{INSTALL_DATE}}
```

### 4.1 Placeholder sources

| Placeholder | Source / construction |
|-------------|-----------------------|
| `{{STACK_LIST}}` | Comma-separated `<stack-id> (confidence <0.NN>)` per Phase 2 detection. Sorted alphabetically by stack-id. |
| `{{FRAMEWORK_LIST}}` | Comma-separated framework ids per Phase 2 detection. Sorted alphabetically. If empty, render `(none detected)`. |
| `{{ORCHESTRA_VERSION}}` | From `{{INSTALLED_FOLDER}}/VERSION`. |
| `{{ADAPTER_VERSION}}` | This adapter's version (matches core in v1). |
| `{{INSTALL_DATE}}` | ISO 8601 timestamp from the install plan — copied to the marker's `orchestra.installedAt`. Never re-rendered after first install. |

### 4.2 Roles section

```markdown
## Roles installed

- **<display name>** — <first sentence of role file's `## Mission`>
```

One bullet per installed role. Sorted alphabetically by display name. Display name is the role file's first `# ` heading, stripped of the prefix.

### 4.3 Pointers section

```markdown
## Pointers

- Project context: `AGENTS.md` (orchestra managed section)
- Skills: referenced via trigger phrases below; source files in `{{INSTALLED_FOLDER}}/core/skills/`
- Learnings: {{LEARNINGS_PATH}}
- Install marker: `.ai-orchestra/install.json`
```

---

## 5. Skill catalog rendering

The Codex adapter does not write per-skill files. Skills are declared as a structured catalog inside the managed section. When Codex matches a user message against a trigger phrase, it navigates to the source SKILL.md.

### 5.1 Catalog format

```markdown
## Skills installed

### <category title>

- **<skill-id>** — <summary line>. Trigger: '<phrase one>', '<phrase two>'. Read: `{{INSTALLED_FOLDER}}/core/skills/<category>/<skill-id>/SKILL.md`.
```

One bullet per skill. Grouped by category (alphabetically). Within each category, skills sorted alphabetically by `skill-id`.

| Field | Source |
|-------|--------|
| `<category title>` | Category directory name, title-cased (e.g., `audit` → `Audit`). |
| `<skill-id>` | The skill's directory name. |
| `<summary line>` | The source SKILL.md's blockquote first paragraph, normalised to a single line. Truncated to 200 characters (no mid-word cuts). |
| Trigger phrases | The bullets under `## Trigger` in the source SKILL.md, joined by `', '` and wrapped in single quotes. |
| Source path | `{{INSTALLED_FOLDER}}/core/skills/<category>/<skill-id>/SKILL.md` — project-relative path to the source file in the orchestra core. |

### 5.2 No suffix-rename for skills

Codex does not write skill files, so there is no file-level suffix-rename for skills. If two skills from different categories share the same `skill-id` (which the orchestra prevents by design), the catalog entry includes the full category-qualified path to disambiguate.

### 5.3 Manual-trigger note

The catalog section begins with a brief note explaining how to invoke skills:

```markdown
> Invoke a skill by using one of its trigger phrases in a Codex message. Codex will navigate to the referenced SKILL.md file and follow its instructions. Skills run with the project root as the working directory.
```

---

## 6. Stop-hook — declared gap

Codex CLI has no documented session-end hook in v1. The stop-hook is a declared gap. See [`INSTALL.md`](INSTALL.md) §6 and [`mappings.md`](mappings.md) §5 for the manual fallbacks.

The Director rule body embedded in §3 includes the Session-End Behaviour section, which instructs the agent to review the session for learnings at the user's request. The manual fallback trigger phrase is "review this session for learnings".

No prompt body is rendered for this adapter.

---

## 7. Stack-pack content rendering

When the project profile detected one or more first-class stacks, stack-pack rules are added as `## Stack: <stack-id>` sub-sections inside the managed section, after the skill catalog.

### 7.1 Glob filtering

Before including a pack rule, the adapter tests its `## When this applies` globs against the project's tracked files. Rules whose globs match zero files are omitted and recorded in `stacks[].skippedPackRules[]`. Installed rules are recorded in `stacks[].installedPackRules[]`. Pack rules with no explicit glob are always included.

### 7.2 Pack rule inline format

Each included pack rule becomes an `### <rule title>` sub-section. Its `## Patterns to follow` and `## Anti-patterns to avoid` content is inlined verbatim. The `## When this applies` and `## References` sections are stripped (meta-content, not agent-facing guidance).

### 7.3 Ordering

Stacks are ordered alphabetically by stack-id. Pack rules within a stack are ordered alphabetically by rule filename. This ordering is deterministic and produces stable managed-section content across re-runs.

---

## 8. Stable rendering and idempotency

Every step in this file is **deterministic**. On re-run, the adapter re-renders the managed section from the same inputs and compares against the content currently between the markers byte-for-byte. Identical bytes → `skip`. Different bytes → replace the managed section (the surrounding user content is preserved).

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
- [`target-schema.md`](target-schema.md) — what the rendered `AGENTS.md` looks like at rest.
- [`post-install-checks.md`](post-install-checks.md) §5 + §9 — checks that validate the outcomes of this file.
- [`mcp.md`](mcp.md) — MCP entries (separate from managed-section rendering).
- [`../../core/director/RULE.md`](../../core/director/RULE.md) — source for §3.
- [`../../core/director/learnings-template.md`](../../core/director/learnings-template.md) — source for the learnings doc.
- [`../cursor/render-rules.md`](../cursor/render-rules.md) — full-adapter reference for the description-synthesis formula (§5.2 there ≡ §5.1 here).
- [`../claude-code/render-rules.md`](../claude-code/render-rules.md) — sibling baseline (Claude Code uses same managed-section pattern).

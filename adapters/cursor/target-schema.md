# Cursor adapter — target-schema.md

> The "after" state. Defines the **exact shape** of every file the Cursor adapter writes (or extends) into the target project. The post-install checks ([`post-install-checks.md`](post-install-checks.md)) validate against this schema; the audit skill re-validates on every run.

---

## 1. Filesystem layout (after install)

```
<project-root>/
├── .ai-orchestra/
│   └── install.json                          # the registry marker (§7)
├── .cursor/
│   ├── hooks.json                            # merged; orchestra owns the stop entry (§5)
│   ├── mcp.json                              # merged; orchestra-prefixed slots (see mcp.md)
│   ├── rules/
│   │   ├── ai-director.mdc                   # always-on Director rule (§2)
│   │   └── orchestra-context.mdc             # always-on consolidated context rule (§2)
│   └── skills/
│       └── <skill-id>/
│           └── SKILL.md                      # one folder per installed skill (§4)
├── _documentation/
│   └── AI_LEARNINGS.md                       # learnings doc (§6)
└── AGENTS.md                                  # consolidated context (§3)
```

Files outside this tree are **not touched** by the adapter. The adapter never writes to `src/`, `node_modules/`, build outputs, or any project source code.

---

## 2. Cursor rule files (`.cursor/rules/*.mdc`)

### 2.1 Frontmatter schema

Every rendered `.mdc` file starts with YAML frontmatter:

```yaml
---
description: <one-line natural-language description; required>
alwaysApply: true | false       # required
globs: <glob pattern>            # required when alwaysApply is false
---
```

Cursor uses these fields directly:

- `description` — surfaced in Cursor's rule UI; also used for rule selection in agent context.
- `alwaysApply` — when true, the rule is included in every session in this project.
- `globs` — when `alwaysApply: false`, the rule is included only for sessions where one of the listed file globs matches a file in the user's context.

### 2.2 The Director rule — `ai-director.mdc`

Source: [`../../core/director/RULE.md`](../../core/director/RULE.md). The adapter renders the template with placeholders substituted from the project profile and install plan.

Frontmatter values:

| Field | Value |
|-------|-------|
| `description` | `"AI Director — session protocol for context continuity. Reads accumulated learnings at session start; captures new ones during and at session end."` |
| `alwaysApply` | `true` |
| `globs` | (omitted) |

Body: the rendered RULE.md body with `{{PROJECT_NAME}}`, `{{LEARNINGS_PATH}}`, `{{PROJECT_CONTEXT_PATH}}`, `{{ARCHITECTURE_DOC_PATH}}`, `{{INSTALL_MARKER_PATH}}`, `{{LEARNINGS_LINE_BUDGET}}` substituted per [`render-rules.md`](render-rules.md) §3.

### 2.3 The orchestra-context rule — `orchestra-context.mdc`

A **single** consolidated always-on rule that summarises:

- The project's identity (name, detected stacks, frameworks).
- The role list installed for this project.
- Critical non-negotiables collected from each role's `## Mission` section.
- A pointer to `AGENTS.md` for full context and to `.ai-orchestra/install.json` for the install record.

Frontmatter values:

| Field | Value |
|-------|-------|
| `description` | `"Always-on orchestra-managed context. Roles, stacks, and non-negotiables. Update via 'audit AI infra'."` |
| `alwaysApply` | `true` |
| `globs` | (omitted) |

Body: rendered per [`render-rules.md`](render-rules.md) §4.

### 2.4 No per-role or per-skill rule files

Cursor's rules and skills are distinct concepts. **Roles do not become rules**; their content lives in the consolidated `orchestra-context.mdc` (always-on summary) and in `AGENTS.md` (full reference).

The orchestra installs at most these two rule files in v1. Stack packs (PR 6) may add stack-specific rules (e.g., `code-standards.mdc`); they get their own files with their own frontmatter and are NOT bundled into the orchestra-context rule.

---

## 3. AGENTS.md — managed section

The orchestra's section between the marker pair has this structure:

```markdown
<!-- ai-orchestra: managed-section start -->
# Project context — managed by ai-orchestra

> Generated content. Do not edit between the markers — your edits will be overwritten on the next orchestra run. Add your own content **above** or **below** the marker pair instead.

## Identity

- **Project:** <project name>
- **Stacks detected:** <comma-separated stack ids> (with confidence scores)
- **Frameworks:** <comma-separated frameworks>
- **Orchestra version:** <orchestra version>
- **Cursor adapter version:** <adapter version>
- **Installed:** <ISO 8601 timestamp>

## Roles installed

<bullet list of role ids with one-line missions>

## Skills installed

<grouped by category, with skill ids>

## How to invoke the orchestra

- **Start a session** — Cursor reads `ai-director.mdc` and `orchestra-context.mdc` automatically.
- **Audit the orchestra** — say "audit AI infra" (any trigger phrase from `ai-infra-audit/SKILL.md`).
- **Update orchestra core** — pull the orchestra repo, then re-run "run the orchestra"; the audit produces a focused diff.

## Pointers

- Director rule: `.cursor/rules/ai-director.mdc`
- Always-on context: `.cursor/rules/orchestra-context.mdc`
- Skills: `.cursor/skills/<skill>/SKILL.md`
- Learnings: `<learnings-path>` (recorded in install marker)
- Install marker: `.ai-orchestra/install.json`
<!-- ai-orchestra: managed-section end -->
```

Sections are produced by templating against the install plan. The adapter MUST NOT add sections beyond those listed here without a core-level template change.

---

## 4. Skill files (`.cursor/skills/<skill-id>/SKILL.md`)

Each skill from the orchestra core is rendered to its own folder with a single `SKILL.md`. The folder name is the skill id (lowercase kebab-case).

### 4.1 Frontmatter schema

```yaml
---
name: <skill-id>                           # matches folder name
description: >-
  <natural-language description that includes
  the trigger phrases from the orchestra core>
---
```

`description` uses YAML's folded-block scalar (`>-`) when the description spans multiple lines. The body of the `description` is built by:

1. Taking the first paragraph of the source SKILL.md (the blockquote summary).
2. Appending: `"Use when the user says <list of Trigger phrases>."`

This is the format Cursor's skill engine expects to match user input.

### 4.2 Body

The body is a near-verbatim render of the source SKILL.md with these adjustments:

- Internal links (to `_schema.md`, other skills, role files) are rewritten from orchestra-relative to project-relative — they point INTO the orchestra folder via `ai-orchestra/...` paths.
- The top-level `# <Skill Name>` heading is preserved.
- The `## Trigger`, `## When to use`, `## When NOT to use`, `## Process`, `## Output`, `## References` sections are preserved verbatim.

The adapter does NOT trim or restructure the body. The audit verifies preservation by hashing the rendered body's relevant sections.

### 4.3 Auxiliary files

If the source skill folder contains `template.md`, `checklist.md`, or `examples/`, the adapter copies them alongside `SKILL.md` in the rendered folder.

---

## 5. `.cursor/hooks.json`

After merge, the file looks like this (when only the orchestra has touched it):

```json
{
  "version": 1,
  "hooks": {
    "stop": [
      {
        "type": "prompt",
        "metadata": { "orchestra": true, "contractVersion": "1.0" },
        "prompt": "Review this conversation for any new project-specific learning...",
        "loop_limit": 1
      }
    ]
  }
}
```

When start-hooks or other event entries already existed, they are preserved verbatim alongside the orchestra's `stop` entry. The full merge logic is in [`mappings.md`](mappings.md) §5.

### Stop-hook prompt body

The exact prompt body is rendered from a template in the adapter (kept here, not in core, because it is Cursor-specific). The body MUST:

- Reference the learnings document by the resolved path.
- Reference the Director rule's update mechanics.
- Stay short (Cursor's prompt budget is finite).
- Carry the contract version inline (so the audit can extract it from the file alone if marker drift occurs).

The exact rendered template lives in [`render-rules.md`](render-rules.md) §6.

---

## 6. `_documentation/AI_LEARNINGS.md`

Rendered from [`../../core/director/learnings-template.md`](../../core/director/learnings-template.md) with these substitutions:

| Placeholder | Value |
|-------------|-------|
| `{{PROJECT_NAME}}` | From the project profile. |
| `{{INSTALL_DATE}}` | ISO 8601 date of the install run. |

If a learnings doc already exists at the resolved path, the adapter applies the merge-missing-sections logic from [`mappings.md`](mappings.md) §4.

---

## 7. `.ai-orchestra/install.json`

Conforms to [`../../core/registry/install.schema.md`](../../core/registry/install.schema.md). The Cursor adapter additionally guarantees these field values, which the post-install checks ([`post-install-checks.md`](post-install-checks.md) §8) verify:

- `ide.id == "cursor"`
- `ide.adapter == "adapters/cursor"`
- `ide.adapterVersion == orchestra.version` (matches core in v1)
- `rules[]` contains exactly two entries with ids `"director"` and `"orchestra-context"` and the corresponding `path` and `source` fields per [`mappings.md`](mappings.md) §2.
- `skills[]` contains one entry per installed skill with `id`, `category`, and `source`.
- `hooks.stop.registered == true`
- `hooks.stop.path == ".cursor/hooks.json"`
- `hooks.stop.contractVersion == "1.0"`
- `mcpSlots[]` contains one entry per registered slot per [`mcp.md`](mcp.md). Each slot's `configPath == ".cursor/mcp.json"` and `userMustAttach == true` while it is in placeholder state.
- `learnings.path == <resolved learnings path>` (per [`mappings.md`](mappings.md) §4) and `learnings.seeded` reflects whether the adapter wrote a fresh seed (`true`) or merged into an existing doc (`false`).
- `agentsDoc.path == "AGENTS.md"` and `agentsDoc.managedSection == "ai-orchestra"`.
- `scheduler.contractVersion == 1` and `scheduler.jobs[] == []` in v1.
- `notifications.contractVersion == 1` and `notifications.channels[] == []` in v1.
- `history[]` contains exactly one entry on first install (`action: "install"`); audit and upgrade actions append entries on subsequent runs without rewriting prior entries.

The marker is written **last** in Phase 7 so it accurately reflects everything else that was installed. If any earlier step failed, the marker is **not** written, leaving the orchestra in a partial state the audit can detect on the next run.

---

## 8. `~/.ai-orchestra/projects.json`

The optional global registry, per [`../../core/registry/install.schema.md`](../../core/registry/install.schema.md) §2. After append, the orchestra-managed entry for this project looks like:

```json
{
  "path": "<absolute project root>",
  "name": "<project name>",
  "ide": "cursor",
  "lastSeenVersion": "1.0.0-alpha",
  "lastSeenAt": "<ISO 8601>"
}
```

If write to `~/.ai-orchestra/projects.json` is denied (sandboxed runtime, permission error, etc.), the adapter records the skip in the **project marker's** `history[]` array (a final history entry with `action: "install"` and a `summary` mentioning "global registry skipped: <reason>") and continues. The project marker remains complete; only the optional cross-project registry is missing.

---

## 9. What is **not** in the schema

The Cursor adapter does NOT write any of the following in v1:

- Per-role rules (roles live in the orchestra-context summary + `AGENTS.md`).
- Per-skill rules (skills are skills, not rules).
- Stack-pack content (deferred to PR 6; the marker reserves a slot).
- Anything inside the project's source tree.
- Anything in `~/.cursor/` (user-global Cursor settings; never touched).
- Workspace settings (`.vscode/settings.json` etc., even though Cursor reads some of them).

Anything beyond this list is a bug in the adapter to report.

---

## 10. References

- [`INSTALL.md`](INSTALL.md) — procedure that produces this state.
- [`mappings.md`](mappings.md) — table of artifact → target → action that drives the writes.
- [`render-rules.md`](render-rules.md) — exact rendering details for `.mdc` files and the stop-hook prompt body.
- [`mcp.md`](mcp.md) — MCP-specific schema details for `.cursor/mcp.json`.
- [`post-install-checks.md`](post-install-checks.md) — checks that validate this schema is met after a run.
- [`../_contract.md`](../_contract.md) — adapter contract this file satisfies.
- [`../_stop-hook.md`](../_stop-hook.md) — stop-hook contract referenced from §5.
- [`../../core/registry/install.schema.md`](../../core/registry/install.schema.md) — install marker schema produced in §7.

# Claude Code adapter — target-schema.md

> The "after" state for a Claude Code install. Defines the **exact shape** of every file the adapter writes (or extends). The post-install checks ([`post-install-checks.md`](post-install-checks.md)) validate against this schema.

---

## 1. Filesystem layout (after install)

```
<project-root>/
├── .ai-orchestra/
│   └── install.json                          # the registry marker (§6)
├── .claude/
│   ├── commands/
│   │   └── <skill-id>.md                     # one file per installed skill (§3)
│   └── settings.json                         # merged; orchestra owns the Stop entry (§4)
├── .mcp.json                                  # merged; orchestra-prefixed slots (see mcp.md)
├── _documentation/
│   └── AI_LEARNINGS.md                       # learnings doc (§5)
├── AGENTS.md                                  # mirror of CLAUDE.md managed section (§2)
└── CLAUDE.md                                  # consolidated context (§2)
```

Files outside this tree are **not touched** by the adapter.

---

## 2. `CLAUDE.md` and `AGENTS.md` — managed section

Both files share an identical managed-section pattern (per [`mappings.md`](mappings.md) §3). The content rendered between the markers:

```markdown
<!-- ai-orchestra: managed-section start -->
# Project context — managed by ai-orchestra

> Generated content. Do not edit between the markers — your edits will be overwritten on the next orchestra run. Add your own content above or below the marker pair instead.

## Identity

- **Project:** <project name>
- **Stacks detected:** <comma-separated stack ids>
- **Frameworks:** <comma-separated frameworks>
- **Orchestra version:** <orchestra version>
- **Claude Code adapter version:** <adapter version>
- **Installed:** <ISO 8601 timestamp>

## Director protocol (always-on)

<rendered Director rule body — same content as Cursor's `ai-director.mdc`,
with `{{LEARNINGS_PATH}}`, `{{PROJECT_CONTEXT_PATH}}`, etc. substituted.
The rule body is included verbatim because Claude Code has no separate
rules/ directory — `CLAUDE.md` IS the rule.>

## Roles installed

<bullet list of role ids with one-line missions>

## Skills installed

<grouped by category, with skill ids and slash-command form `/skill-id`>

## How to invoke the orchestra

- **Start a session** — Claude Code reads this file automatically.
- **Run a skill** — type `/<skill-id>` (e.g., `/ai-infra-audit`).
- **Audit the orchestra** — `/ai-infra-audit`.

## Pointers

- Project context (this file): `CLAUDE.md` (and `AGENTS.md` mirror)
- Skills: `.claude/commands/<skill-id>.md`
- Learnings: `<learnings-path>` (recorded in install marker)
- Install marker: `.ai-orchestra/install.json`
<!-- ai-orchestra: managed-section end -->
```

The same content is written to both `CLAUDE.md` and `AGENTS.md`. The Director rule body is **embedded** here (not in a separate file) because Claude Code consolidates rules into `CLAUDE.md`.

---

## 3. Skill files (`.claude/commands/<skill-id>.md`)

Each skill is a single Markdown file with frontmatter:

```yaml
---
description: >-
  <natural-language description that includes the trigger phrases from
  the source SKILL.md, formatted as: "<summary>. Use when the user says
  '<phrase one>', '<phrase two>'.">
---
```

Body: a near-verbatim render of the source SKILL.md content from the first `# <Skill Name>` heading onward, with relative links rewritten to point into `ai-orchestra/core/...` from the project root.

The folder name in the source (`audit/`, `code/`, `quality/`, etc.) is collapsed — Claude Code's `.claude/commands/` is flat. The category remains visible only in the install marker (`skills[].category`).

### Description synthesis

Same as Cursor (per [`../cursor/render-rules.md`](../cursor/render-rules.md) §5.2): summary line + " Use when the user says " + comma-joined trigger phrases.

The description is what Claude Code shows in the `/help` listing, so it doubles as user-visible documentation.

---

## 4. `.claude/settings.json`

After merge (when hooks are supported), the file looks like this (when only the orchestra has touched it):

```json
{
  "hooks": {
    "Stop": [
      {
        "type": "prompt",
        "metadata": { "orchestra": true, "contractVersion": "1.0" },
        "prompt": "First, evaluate the scheduler: read ai-orchestra/core/scheduler/RUNNER.md §0–§3 and run any overdue jobs. If all jobs are up to date, continue immediately. Then, review this conversation for any new project-specific learning...",
        "loop_limit": 1
      }
    ]
  }
}
```

When other entries existed prior to install, they are preserved verbatim alongside the orchestra's `Stop` entry. The full merge logic is in [`mappings.md`](mappings.md) §5.

### Stop-hook prompt body

Same template as Cursor's stop-hook prompt (per [`../cursor/render-rules.md`](../cursor/render-rules.md) §6), with `{{DIRECTOR_RULE_PATH}}` substituted as `CLAUDE.md` (the Director's location for Claude Code) instead of `.cursor/rules/ai-director.mdc`.

### Older Claude Code versions (no hooks)

When the detected version does not support hooks, this file is **not modified**. The install marker records `hooks.Stop.registered: false` and `hooks.Stop.gapReason: "claude-code-version-no-hooks"`. The post-install report names the gap and points the user to the manual fallback (the audit skill or saying "review this session for learnings" at session end).

---

## 5. `_documentation/AI_LEARNINGS.md`

Rendered from [`../../core/director/learnings-template.md`](../../core/director/learnings-template.md) with `{{PROJECT_NAME}}` and `{{INSTALL_DATE}}` substituted. If a learnings doc already exists at the resolved path, the adapter applies the merge-missing-sections logic from [`mappings.md`](mappings.md) §6.

Path resolution follows the same order as the Cursor adapter (per [`../cursor/mappings.md`](../cursor/mappings.md) §4).

---

## 6. `.ai-orchestra/install.json`

Conforms to [`../../core/registry/install.schema.md`](../../core/registry/install.schema.md). The Claude Code adapter additionally guarantees these field values:

- `ide.id == "claude-code"`
- `ide.adapter == "adapters/claude-code"`
- `ide.adapterVersion == orchestra.version` (matches core in v1)
- `rules[]` contains a single conceptual entry pointing to `CLAUDE.md` (the consolidated rule file). The `path` field references `CLAUDE.md`.
- `skills[]` contains one entry per installed skill with `id`, `category`, and `source`. The `path` field on each is `.claude/commands/<skill-id>.md`.
- `hooks.Stop.registered` is `true` when hooks are supported, `false` otherwise. When `false`, `hooks.Stop.gapReason` is set.
- `hooks.Stop.contractVersion == "1.0"` when registered; `null` otherwise.
- `mcpSlots[]` contains one entry per registered slot per [`mcp.md`](mcp.md), with `configPath == ".mcp.json"`.
- `learnings.path == <resolved>` and `learnings.seeded` reflects whether the adapter wrote a fresh seed (`true`) or merged into an existing doc (`false`).
- `agentsDoc.path == "AGENTS.md"`, `agentsDoc.managedSection == "ai-orchestra"`. (`CLAUDE.md` is tracked separately under a future schema field; v1 records it via the rule entry.)
- `scheduler.contractVersion == 1` and `scheduler.jobs[] == []` in v1.
- `notifications.contractVersion == 1` and `notifications.channels[] == []` in v1.
- `history[]` contains exactly one `action: "install"` entry on first install.

The marker is written **last** in Phase 7.

---

## 7. `~/.ai-orchestra/projects.json`

Per [`../../core/registry/install.schema.md`](../../core/registry/install.schema.md) §2. The orchestra-managed entry for this project on append:

```json
{
  "path": "<absolute project root>",
  "name": "<project name>",
  "ide": "claude-code",
  "lastSeenVersion": "1.0.0-alpha",
  "lastSeenAt": "<ISO 8601>"
}
```

If write to `~/.ai-orchestra/projects.json` is denied, the adapter records the skip in the project marker's `history[]` and continues.

---

## 8. What is **not** in the schema

The Claude Code baseline adapter does NOT write any of the following in v1:

- Per-rule files (Claude Code's design has no `.claude/rules/`).
- `.claude/projects/`, `.claude/settings.local.json`, or anything inside `~/.claude/` (user-global Claude Code state).
- Auxiliary files alongside skill commands (single-file `.claude/commands/<id>.md` only).
- Stack-pack content is available from [`../../core/stack-packs/`](../../core/stack-packs/) (PR 6) and lands as additional sections inside the `CLAUDE.md` managed area per [`mappings.md`](mappings.md) §7.
- Anything inside the project's source tree.

---

## 9. References

- [`INSTALL.md`](INSTALL.md) — procedure that produces this state.
- [`mappings.md`](mappings.md) — table of artifact → target → action that drives the writes.
- [`mcp.md`](mcp.md) — MCP-specific schema details for `.mcp.json`.
- [`post-install-checks.md`](post-install-checks.md) — checks that validate this schema is met after a run.
- [`../cursor/target-schema.md`](../cursor/target-schema.md) — full-adapter reference; this baseline mirrors its structure.
- [`../_contract.md`](../_contract.md) — adapter contract this file satisfies (with declared gaps).
- [`../_stop-hook.md`](../_stop-hook.md) — stop-hook contract referenced from §4.
- [`../../core/registry/install.schema.md`](../../core/registry/install.schema.md) — install marker schema produced in §6.

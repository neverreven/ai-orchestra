# VS Code (Copilot) adapter — target-schema.md

> The "after" state for a VS Code + Copilot install. Defines the exact shape of every file the adapter writes (or extends).

---

## 1. Filesystem layout (after install)

```
<project-root>/
├── .ai-orchestra/
│   └── install.json                          # the registry marker (§5)
├── .github/
│   ├── copilot-instructions.md               # consolidated context, managed section (§2)
│   └── prompts/
│       └── <skill-id>.prompt.md              # one file per installed skill (§3)
├── .vscode/
│   └── mcp.json                              # merged; orchestra-prefixed slots (see mcp.md)
├── _documentation/
│   └── AI_LEARNINGS.md                       # learnings doc (§4)
└── AGENTS.md                                  # mirror of copilot-instructions.md managed section (§2)
```

Files outside this tree are **not touched** by the adapter. The adapter never writes to `.vscode/settings.json`, `.vscode/tasks.json`, `.vscode/launch.json`, or anywhere inside the project source tree.

---

## 2. `.github/copilot-instructions.md` and `AGENTS.md` — managed section

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
- **VS Code adapter version:** <adapter version>
- **Installed:** <ISO 8601 timestamp>

## Director protocol (always-on)

<rendered Director rule body — same content as Cursor's `ai-director.mdc`,
with `{{LEARNINGS_PATH}}`, `{{PROJECT_CONTEXT_PATH}}`, etc. substituted.
The rule body is included verbatim because the v1 baseline consolidates
everything in a single instructions file (per `INSTALL.md` §6).>

## Roles installed

<bullet list of role ids with one-line missions>

## Skills installed

<grouped by category, with skill ids and Copilot Chat invocation form `/skill-id`>

## Critical non-negotiables

<bullet list of one-line statements derived from each role's `## Mission` paragraph>

## How to invoke the orchestra

- **Start a session** — Copilot reads `.github/copilot-instructions.md` automatically at chat start.
- **Run a skill** — type `/<skill-id>` in Copilot Chat (e.g., `/ai-infra-audit`).
- **Audit the orchestra** — `/ai-infra-audit`.
- **Review session for learnings** — say "review this session for learnings" (manual stop-hook fallback — see Declared gaps below).

## Pointers

- Project context (this file): `.github/copilot-instructions.md` (and `AGENTS.md` mirror)
- Custom prompts: `.github/prompts/<skill-id>.prompt.md`
- Learnings: `<learnings-path>` (recorded in install marker)
- Install marker: `.ai-orchestra/install.json`

## Declared gaps for this IDE

<List the gaps from `INSTALL.md` §6, each with its user-facing fallback.>
<!-- ai-orchestra: managed-section end -->
```

The same content is written to both files. The Director rule body is **embedded** here because the v1 baseline does not use Copilot's per-stack `.github/instructions/` mechanism (declared gap — see [`INSTALL.md`](INSTALL.md) §6).

---

## 3. Skill files (`.github/prompts/<skill-id>.prompt.md`)

Each skill is a single Markdown file with frontmatter:

```yaml
---
mode: 'agent'
description: >-
  <natural-language description that includes the trigger phrases from
  the source SKILL.md, formatted as: "<summary>. Use when the user says
  '<phrase one>', '<phrase two>'.">
---
```

Body: a near-verbatim render of the source SKILL.md content from the first `# <Skill Name>` heading onward, with relative links rewritten to point into `{{INSTALLED_FOLDER}}/core/...` from the project root.

After install, the user invokes the skill in Copilot Chat with `/<skill-id>`. The `mode: 'agent'` value is correct for all v1 orchestra skills.

### Description synthesis

Same as Cursor (per [`../cursor/render-rules.md`](../cursor/render-rules.md) §5.2): summary line + " Use when the user says " + comma-joined trigger phrases.

---

## 4. `_documentation/AI_LEARNINGS.md`

Rendered from [`../../core/director/learnings-template.md`](../../core/director/learnings-template.md) with `{{PROJECT_NAME}}` and `{{INSTALL_DATE}}` substituted. Path resolution follows the same order as the Cursor adapter (per [`../cursor/mappings.md`](../cursor/mappings.md) §4).

If a learnings doc already exists at the resolved path, the adapter applies the merge-missing-sections logic from [`mappings.md`](mappings.md) §6.

---

## 5. `.vscode/mcp.json`

After merge (when only the orchestra has touched it):

```json
{
  "servers": {
    "orchestra-analytics-database": {
      "command": "echo",
      "args": [
        "Slot 'orchestra-analytics-database' was registered by ai-orchestra. Replace this entry with your real MCP server: command + args + env. See {{INSTALLED_FOLDER}}/adapters/vscode/mcp.md."
      ],
      "metadata": {
        "orchestra": true,
        "orchestra_role": "analytics-engineer",
        "orchestra_purpose": "analytics-warehouse-read",
        "orchestra_status": "placeholder"
      }
    }
  }
}
```

VS Code's MCP convention uses the key `servers` (singular convention) under the top-level object, distinct from Cursor / Claude Code / Codex which use `mcpServers`. The adapter handles this difference automatically — slot ids and metadata stay portable.

The full merge logic is in [`mcp.md`](mcp.md).

---

## 6. `.ai-orchestra/install.json`

Conforms to [`../../core/registry/install.schema.md`](../../core/registry/install.schema.md). The VS Code adapter additionally guarantees:

- `ide.id == "vscode"`
- `ide.adapter == "adapters/vscode"`
- `ide.adapterVersion == orchestra.version` (matches core in v1)
- `rules[]` contains a single conceptual entry pointing to `.github/copilot-instructions.md` (the consolidated rule file).
- `skills[]` contains one entry per installed skill with `id`, `category`, and `source`. The `path` field on each is `.github/prompts/<skill-id>.prompt.md`.
- `hooks.Stop.registered == false`
- `hooks.Stop.gapReason == "vscode-copilot-no-session-end-hook"`
- `hooks.Stop.contractVersion == null`
- `mcpSlots[]` contains one entry per registered slot per [`mcp.md`](mcp.md), with `configPath == ".vscode/mcp.json"`.
- `learnings.path == <resolved>` and `learnings.seeded` reflects whether the adapter wrote a fresh seed (`true`) or merged into an existing doc (`false`).
- `agentsDoc.path == "AGENTS.md"`, `agentsDoc.managedSection == "ai-orchestra"`. (The `.github/copilot-instructions.md` location is recorded via the rule entry.)
- `scheduler.contractVersion == 1` and `scheduler.jobs[] == []` in v1.
- `notifications.contractVersion == 1` and `notifications.channels[] == []` in v1.
- `history[]` contains exactly one `action: "install"` entry on first install. The `summary` field for the install entry mentions all declared gaps from [`INSTALL.md`](INSTALL.md) §6.

The marker is written **last** in Phase 7.

---

## 7. `~/.ai-orchestra/projects.json`

Per [`../../core/registry/install.schema.md`](../../core/registry/install.schema.md) §2:

```json
{
  "path": "<absolute project root>",
  "name": "<project name>",
  "ide": "vscode",
  "lastSeenVersion": "1.0.0-alpha",
  "lastSeenAt": "<ISO 8601>"
}
```

If write is denied, the adapter records the skip in the project marker's `history[]`.

---

## 8. What is **not** in the schema

The VS Code baseline adapter does NOT write any of the following in v1:

- Per-instruction files (`.github/instructions/<name>.instructions.md`) — declared gap; v1 uses single `copilot-instructions.md`.
- `.vscode/settings.json`, `.vscode/tasks.json`, `.vscode/launch.json`.
- Anything in `~/.vscode/` (user-global VS Code state).
- Auxiliary files alongside skill prompts (single-file prompts only).
- Stack-pack content is available from [`../../core/stack-packs/`](../../core/stack-packs/) (PR 6) and lands as additional sections inside the `.github/copilot-instructions.md` managed area per [`mappings.md`](mappings.md) §7.
- Anything inside the project's source tree.

---

## 9. References

- [`INSTALL.md`](INSTALL.md) — procedure that produces this state.
- [`mappings.md`](mappings.md) — table of artifact → target → action that drives the writes.
- [`mcp.md`](mcp.md) — MCP-specific schema details for `.vscode/mcp.json`.
- [`post-install-checks.md`](post-install-checks.md) — checks that validate this schema is met after a run.
- [`../cursor/target-schema.md`](../cursor/target-schema.md) — full-adapter reference.
- [`../claude-code/target-schema.md`](../claude-code/target-schema.md) — sibling baseline.
- [`../codex/target-schema.md`](../codex/target-schema.md) — sibling baseline.
- [`../_contract.md`](../_contract.md) — adapter contract this file satisfies (with declared gaps).
- [`../_stop-hook.md`](../_stop-hook.md) — stop-hook contract; declared as a gap for VS Code v1.
- [`../../core/registry/install.schema.md`](../../core/registry/install.schema.md) — install marker schema produced in §6.

# Codex adapter — target-schema.md

> The "after" state for a Codex install. Defines the exact shape of every file the adapter writes (or extends).

---

## 1. Filesystem layout (after install)

```
<project-root>/
├── .ai-orchestra/
│   └── install.json                          # the registry marker (§5)
├── .codex/
│   └── mcp.json                              # merged; orchestra-prefixed slots (see mcp.md)
├── _documentation/
│   └── AI_LEARNINGS.md                       # learnings doc (§4)
├── score/                                    # orchestra core (referenced, not modified; legacy: ai-orchestra/)
│   └── core/skills/<category>/<skill-id>/SKILL.md   # skills executed in-place
└── AGENTS.md                                  # consolidated context (§2)
```

The Codex install touches strictly fewer files than Cursor or Claude Code because skills are not duplicated. the orchestra core (`{{INSTALLED_FOLDER}}/`) is required to remain in the project; its files are READ by the agent during skill execution, not COPIED.

---

## 2. AGENTS.md — managed section

The content rendered between the markers:

```markdown
<!-- ai-orchestra: managed-section start -->
# Project context — managed by ai-orchestra

> Generated content. Do not edit between the markers — your edits will be overwritten on the next orchestra run. Add your own content above or below the marker pair instead.

## Identity

- **Project:** <project name>
- **Stacks detected:** <comma-separated stack ids>
- **Frameworks:** <comma-separated frameworks>
- **Orchestra version:** <orchestra version>
- **Codex adapter version:** <adapter version>
- **Installed:** <ISO 8601 timestamp>

## Director protocol (always-on)

<rendered Director rule body — same content as Cursor's `ai-director.mdc`,
with `{{LEARNINGS_PATH}}`, `{{PROJECT_CONTEXT_PATH}}`, etc. substituted.
The rule body is included verbatim because Codex has no separate
rules/ directory — `AGENTS.md` IS the rule.>

## Roles installed

<bullet list of role ids with one-line missions>

## Skill catalog

<For every installed skill:>
### `<skill-id>` (`<category>`)

- **Triggers:** <comma-separated, single-quoted phrases from the source SKILL.md `## Trigger` section>
- **Source:** `{{INSTALLED_FOLDER}}/core/skills/<category>/<skill-id>/SKILL.md` (the agent navigates to this path on trigger match — substitute the actual `<category>` and `<skill-id>` for each installed skill)
- **Summary:** <first sentence of the source SKILL.md's blockquote summary>

When you (the agent) match a trigger phrase, follow the source link, read the SKILL.md, and execute the skill's process verbatim. Do not duplicate skill content into this project.

## Critical non-negotiables

<bullet list of one-line statements derived from each role's `## Mission` paragraph>

## How to invoke the orchestra

- **Audit the orchestra** — say "audit AI infra".
- **Review session for learnings** — say "review this session for learnings".
- **Run a skill** — say any of the trigger phrases listed in the Skill catalog above.

## Pointers

- Project context (this file): `AGENTS.md`
- Skills: `{{INSTALLED_FOLDER}}/core/skills/<category>/<skill-id>/SKILL.md` (executed in place — never duplicated)
- Learnings: `<learnings-path>` (recorded in install marker)
- Install marker: `.ai-orchestra/install.json`
- Orchestra core: `{{INSTALLED_FOLDER}}/` (must remain in the repo for skills to work)

## Declared gaps for this IDE

<List the gaps from `INSTALL.md` §6, each with its user-facing fallback.>
<!-- ai-orchestra: managed-section end -->
```

The Director rule body is **embedded** here because Codex has no separate rule mechanism. The skill catalog is unique to this adapter — it gives Codex the routing information it needs to find and execute skills from the orchestra core.

---

## 3. `.codex/mcp.json`

After merge (when only the orchestra has touched it):

```json
{
  "mcpServers": {
    "orchestra-analytics-database": {
      "command": "echo",
      "args": [
        "Slot 'orchestra-analytics-database' was registered by ai-orchestra. Replace this entry with your real MCP server: command + args + env. See {{INSTALLED_FOLDER}}/adapters/codex/mcp.md."
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

The merge logic is in [`mcp.md`](mcp.md). The file shape mirrors `.mcp.json` used by other IDEs in this orchestra version, by design.

> **Note.** Codex CLI's project-scoped MCP convention is not fully settled in v1. The orchestra writes the slot intent to `.codex/mcp.json` as the most-portable shape; the user may need to copy entries into `~/.codex/config.toml` (TOML form) to wire them into Codex's runtime. The orchestra's slot ids, purposes, and metadata remain stable across both shapes.

---

## 4. `_documentation/AI_LEARNINGS.md`

Rendered from [`../../core/director/learnings-template.md`](../../core/director/learnings-template.md) with `{{PROJECT_NAME}}` and `{{INSTALL_DATE}}` substituted. Path resolution follows the same order as the Cursor adapter (per [`../cursor/mappings.md`](../cursor/mappings.md) §4).

If a learnings doc already exists at the resolved path, the adapter applies the merge-missing-sections logic from [`mappings.md`](mappings.md) §6.

---

## 5. `.ai-orchestra/install.json`

Conforms to [`../../core/registry/install.schema.md`](../../core/registry/install.schema.md). The Codex adapter additionally guarantees:

- `ide.id == "codex"`
- `ide.adapter == "adapters/codex"`
- `ide.adapterVersion == orchestra.version` (matches core in v1)
- `rules[]` contains a single conceptual entry pointing to `AGENTS.md` (the consolidated rule file).
- `skills[]` contains one entry per installed skill with `id`, `category`, and `source`. The `path` field on each is the same as `source` (skills are not copied; they live in the orchestra core).
- `hooks.Stop.registered == false`
- `hooks.Stop.gapReason == "codex-no-session-end-hook"`
- `hooks.Stop.contractVersion == null`
- `mcpSlots[]` contains one entry per registered slot per [`mcp.md`](mcp.md), with `configPath == ".codex/mcp.json"`.
- `learnings.path == <resolved>` and `learnings.seeded` reflects whether the adapter wrote a fresh seed (`true`) or merged into an existing doc (`false`).
- `agentsDoc.path == "AGENTS.md"`, `agentsDoc.managedSection == "ai-orchestra"`.
- `scheduler.contractVersion == 1` and `scheduler.jobs[] == []` in v1.
- `notifications.contractVersion == 1` and `notifications.channels[] == []` in v1.
- `history[]` contains exactly one `action: "install"` entry on first install. The `summary` field for the install entry mentions all declared gaps from [`INSTALL.md`](INSTALL.md) §6.

The marker is written **last** in Phase 7.

---

## 6. `~/.ai-orchestra/projects.json`

Per [`../../core/registry/install.schema.md`](../../core/registry/install.schema.md) §2:

```json
{
  "path": "<absolute project root>",
  "name": "<project name>",
  "ide": "codex",
  "lastSeenVersion": "1.0.0-alpha",
  "lastSeenAt": "<ISO 8601>"
}
```

If write is denied, the adapter records the skip in the project marker's `history[]`.

---

## 7. What is **not** in the schema

The Codex baseline adapter does NOT write any of the following in v1:

- Per-skill files (skills live in the orchestra core; AGENTS.md routes to them).
- Per-rule files (Codex consolidates rules in AGENTS.md).
- Anything in `~/.codex/` (user-global Codex state).
- Codex's `~/.codex/config.toml` or `.codex/config.toml` (those are user-managed; the orchestra reads but never writes).
- Stack-pack content is available from [`../../core/stack-packs/`](../../core/stack-packs/) (PR 6) and lands as additional sections inside the `AGENTS.md` managed area per [`mappings.md`](mappings.md) §7.
- Anything inside the project's source tree.

---

## 8. References

- [`INSTALL.md`](INSTALL.md) — procedure that produces this state.
- [`mappings.md`](mappings.md) — table of artifact → target → action that drives the writes.
- [`mcp.md`](mcp.md) — MCP-specific schema details for `.codex/mcp.json`.
- [`post-install-checks.md`](post-install-checks.md) — checks that validate this schema is met after a run.
- [`../cursor/target-schema.md`](../cursor/target-schema.md) — full-adapter reference.
- [`../claude-code/target-schema.md`](../claude-code/target-schema.md) — sibling baseline that copies skills (different strategy).
- [`../_contract.md`](../_contract.md) — adapter contract this file satisfies (with declared gaps).
- [`../_stop-hook.md`](../_stop-hook.md) — stop-hook contract; declared as a gap for Codex.
- [`../../core/registry/install.schema.md`](../../core/registry/install.schema.md) — install marker schema produced in §5.

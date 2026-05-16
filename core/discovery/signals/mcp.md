# Signal: mcp (Model Context Protocol configurations)

> Not a stack — this detector inventories existing **MCP server configurations** in the target project so the orchestra can extend them non-destructively. Read during Phase 3 (existing-infra inventory) per [existing-infra.md](../existing-infra.md).

**Identifier:** `mcp`
**Output:** entries appended to `profile.existingInfra.mcp[]` (read by the adapter to merge orchestra-registered slots).

## Why this exists

MCP (Model Context Protocol, [modelcontextprotocol.io](https://modelcontextprotocol.io)) is the standard for connecting AI agents to data sources and tools. Most modern IDE agents support MCP via a per-project config file. The orchestra **never creates MCP servers itself**; it only **registers slots** the user can attach a real server to. To do that safely, it must first inventory what's already there.

## Detection per IDE

### Cursor

| Path | Format | Notes |
|------|--------|-------|
| `.cursor/mcp.json` | JSON | Per-project Cursor MCP config. |
| `~/.cursor/mcp.json` | JSON | User-level Cursor MCP config (informational only — orchestra never modifies user-level config). |

Output for each detected entry:

```json
{
  "ide": "cursor",
  "scope": "project",
  "path": ".cursor/mcp.json",
  "servers": [ { "name": "<server name>", "command": "<command line>", "env": { ... } }, ... ]
}
```

### Claude Code

| Path | Format | Notes |
|------|--------|-------|
| `.claude/mcp_settings.json` | JSON | Per-project Claude Code MCP settings. |
| `~/.claude/mcp_settings.json` | JSON | User-level. |

Output schema mirrors Cursor's.

### Codex CLI

| Path | Format | Notes |
|------|--------|-------|
| `.codex/mcp.toml` (provisional) | TOML | Convention to be confirmed at PR 5 build-time; record actual location and shape then. |

If no settled convention is found at PR 5 build-time, this detector should report `mcp: { ide: "codex", scope: "project", supported: false }` and the Codex adapter should treat MCP as a documented gap.

### VS Code (with GitHub Copilot)

| Path | Format | Notes |
|------|--------|-------|
| `.vscode/mcp.json` (provisional) | JSON | Convention to be confirmed at PR 5 build-time. |
| `.github/mcp.json` | JSON | Alternative convention seen in some projects. |

If no settled convention exists at PR 5 build-time, treat as `supported: false`.

## What the detector returns

The detector contributes a single field to the existing-infra inventory:

```json
{
  "mcp": [
    {
      "ide": "cursor",
      "scope": "project",
      "path": ".cursor/mcp.json",
      "supported": true,
      "servers": [ ... already-configured server entries ... ]
    }
  ]
}
```

Each adapter's `mcp.md` (PR 4 / PR 5) consumes this list to:

1. Read existing servers and **never rename or remove** them.
2. Add orchestra-registered slots with names prefixed `orchestra-<role>-<purpose>` to avoid collision with user-managed servers.
3. Record the merged config in the dry-run plan.

## Validation

After read, validate the configs:

- File parses as the declared format (JSON or TOML).
- Each server entry has the IDE-required fields (e.g., `command` for Cursor).

If validation fails, add an open question to `profile.openQuestions`:

```json
{
  "topic": "mcp-config",
  "score": null,
  "evidence": [".cursor/mcp.json failed to parse: <error>"],
  "question": "Found a malformed MCP config. The orchestra will not modify it. Please fix it manually before proceeding."
}
```

The install proceeds for everything else; the malformed MCP file is left untouched.

## Privacy

MCP configs frequently contain credentials (API tokens, server URLs, keys). The detector reads these only to inventory **server names**. **Do not** echo credential values into the install plan, the dry-run diff, the registry marker, or any log line. Mask sensitive fields when displaying server entries.

## References

- [DETECTION.md](../DETECTION.md) — overall probe procedure.
- [existing-infra.md](../existing-infra.md) — overall existing-infra inventory.
- [Model Context Protocol](https://modelcontextprotocol.io) — external standard.

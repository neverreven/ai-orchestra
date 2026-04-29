# VS Code (Copilot) adapter — mcp.md

> Maps the orchestra's MCP-slot concept onto VS Code's `.vscode/mcp.json` configuration. VS Code uses a slightly different top-level key (`servers`, not `mcpServers`); the orchestra adapter handles the translation transparently.

---

## 1. VS Code's MCP convention

VS Code reads MCP server configurations from `.vscode/mcp.json` at the project root (via the MCP extension). The shape:

```json
{
  "servers": {
    "<server-id>": {
      "command": "<executable>",
      "args": ["<arg>", "<arg>"],
      "env": { "VAR": "value" }
    }
  }
}
```

Note the key `servers` rather than `mcpServers` used by Cursor / Claude Code / Codex. This is the only structural difference — slot ids, metadata, and merge semantics remain portable across IDEs.

VS Code also supports stdio servers as the default. SSE / HTTP variants (with a `url` field instead of `command`) are supported in newer versions; the orchestra targets stdio for slots it generates.

User-global VS Code state in `~/.vscode/` and global Copilot settings are **not touched** by the orchestra.

---

## 2. What an "orchestra MCP slot" is

Same definition as the other adapters (per [`../cursor/mcp.md`](../cursor/mcp.md) §2): a placeholder MCP server entry registered under a stable, prefixed id. The user attaches a real server by editing the slot — the orchestra reserves the id and documents the intent.

---

## 3. Slot id convention

Identical to the other adapters:

```
orchestra-<role-id>-<purpose>
```

Slot ids are stable across IDEs.

---

## 4. v1 default slot list

Same as the Cursor adapter (per [`../cursor/mcp.md`](../cursor/mcp.md) §4). Slots register only when the relevant role is part of the selected role list AND the user did not opt out in Phase 5.

---

## 5. Slot entry shape (placeholder form)

```json
{
  "servers": {
    "orchestra-analytics-database": {
      "command": "echo",
      "args": [
        "Slot 'orchestra-analytics-database' was registered by ai-orchestra. Replace this entry with your real MCP server: command + args + env. See ai-orchestra/adapters/vscode/mcp.md."
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

The placeholder structure is identical to the other adapters — only the top-level wrapper key (`servers` instead of `mcpServers`) differs.

---

## 6. Merge rules with existing `.vscode/mcp.json`

| Situation | Action |
|-----------|--------|
| File does not exist | `create` with the slot list under `servers`. |
| File exists, valid JSON, no `servers` key | Add `servers` with the slot list. |
| File exists, `servers` present, no orchestra slots | Add the slot list under `servers`. Existing entries preserved. |
| Orchestra slot id already present (matched by id prefix `orchestra-` AND `metadata.orchestra: true`) | If `metadata.orchestra_status == "placeholder"` — overwrite. If `metadata.orchestra_status == "attached"` — `skip` and preserve verbatim. |
| User has an entry whose id collides with an orchestra slot but lacks `metadata.orchestra: true` | Critical conflict — surface to user; do NOT overwrite. |
| File uses the `mcpServers` key instead of `servers` (older VS Code MCP convention or copy-paste from another tool) | The adapter records the inconsistency in the install plan but does NOT migrate the existing entries. The orchestra adds its slots under `servers`; the user can consolidate later. |
| File exists but invalid JSON | Critical conflict — surface to user; do not auto-repair. |

### Stable serialisation

After merge: 2-space indentation, `servers` keys sorted alphabetically, keys inside each entry ordered (`command`, `args`, `env`, `metadata`), trailing newline.

---

## 7. Permission policy

Same as the other adapters (per [`../cursor/mcp.md`](../cursor/mcp.md) §7).

---

## 8. Servers added outside the orchestra

User-managed MCP servers under non-orchestra-prefixed ids are NOT recorded in the marker. The orchestra never modifies them. The audit surfaces them as `info` per [`../../core/notifications/CONTRACT.md`](../../core/notifications/CONTRACT.md).

---

## 9. Differences from sibling adapters

| Aspect | Cursor | Claude Code | Codex | VS Code |
|--------|--------|-------------|-------|---------|
| Config file path | `.cursor/mcp.json` | `.mcp.json` | `.codex/mcp.json` | `.vscode/mcp.json` |
| Top-level wrapper key | `mcpServers` | `mcpServers` | `mcpServers` | `servers` |
| User-global file touched | No | No | No | No |
| Slot id convention | Same across all IDEs | Same | Same | Same |
| Placeholder shape | Same | Same | Same | Same (minus key name) |
| Merge rules | Same | Same | Same | Same |

---

## 10. References

- [`INSTALL.md`](INSTALL.md) — procedure that calls into this file.
- [`mappings.md`](mappings.md) — points to this file for entry #6 (MCP slots).
- [`target-schema.md`](target-schema.md) §5 — file shape this file produces.
- [`../cursor/mcp.md`](../cursor/mcp.md) — reference adapter; this baseline mirrors its policies.
- [`../claude-code/mcp.md`](../claude-code/mcp.md) — sibling baseline.
- [`../codex/mcp.md`](../codex/mcp.md) — sibling baseline.
- [`../_contract.md`](../_contract.md) §4 — required deliverable: MCP slots.
- [`../../core/discovery/signals/mcp.md`](../../core/discovery/signals/mcp.md) — discovery-side signal that detects existing MCP configurations.
- [`../../core/skills/platform/mcp-server-audit/SKILL.md`](../../core/skills/platform/mcp-server-audit/SKILL.md) — audit skill that watches MCP drift.
- [`../../core/notifications/CONTRACT.md`](../../core/notifications/CONTRACT.md) — notifications emitted for MCP events.

# Claude Code adapter — mcp.md

> Maps the orchestra's MCP-slot concept onto Claude Code's `.mcp.json` configuration. Defines slot id convention, merge logic, permission policy, and v1 default slot list.

---

## 1. Claude Code's MCP convention

Claude Code reads MCP server configurations from `.mcp.json` at the project root. The shape:

```json
{
  "mcpServers": {
    "<server-id>": {
      "command": "<executable>",
      "args": ["<arg>", "<arg>"],
      "env": { "VAR": "value" }
    }
  }
}
```

Claude Code supports stdio servers (the shape above) plus SSE / HTTP variants in newer versions. The orchestra adapter targets stdio for slots it generates (same as Cursor — stdio is the most-portable form).

The user-global file `~/.claude.json` is **not touched** by the orchestra; only the per-project `.mcp.json` is.

---

## 2. What an "orchestra MCP slot" is

Same definition as the Cursor adapter (per [`../cursor/mcp.md`](../cursor/mcp.md) §2): a placeholder MCP server entry registered under a stable, prefixed id. The user attaches a real server by editing the slot — the orchestra reserves the id and documents the intent.

---

## 3. Slot id convention

Identical to Cursor's:

```
orchestra-<role-id>-<purpose>
```

Examples: `orchestra-analytics-database`, `orchestra-backend-database`, `orchestra-devops-secrets`, `orchestra-security-vuln-feed`, `orchestra-ai-ml-vector-db`.

Slot ids are stable across IDEs — the same role + purpose maps to the same id whether installed via Cursor, Claude Code, Codex, or VS Code. This is intentional: an organisation that uses multiple IDEs gets the same MCP slot vocabulary across them.

---

## 4. v1 default slot list

Same as the Cursor adapter (per [`../cursor/mcp.md`](../cursor/mcp.md) §4). Slots register only when the relevant role is part of the selected role list AND the user did not opt out in Phase 5.

---

## 5. Slot entry shape (placeholder form)

```json
{
  "mcpServers": {
    "orchestra-analytics-database": {
      "command": "echo",
      "args": [
        "Slot 'orchestra-analytics-database' was registered by ai-orchestra. Replace this entry with your real MCP server: command + args + env. See ai-orchestra/adapters/claude-code/mcp.md."
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

Same inert-placeholder pattern as Cursor — `command: "echo"` produces a message rather than failing. When the user replaces the entry with a real server, they're expected to update `metadata.orchestra_status` from `"placeholder"` to `"attached"`. The audit then leaves the slot alone on subsequent runs.

---

## 6. Merge rules with existing `.mcp.json`

| Situation | Action |
|-----------|--------|
| File does not exist | `create` with the slot list as the only `mcpServers` entries. |
| File exists, valid JSON, no `mcpServers` key | Add `mcpServers` with the slot list. |
| File exists, `mcpServers` present, no orchestra slots | Add the slot list under `mcpServers`. Existing entries preserved. |
| Orchestra slot id already present (matched by id prefix `orchestra-` AND `metadata.orchestra: true`) | If `metadata.orchestra_status == "placeholder"` — overwrite (placeholder refresh is safe). If `metadata.orchestra_status == "attached"` — `skip` and preserve verbatim. |
| User has an entry whose id collides with an orchestra slot but lacks `metadata.orchestra: true` | Critical conflict — surface to user; do NOT overwrite. |
| File exists but invalid JSON | Critical conflict — surface to user; do not auto-repair. |

### Stable serialisation

After merge: 2-space indentation, `mcpServers` keys sorted alphabetically, keys inside each entry ordered (`command`, `args`, `env`, `metadata`), trailing newline.

---

## 7. Permission policy

Identical to Cursor's policy (per [`../cursor/mcp.md`](../cursor/mcp.md) §7): the slot's `purpose` field describes intended permission level (always read-only in v1); the audit ([`../../core/skills/platform/mcp-server-audit/SKILL.md`](../../core/skills/platform/mcp-server-audit/SKILL.md)) flags servers whose declared capabilities exceed the stated purpose as `audit.drift.warning`.

---

## 8. Servers added outside the orchestra

User-managed MCP servers under non-orchestra-prefixed ids are NOT recorded in the marker; the orchestra never modifies them; the audit surfaces them as `info` per [`../../core/notifications/CONTRACT.md`](../../core/notifications/CONTRACT.md).

---

## 9. Differences from the Cursor adapter

| Aspect | Cursor | Claude Code |
|--------|--------|-------------|
| Config file path | `.cursor/mcp.json` | `.mcp.json` (project root) |
| User-global file | Not touched (`~/.cursor/`) | Not touched (`~/.claude.json`) |
| Slot id convention | `orchestra-<role>-<purpose>` | Same — identical across all IDEs |
| Placeholder shape | Same | Same |
| Merge rules | Same | Same |

The slot vocabulary is portable — the same orchestra slots work across IDEs.

---

## 10. References

- [`INSTALL.md`](INSTALL.md) — procedure that calls into this file.
- [`mappings.md`](mappings.md) — points to this file for entry #6 (MCP slots).
- [`target-schema.md`](target-schema.md) §1 — overall filesystem layout.
- [`../cursor/mcp.md`](../cursor/mcp.md) — reference adapter; this baseline mirrors its policies.
- [`../_contract.md`](../_contract.md) §4 — required deliverable: MCP slots.
- [`../../core/discovery/signals/mcp.md`](../../core/discovery/signals/mcp.md) — discovery-side signal that detects existing MCP configurations.
- [`../../core/skills/platform/mcp-server-audit/SKILL.md`](../../core/skills/platform/mcp-server-audit/SKILL.md) — audit skill that watches MCP drift.
- [`../../core/notifications/CONTRACT.md`](../../core/notifications/CONTRACT.md) — notifications emitted for MCP events.

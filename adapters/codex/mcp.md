# Codex adapter — mcp.md

> Maps the orchestra's MCP-slot concept onto Codex's project-scoped MCP configuration. Codex's settled convention is partial in v1; the orchestra writes a stable slot intent file and documents the manual handoff.

---

## 1. Codex's MCP convention

Codex CLI supports MCP via its primary configuration file (`~/.codex/config.toml` or `.codex/config.toml`, TOML format). The settled convention for **project-scoped** MCP entries is not fully fixed in v1.

The orchestra's baseline strategy:

- Write the slot intent to `.codex/mcp.json` (JSON, project-root-scoped, same shape as Claude Code's `.mcp.json` and Cursor's `.cursor/mcp.json`).
- Document in `AGENTS.md` and the post-install report that the user may need to copy entries into Codex's actual runtime config (`~/.codex/config.toml` or similar) to wire them up. The slot ids, purposes, and metadata stay portable across both shapes.

This is conservative — when Codex's project-scoped MCP convention settles in a future v1.x, this adapter can simply update the target path without changing the slot semantics.

The user-global file `~/.codex/config.toml` is **not touched** by the orchestra; only the per-project `.codex/mcp.json` is.

---

## 2. What an "orchestra MCP slot" is

Same definition as the Cursor and Claude Code adapters (per [`../cursor/mcp.md`](../cursor/mcp.md) §2): a placeholder MCP server entry registered under a stable, prefixed id. The user attaches a real server by editing the slot — the orchestra reserves the id and documents the intent.

---

## 3. Slot id convention

Identical to the other adapters:

```
orchestra-<role-id>-<purpose>
```

Slot ids are stable across IDEs. The same role + purpose maps to the same id whether installed via Cursor, Claude Code, Codex, or VS Code.

---

## 4. v1 default slot list

Same as the Cursor adapter (per [`../cursor/mcp.md`](../cursor/mcp.md) §4). Slots register only when the relevant role is part of the selected role list AND the user did not opt out in Phase 5.

---

## 5. Slot entry shape (placeholder form)

Same as Claude Code's per [`../claude-code/mcp.md`](../claude-code/mcp.md) §5 — JSON, inert `echo` placeholder, `metadata.orchestra: true`, `orchestra_status: "placeholder"`. The placeholder text references this adapter's `mcp.md` so the user can locate the docs.

---

## 6. Merge rules with existing `.codex/mcp.json`

| Situation | Action |
|-----------|--------|
| File does not exist | `create` with the slot list as the only `mcpServers` entries. |
| File exists, valid JSON, no `mcpServers` key | Add `mcpServers` with the slot list. |
| File exists, `mcpServers` present, no orchestra slots | Add the slot list under `mcpServers`. Existing entries preserved. |
| Orchestra slot id already present (matched by id prefix `orchestra-` AND `metadata.orchestra: true`) | If `metadata.orchestra_status == "placeholder"` — overwrite. If `metadata.orchestra_status == "attached"` — `skip` and preserve verbatim. |
| User has an entry whose id collides with an orchestra slot but lacks `metadata.orchestra: true` | Critical conflict — surface to user; do NOT overwrite. |
| File exists but invalid JSON | Critical conflict — surface to user; do not auto-repair. |

### Stable serialisation

After merge: 2-space indentation, `mcpServers` keys sorted alphabetically, keys inside each entry ordered (`command`, `args`, `env`, `metadata`), trailing newline.

---

## 7. Permission policy

Same as the other adapters (per [`../cursor/mcp.md`](../cursor/mcp.md) §7): the slot's `purpose` field describes intended permission level (read-only in v1); the audit ([`../../core/skills/platform/mcp-server-audit/SKILL.md`](../../core/skills/platform/mcp-server-audit/SKILL.md)) flags drift as warnings.

---

## 8. Servers added outside the orchestra

User-managed MCP servers (in `.codex/mcp.json` under non-orchestra-prefixed ids OR in `~/.codex/config.toml`) are NOT recorded in the marker. The orchestra never modifies them. The audit surfaces them as `info` per [`../../core/notifications/CONTRACT.md`](../../core/notifications/CONTRACT.md).

---

## 9. Differences from sibling adapters

| Aspect | Cursor | Claude Code | Codex |
|--------|--------|-------------|-------|
| Config file path | `.cursor/mcp.json` | `.mcp.json` (root) | `.codex/mcp.json` |
| Codex runtime wiring | N/A | N/A | **Manual** — user may need to copy into `~/.codex/config.toml` |
| User-global file touched | No (`~/.cursor/`) | No (`~/.claude.json`) | No (`~/.codex/config.toml`) |
| Slot id convention | Same across all IDEs | Same | Same |
| Placeholder shape | Same | Same | Same |
| Merge rules | Same | Same | Same |

---

## 10. References

- [`INSTALL.md`](INSTALL.md) — procedure that calls into this file.
- [`mappings.md`](mappings.md) — points to this file for entry #5 (MCP slots).
- [`target-schema.md`](target-schema.md) §3 — the file shape this file produces.
- [`../cursor/mcp.md`](../cursor/mcp.md) — reference adapter; this baseline mirrors its policies.
- [`../claude-code/mcp.md`](../claude-code/mcp.md) — sibling baseline using the same JSON shape at a different path.
- [`../_contract.md`](../_contract.md) §4 — required deliverable: MCP slots.
- [`../../core/discovery/signals/mcp.md`](../../core/discovery/signals/mcp.md) — discovery-side signal that detects existing MCP configurations.
- [`../../core/skills/platform/mcp-server-audit/SKILL.md`](../../core/skills/platform/mcp-server-audit/SKILL.md) — audit skill that watches MCP drift.
- [`../../core/notifications/CONTRACT.md`](../../core/notifications/CONTRACT.md) — notifications emitted for MCP events.

# Cursor adapter — mcp.md

> Maps the orchestra's MCP-slot concept onto Cursor's `.cursor/mcp.json` configuration. Defines the slot naming convention, merge logic, permission policy, and v1 default slot list.

---

## 1. Cursor's MCP convention

Cursor reads MCP server configurations from `.cursor/mcp.json` in the project root (per Cursor's MCP support, 0.40+). The shape:

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

Cursor supports stdio servers (the shape above), SSE servers (with `url`), and HTTP servers. The orchestra adapter targets all three but registers **stdio** as the default for slots it generates, because stdio servers respect the project's working directory (and therefore the orchestra's read-only intent).

---

## 2. What an "orchestra MCP slot" is

A slot is a placeholder MCP server entry that the orchestra registers under a stable, prefixed id. The user attaches a real implementation by editing the slot — the orchestra reserves the id and documents the intent.

This split exists because:

- The orchestra cannot ship MCP server binaries for every project's stack.
- The user often already has trusted servers they want to wire up.
- The slot system gives the orchestra a place to **declare** "this role wants an MCP server that does X" without making the choice for the user.

When the user attaches a real server, the orchestra never overwrites it on subsequent runs. The slot contract is "we register the id once; you own the implementation forever after."

---

## 3. Slot id convention

Every orchestra-managed slot id is prefixed with `orchestra-`. The full pattern:

```
orchestra-<role-id>-<purpose>
```

Examples:

| Slot id | Role | Purpose |
|---------|------|---------|
| `orchestra-analytics-database` | analytics-engineer | Read-only access to the project's analytics warehouse. |
| `orchestra-backend-database` | backend-engineer | Read-only access to the application database for query inspection. |
| `orchestra-devops-secrets` | devops-sre | Read-only access to the project's secrets manager (rotation visibility, no read of secret values). |
| `orchestra-security-vuln-feed` | security-engineer | Read access to a vulnerability feed (CVE / GHSA). |
| `orchestra-ai-ml-vector-db` | ai-ml-engineer | Read-only access to a vector / embeddings store. |

Slot ids are stable across versions. Renames are deprecate-plus-new-id, never silent.

---

## 4. v1 default slot list

The Cursor adapter registers slots based on the role list selected for this project. By role:

| Role | Slot(s) registered by default |
|------|-------------------------------|
| `frontend-engineer` | (none in v1; FE slots planned for v2 — visual regression, design-system query) |
| `backend-engineer` | `orchestra-backend-database` |
| `qa-engineer` | (none; QA slots planned for v2 — test-result browser) |
| `analytics-engineer` | `orchestra-analytics-database` |
| `devops-sre` | `orchestra-devops-secrets` |
| `security-engineer` | `orchestra-security-vuln-feed` |
| `mobile-engineer` | (none in v1) |
| `ai-ml-engineer` | `orchestra-ai-ml-vector-db` |
| `tech-writer` | (none) |
| `product-manager` | (none) |

A slot is registered only if its role is part of the selected role list AND the user has not opted-out in the install plan (Phase 5 of [`INSTALL.md`](INSTALL.md)).

The user can always add more slots manually after install — the orchestra leaves them alone.

---

## 5. Slot entry shape (placeholder form)

When the orchestra registers a slot in `.cursor/mcp.json`, it writes a placeholder entry:

```json
{
  "mcpServers": {
    "orchestra-analytics-database": {
      "command": "echo",
      "args": [
        "Slot 'orchestra-analytics-database' was registered by ai-orchestra. Replace this entry with your real MCP server: command + args + env. See ai-orchestra/adapters/cursor/mcp.md."
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

The placeholder is intentionally inert — `command: "echo"` produces a message rather than failing. Cursor will surface the message if the slot is invoked, prompting the user to wire it up.

When the user replaces the entry with a real server, the **expected behaviour** is that they remove the `metadata.orchestra_status: "placeholder"` field (or change it to `"attached"`). The orchestra's audit then treats the slot as user-attached and never overwrites the server config — only the metadata fields the orchestra owns.

---

## 6. Merge rules with existing `.cursor/mcp.json`

| Situation | Action |
|-----------|--------|
| File does not exist | `create` with the slot list as the only `mcpServers` entries. |
| File exists, valid JSON, no `mcpServers` key | Add `mcpServers` with the slot list. |
| File exists, `mcpServers` present, no orchestra slots | Add the slot list under `mcpServers`. Existing entries preserved. |
| File exists, orchestra slot id already present (matched by id prefix `orchestra-` AND `metadata.orchestra: true`) | If `metadata.orchestra_status == "placeholder"` — overwrite (placeholder refresh is safe). If `metadata.orchestra_status == "attached"` (or any non-placeholder value) — `skip` and preserve verbatim. |
| User has an entry whose id collides with an orchestra slot but lacks `metadata.orchestra: true` | Critical conflict — the user owns the id. Surface to user; do NOT overwrite. |
| File exists but invalid JSON | Critical conflict — surface to user; do not auto-repair. |

### Stable serialisation

After merge, the adapter writes the file with:

- 2-space indentation.
- `mcpServers` keys sorted alphabetically.
- Inside each entry, keys ordered: `command`, `args`, `env`, `metadata`.
- Trailing newline.

---

## 7. Permission policy

The orchestra's slots embody the principle of **least privilege**:

- The intended permission level for every slot is described in human-readable form in the slot's `purpose` field (per [`../../core/registry/install.schema.md`](../../core/registry/install.schema.md) §1.2 — `mcpSlots[].purpose`). The user's actual server may exceed it, but the recorded intent gives the audit a baseline to compare against.
- Slot purposes always express read-only intent unless the role's mission inherently requires write access (none in v1).
- The audit ([`../../core/skills/platform/mcp-server-audit/SKILL.md`](../../core/skills/platform/mcp-server-audit/SKILL.md)) flags as `audit.drift.warning` any user-attached server whose declared capabilities appear to exceed the slot's stated purpose. It does not block — the user owns the choice.

---

## 8. Servers added outside the orchestra

The user is free to add any number of MCP servers under non-orchestra-prefixed ids. The adapter:

- Does not record them in the marker (the marker tracks only `mcpSlots[]` the orchestra registered).
- Never modifies them.
- Surfaces them in the audit's "informational" output (event `mcp.server.added.outside.orchestra`, severity `info` per [`../../core/notifications/CONTRACT.md`](../../core/notifications/CONTRACT.md)).

---

## 9. v1 limitations

| Limitation | Justification | v2 plan |
|------------|---------------|---------|
| Placeholder slots are stdio-only. | Stdio is the most-portable form; SSE / HTTP often need extra config the orchestra cannot supply. | Allow per-slot `transport` declaration in stack packs. |
| No automatic discovery of likely real servers. | Avoiding a network call at install time is more important. | Optional opt-in discovery in v2. |
| Slot ids are role-prefixed, not project-prefixed. | Roles are stable, projects are nameable. | Reconsider if multiple projects share the same Cursor profile cause collisions. |

None of these are gaps against the contract. They are deliberate v1 simplifications and are recorded as such in the install marker.

---

## 10. References

- [`INSTALL.md`](INSTALL.md) — procedure that calls into this file.
- [`mappings.md`](mappings.md) — points to this file for entry #7 (MCP slots).
- [`target-schema.md`](target-schema.md) §1 — overall filesystem layout.
- [`../_contract.md`](../_contract.md) §4 — required deliverable: MCP slots.
- [`../../core/discovery/signals/mcp.md`](../../core/discovery/signals/mcp.md) — discovery-side signal that detects existing MCP configurations.
- [`../../core/skills/platform/mcp-server-audit/SKILL.md`](../../core/skills/platform/mcp-server-audit/SKILL.md) — audit skill that watches MCP drift.
- [`../../core/notifications/CONTRACT.md`](../../core/notifications/CONTRACT.md) — notifications emitted for MCP events.

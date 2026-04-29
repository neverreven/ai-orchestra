# install.schema.md — `.ai-orchestra/install.json` and the Global Registry

> Defines the shape of the **per-project install marker** (`.ai-orchestra/install.json`) written into every installed target project, and the **optional global registry** (`~/.ai-orchestra/projects.json`) that lists all installs on the current machine.

These files are written by the adapter at the end of Phase 7 in [RUN.md](../../RUN.md). They are read by the audit skill (PR 3) and by future v2 multi-project tooling.

---

## 1. Per-project install marker

### 1.1 Location

Always at: `<target-project-root>/.ai-orchestra/install.json`

The `.ai-orchestra/` directory at the target project root is reserved for orchestra-owned per-project state. Other files may live here in future versions (audit history, last-plan archives), but in v1 the only file is `install.json`.

### 1.2 Schema

```json
{
  "$schema": "https://ai-orchestra.dev/schemas/install/v1.json",
  "schemaVersion": 1,

  "orchestra": {
    "version": "1.0.0-alpha",
    "installedAt": "2026-04-29T08:00:00.000Z",
    "lastAuditedAt": null
  },

  "ide": {
    "id": "cursor",
    "adapter": "adapters/cursor",
    "adapterVersion": "1.0.0-alpha"
  },

  "project": {
    "name": "host-project",
    "root": "C:/_host-project/_project/host-project"
  },

  "stacks": [
    {
      "id": "js-ts",
      "confidence": 0.97,
      "frameworks": ["react", "vite"],
      "stackPack": "core/stack-packs/js-ts",
      "stackPackVersion": "1.0.0-alpha"
    }
  ],

  "roles": [
    "frontend-engineer",
    "qa-engineer",
    "tech-writer"
  ],

  "skills": [
    { "id": "cleanup",       "category": "audit",    "source": "core/skills/audit/cleanup" },
    { "id": "code-review",   "category": "code",     "source": "core/skills/code/code-review" }
  ],

  "rules": [
    { "id": "project-context", "path": ".cursor/rules/project-context.mdc",   "source": "core/rules/project-context.template.md" },
    { "id": "director",        "path": ".cursor/rules/ai-director.mdc",       "source": "core/rules/director.template.md" }
  ],

  "hooks": {
    "stop": { "registered": true, "path": ".cursor/hooks.json" }
  },

  "mcpSlots": [
    {
      "name": "orchestra-analytics-database",
      "ide": "cursor",
      "configPath": ".cursor/mcp.json",
      "registeredBy": "analytics-engineer",
      "purpose": "Slot for an analytics database MCP server. User must attach a real server.",
      "userMustAttach": true
    }
  ],

  "learnings": {
    "path": "_documentation/AI_LEARNINGS.md",
    "seeded": true
  },

  "agentsDoc": {
    "path": "AGENTS.md",
    "managedSection": "ai-orchestra"
  },

  "scheduler": {
    "contractVersion": 1,
    "jobs": []
  },

  "notifications": {
    "contractVersion": 1,
    "channels": []
  },

  "history": [
    {
      "at": "2026-04-29T08:00:00.000Z",
      "action": "install",
      "orchestraVersion": "1.0.0-alpha",
      "summary": "Initial install: js-ts stack, 3 roles, 12 skills, director + audit, 1 MCP slot."
    }
  ]
}
```

### 1.3 Field reference

| Field | Required | Description |
|-------|----------|-------------|
| `$schema` | Yes | URL of the JSON schema for this version. v1 is informational; the schema doc lives in this file. |
| `schemaVersion` | Yes | Integer. Increments only on breaking schema changes. v1 = `1`. |
| `orchestra.version` | Yes | The `VERSION` of the orchestra core that produced the install. |
| `orchestra.installedAt` | Yes | ISO 8601 timestamp of the original install. Never updated. |
| `orchestra.lastAuditedAt` | Yes | ISO 8601 timestamp of the last audit. `null` until first audit. Updated on every audit run. |
| `ide.id` | Yes | One of `cursor`, `claude-code`, `codex`, `vscode`. |
| `ide.adapter` | Yes | Path of the adapter relative to the orchestra core root. |
| `ide.adapterVersion` | Yes | Adapter's own version (matches `orchestra.version` in v1; may diverge later). |
| `project.name` | Yes | Human-readable project name (from `package.json#name`, `pyproject.toml#name`, or the root folder name as fallback). |
| `project.root` | Yes | Absolute path to the project root at install time. May go stale if the project moves; the audit can reconcile. |
| `stacks[]` | Yes | Detected stacks with confidence and framework lists. |
| `stacks[].stackPack` | Conditional | Path to the stack pack (relative to orchestra core). `null` for stacks with no pack in the current version. |
| `roles[]` | Yes | Role identifiers installed for this project. |
| `skills[]` | Yes | Skill identifiers installed, with category and source path. |
| `rules[]` | Yes | Rules installed, with target path and source template. |
| `hooks` | Yes | Map of event name → registration metadata. Empty object if no hooks installed. |
| `mcpSlots[]` | Yes | MCP slots the orchestra registered. Empty array if none. |
| `learnings` | Yes | Learnings document location and whether the orchestra seeded it. |
| `agentsDoc` | Yes | Project-context document location and the section name owned by the orchestra. |
| `scheduler.contractVersion` | Yes | Version of the scheduler contract this install is compatible with. |
| `scheduler.jobs[]` | Yes | List of registered jobs. Empty in v1 (no runner). |
| `notifications.contractVersion` | Yes | Version of the notifications contract. |
| `notifications.channels[]` | Yes | List of registered notification channels. Empty in v1 (no router). |
| `history[]` | Yes | Append-only log of install / upgrade / audit events. |

### 1.4 Mutation rules

- **`install`** appends the first entry to `history[]` and writes all other top-level fields fresh.
- **`upgrade`** appends a new history entry, updates `orchestra.version` and dependent version fields, and may update `roles[]`, `skills[]`, `rules[]`, `mcpSlots[]` based on the upgrade plan. **Never** mutates `orchestra.installedAt`.
- **`audit`** appends a history entry with `action: "audit"` and updates `orchestra.lastAuditedAt`. May append fix entries when the audit auto-fixes drift; critical-change proposals do not mutate the file until applied.

### 1.5 Validation

The audit skill (PR 3) validates the file on every run. Validation rules:

- Required fields present.
- `schemaVersion` matches a known schema version.
- All `rules[].path` paths exist (auto-fixable: prune missing).
- All `skills[].source` paths exist relative to the orchestra core (auto-fixable: warn and propose update).
- Timestamps are valid ISO 8601.
- `mcpSlots[].configPath` files exist and parse.

If validation fails, the audit reports the failure and proposes fixes; it does not silently rewrite the marker.

---

## 2. Optional global registry

### 2.1 Location

`~/.ai-orchestra/projects.json` (where `~` is the user's home directory: `%USERPROFILE%` on Windows, `$HOME` on Unix-likes).

The directory `~/.ai-orchestra/` is created on first install if it does not exist. The file is owned by the user and may also be edited by hand.

### 2.2 Schema

```json
{
  "schemaVersion": 1,
  "projects": [
    {
      "path": "C:/_host-project/_project/host-project",
      "name": "host-project",
      "ide": "cursor",
      "lastSeenVersion": "1.0.0-alpha",
      "lastSeenAt": "2026-04-29T08:00:00.000Z"
    }
  ]
}
```

### 2.3 Mutation rules

- **First install on a machine** creates the file with one project entry.
- **Subsequent installs** append (or update by `path` match) a project entry.
- **The orchestra never deletes entries** in the global registry. If a project moves or is removed, the entry becomes stale; the user can prune manually. v2 may surface a `prune` skill.
- **Privacy:** the global registry contains only project paths and metadata. No code, no secrets, no telemetry. It is local-only and never transmitted.

### 2.4 Reading

- **v1:** the orchestra writes only. Nothing reads the global registry yet.
- **v2:** the multi-project orchestration runtime reads it to enable cross-project status, batch updates, and shared learnings consolidation.

---

## 3. Backward compatibility

If a future schema version is introduced (`schemaVersion: 2`), the orchestra at that version must:

- Detect older `schemaVersion` markers and migrate them in place during upgrade.
- Preserve `history[]` across migrations.
- Document the migration in `CHANGELOG.md`.

The audit skill should refuse to run against an unknown future schema version (e.g., a v1 orchestra encountering a v2 marker).

---

## 4. References

- [../../RUN.md](../../RUN.md) — Phase 7 writes the marker; Phase 3 reads any prior marker.
- [../discovery/existing-infra.md](../discovery/existing-infra.md) — inventory consumes the marker for upgrade-and-audit mode.
- [../../adapters/_contract.md](../../adapters/_contract.md) — adapters must produce a marker conforming to this schema.

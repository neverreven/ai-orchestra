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
    "name": "example-project",
    "root": "/absolute/path/to/example-project"
  },

  "stacks": [
    {
      "id": "js-ts",
      "confidence": 0.97,
      "frameworks": ["react", "vite"],
      "stackPack": "core/stack-packs/js-ts",
      "stackPackVersion": "1.0.0-alpha",
      "installedPackRules": ["rules/react.md", "rules/typescript.md", "rules/vite.md"],
      "skippedPackRules": ["rules/node-server.md"]
    }
  ],

  "subProjects": [
    { "path": "server", "manifest": "server/package.json", "type": "package.json" }
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

  "installScope": {
    "mode": "selected-roles",
    "primaryRole": null,
    "selectedRoles": ["frontend-engineer", "qa-engineer", "security-engineer", "tech-writer"],
    "optedOutUniversals": [],
    "decidedAt": "2026-04-29T08:00:00.000Z",
    "decidedBy": "user-accepted-recommendation",
    "recommendation": {
      "mode": "selected-roles",
      "rationale": "Detected external ownership of backend-engineer (backend/AGENTS.md, 4.2 KB hand-written)."
    },
    "stopHookOverlapResolution": {
      "value": null,
      "detectedAt": "2026-04-29T08:00:00.000Z",
      "decidedAt": "2026-04-29T08:00:00.000Z",
      "decidedBy": "default-no-overlap"
    }
  },

  "skillPlacementStrategy": {
    "type": "ide-specific",
    "sharedPath": null,
    "decidedAt": "2026-04-29T08:00:00.000Z",
    "decidedBy": "default"
  },

  "rules": [
    { "id": "project-context", "path": ".cursor/rules/orchestra-context.mdc",   "source": "adapter-generated", "alwaysOn": true },
    { "id": "director",        "path": ".cursor/rules/ai-director.mdc",         "source": "core/director/RULE.md", "alwaysOn": true }
  ],

  "hooks": {
    "stop": {
      "registered": true,
      "path": ".cursor/hooks.json",
      "contractVersion": "1.0",
      "lastRun": null
    }
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

  "tier": 1,

  "installedFolder": "score",

  "ensemble": {
    "installed": false,
    "location": "project-local",
    "path": null,
    "version": null,
    "telegramEnabled": false,
    "webUiEnabled": false,
    "webUiPort": null
  },

  "learnings": {
    "path": "_documentation/AI_LEARNINGS.md",
    "seeded": true
  },

  "sessionState": {
    "path": ".ai-orchestra/SESSION_STATE.md",
    "seeded": false
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
| `schemaVersion` | Yes | Integer. Increments only on breaking schema changes. v1 = `1`. The schema itself is described in this document; the marker is identified by `schemaVersion` only. No `$schema` URL is used — the orchestra deliberately avoids fictional or aspirational identifiers that could be mistaken for third-party resources. |
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
| `stacks[].installedPackRules[]` | Conditional | List of pack rule file names (e.g., `rules/react.md`) that were installed for this stack. Present when a stack pack was applied. Empty array when all rules were filtered out. |
| `stacks[].skippedPackRules[]` | Conditional | List of pack rule file names that were skipped because their `## When this applies` globs matched zero tracked files in the project at install time. The audit re-evaluates these on every run — if matching files appear later, the rule is installed on the next upgrade. |
| `subProjects[]` | Conditional | Sub-packages detected by the secondary scan in [`../discovery/DETECTION.md`](../discovery/DETECTION.md) §3.4. Each entry is `{ "path": string, "manifest": string, "type": string }`. `path` is the subdirectory relative to the project root; `manifest` is the relative path to the manifest file; `type` is the manifest filename (e.g., `Cargo.toml`). Absent (or empty array) when no sub-projects were detected. Stack packs in v1.3 remain root-scoped; this field is informational only. |
| `roles[]` | Yes | Role identifiers installed for this project. Computed by the resolver in [`../install-scope.md`](../install-scope.md) §2 from `installScope.mode` plus the user's selection. Always sorted; always de-duplicated. |
| `skills[]` | Yes | Skill identifiers installed, with category and source path. Computed by the resolver in [`../install-scope.md`](../install-scope.md) §3 from `roles[]` plus the universal skill set. |
| `installScope` | Yes | Records how the install was scoped and the recommendation engine's input to that decision. `mode` is one of `full-kit`, `selected-roles`, `primary-plus-collaborators`, `core-only` per [`../install-scope.md`](../install-scope.md) §1. `primaryRole` is the chosen primary role id when `mode` is `primary-plus-collaborators`; `null` otherwise. `selectedRoles` mirrors `roles[]` (kept here for self-containment when an audit reads only this field). `optedOutUniversals[]` lists universal role ids the user explicitly opted out of (typically empty). `decidedAt` is the ISO 8601 timestamp of the decision. `decidedBy` is `default` (no human input — applied automatically), `user` (user picked an option without a recommendation), `user-accepted-recommendation`, or `user-override` (user picked a mode different from the recommendation). `recommendation` records the engine's proposed mode and a one-sentence rationale (always present even when `decidedBy` is `default`). Markers without `installScope` (older v1.0.x installs) are treated as `mode: "full-kit"`, `decidedBy: "default"`. |
| `installScope.stopHookOverlapResolution` | Yes (since v1.2.0) | Records how the orchestra resolved a stop-hook conceptual overlap with an existing project hook (per [`../conflict/stop-hook-overlap.md`](../conflict/stop-hook-overlap.md)). `value` is one of `"skip-orchestra"`, `"replace-with-orchestra"`, `"adopt-existing"`, or `null` when no overlap was detected. `detectedAt` and `decidedAt` are ISO 8601 timestamps. `decidedBy` is `"user"` (user picked one of the three resolutions in Phase 6) or `"default-no-overlap"` (no overlap detected, no question asked). When `value` is `"replace-with-orchestra"`, the field also carries `replacedEntryEvidence` (a one-line summary of the removed project hook). When `value` is `"adopt-existing"`, the field also carries `adoptedEntryDigest` (an SHA-256 hex of the adopted prompt body, used by the audit to detect drift). When `value` is `null`, only the four base fields are present. Markers without this field (v1.0 / v1.1 markers) are valid and treated as `value: null`, `decidedBy: "default-no-overlap"`; the audit migrates them on first run by re-running detection and writing the field. |
| `skillPlacementStrategy` | Yes | Records where portable skills are installed and the basis for the decision. `type` is one of `ide-specific` (default — skills only under the IDE folder, e.g., `.cursor/skills/`), `shared` (skills under a tool-agnostic folder the user nominated, e.g., `.agents/`), or `hybrid` (skills under both, with the IDE-folder copy as a stub pointing to the shared file). `sharedPath` is the user-nominated folder when `type` is `shared` or `hybrid`; `null` otherwise. `decidedAt` is the ISO 8601 timestamp of the decision. `decidedBy` is `user` (chosen explicitly during Phase 6) or `default` (no candidate detected, so `ide-specific` was applied automatically). |
| `rules[]` | Yes | Rules installed, with target path and source template. Each entry is `{ "id": string, "path": string, "source": string, "action"?: string, "alwaysOn": bool, "sourceAlwaysApply"?: bool }`. `alwaysOn` records whether the rule is active as always-on in the IDE after install (`true` for normally-installed always-on rules; `false` for suffix-renamed copies that were downgraded per the F2 always-on downgrade policy). `sourceAlwaysApply` is `true` when the source template declares `alwaysApply: true` — present only on suffix-renamed entries to let post-install checks verify the downgrade was applied. |
| `hooks` | Yes | Map of event name → registration metadata. Empty object if no hooks installed. Each entry has `registered: bool`, `path: string`, `contractVersion: string` (per [`../../adapters/_stop-hook.md`](../../adapters/_stop-hook.md) — `"1.0"` in v1), and optional `lastRun: ISO-8601 | null` (updated after each hook fire). |
| `mcpSlots[]` | Yes | MCP slots the orchestra registered. Empty array if none. |
| `tier` | Yes | Current activation tier: `1` = Score only (IDE agent + spec infra); `2` = Ensemble active (Lead + Role agents); `3` = Telegram remote orchestration enabled. Set to `1` on fresh install; upgraded by the `setup-ensemble` and `setup-telegram` skills. |
| `installedFolder` | Yes | Name of the spec folder in the project root. `"score"` for v3+ installs; `"ai-orchestra"` for pre-v3 installs pending migration. Used by the upgrade skill to locate the folder. |
| `ensemble` | Yes | Ensemble installation state. `installed: bool` — whether the ensemble has been set up. `location: "project-local"\|"system-global"` — where the ensemble lives: `"project-local"` means `.ai-orchestra/ensemble/` inside the project; `"system-global"` means `~/.ai-orchestra/ensemble/` on the machine (shared across projects). `path: string\|null` — absolute path to the ensemble directory. `version: string\|null` — ensemble package version at setup time. `telegramEnabled: bool` — whether Telegram bots have been configured. `webUiEnabled: bool` — whether the local web chat UI is enabled (served at `localhost:webUiPort`). `webUiPort: number\|null` — port for the web chat UI; `null` when `webUiEnabled` is `false`; defaults to `3847`. All `false`/`null`/`"project-local"` on fresh Tier 1 installs. |
| `learnings` | Yes | Learnings document location and whether the orchestra seeded it. |
| `sessionState` | Yes | Session state file location (`path`) and whether it has been seeded (`seeded: bool`). `seeded: false` on fresh installs — the upgrade skill offers to create it; the user opts in. Updated to `true` once the file is written. |
| `agentsDoc` | Yes | Project-context document location and the section name owned by the orchestra. |
| `scheduler.contractVersion` | Yes | Version of the scheduler contract this install is compatible with. |
| `scheduler.jobs[]` | Yes | List of registered jobs. Empty in v1 (no runner). |
| `notifications.contractVersion` | Yes | Version of the notifications contract. |
| `notifications.channels[]` | Yes | List of registered notification channels. Empty in v1 (no router). |
| `history[]` | Yes | Append-only log of install / upgrade / audit events. |

### 1.4 Mutation rules

- **`install`** appends the first entry to `history[]` and writes all other top-level fields fresh.
- **`upgrade`** appends a new history entry, updates `orchestra.version` and dependent version fields, and may update `roles[]`, `skills[]`, `rules[]`, `mcpSlots[]` based on the upgrade plan. **Never** mutates `orchestra.installedAt`. The full upgrade procedure (managed vs. project-owned boundary, diff-and-consent for adapted skills, SESSION_STATE opt-in) is described in [`../skills/audit/upgrade/SKILL.md`](../skills/audit/upgrade/SKILL.md).
- **`audit`** appends a history entry with `action: "audit"` and updates `orchestra.lastAuditedAt`. May append fix entries when the audit auto-fixes drift; critical-change proposals do not mutate the file until applied.

### 1.5 Validation

The audit skill (PR 3) validates the file on every run. Validation rules:

- Required fields present.
- `schemaVersion` matches a known schema version.
- All `rules[].path` paths exist (auto-fixable: prune missing).
- All `skills[].source` paths exist relative to the orchestra core (auto-fixable: warn and propose update).
- Timestamps are valid ISO 8601.
- `mcpSlots[].configPath` files exist and parse.
- `installScope` validation per [`../install-scope.md`](../install-scope.md) §5 (mode is one of the four ids; `selectedRoles[]` matches the resolver for the chosen mode; `primaryRole` set iff mode is `primary-plus-collaborators`; etc.). Markers with no `installScope` field are accepted and the audit proposes a one-time migration that records the inferred `mode: "full-kit"` decision.

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
      "path": "/absolute/path/to/example-project",
      "name": "example-project",
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
- [../install-scope.md](../install-scope.md) — defines `installScope.mode`, the resolver, and the recommendation engine.
- [../discovery/existing-infra.md](../discovery/existing-infra.md) — §3.9 / §3.10 produce the inventory inputs the recommendation engine consumes; the marker also drives upgrade-and-audit mode.
- [../../adapters/_contract.md](../../adapters/_contract.md) — adapters must produce a marker conforming to this schema.

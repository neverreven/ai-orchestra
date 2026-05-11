# Global Registry — `~/.ai-orchestra/projects.json`

> Defines the schema, mutation rules, reading semantics, and cross-project operations for the **global registry** — a single JSON file that tracks every project where ai-orchestra is installed on the current machine.

The global registry is the foundation of multi-project orchestration. In v1 it is write-only (populated at install time, never read by the runtime). Starting in v2, the scheduler, audit, and upgrade skills read it to provide cross-project status, batch updates, and health monitoring.

---

## 1. Location

`~/.ai-orchestra/projects.json`

- `~` is `%USERPROFILE%` on Windows, `$HOME` on Unix-likes.
- `~/.ai-orchestra/` is created on first install if absent.
- The file is **user-owned** — not checked into any project repo.
- A missing file means no projects have been installed yet. The registry is created lazily on the first install or on the first `register` command.

---

## 2. Schema (v2)

```json
{
  "schemaVersion": 2,
  "machine": {
    "id": "<deterministic machine fingerprint — see §2.1>",
    "os": "win32 | darwin | linux",
    "hostname": "<os.hostname()>"
  },
  "projects": [
    {
      "path": "/absolute/path/to/project",
      "name": "project-name",
      "ide": "cursor",
      "orchestraVersion": "1.3.1",
      "installedAt": "2026-04-29T08:00:00.000Z",
      "lastSeenAt": "2026-05-11T08:00:00.000Z",
      "lastAuditedAt": null,
      "lastAuditOutcome": null,
      "stacks": ["js-ts"],
      "markerPath": ".ai-orchestra/install.json",
      "healthy": true
    }
  ]
}
```

### 2.1 Machine fingerprint

The `machine.id` is deterministic and local-only: `SHA-256(os.hostname() + os.homedir() + os.platform())` truncated to 16 hex characters. It allows the upgrade-all skill to detect when a registry was copied from another machine (mismatched `machine.id`) and skip destructive operations. No PII is transmitted; the hash is local.

### 2.2 Field reference — `projects[]` entries

| Field | Required | Description |
|-------|----------|-------------|
| `path` | Yes | Absolute path to the project root. The dedup key — entries are matched by `path` (normalised: forward slashes, no trailing slash). |
| `name` | Yes | Human-readable project name (from `project.name` in the per-project marker). |
| `ide` | Yes | IDE identifier (`cursor`, `claude-code`, `codex`, `vscode`). |
| `orchestraVersion` | Yes | The orchestra `VERSION` at the time of install or last upgrade. |
| `installedAt` | Yes | ISO 8601 — copied from the per-project marker's `orchestra.installedAt`. |
| `lastSeenAt` | Yes | ISO 8601 — updated every time the adapter writes to or reads from the per-project marker. This is the "freshness" signal — a `lastSeenAt` older than 90 days suggests the project is stale. |
| `lastAuditedAt` | No | ISO 8601 — mirrors `orchestra.lastAuditedAt` from the per-project marker. `null` until first audit. |
| `lastAuditOutcome` | No | One of `"clean"`, `"findings"`, `"failed"`, or `null`. Updated by the audit skill after each run. |
| `stacks[]` | Yes | Stack ids detected (e.g., `["js-ts", "mobile"]`). Mirrors `stacks[].id` from the per-project marker. |
| `markerPath` | Yes | Relative path to the per-project marker from the project root. Always `.ai-orchestra/install.json` in v1/v2. |
| `healthy` | Yes | Boolean. `true` when the last audit (or install) left the project in a clean state. Set to `false` when an audit reports unresolved findings or when the marker is unreachable. |

---

## 3. Mutation rules

### 3.1 On install (Phase 7)

After writing `.ai-orchestra/install.json`, the adapter:

1. Reads `~/.ai-orchestra/projects.json`. If absent, creates it with `schemaVersion: 2`, the `machine` block, and an empty `projects: []`.
2. Searches `projects[]` for an entry whose normalised `path` matches the current project.
3. If found — **update** the existing entry with fresh values (version, stacks, lastSeenAt, healthy).
4. If not found — **append** a new entry.
5. Writes the file with stable JSON serialisation (2-space indent, keys alphabetically sorted within each object, trailing newline).

Failure to write the global registry (permissions, disk full) is non-fatal. The adapter logs a `warning` and continues. The per-project marker is the authoritative record; the global registry is a convenience index.

### 3.2 On audit

The audit skill (or the scheduler-triggered periodic-audit) updates the matching entry:

- `lastAuditedAt` ← now.
- `lastAuditOutcome` ← `"clean"` | `"findings"` | `"failed"`.
- `healthy` ← `true` if outcome is `clean`, `false` otherwise.
- `lastSeenAt` ← now.
- `orchestraVersion` ← current `VERSION` (may have been upgraded since install).

### 3.3 On upgrade

The upgrade-all skill (§5) iterates `projects[]` and updates each project. After upgrading a project:

- `orchestraVersion` ← new version.
- `lastSeenAt` ← now.
- `healthy` ← result of post-upgrade audit.

### 3.4 On manual prune

The user (or a future `prune` skill) removes entries whose `path` no longer exists on disk. The orchestrator never auto-prunes — stale entries are informational (the user may have the project on an external drive, a different branch, or a restored backup).

---

## 4. Reading semantics

### 4.1 Discovery

Any skill that reads the global registry MUST:

1. Verify `schemaVersion`. If > 2, warn and refuse destructive operations (forward-compatibility guard).
2. Verify `machine.id` matches the current machine. If mismatched, print a `warning` ("This registry appears to have been copied from another machine") and switch to read-only mode.
3. For each `projects[]` entry, verify `path` exists before attempting to read the per-project marker. Mark unreachable entries as `healthy: false` in the report (but do not remove them).

### 4.2 Freshness classification

| `lastSeenAt` age | Classification | Visual |
|-------------------|---------------|--------|
| ≤ 7 days | Active | Green |
| 8–30 days | Idle | Yellow |
| 31–90 days | Stale | Orange |
| > 90 days | Dormant | Red |

The multi-project-audit skill uses these classifications in its summary table.

---

## 5. Cross-project skills

### 5.1 `multi-project-audit`

See [`../skills/orchestration/multi-project-audit/SKILL.md`](../skills/orchestration/multi-project-audit/SKILL.md).

Reads the global registry, visits each reachable project, runs `ai-infra-audit` against its per-project marker, and produces a consolidated cross-project health report.

### 5.2 `upgrade-all`

See [`../skills/orchestration/upgrade-all/SKILL.md`](../skills/orchestration/upgrade-all/SKILL.md).

Reads the global registry, identifies projects behind the current orchestra version, generates upgrade plans, and applies them with user confirmation.

---

## 6. Privacy and security

- The global registry contains **only** paths, project names, stack ids, and timestamps. No code, no secrets, no credentials, no file contents.
- It is **never transmitted** — local-only.
- The machine fingerprint is a one-way hash that cannot be reversed to recover the hostname or home directory.
- The orchestrator never reads projects outside the registry. It does not scan the filesystem for unregistered projects.

---

## 7. Backward compatibility

### v1 → v2 migration

v1 registries have `schemaVersion: 1` and a simpler entry shape (`path`, `name`, `ide`, `lastSeenVersion`, `lastSeenAt`). When a v2-aware adapter reads a v1 registry:

1. Set `schemaVersion: 2`.
2. Add the `machine` block.
3. For each entry: rename `lastSeenVersion` → `orchestraVersion`; add default values for new fields (`lastAuditedAt: null`, `lastAuditOutcome: null`, `stacks: []`, `markerPath: ".ai-orchestra/install.json"`, `healthy: true`, `installedAt` copied from `lastSeenAt` as best-effort).
4. Write the migrated file.

The migration is in-place and idempotent.

---

## 8. References

- [`install.schema.md`](install.schema.md) — per-project marker schema (the authoritative record).
- [`../../adapters/_contract.md`](../../adapters/_contract.md) — adapter contract §7.9 (global registry write).
- [`../skills/orchestration/multi-project-audit/SKILL.md`](../skills/orchestration/multi-project-audit/SKILL.md) — cross-project audit skill.
- [`../skills/orchestration/upgrade-all/SKILL.md`](../skills/orchestration/upgrade-all/SKILL.md) — batch upgrade skill.
- [`../scheduler/RUNNER.md`](../scheduler/RUNNER.md) — the runner reads the global registry when evaluating cross-project jobs.

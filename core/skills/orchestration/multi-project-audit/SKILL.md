# Multi-project audit

> Cross-project health check. Reads the global registry (`~/.ai-orchestra/projects.json`), visits each reachable project, runs the `ai-infra-audit` skill against its per-project marker, and produces a consolidated report showing version drift, stale installs, and unresolved findings across all orchestra-managed projects on this machine.

## Trigger

- "audit all projects"
- "multi-project audit"
- "cross-project health check"
- "orchestra status across projects"

## When to use

- When you manage multiple projects with ai-orchestra and want a single view of infrastructure health.
- After upgrading the orchestra core — to see which projects are behind.
- When onboarding a new machine and the global registry was migrated or restored.
- As a pre-upgrade check before running `upgrade-all`.

## When NOT to use

- For a single project — use `ai-infra-audit` directly.
- When the global registry does not exist (no projects installed yet).
- When running inside a sandboxed environment without access to `~/.ai-orchestra/`.

## Process

> **You are an AI agent.** Follow these steps exactly.

### 1. Read the global registry

1. Read `~/.ai-orchestra/projects.json`. If absent, report: "No global registry found — no projects are registered. Run `npx @neverreven/ai-orchestra init` in a project first." and stop.
2. Validate `schemaVersion`. If > 2, warn: "Registry schema is newer than this skill expects. Proceeding in read-only mode." Do not modify the registry.
3. Validate `machine.id` (per [`../../registry/global-registry.md`](../../registry/global-registry.md) §4.1). If mismatched, warn and switch to read-only.
4. Count total projects. If zero, report "Registry is empty" and stop.

### 2. Classify each project

For each entry in `projects[]`:

1. **Reachability.** Check whether `path` exists on disk. If not, mark as `unreachable` and skip to the next project. Do not remove the entry.
2. **Freshness.** Compute classification from `lastSeenAt` (Active / Idle / Stale / Dormant) per [`../../registry/global-registry.md`](../../registry/global-registry.md) §4.2.
3. **Marker validity.** Read `<path>/<markerPath>`. If missing or unparseable, mark as `marker-missing` and skip deeper checks.
4. **Version delta.** Compare the project's `orchestraVersion` against the current `ai-orchestra/VERSION`. Classify as `current`, `behind-minor`, `behind-major`, or `ahead` (the project has a newer version than the orchestra core — should not happen but handle gracefully).

### 3. Run per-project audit (reachable projects only)

For each reachable project with a valid marker:

1. Read the per-project marker.
2. Run the same checks as [`../../skills/audit/ai-infra-audit/SKILL.md`](../../skills/audit/ai-infra-audit/SKILL.md) §Process, but **collect findings into the cross-project report** rather than printing them inline.
3. Classify the project outcome: `clean` (no findings), `findings` (non-critical drift), or `failed` (critical errors or missing required files).

If this is a **scheduled** run (`mode: "scheduled"` passed by the runner), limit per-project audit to checks that can run without user input (no interactive fix proposals).

### 4. Update the global registry

For each audited project, update its entry:

- `lastAuditedAt` ← now.
- `lastAuditOutcome` ← outcome from step 3.
- `healthy` ← `true` if outcome is `clean`.
- `lastSeenAt` ← now.

Write the updated registry (stable serialisation per [`../../registry/global-registry.md`](../../registry/global-registry.md) §3.1).

### 5. Produce the consolidated report

Output a summary table:

```
## Multi-project audit — <n> projects, <date>

| Project | IDE | Version | Freshness | Outcome | Notes |
|---------|-----|---------|-----------|---------|-------|
| <name>  | cursor | 1.3.1 (current) | Active | Clean | — |
| <name>  | claude-code | 1.2.0 (behind) | Idle | 2 findings | Stale learnings, missing skill |
| <name>  | — | — | — | Unreachable | Path does not exist |
```

Below the table, list:

- **Action items** — projects with findings, grouped by severity.
- **Upgrade candidates** — projects with `behind-minor` or `behind-major` versions.
- **Stale/Dormant projects** — projects not seen in > 30 days, with a suggestion to prune if no longer active.

End with a one-line summary: "X of Y projects healthy. Z upgrades available."

## Output

- The summary table (always).
- Per-project finding details (when there are findings).
- A suggested next step: "Run `upgrade-all` to bring N projects to version X.Y.Z." (when upgrades are available).

## References

- [`../../registry/global-registry.md`](../../registry/global-registry.md) — global registry schema and semantics.
- [`../../registry/install.schema.md`](../../registry/install.schema.md) — per-project marker schema.
- [`../audit/ai-infra-audit/SKILL.md`](../audit/ai-infra-audit/SKILL.md) — single-project audit (reused per-project).
- [`upgrade-all` (sibling)](../orchestration/upgrade-all/SKILL.md) — batch upgrade skill.

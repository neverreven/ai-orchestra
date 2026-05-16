# Upgrade all projects

> Batch-upgrade every orchestra-managed project on this machine to the current orchestra version. Reads the global registry, identifies projects behind the current version, generates per-project upgrade plans, and applies them after user confirmation.

## Trigger

- "upgrade all projects"
- "upgrade all orchestra installs"
- "batch upgrade"
- "bring all projects up to date"

## When to use

- After updating the ai-orchestra core to a new version — to propagate changes to all installed projects.
- When `multi-project-audit` reports version drift across projects.
- When a new stack pack, skill, or Director rule improvement should reach all projects.

## When NOT to use

- To upgrade a single project — re-run `npx @neverreven/ai-orchestra init` in that project directly.
- When the global registry does not exist (no projects installed).
- In CI/CD pipelines without user confirmation capability (the skill requires interactive confirmation).

## Process

> **You are an AI agent.** Follow these steps exactly.

### 1. Read the global registry

1. Read `~/.ai-orchestra/projects.json`. If absent, report: "No global registry found." and stop.
2. Validate `schemaVersion` and `machine.id` per [`../../registry/global-registry.md`](../../registry/global-registry.md) §4.1.
3. If `machine.id` does not match, refuse to proceed: "Registry appears to have been copied from another machine. Upgrade-all modifies projects on disk — refusing to operate on a foreign registry." Stop.

### 2. Identify upgrade candidates

Read the current orchestra version from `ai-orchestra/VERSION`.

For each entry in `projects[]`:

1. Skip if `path` is unreachable (does not exist on disk).
2. Skip if `orchestraVersion` matches the current version (already up to date).
3. Otherwise, mark as an upgrade candidate. Record the version delta.

If no candidates, report: "All reachable projects are at version X.Y.Z. Nothing to upgrade." and stop.

### 3. Present the upgrade plan

Print a summary for user review:

```
## Upgrade plan — <n> projects → version X.Y.Z

| # | Project | Current | IDE | Stacks | Path |
|---|---------|---------|-----|--------|------|
| 1 | my-app  | 1.2.0   | cursor | js-ts | /path/to/my-app |
| 2 | backend | 1.3.0   | codex  | python-web | /path/to/backend |

The following changes will be applied to each project:
- Director rule re-rendered with new template.
- Scheduler section added to Director rule (new in X.Y.Z).
- Stack-pack rules refreshed (3 new depth rules per applicable pack).
- Install marker updated.
- Post-install checks re-run.
```

Ask for confirmation: "Proceed with upgrading all N projects? (y/n)"

If declined, stop. No changes are made.

### 4. Upgrade each project

For each candidate, in the order presented:

1. **Read the per-project marker.** Verify the marker is valid. If corrupt, skip with an error message.
2. **Determine the adapter.** Read `ide.id` from the marker. Load the corresponding adapter's `INSTALL.md`.
3. **Re-run Phase 7 (Apply) of the adapter.** The adapter re-renders all artifacts from the current orchestra templates using the project's existing install plan (roles, stacks, scope — these do NOT change during upgrade). Only the orchestra-managed content is re-rendered; user content outside managed sections is preserved.
4. **Update the marker.** Set `orchestra.version` to the new version. Append a `history[]` entry: `{ "at": "<now>", "action": "upgrade", "orchestraVersion": "<new>", "previousVersion": "<old>", "summary": "Batch upgrade via upgrade-all skill." }`.
5. **Run post-install checks.** Read the adapter's `post-install-checks.md` and execute all checks. Record pass/fail.
6. **Update the global registry entry.** Set `orchestraVersion`, `lastSeenAt`, `healthy` based on check results.

If a project's upgrade fails (post-install checks report critical errors):

- Mark `healthy: false` in the global registry.
- Continue to the next project (do not abort the batch).
- Include the failure in the final report.

### 5. Produce the upgrade report

```
## Upgrade report — <date>

| Project | Previous | New | Outcome |
|---------|----------|-----|---------|
| my-app  | 1.2.0    | 1.3.1 | Success |
| backend | 1.3.0    | 1.3.1 | Success |

All N projects upgraded successfully.
```

Or, if failures occurred:

```
N-1 of N projects upgraded successfully.
1 project failed — see details above.
```

## Output

- The upgrade plan (before confirmation).
- Per-project upgrade status (during execution).
- The final upgrade report (after completion).

## References

- [`../../registry/global-registry.md`](../../registry/global-registry.md) — global registry schema.
- [`../../registry/install.schema.md`](../../registry/install.schema.md) — per-project marker schema.
- [`../orchestration/multi-project-audit/SKILL.md`](../orchestration/multi-project-audit/SKILL.md) — cross-project audit (run before or after).
- [`../../../../adapters/_contract.md`](../../../../adapters/_contract.md) — adapter contract (Phase 7 re-execution).

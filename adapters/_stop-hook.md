# Stop-hook contract

> Defines the **stop-hook** that delivers the Director's session-end behaviour through an IDE-native event mechanism. Every adapter that supports stop-events implements this contract. Adapters that do not (yet) support stop-events ship without a hook and surface the gap in the post-install report.

The stop-hook complements the always-on Director Rule. The rule itself instructs the agent to update learnings *during* the session whenever a trigger fires; the stop-hook is the catch-all that runs once at session end and sweeps for anything missed.

---

## 1. What the stop-hook does

When a session ends, the IDE invokes the hook. The hook prompts the agent to:

1. Review the conversation just completed.
2. Decide whether any learning emerged that was not already captured.
3. If yes, apply the update to the learnings document per the Director Rule's **Update Mechanics** section.
4. If no, exit silently. *Empty is the common case and is fine.*

The hook never modifies the Director Rule, nor any rule, skill, or schema file the orchestra installed. Its only write target is the learnings document the rule names.

---

## 2. Inputs the hook receives

The hook executes inside the IDE's stop-event runtime. The set of inputs an adapter exposes varies by IDE; the contract defines the **minimum** every adapter must provide.

### Required inputs

| Input | Description | Required for |
|-------|-------------|--------------|
| `learnings_path` | Absolute or repo-relative path to the learnings document the Director Rule names. | Writing the update. |
| `project_context_path` | Path to the always-on project context document (`AGENTS.md`, etc.). | Cross-checking that a learning is not duplicated by an existing rule. |
| `install_marker_path` | Path to `.ai-orchestra/install.json`. | Locating the orchestra's install record. |

The adapter substitutes these from the install marker. If any required input is missing, the adapter must not register the hook — install-time validation catches this.

### Optional inputs

| Input | Description |
|-------|-------------|
| `conversation_summary` | Short text summary of the session (when the IDE provides one). |
| `files_touched` | List of files the session modified (when the IDE exposes this). |
| `exit_reason` | Why the session ended (user closed, timeout, error). |
| `session_id` | Stable id correlating the hook run with the conversation. |

Absence of optional inputs must not cause the hook to fail. The contract is "best-effort context" — the agent does the right thing with whatever it has.

---

## 3. Outputs the hook produces

The hook produces at most **one** of the following:

| Outcome | When | Side-effect |
|---------|------|-------------|
| `noop` | No new learning emerged. | None. |
| `learnings-update` | At least one learning was captured. | The agent writes the patch to `learnings_path` per the Director Rule. |
| `learnings-conflict` | The agent detected a contradiction with an existing entry that requires user input. | The agent writes a brief note to `learnings_path` under a `## Pending review` section and surfaces it via the [notifications contract](../core/notifications/CONTRACT.md). It does **not** silently overwrite. |
| `error` | The hook could not complete (file unreadable, learnings doc malformed). | The agent records the error in stderr / the IDE's hook log; no edits to the learnings doc. |

The hook **must not** spawn long-running follow-up work. It is a sweep, not a feature. If the agent identifies follow-up work during the sweep, it records a brief note in the conflict / next-session entry and exits.

---

## 4. Idempotency

Re-running the hook with the same inputs must produce a no-op the second time. The contract enforces this through:

- The agent reads the learnings file before writing; if a candidate entry is already present (matched by content or by an explicit id the agent assigns), no write happens.
- The hook records the last-run timestamp + session id in the install marker (under a hook-state field per the [install schema](../core/registry/install.schema.md)). A second invocation with the same session id is a no-op.

Adapters do not need to implement deduplication themselves — the agent's read-then-write pattern, combined with the install marker, gives idempotency for free.

---

## 5. Safety constraints

The hook MUST:

- Only ever write to the path declared as the learnings document.
- Treat the learnings doc as append-or-update; never wholesale overwrite.
- Refuse to run if the learnings doc fails its schema check (per the Director's `## Update Mechanics`).
- Honor the orchestra's "no telemetry" stance — the hook never sends data outside the local machine.
- Surface all errors through the IDE's normal hook-log channel, never silently swallow them.

The hook MUST NOT:

- Modify any orchestra-installed rule, skill, schema, scheduler, or notification artifact.
- Modify project source code, tests, dependencies, or configuration.
- Trigger another agent run automatically (some IDEs allow chained hooks; orchestra does not).
- Call out to network services.

---

## 6. Per-IDE mappings

Each adapter must declare in its `INSTALL.md` exactly how the contract maps to the IDE's hook mechanism. Reference mappings (filled in by adapter PRs):

| IDE | Hook mechanism | Suggested config location |
|-----|----------------|---------------------------|
| Cursor | `prompt`-type hook on `stop` event | `.cursor/hooks.json` |
| Claude Code | Session-end command in CLI runtime config | `.claude/settings.json` (or current canonical path) |
| Codex | Codex's session-end mechanism (when available) | TBD by adapter |
| VS Code (Copilot) | VS Code task / extension lifecycle hook | `.vscode/tasks.json` and accompanying instruction |

If an IDE has **no** session-end mechanism, the adapter:

1. Skips wiring the hook.
2. Records the gap in the install marker (`hooks.stop.installed = false` with a `reason`).
3. Surfaces a recommendation in the post-install report: "manually invoke 'update learnings' at session end."

This is acceptable in v1. The Director Rule still works; the discipline drops without the hook, but the orchestra remains functional.

---

## 7. Failure modes

| Failure | What the hook does |
|---------|---------------------|
| Learnings file missing | The hook recreates it from `learnings-template.md` (referenced in the install marker), then proceeds. Records the recreation in the conflict-archive output. |
| Learnings file malformed (schema check fails) | The hook does not write. It surfaces the issue via the [notifications contract](../core/notifications/CONTRACT.md) and recommends running `ai-infra-audit`. |
| Conflict between candidate entry and existing entry | The hook writes the candidate to a `## Pending review` section and surfaces a notification. No silent overwrite. |
| Hook itself crashes | The IDE logs the failure; the orchestra's audit detects the crash on next run via the install marker's `hooks.stop.last_run` timestamp lagging the most recent session. |

---

## 8. Versioning

This contract has a version (currently `1.0`). The adapter records the contract version it implements in the install marker (`hooks.stop.contract_version`). Future contract versions add fields backward-compatibly; breaking changes require a major version bump and a migration path described in the changelog.

---

## 9. Conformance test (run by the audit skill)

The `ai-infra-audit` skill verifies hook conformance by checking:

- Hook is registered at the expected IDE-specific location (per adapter mapping).
- The marker's `hooks.stop` entry exists and references this contract version.
- The marker's `hooks.stop.last_run` is within a reasonable window of recent commits (warning if stale > 30 days; not failure).
- The hook's configured `learnings_path` resolves to a file that exists and is well-formed.

Failures are categorised per [`core/_lint.md`](../core/_lint.md): structural breakage = critical; staleness = warning.

---

## 10. References

- [`_contract.md`](_contract.md) — overall adapter contract that this stop-hook contract sits inside.
- [`../core/director/RULE.md`](../core/director/RULE.md) — Director Rule whose session-end behaviour the hook delivers.
- [`../core/director/learnings-template.md`](../core/director/learnings-template.md) — the document the hook updates.
- [`../core/notifications/CONTRACT.md`](../core/notifications/CONTRACT.md) — channel for hook-emitted notifications.
- [`../core/registry/install.schema.md`](../core/registry/install.schema.md) — install marker that records hook state.
- [`../core/skills/audit/ai-infra-audit/SKILL.md`](../core/skills/audit/ai-infra-audit/SKILL.md) — audit that validates conformance.

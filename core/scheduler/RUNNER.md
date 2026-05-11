# Scheduler — Runner Procedure

> **You are an AI agent.** You arrived here because the Director rule instructed you to check the scheduler at session start, or because the stop-hook triggered a scheduled-jobs evaluation. Read this file top-to-bottom and follow it exactly.
>
> The scheduler runner is **declarative and non-destructive**. It reads job descriptors from the install marker, evaluates whether any jobs are due, and either runs them or records why it skipped them. It never deletes or modifies job descriptors.

This file activates in v2. In v1, job descriptors are recorded in the install marker but not auto-invoked — the agent runs them on demand only. This file is shipped in v1 so projects can declare jobs forward-compatibly and the runner becomes active the moment the orchestra is upgraded to v2.

---

## 0. Prerequisites

Before evaluating any job, verify:

1. **Install marker exists.** Read `.ai-orchestra/install.json`. If absent, stop and report — the runner cannot operate without the marker.
2. **`scheduler.jobs[]` field is present.** If the field is absent or empty, exit cleanly with an `info`-level note: "No scheduled jobs declared."
3. **Current time is known.** The runner needs the current local timestamp. Derive it from the system clock (ISO 8601, with timezone offset). If the timezone cannot be determined, use UTC and record a `warning` in the run log.

---

## 1. Evaluate each job

For each entry in `marker.scheduler.jobs[]`:

### 1.1 Skip conditions (in order; stop at the first match)

| Condition | Action | Log level |
|-----------|--------|-----------|
| `enabled: false` | Skip. | `info` |
| `schedule.kind === "manual"` | Skip (manual jobs only run on explicit user invocation). | `info` |
| `runs.kind === "script"` and script runs are not explicitly user-enabled | Skip. Block with a note: "Script jobs are disabled by default. To enable, set `runs.allowScript: true` in the job descriptor." | `warning` |

### 1.2 Determine if the job is due

1. Read `job.lastRun` from the marker. If `null` or absent, treat as **never run** — the job is due.
2. Parse the schedule:
   - `kind: "cron"` — evaluate the cron expression against the current time. The job is due if the current time is at or past the first occurrence after `lastRun` (or the first occurrence ever if never run).
   - `kind: "interval"` — the job is due if `(now - lastRun) >= every_seconds - jitter_seconds`.
3. If not due, skip. Log at `info`: "Job `<id>` next run: `<next_scheduled_time_ISO>`."

### 1.3 Apply missed-run policy

If the job was last run more than one scheduled period ago (missed runs detected):

| Policy | Behaviour |
|--------|-----------|
| `catchup-once` | Mark as due for one run now. Do not re-run for each missed slot. |
| `skip` | Skip all missed runs. Mark as due only from the next scheduled time onward. |
| `catchup-all` | Run once per missed slot, sequentially. Log count before starting: "Running `<n>` missed runs for job `<id>`." Cap at 10 to prevent runaway loops; surface a `warning` if the cap is hit. |

### 1.4 Concurrency check

If `concurrency: "single-run"` and the job's `status` in the marker is `running` (a previous run did not clean up its status flag):

- Do not start a new run.
- Log at `warning`: "Job `<id>` is marked as still running from `<lastRun>`. If the previous run is truly complete, update `status` to `idle` in the marker and re-run."

---

## 2. Execute a due job

For each job that passed §1 evaluation:

### 2.1 Set status

Before executing, update the job's status in the marker: `status: "running"`, `runStartedAt: <now ISO>`.

### 2.2 Dispatch by run kind

| `runs.kind` | What to do |
|-------------|------------|
| `skill` | Read the skill file at `ai-orchestra/core/skills/<category>/<skill_id>/SKILL.md`. Follow the skill's `## Process` section exactly. Pass `mode: "scheduled"` as context so the skill knows it was triggered automatically rather than by the user. |
| `hook` | Invoke the adapter-registered hook identified by `hook_id`. If the hook is not found, record a `gap` in the run log and mark the job `failed`. |
| `script` | Execute the script at `runs.path` from the project root. Only if `runs.allowScript: true` (user explicitly enabled). Capture stdout/stderr and include in the run log. |

### 2.3 Emit lifecycle events

Per [`CONTRACT.md`](CONTRACT.md) §8:

- Emit `job.started` before dispatch.
- Emit `job.succeeded` or `job.completed_with_findings` or `job.failed` based on outcome.
- Route events via `job.notifications` field; if absent, default to in-session output only.

### 2.4 Update the marker on completion

Whether the job succeeded or failed:

1. Set `status: "idle"`.
2. Set `lastRun: <now ISO>`.
3. Append an entry to `job.history[]` (last 10 entries; trim oldest beyond 10): `{ "runAt": ISO, "outcome": "succeeded"|"failed"|"findings", "summary": "<one line>" }`.
4. Write the updated marker to `.ai-orchestra/install.json`.

---

## 3. After all jobs are evaluated

Print a compact summary to the user:

```
Scheduler check — <n> jobs evaluated.
  Ran:     <list of ids that executed>
  Skipped: <list with reason>
  Failed:  <list with error>
```

If all jobs were skipped, print only: "Scheduler check — all jobs up to date."

If no jobs exist, print: "Scheduler check — no jobs declared."

The summary is `info`-level. Do not interrupt the user's main task for routine skips — only surface `warning` or `error` outcomes explicitly.

---

## 4. When the runner is triggered

The runner is invoked from two entry points:

| Entry point | When | How |
|-------------|------|-----|
| **Director rule — session start** | Every session, after loading learnings and project context. | Director rule §Scheduler section: "After loading learnings, evaluate `core/scheduler/RUNNER.md`." |
| **Stop-hook** | Every session end (when the stop-hook fires). | Stop-hook calls RUNNER.md before the learnings review, so any overdue maintenance jobs run while context is fresh. |

The runner is **fast by design**: jobs that are not due cost one timestamp comparison each. A project with 5 jobs and no due runs completes the check in under 1 second of agent reasoning time.

---

## 5. Security constraints

These mirror [`CONTRACT.md`](CONTRACT.md) §5:

- Jobs run in the user's security context — no privilege escalation.
- No network access unless the skill explicitly declares it.
- Working directory is always the project root.
- The runner never touches files outside the project root except `.ai-orchestra/projects.json` (global registry append only).

---

## 6. v1 compatibility mode

When the install marker was written by an orchestra version < 2.0 (check `marker.orchestraVersion`):

- The `scheduler.jobs[]` field may be absent. Exit cleanly per §0.
- The `job.lastRun` field may be absent on individual jobs. Treat as never-run per §1.2.
- Do not fail on missing fields; the runner is additive. Log a `info`: "Marker is pre-v2; scheduler fields will be populated on first run."

---

## 7. References

- [`CONTRACT.md`](CONTRACT.md) — job descriptor schema, schedule formats, missed-run policy, concurrency, lifecycle events.
- [`jobs/periodic-audit.job.json`](jobs/periodic-audit.job.json) — default shipped job descriptor.
- [`../director/RULE.md`](../director/RULE.md) — the always-on rule that triggers this runner at session start.
- [`../../adapters/_stop-hook.md`](../../adapters/_stop-hook.md) — stop-hook contract; also triggers this runner.
- [`../registry/install.schema.md`](../registry/install.schema.md) — install marker schema (`scheduler.jobs[]` field).
- [`../skills/audit/ai-infra-audit/SKILL.md`](../skills/audit/ai-infra-audit/SKILL.md) — the skill most commonly invoked by scheduled jobs.

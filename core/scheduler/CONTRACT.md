# Scheduler — Contract

> Defines how scheduled jobs are **declared** by the orchestra. The contract specifies the descriptor format, runtime expectations, isolation, missed-run policy, and observability hooks. The runner that executes scheduled jobs ships in **v2**; v1 ships only the contract so that v1 components (rules, skills, audits) can declare jobs forward-compatibly.

In v1, declared jobs are recorded in the install marker but not invoked automatically. The audit skill ([`../skills/audit/ai-infra-audit/SKILL.md`](../skills/audit/ai-infra-audit/SKILL.md)) is the one job a user can run on demand; the scheduler will pick that and other jobs up in v2.

---

## 1. Purpose

Repeating maintenance work is foundational to a healthy installed orchestra:

- Re-run the audit weekly to catch drift.
- Consolidate the learnings document monthly.
- Re-validate MCP server permissions periodically.
- Re-run dependency-audit and surface CVE deltas weekly.

Without a scheduler, this work either does not happen or relies on each team member remembering. With one, the orchestra becomes self-sustaining at the installed level.

The scheduler does **not** replace project-level CI cron jobs (those are owned by the project's own pipeline). It is concerned only with orchestra-managed jobs that operate on orchestra-installed artifacts.

---

## 2. Job descriptor

A scheduled job is a JSON object with this shape (illustrative):

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | string | yes | Stable identifier. Lowercase kebab-case. Unique per installed orchestra. |
| `description` | string | yes | One-line human description of the job's purpose. |
| `schedule` | object | yes | See **3. Schedule formats**. |
| `runs` | object | yes | See **4. Run targets**. |
| `concurrency` | enum | yes | `single-run` (default) or `allow-overlap`. Most orchestra jobs are `single-run`. |
| `missed_run_policy` | enum | yes | `catchup-once`, `skip`, or `catchup-all`. Default `catchup-once`. |
| `notifications` | object | no | Routing for job lifecycle events; see [notifications contract](../notifications/CONTRACT.md). |
| `enabled` | bool | yes | Default `true`. Operators may disable individual jobs without removing them. |
| `metadata` | object | no | Free-form for adapter-specific extensions. Must be additive only. |

The orchestra's audit verifies every declared job conforms to this shape.

---

## 3. Schedule formats

A `schedule` object declares **one** of these forms:

| Form | Shape | Example |
|------|-------|---------|
| Cron | `{ "kind": "cron", "expr": "<5-field expr>", "tz": "<IANA tz>" }` | `{ "kind": "cron", "expr": "0 9 * * 1", "tz": "Europe/Brussels" }` (every Monday 09:00 local). |
| Interval | `{ "kind": "interval", "every_seconds": <int>, "jitter_seconds": <int> }` | `{ "kind": "interval", "every_seconds": 86400, "jitter_seconds": 600 }` (every 24h ± 10 min). |
| Calendar | `{ "kind": "calendar", "rules": [...] }` | RFC 5545 RRULE-style human-readable calendar entries. (Optional in v1; v2 may require a fuller spec.) |
| Manual | `{ "kind": "manual" }` | Job is declared but only runs when the user explicitly invokes it. Used for the `ai-infra-audit` opt-in default. |

The runner (v2) is required to support `cron`, `interval`, and `manual` at minimum. `calendar` is best-effort.

Time-zone resolution rule: if `tz` is omitted, the runner uses the project's recorded local time-zone (from the install marker). If that is unrecorded, UTC is assumed and a warning is logged.

---

## 4. Run targets

A `runs` object declares **what** to execute:

| Kind | Shape | Notes |
|------|-------|-------|
| Skill | `{ "kind": "skill", "skill_id": "<category/skill>" }` | Invokes an orchestra skill in audit / report mode. The skill must be installed in the project. |
| Hook | `{ "kind": "hook", "hook_id": "<adapter-defined>" }` | Invokes an adapter-registered hook (e.g., a stop-hook fired manually). |
| Script | `{ "kind": "script", "path": "<repo-relative>" }` | Runs a script at the given path. **Disabled in v1** — surfaced in the audit if any job declares this kind, blocked at runtime in v2 unless explicitly enabled by the user. |

`skill` is the default and the only form recommended for v1 declarations. The runner enforces sandboxing per **5. Isolation**.

---

## 5. Isolation

The scheduler runner (v2) executes each job under these constraints:

- The job runs in the same security context as the user, with no elevation.
- The job's working directory is the project root.
- The job's environment is a minimal, opt-in subset of the user's environment (the orchestra explicitly avoids leaking ambient env vars into job runs).
- The job has no network access by default. Skills that genuinely need network access declare it in their `SKILL.md` `## Output` section; the runner gates accordingly.
- The job operates on the orchestra-installed artifacts and the project's repo only. It must not touch sibling projects or files outside the repository.

These constraints apply to v2's runner. In v1, the contract records them so adapter implementations and skill authors can plan accordingly.

---

## 6. Missed-run policy

When the runner detects that a job's scheduled time was missed (machine asleep, runner not active, IDE closed):

| Policy | Behaviour |
|--------|-----------|
| `catchup-once` | Run the job once at next opportunity, regardless of how many runs were missed. Default for most orchestra jobs. |
| `skip` | Skip all missed runs; resume on the next scheduled time. |
| `catchup-all` | Run once per missed slot. Reserved for jobs where each occurrence is meaningful (rare; orchestra has none in v1). |

Audit-style jobs (e.g., periodic re-audit) should use `catchup-once`. Maintenance jobs (e.g., monthly consolidation) should use `catchup-once`. There is no orchestra job in v1 that should use `catchup-all`.

---

## 7. Concurrency

`concurrency: single-run` is the default and means: if a previous run is still active when the next scheduled time arrives, the new run is skipped (with a notification). `allow-overlap` is reserved for read-only inspection jobs that can safely run concurrently — it is not used by any v1 orchestra job.

---

## 8. Lifecycle events

Every job emits the following lifecycle events through the [notifications contract](../notifications/CONTRACT.md), unless the job's `notifications.suppress` is set for the corresponding event:

| Event | When | Default severity |
|-------|------|------------------|
| `job.scheduled` | Job descriptor registered or updated. | `info` |
| `job.started` | Run begins. | `info` (typically suppressed) |
| `job.succeeded` | Run completed without findings. | `info` (typically suppressed) |
| `job.completed_with_findings` | Run completed and produced findings the user should see. | `warning` |
| `job.failed` | Run errored. | `error` |
| `job.skipped` | Run was skipped due to concurrency policy. | `info` |

Channels and routing are declared per the notifications contract.

---

## 9. Where descriptors live

In v1, scheduled job descriptors live in two places:

- **Core defaults** — the orchestra ships a small set of recommended job descriptors as part of role / skill content. Any skill that benefits from periodic re-runs may declare its default descriptor inside its `SKILL.md` (in a section ignored by the linter when the section name is `## Schedule`). The audit aggregates these.
- **Project install** — the adapter, at install time, may include selected jobs in the install marker under `scheduler.jobs[]`. The user can edit / disable jobs in the marker.

Adapters that target IDEs without a usable scheduler still record descriptors in the marker; the v2 runner can read them once available, regardless of which adapter installed.

---

## 10. v1 versus v2 responsibilities

| Concern | v1 | v2 |
|---------|----|----|
| Descriptor schema | **Defined here.** | Stable; additive evolution only. |
| Descriptor recording in install marker | Implemented per-adapter. | Unchanged. |
| On-demand invocation of declared skills | Already possible via the skill system. | Unchanged. |
| Automatic execution at scheduled times | **Not implemented.** | Implemented by the runner. |
| Missed-run policy enforcement | Recorded only. | Enforced. |
| Concurrency enforcement | Recorded only. | Enforced. |
| Notification emission | Hook contract defined. | Implemented. |

v1 audits flag any descriptor whose schedule is declared but whose runner is unavailable, with a note that v2 will pick it up.

---

## 11. Versioning

This contract has a version (currently `1.0`). The marker records the contract version installed jobs were declared against. Forward-compat: v1 descriptors are valid input to the v2 runner; the runner upgrades them in-place if necessary.

---

## 12. References

- [`../director/_overview.md`](../director/_overview.md) — Director system; one of the primary sources of declared scheduled work.
- [`../skills/audit/ai-infra-audit/SKILL.md`](../skills/audit/ai-infra-audit/SKILL.md) — the audit skill, which validates job conformance.
- [`../notifications/CONTRACT.md`](../notifications/CONTRACT.md) — emits the scheduler's lifecycle events.
- [`../registry/install.schema.md`](../registry/install.schema.md) — install marker that records job descriptors.
- [`../../adapters/_contract.md`](../../adapters/_contract.md) — adapter contract; adapters write `scheduler.jobs[]` here.
- [`../_lint.md`](../_lint.md) — linter that validates job descriptors at audit time.

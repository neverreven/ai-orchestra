# Notifications — Contract

> Defines how the orchestra **emits** notifications and how channels **route** them. The contract specifies the event taxonomy, severity levels, payload schema, channel abstraction, deduplication policy, and acknowledgement model. The router that delivers notifications to specific destinations ships in **v2**; v1 ships only the contract so that v1 components (the audit skill, the stop-hook, the scheduler) can declare what they will emit.

In v1, declared notifications are surfaced through whatever the IDE's native notification or report channel is (per adapter). The router that supports richer routing (toast vs. notification panel vs. Slack vs. email) arrives in v2.

---

## 1. Purpose

Useful notifications are the difference between an installed orchestra that quietly goes stale and one the team actually trusts. Without notifications, audit findings remain unread, scheduler jobs run silently, and the Director's session-end conflicts pile up.

The contract treats notifications as a **first-class, structured, project-local** signal — never bypassing the user, never sending to external services without explicit opt-in.

---

## 2. Non-goals

- **Not** a logging system. Routine logs go to the IDE's normal log channel.
- **Not** a metrics system. Metrics belong to the project's own observability stack.
- **Not** a chat / communication tool. The contract supports human-readable messages, not threaded conversations.
- **Not** a monitoring back-end. The orchestra emits; external systems may consume — that is the integrator's choice, not the orchestra's responsibility.

---

## 3. Event taxonomy

Every notification belongs to a known event id. The id is hierarchical, dotted-lowercase. The v1 event registry:

| Event id | Emitted by | Default severity |
|----------|------------|------------------|
| `install.started` | Adapter (Phase 6 of [`RUN.md`](../../RUN.md)). | `info` |
| `install.completed` | Adapter. | `info` |
| `install.failed` | Adapter. | `error` |
| `install.partial` | Adapter (some skills/roles failed validation; install proceeded). | `warning` |
| `audit.completed` | `ai-infra-audit` skill. | `info` if clean; `warning` if drift; `error` if critical drift. |
| `audit.drift.critical` | `ai-infra-audit` skill. | `error` |
| `audit.drift.warning` | `ai-infra-audit` skill. | `warning` |
| `learnings.conflict` | Stop-hook ([`../../adapters/_stop-hook.md`](../../adapters/_stop-hook.md)). | `warning` |
| `learnings.budget.exceeded` | `ai-infra-audit` skill. | `warning` |
| `mcp.permission.widened` | `mcp-server-audit` skill. | `error` |
| `mcp.server.added.outside.orchestra` | `mcp-server-audit` skill. | `info` |
| `scheduler.job.completed_with_findings` | Scheduler (v2 runner). | `warning` |
| `scheduler.job.failed` | Scheduler (v2 runner). | `error` |
| `scheduler.job.skipped` | Scheduler (v2 runner). | `info` |

New event ids may be added in subsequent PRs (additive evolution); existing ids are immutable. Renames are deprecate-plus-new-id, never silent.

---

## 4. Severity levels

| Severity | Meaning | Default channel behaviour |
|----------|---------|---------------------------|
| `info` | Informational; no action required. | Quiet by default; visible in the orchestra's report panel only when the user opens it. |
| `warning` | Action recommended but not urgent. | Surfaced via the IDE's native notification; non-blocking. |
| `error` | Action required. | Surfaced prominently; the orchestra's status indicator (per adapter) flips to "needs attention." |

Severity is a property of the **event instance**, not of the event id alone — the same id may carry different severities on different runs (e.g., `audit.completed` is `info` if clean, `warning` otherwise).

---

## 5. Payload schema

Every notification payload is a JSON object with this shape:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `event_id` | string | yes | Dotted hierarchy from the event registry. |
| `severity` | enum | yes | `info` / `warning` / `error`. |
| `title` | string | yes | One-line human summary. ≤ 80 chars. |
| `body` | string | yes | Multi-line detail. Markdown allowed but kept short — long content links to a file. |
| `source` | object | yes | `{ kind: "skill" | "hook" | "adapter" | "scheduler", id: string }`. |
| `timestamp` | string | yes | ISO-8601 with timezone. |
| `dedup_key` | string | no | If provided, repeat emissions with the same key collapse per the dedup policy below. |
| `actions` | array | no | List of `{ id, label, kind }` describing user-actionable follow-ups (e.g., `re-run-audit`, `open-learnings`). |
| `metadata` | object | no | Free-form for adapter-specific extensions. Must be additive only. |

Channels render the payload using whatever fields they support. A minimal channel (e.g., a CLI line) renders `severity + title`. A richer channel (e.g., an IDE notification panel) renders the full payload with action buttons.

---

## 6. Channel abstraction

A channel is anything that consumes a notification payload and surfaces it somewhere. The contract defines the **interface**; adapters implement specific channels.

A channel declares:

- `id` — stable kebab-case id (e.g., `cursor-toast`, `claude-statusline`, `ide-report-panel`).
- `severities` — which severities it accepts (default: all).
- `events` — optional event filter (default: all).
- `enabled` — operator-controllable on/off.

In v1, the **only** required channel is the `default-ide-channel`, which an adapter binds to the IDE's native notification surface. Additional channels (Slack, email, file-based logging) are post-v1 work, but the contract supports them today so v1 declarations remain forward-compatible.

The router (v2) is responsible for routing each payload to channels whose filter matches.

---

## 7. Deduplication

Repeated emissions with the same `dedup_key` collapse per these rules:

- The first emission within a deduplication window (default: 24h, configurable per channel) produces a notification.
- Subsequent emissions update the existing notification's count and `last_seen` timestamp without producing a new one.
- After the deduplication window expires, the next emission produces a fresh notification.

Components emitting periodically (e.g., the audit's `audit.drift.warning`) should always include a `dedup_key` (e.g., `audit-drift-${rule_id}-${target_path}`). Components emitting one-off (e.g., `install.failed`) may omit it.

When `dedup_key` is omitted, every emission produces a separate notification.

---

## 8. Acknowledgement

Notifications support a lightweight acknowledgement model:

- `info` — implicit ack on render.
- `warning` — explicit ack via a user action (e.g., dismiss). Until acked, the orchestra's status indicator reflects the pending warning.
- `error` — explicit ack required, plus a follow-up action (re-run audit, fix file, etc.). The status indicator stays in "needs attention" until ack + action.

The acknowledgement state lives in the install marker (`notifications.state[]`) so it survives IDE restarts.

---

## 9. Privacy and outbound rules

The notifications system **never** sends data outside the local machine in v1. There is no built-in connector to Slack, email, webhooks, or any external service. Any such integration is a v2 channel that the user opts into explicitly.

Even within local channels, the contract requires:

- No source code excerpts in `body` beyond what the user can already see in the IDE.
- No secrets or tokens, ever (the [`secrets-scan`](../skills/quality/secrets-scan/SKILL.md) skill applies to notification bodies as well).
- No PII (e.g., the user's email) — the orchestra has none of this anyway, but the contract is explicit.

---

## 10. v1 versus v2 responsibilities

| Concern | v1 | v2 |
|---------|----|----|
| Event registry | **Defined here.** | Additive evolution. |
| Payload schema | **Defined here.** | Additive evolution. |
| Severity model | **Defined here.** | Stable. |
| Default IDE channel | Implemented per adapter. | Unchanged. |
| Multi-channel routing | Contract supports it; routing absent. | Implemented by the router. |
| Deduplication enforcement | Contract supports it; enforcement absent. | Enforced. |
| External-service channels | **Forbidden.** | Opt-in, gated. |

v1 audits flag any payload that violates the schema (missing required fields, unknown event id) and surface it as a critical finding.

---

## 11. Conformance check (run by the audit skill)

The `ai-infra-audit` skill verifies notifications conformance by sampling recent emissions recorded in the install marker (`notifications.state[]`):

- Every payload validates against the schema.
- Every `event_id` is in the registry (or in a recognised future-version superset).
- Severities are consistent with the event id's documented severity range.
- Dedup keys, when present, are stable strings (not random per emission).

Failures classify per [`../_lint.md`](../_lint.md): schema violation = critical; unknown id = warning; severity drift = warning.

---

## 12. Versioning

This contract has a version (currently `1.0`). The marker records the contract version each emitter declares against, so v2 routing can adapt to legacy emitters during migration. Breaking changes require a major version bump and a migration path described in the changelog.

---

## 13. References

- [`../director/_overview.md`](../director/_overview.md) — Director system; primary source of `learnings.*` events.
- [`../scheduler/CONTRACT.md`](../scheduler/CONTRACT.md) — scheduler; primary source of `scheduler.job.*` events.
- [`../skills/audit/ai-infra-audit/SKILL.md`](../skills/audit/ai-infra-audit/SKILL.md) — audit; primary source of `audit.*` events and validator of conformance.
- [`../skills/platform/mcp-server-audit/SKILL.md`](../skills/platform/mcp-server-audit/SKILL.md) — MCP audit; emits `mcp.*` events.
- [`../../adapters/_stop-hook.md`](../../adapters/_stop-hook.md) — stop-hook; emits `learnings.conflict` events.
- [`../registry/install.schema.md`](../registry/install.schema.md) — install marker stores notification state.
- [`../_lint.md`](../_lint.md) — linter that validates payload conformance.

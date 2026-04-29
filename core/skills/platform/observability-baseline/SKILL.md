# Observability baseline

> Establish or audit a minimum viable observability footprint — logs, metrics, traces, and alerts — appropriate for the project's stage. The skill biases toward "enough to debug an incident at 3am," not toward a full SRE platform.

## Trigger

- "observability baseline"
- "are we logging enough?"
- "what alerts do we need?"
- "we have no metrics, where do we start?"
- "tracing setup"

## When to use

- New service or app preparing for production.
- Existing project where the team realises an incident took too long to diagnose.
- Periodic — observability drifts as code changes.
- After moving runtime environments (cloud provider change, k8s adoption).

## When NOT to use

- Application-feature debugging (use [code-review](../../code/code-review/SKILL.md) or runtime debugging).
- Big platform-engineering investments beyond a baseline (out of scope; recommend [write-technical-spec](../../docs/write-technical-spec/SKILL.md)).

## Process

1. **Establish the runtime context** — language, framework, deployment target. The right defaults vary widely, but the categories below are universal.
2. **Logs** — structured, levelled, correlation-id-aware on requests / jobs. Avoid logging sensitive data; cross-reference with [secrets-scan](../../quality/secrets-scan/SKILL.md).
3. **Metrics** — at minimum: request rate / error rate / duration (RED) for services; resource utilisation; business-domain metrics that the team actually looks at.
4. **Traces** — at minimum: distributed-trace propagation across service boundaries, sampling configured, expensive paths instrumented.
5. **Alerts** — page on user-impacting symptoms, not internal causes. Alerts have runbooks; runbooks live next to the alert.
6. **Dashboards** — the team can answer "is the system healthy" without writing a query. Cross-reference [dashboard-spec](../../analytics/dashboard-spec/SKILL.md) for the analytics-side equivalent.
7. **Retention + cost** — log/metric/trace retention is a known number; cost of the baseline is understood.
8. **Findings + gaps** — categorised `must-fix` (no error metrics, no alerts on user-impacting signals), `should-fix` (no traces, alert noise), `nit`.

## Output

An observability baseline report with:
- What exists (logs / metrics / traces / alerts inventory).
- What is missing relative to baseline.
- Concrete recommendations (specific metric names to add, alert rules to write, runbook stubs).
- Cost estimate of recommended additions.

## References

- [_schema.md](../../_schema.md)
- [deployment-checklist/SKILL.md](../deployment-checklist/SKILL.md)
- [../../analytics/dashboard-spec/SKILL.md](../../analytics/dashboard-spec/SKILL.md)
- [../../quality/secrets-scan/SKILL.md](../../quality/secrets-scan/SKILL.md)
- [../../../roles/devops-sre.md](../../../roles/devops-sre.md)
- [../../../roles/backend-engineer.md](../../../roles/backend-engineer.md)

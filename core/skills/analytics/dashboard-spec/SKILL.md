# Dashboard spec

> Specify a dashboard before building it — what question it answers, who uses it, which events power it, what numbers signal healthy vs unhealthy.

## Trigger

- "spec a dashboard"
- "what should this dashboard show?"
- "design the metric view"
- "what's our north star?"
- "release readiness dashboard"

## When to use

- A new dashboard is being commissioned.
- An existing dashboard is being retired and the team wants a deliberate replacement.
- A new feature needs a dashboard to observe its launch.
- A team conversation keeps gravitating toward "we should have a chart for that" — write the spec before clicking around in a BI tool.

## When NOT to use

- Designing the events themselves (use [event-taxonomy-design](../event-taxonomy-design/SKILL.md)).
- Replacing observability/operational alerts (use [observability-baseline](../../platform/observability-baseline/SKILL.md)).
- A one-off ad-hoc query (the overhead exceeds the value).

## Process

1. **Define the question** — one or two sentences. "Are users adopting feature X" / "is checkout funnel healthy" / "did the release improve performance".
2. **Identify the audience** — who reads this and what they will do with it. Different audiences need different chart types and granularities.
3. **List the metrics** — name, definition, source events, computation. Be precise: ambiguous metric definitions are the most common dashboard failure mode.
4. **Specify cuts and dimensions** — by platform, by cohort, by version, by feature flag.
5. **Set thresholds** — what numbers are healthy, watch, or unhealthy. Without thresholds, dashboards become wallpaper.
6. **Choose visualisation per metric** — line for trend, bar for comparison, funnel for conversion, distribution for latency. The right chart is rarely the obvious one.
7. **Define refresh + retention** — how often the dashboard updates, how far back it shows.
8. **Cross-link to taxonomy** — every metric maps back to events that exist in the taxonomy. If they do not exist yet, this drives a taxonomy update first.

## Output

A markdown dashboard spec with:
- Header: question, audience, owner, refresh, retention.
- Metrics table (name, definition, source, computation, threshold, visualisation).
- Cuts table (dimension, default value, available values).
- Open questions / deferred metrics.

## References

- [_schema.md](../../_schema.md)
- [event-taxonomy-design/SKILL.md](../event-taxonomy-design/SKILL.md)
- [analytics-implementation-audit/SKILL.md](../analytics-implementation-audit/SKILL.md)
- [../../platform/observability-baseline/SKILL.md](../../platform/observability-baseline/SKILL.md)
- [../../docs/write-prd/SKILL.md](../../docs/write-prd/SKILL.md)
- [../../../roles/analytics-engineer.md](../../../roles/analytics-engineer.md)
- [../../../roles/product-manager.md](../../../roles/product-manager.md)

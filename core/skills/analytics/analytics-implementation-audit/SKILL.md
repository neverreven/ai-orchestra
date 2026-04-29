# Analytics implementation audit

> Verify that the events the codebase actually emits match the taxonomy the team intends. Catch missing events, duplicated events, misnamed events, and silent firings.

## Trigger

- "audit the analytics"
- "are we tracking everything?"
- "do these events fire correctly?"
- "implementation vs taxonomy"
- "find duplicate events"

## When to use

- After a feature ships, to verify the planned events actually fire.
- During a periodic health check.
- After migrating analytics SDKs or destinations.
- When a dashboard looks suspicious and the team needs to validate the source data.

## When NOT to use

- Designing events from scratch (use [event-taxonomy-design](../event-taxonomy-design/SKILL.md)).
- Building a dashboard (use [dashboard-spec](../dashboard-spec/SKILL.md)).

## Process

1. **Identify the taxonomy** — the document or schema the implementation should match. If none exists, recommend creating one before this audit.
2. **Locate the SDK + helper** — where the `track` / `capture` / `event` calls happen. There is usually a thin wrapper module; if not, flag the absence.
3. **Find every emit site** — collect every call site in the codebase, with file + line + event name + properties.
4. **Cross-check against taxonomy** — events in the codebase but not the taxonomy (orphans), events in the taxonomy but not the codebase (gaps), events with property mismatches.
5. **Look for semantic duplicates** — different names for the same user action (e.g., `cv saved` and `resume save`). Surface for taxonomy correction.
6. **Look for over-firing** — events emitted in render-loops, in retry loops, in background polling. These distort metrics silently.
7. **Validate user-identification** — `identify` / `alias` / `setUser` calls happen at the right moment, do not leak PII, do not happen on every render.
8. **Findings** — categorised `must-fix` (orphan event corrupting taxonomy, over-firing, identity bug), `should-fix` (mismatched property), `nit`.

## Output

An implementation-audit report with:
- Inventory of emit sites cross-referenced with taxonomy.
- Orphans, gaps, duplicates listed separately.
- Risk assessment (high if metrics are visibly affected; medium if dashboards are skewed by hidden duplicates).
- Recommended fixes ordered by impact.

## References

- [_schema.md](../../_schema.md)
- [event-taxonomy-design/SKILL.md](../event-taxonomy-design/SKILL.md)
- [dashboard-spec/SKILL.md](../dashboard-spec/SKILL.md)
- [../../code/code-review/SKILL.md](../../code/code-review/SKILL.md)
- [../../../roles/analytics-engineer.md](../../../roles/analytics-engineer.md)
- [../../../roles/frontend-engineer.md](../../../roles/frontend-engineer.md)

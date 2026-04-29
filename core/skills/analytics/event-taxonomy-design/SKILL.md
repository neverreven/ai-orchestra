# Event taxonomy design

> Design the names, properties, and ownership of analytics events before they are wired up. The skill exists because events that are renamed later silently destroy historical comparability.

## Trigger

- "design the events"
- "event taxonomy"
- "what should we track?"
- "name these events"
- "set up our analytics naming"

## When to use

- A new feature is being built and its events need names that will survive 18 months of growth.
- A taxonomy exists but is inconsistent (mixed casing, mixed verb tenses, semantic duplicates).
- A new analytics destination is being added and the team wants a clean migration target.

## When NOT to use

- Picking the analytics SDK itself (use [decision-log](../../docs/decision-log/SKILL.md)).
- Building dashboards (use [dashboard-spec](../dashboard-spec/SKILL.md)).
- Auditing whether existing events fire correctly (use [analytics-implementation-audit](../analytics-implementation-audit/SKILL.md)).

## Process

1. **Identify the source of truth** — does the project already have a taxonomy doc, schema in code, or schema in an analytics tool? If multiple, flag the divergence.
2. **List in-scope events** — every interaction or system happening that should be tracked, expressed as `<noun> <verb>` (e.g., `cv created`, `cover_letter exported`).
3. **Settle on naming convention** — case (lowercase preferred), verb tense (past tense preferred), separator (space or underscore), singular vs plural for nouns. Whatever the project chooses, apply consistently.
4. **Define properties per event** — common properties (user id, session, platform, version) and event-specific properties. Each property has a name, type, and ownership.
5. **Identify identity model** — anonymous → identified transition, alias logic, server-side stitching. Misalignment here causes the worst data bugs.
6. **Specify versioning rules** — additive changes are free; renaming or removing properties requires a deprecation window.
7. **Specify governance** — who can add new events, where the taxonomy doc lives, how PRs propose new events.
8. **Validate** — cross-check against existing events in code, dashboards, and external destinations. Surface conflicts.

## Output

A markdown taxonomy document with:
- Conventions section (naming, casing, identity).
- Events table (name, definition, when it fires, ownership, properties).
- Property reference table (name, type, allowed values, owning event(s)).
- Governance section (process for changes).

## References

- [_schema.md](../../_schema.md)
- [analytics-implementation-audit/SKILL.md](../analytics-implementation-audit/SKILL.md)
- [dashboard-spec/SKILL.md](../dashboard-spec/SKILL.md)
- [../../docs/write-prd/SKILL.md](../../docs/write-prd/SKILL.md)
- [../../../roles/analytics-engineer.md](../../../roles/analytics-engineer.md)
- [../../../roles/product-manager.md](../../../roles/product-manager.md)

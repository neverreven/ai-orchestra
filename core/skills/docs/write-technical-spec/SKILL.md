# Write technical spec

> Author a design document for a non-trivial change — typically architectural, cross-cutting, or risky. Spec exists to make trade-offs explicit before code is written.

## Trigger

- "technical spec for X"
- "design doc for X"
- "architecture proposal"
- "RFC for X"
- "let's spec this before coding"

## When to use

- A change touches more than one subsystem.
- A change has multiple plausible approaches with real trade-offs.
- A change carries risk (data migration, rollback complexity, security surface, public API).
- A team needs alignment before committing time.

## When NOT to use

- A change with a single obvious approach (use [write-prd](../write-prd/SKILL.md) for product framing or [decision-log](../decision-log/SKILL.md) for the trade-off note).
- Implementation review of code that already exists (use [code-review](../../code/code-review/SKILL.md)).

## Process

1. **State the problem** — concise, written from the project's actual constraints, not generic.
2. **State the goals + non-goals** — what success looks like and what is explicitly not being attempted.
3. **Survey approaches** — list at least two plausible approaches and one straw-man that was rejected. Brevity beats exhaustiveness.
4. **Recommend an approach** — with reasoning that someone reading in six months can follow.
5. **Sketch the design** — components, data flow, contracts, key invariants. Diagrams are encouraged where they fit.
6. **List risks + mitigations** — performance, reliability, security, operability, migration cost.
7. **Plan the rollout** — phasing, feature flags, reversibility, observability hooks.
8. **List open questions** — explicit, named where possible.
9. **Connect to existing artifacts** — link any related PRDs, prior decisions, ADRs.

## Output

A markdown design document with the standard sections above. Length is whatever the trade-offs warrant — usually two to six pages. The spec is checked into the project's documentation folder per existing conventions; the skill will not invent a layout.

## References

- [_schema.md](../../_schema.md)
- [write-prd/SKILL.md](../write-prd/SKILL.md)
- [decision-log/SKILL.md](../decision-log/SKILL.md)
- [../../code/api-design-review/SKILL.md](../../code/api-design-review/SKILL.md)
- [../../../roles/tech-writer.md](../../../roles/tech-writer.md)
- [../../../roles/backend-engineer.md](../../../roles/backend-engineer.md)

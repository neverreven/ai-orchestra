# Write PRD

> Author a one-page Product Requirements Document for a feature change. Aimed at the threshold where a feature is too big to live only in commit messages but too small to need a full technical spec.

## Trigger

- "draft a PRD"
- "write the PRD"
- "what does this feature need?"
- "scope this out"
- "one-pager for this feature"

## When to use

- A feature is being planned that touches more than one role's surface (UI + backend, mobile + analytics).
- A change has explicit success criteria worth recording (a metric to move, a flow to enable).
- The team would benefit from a written agreement on what is in / out / deferred.
- Prior to starting implementation, not after.

## When NOT to use

- Tiny fixes, typos, version bumps — overhead is not justified.
- Architectural redesigns — these need [write-technical-spec](../write-technical-spec/SKILL.md).
- Internal refactors with no user-visible outcome — use [decision-log](../decision-log/SKILL.md).

## Process

1. **Establish context** — what problem is this solving, for whom, and why now? One short paragraph.
2. **Define the goal** — a single, measurable outcome. If you cannot make it measurable, mark it explicitly as `directional`.
3. **List in-scope behaviours** — what the user can do after this ships that they could not before. Bullet form, three to seven items.
4. **List out-of-scope** — things people might assume are included but are not. This is where most PRD value lives.
5. **Define acceptance criteria** — pass/fail conditions tied to the in-scope behaviours.
6. **Surface dependencies + risks** — other teams, external services, migrations, deprecations.
7. **Sketch the rollout** — flag, percentage rollout, full launch; what is reversible and what is not.
8. **Capture open questions** — explicit, with a name attached if possible.

## Output

A short markdown PRD using the included template ([template.md](template.md), if present in the skill's folder; otherwise the agent generates one). Length target: 1–2 pages. The PRD lives in the project's documentation folder according to existing conventions; the skill will not invent a folder.

## References

- [_schema.md](../../_schema.md)
- [decision-log/SKILL.md](../decision-log/SKILL.md)
- [write-technical-spec/SKILL.md](../write-technical-spec/SKILL.md)
- [../../analytics/dashboard-spec/SKILL.md](../../analytics/dashboard-spec/SKILL.md)
- [../../../roles/product-manager.md](../../../roles/product-manager.md)
- [../../../roles/tech-writer.md](../../../roles/tech-writer.md)

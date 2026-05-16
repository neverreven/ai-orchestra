# Write test plan

> Draft a test plan for a feature or area of the codebase — what to test, at what level, with what data, and what counts as enough.

## Trigger

- "test plan for X"
- "what should we test?"
- "is this enough coverage?"
- "design tests"
- "regression checklist"

## When to use

- A new feature is being implemented and the team wants up-front agreement on coverage.
- A bug class is recurring and a structured plan is needed to catch it early.
- A release is approaching and a regression checklist is needed.
- An area of the codebase is being refactored and the test surface needs to be deliberate.

## When NOT to use

- Unit-test authoring within a single PR (use [code-review](../../code/code-review/SKILL.md) with a coverage lens).
- Manual exploratory testing campaigns (a planning artifact for that is more open-ended than this skill targets).

## Process

1. **Identify the feature / area** — name it, link to the PRD or spec if one exists.
2. **List behaviours under test** — bullet each behaviour as a sentence the test will assert ("a logged-out user landing on /dashboard is redirected to /login").
3. **Choose the test level** for each — unit, integration, contract, E2E, visual, manual. Bias toward the lowest level that gives confidence.
4. **Determine fixtures + data** — what state is required, how it is set up and torn down, whether real services or fakes are used.
5. **List edge cases** — empty/null inputs, large inputs, concurrent calls, slow networks, denied permissions, intermittent failures.
6. **Specify pass criteria** — explicit assertions; avoid "looks correct."
7. **Specify the regression hooks** — which of these tests run on every commit, on every PR, on every release.
8. **Note gaps + deferred coverage** — be honest about what is not being tested and why.

## Output

A markdown test plan with:
- Header summarising the feature/area + scope.
- Table of behaviours × test level × pass criteria.
- Fixture/data section.
- Edge cases section.
- Regression hooks section.
- Open items / deferred coverage.

## References

- [_schema.md](../../_schema.md)
- [write-prd/SKILL.md](../write-prd/SKILL.md)
- [../../code/code-review/SKILL.md](../../code/code-review/SKILL.md)
- [../../../roles/qa-engineer.md](../../../roles/qa-engineer.md)
- [../../../roles/tech-writer.md](../../../roles/tech-writer.md)

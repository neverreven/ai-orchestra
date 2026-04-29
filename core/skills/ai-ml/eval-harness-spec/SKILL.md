# Eval harness spec

> Bootstrap an evaluation harness for projects that ship AI features without one. Aimed at the minimum viable harness — runnable, reproducible, and honest about its limits.

## Trigger

- "we have no evals, where do we start?"
- "set up the eval harness"
- "evaluate this feature reliably"
- "spec the eval system"
- "make AI changes safe to ship"

## When to use

- A project ships AI features and has no structured evaluation.
- An existing harness is bespoke and unreliable, and the team wants to reset.
- A new AI feature is being added and the team agrees up-front on how it will be measured.

## When NOT to use

- Designing a single eval against an existing harness (use [model-evaluation-spec](../model-evaluation-spec/SKILL.md)).
- Routine prompt review (use [prompt-quality-audit](../prompt-quality-audit/SKILL.md)).

## Process

1. **Identify scope of evaluation** — which features, which models, which prompts. The harness covers the scope, not the entire AI universe.
2. **Pick the storage substrate** — test-set fixtures live in the repo (`evals/`, `eval/`) or in a vendor (LangSmith, Braintrust, custom). Trade-offs declared.
3. **Design the runner** — CLI entry-point, deterministic seeds, parallelism, vendor SDK abstraction. The runner can be re-run and produce stable results.
4. **Design the metrics layer** — pluggable metric functions; a metric is a `(input, expected, output) → score` function; bias and limits documented per metric.
5. **Design the judge layer** — automated metrics first, model-as-judge second, human review only where unavoidable. Each judge declares its bias.
6. **Design the report** — markdown or HTML output with metric tables, distribution charts, and side-by-side diffs of failed cases.
7. **Wire to CI (with budget)** — full eval may be too slow; a fast subset runs on every PR, full runs on a schedule or on tag.
8. **Document the harness** — short README inside `evals/` covering how to add a test case, how to re-run, how to interpret results.
9. **Plan iteration** — the harness will be wrong at first; ensure adding test cases and metrics is cheap, so it improves with use.

## Output

A markdown spec for the harness with:
- Architecture sketch (runner / metrics / judge / report / storage).
- File / directory layout proposed.
- Initial metric set with rationale.
- CI integration plan + budget.
- Limits and biases declared.
- A first set of starter test cases (5–10 realistic ones).

## References

- [_schema.md](../../_schema.md)
- [model-evaluation-spec/SKILL.md](../model-evaluation-spec/SKILL.md)
- [prompt-quality-audit/SKILL.md](../prompt-quality-audit/SKILL.md)
- [../../docs/write-technical-spec/SKILL.md](../../docs/write-technical-spec/SKILL.md)
- [../../platform/ci-pipeline-audit/SKILL.md](../../platform/ci-pipeline-audit/SKILL.md)
- [../../../roles/ai-ml-engineer.md](../../../roles/ai-ml-engineer.md)
- [../../../roles/qa-engineer.md](../../../roles/qa-engineer.md)

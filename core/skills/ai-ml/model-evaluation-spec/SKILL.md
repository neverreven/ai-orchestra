# Model evaluation spec

> Design an evaluation for a model change before shipping it — what to measure, on which test set, with which threshold to pass. Without this, "the new model feels better" is the loudest signal in the room.

## Trigger

- "spec an eval"
- "evaluate this model change"
- "should we ship this prompt change?"
- "how do we test the new model?"
- "model A vs model B"

## When to use

- A model is being switched (vendor change, version bump, fine-tuned variant).
- A prompt is being changed in a way that may affect quality.
- A retrieval / RAG component is being tuned.
- A new AI feature is being added and needs an acceptance criterion.

## When NOT to use

- Building the harness from scratch (use [eval-harness-spec](../eval-harness-spec/SKILL.md)).
- Auditing prompt content alone (use [prompt-quality-audit](../prompt-quality-audit/SKILL.md)).
- Application-code review of the integration (use [code-review](../../code/code-review/SKILL.md)).

## Process

1. **State the change under evaluation** — what is being compared (current vs candidate), and on what user-visible task.
2. **Define the metrics** — accuracy / preference / pass-rate / latency / cost / refusal rate / safety pass-rate. Pick at most three primary metrics; the rest are observed but not gating.
3. **Select the test set** — drawn from real production traffic when possible, with PII removed; supplemented with adversarial cases the team has accumulated.
4. **Decide the judge** — automated metric, rule-based check, model-as-judge, human review, or a mix. Each has bias; declare it.
5. **Set thresholds** — primary metric must move by at least X to ship; safety metric must not regress at all.
6. **Decide cost + latency budgets** — a quality win that triples cost may not be a win.
7. **Specify reproducibility** — seed, decoding settings, exact prompts, exact inputs are recorded so a re-run gives the same numbers.
8. **Specify rollout** — flag percent, observation window, rollback trigger.

## Output

A markdown eval spec with:
- Change summary.
- Metrics + thresholds.
- Test set composition + sourcing.
- Judge methodology + caveats.
- Reproducibility section.
- Rollout + rollback plan.

## References

- [_schema.md](../../_schema.md)
- [eval-harness-spec/SKILL.md](../eval-harness-spec/SKILL.md)
- [prompt-quality-audit/SKILL.md](../prompt-quality-audit/SKILL.md)
- [../../audit/ai-infra-audit/SKILL.md](../../audit/ai-infra-audit/SKILL.md)
- [../../docs/write-technical-spec/SKILL.md](../../docs/write-technical-spec/SKILL.md)
- [../../../roles/ai-ml-engineer.md](../../../roles/ai-ml-engineer.md)
- [../../../roles/qa-engineer.md](../../../roles/qa-engineer.md)

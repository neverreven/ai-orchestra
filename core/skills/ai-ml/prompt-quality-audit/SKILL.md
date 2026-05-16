# Prompt quality audit

> Review a prompt or set of prompts for clarity, redundancy, brittleness, injection resistance, and version traceability. Aimed at the prompts the project actually ships, not exploratory ones.

## Trigger

- "audit this prompt"
- "review the system prompt"
- "is this prompt good?"
- "prompt regression"
- "prompt injection check"

## When to use

- A prompt is being introduced or changed in production code.
- An AI feature is misbehaving and the prompt is a candidate root cause.
- Periodic — prompts accumulate cruft as features evolve.
- Before shipping a new model, the prompts must be re-examined against the new model's idiosyncrasies.

## When NOT to use

- Designing an evaluation (use [model-evaluation-spec](../model-evaluation-spec/SKILL.md)).
- Bootstrapping an evaluation harness (use [eval-harness-spec](../eval-harness-spec/SKILL.md)).
- Application-code review of the prompt-using component (use [code-review](../../code/code-review/SKILL.md)).

## Process

1. **Locate the prompts** — files, templates, builders. Identify which are user-facing vs system-only.
2. **Clarity pass** — the prompt's instruction is unambiguous; no contradicting clauses; no instruction that the model is unlikely to follow.
3. **Redundancy pass** — repeated rules, overlapping constraints, leftover instructions for problems that no longer exist.
4. **Format contract** — the prompt declares the expected output format; downstream parsing is robust to format drift.
5. **Few-shot examples** — examples represent the real input distribution; do not encode answers the model can copy literally; demonstrate edge cases proportionally.
6. **Injection resistance** — user content is clearly delimited from system instructions; the prompt does not treat user content as authoritative for tool use, identity, or role escalation.
7. **Tool use prompts (if applicable)** — tool descriptions match tool implementations; argument schemas are explicit; safety floor is encoded.
8. **Version traceability** — prompts are checked into the repo, diffable, dated, attributable; runtime can log which prompt version produced an output.
9. **Findings** — categorised `must-fix` (injection vulnerability, contradicting instructions, drift from implementation), `should-fix` (clarity), `nit`.

## Output

A prompt audit report with:
- Inventory of prompts touched.
- Per-finding entry: prompt + section, severity, what to change, why.
- Recommended evaluation suite to lock in the changes (links into [model-evaluation-spec](../model-evaluation-spec/SKILL.md)).

## References

- [_schema.md](../../_schema.md)
- [model-evaluation-spec/SKILL.md](../model-evaluation-spec/SKILL.md)
- [eval-harness-spec/SKILL.md](../eval-harness-spec/SKILL.md)
- [../../audit/ai-infra-audit/SKILL.md](../../audit/ai-infra-audit/SKILL.md)
- [../../quality/security-baseline/SKILL.md](../../quality/security-baseline/SKILL.md)
- [../../../roles/ai-ml-engineer.md](../../../roles/ai-ml-engineer.md)
- [../../../roles/security-engineer.md](../../../roles/security-engineer.md)

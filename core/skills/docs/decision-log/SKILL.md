# Decision log

> Capture an architectural or product decision with its rationale, alternatives considered, and consequences. Lightweight ADR.

## Trigger

- "log this decision"
- "ADR for X"
- "record why we chose Y"
- "decision record"
- "I keep forgetting why we did this — capture it"

## When to use

- A non-obvious choice has been made and the team will benefit from being able to recover the reasoning later.
- A rejected alternative has been considered seriously enough to warrant a written explanation.
- A pattern or convention is being adopted project-wide.

## When NOT to use

- Routine implementation decisions covered by the team's existing conventions.
- Trade-offs that are best captured inline in code as a comment ("// using X here because Y").
- Decisions that genuinely have not been made yet — write a [write-technical-spec](../write-technical-spec/SKILL.md) instead.

## Process

1. **Title the decision** — short, in the form `Use X for Y`.
2. **State the context** — the problem the decision addresses, in one paragraph.
3. **State the decision** — one or two sentences. The exact choice made.
4. **List the alternatives considered** — a bullet for each, with one-line rationale for rejection.
5. **State the consequences** — what becomes easier, what becomes harder, what becomes locked in.
6. **State the status** — `proposed`, `accepted`, `superseded by ADR-N`, `deprecated`. Most decisions go straight to `accepted`.
7. **Date + author** — when, by whom (or which team).
8. **Cross-link** — to PRDs, technical specs, or earlier ADRs that this one supersedes or builds on.

## Output

A short markdown ADR — typically half a page to one page — placed in the project's existing decision-log directory (`docs/adr/`, `_documentation/decisions/`, `decisions/`, etc.). The skill respects existing numbering or filename schemes and will not invent a new one.

## References

- [_schema.md](../../_schema.md)
- [write-prd/SKILL.md](../write-prd/SKILL.md)
- [write-technical-spec/SKILL.md](../write-technical-spec/SKILL.md)
- [../../../roles/tech-writer.md](../../../roles/tech-writer.md)
- [../../../roles/product-manager.md](../../../roles/product-manager.md)

# Code review

> Patch-level review of a diff — focused on correctness, readability, and adherence to the project's existing patterns. Stack-agnostic at v1; stack packs (PR 6) layer in framework-specific guidance.

## Trigger

- "review this diff"
- "code review"
- "review my changes"
- "is this PR ready?"
- "look at this patch"

## When to use

- A coherent change set is ready for a second pair of eyes (a feature branch, a PR, a focused commit).
- Right before opening a PR — to catch the obvious before reviewers do.
- During a long branch — periodic review keeps the diff readable.

## When NOT to use

- Whole-codebase review or large architectural critique — out of scope for this skill; use [write-technical-spec](../../docs/write-technical-spec/SKILL.md) or [decision-log](../../docs/decision-log/SKILL.md).
- An empty or trivial diff (one-line typo, version bump).
- Review of someone else's intent without their context — ask first.

## Process

1. **Establish scope** — exact diff range or file list. The skill never expands beyond it without explicit consent.
2. **Read the change top to bottom once** — build a mental model before commenting.
3. **Correctness pass** — does the change do what its description claims? Look for off-by-one, null handling, error paths, race conditions, missing returns, leaked side-effects.
4. **Pattern fit** — does the change follow conventions visible elsewhere in the touched files? Naming, file structure, error handling, logging, state shape.
5. **Test coverage** — does the change ship with tests proportional to its risk? Note gaps without inflating scope.
6. **Readability** — names, comments, complexity. Flag dense code that could be split; flag comments that say what the code already says.
7. **Surface, do not rewrite** — the skill's output is review notes, not silent edits. The author owns the patch.
8. **Categorise findings** — `must-fix`, `should-fix`, `nit`. Be honest; not everything is must-fix.

## Output

A review report with:
- Summary line: pass / pass-with-changes / changes-required.
- Per-finding entry: file + line range, severity, what to change, why.
- Optional: proposed diff snippets for non-trivial changes (for the author to apply or decline).
- Coverage and risk assessment.

## References

- [_schema.md](../../_schema.md)
- [../../docs/write-test-plan/SKILL.md](../../docs/write-test-plan/SKILL.md)
- [../../audit/cleanup/SKILL.md](../../audit/cleanup/SKILL.md)
- [../../../roles/frontend-engineer.md](../../../roles/frontend-engineer.md)
- [../../../roles/backend-engineer.md](../../../roles/backend-engineer.md)
- [../../../roles/qa-engineer.md](../../../roles/qa-engineer.md)

# Cleanup

> A focused sweep for dead code, unused imports, orphan styles, leftover debug statements, and inconsistencies introduced during recent work. Cleanup is the smallest valuable audit: the agent never goes searching beyond what was recently changed.

## Trigger

- "clean up the mess"
- "tidy up"
- "refine the code"
- "remove leftovers"
- "post-feature cleanup"
- After completing a feature, before marking it done.

## When to use

- A feature or refactor was just landed and the working tree may carry residue.
- A PR is about to be opened and the diff should be free of obvious noise.
- A specific file or directory is suspected of accumulating dead references.

## When NOT to use

- The entire codebase audit ("find every unused export") — that is a separate, larger skill belonging to PR 6 stack packs.
- Critical bugfix in flight — fix the bug first; cleanup separately.
- Initial onboarding to an unfamiliar codebase — read first, do not delete.

## Process

1. **Identify scope** — the recently changed files (last commit, last branch diff, or explicit list). Do not expand beyond this.
2. **Imports + symbols** — remove unused imports, unreferenced variables, dead exports the diff introduced or no longer needs.
3. **Styles + assets** — find styles, classes, or asset references that were used by deleted code paths. Remove them only when there is no live reference anywhere in the project.
4. **Debug residue** — remove `console.log`, `print(`, `debugger`, `TODO: remove`, `FIXME: temp`, leftover `// eslint-disable-next-line` directives that no longer apply.
5. **Naming + structure consistency** — if the recent changes introduced a pattern (a hook, a builder, a module structure), check that the rest of the touched files follow it. Propose, do not silently rewrite, broader normalisation.
6. **Run lint + tests** — confirm the cleanup did not break either. If the lint surfaces additional unrelated warnings, list them but do not auto-fix.
7. **Summarise** — a short list of removals + reasons, plus any deferred items the agent flagged but did not act on.

## Output

A change set scoped strictly to the recently changed files, accompanied by a numbered summary describing each removal. The agent never silently rewrites areas outside the recent diff.

## References

- [_schema.md](../../_schema.md)
- [pre-release/SKILL.md](../pre-release/SKILL.md) — cleanup is the first stage of pre-release.
- [../../../roles/frontend-engineer.md](../../../roles/frontend-engineer.md)
- [../../../roles/backend-engineer.md](../../../roles/backend-engineer.md)
- [../../../roles/qa-engineer.md](../../../roles/qa-engineer.md)

## Model hint

- **Preferred:** `haiku`
- **Reason:** Cleanup is mechanical — identify and remove dead code, unused imports, debug residue in recently changed files. Haiku is fast and accurate for this pattern-matching work. Upgrade to `sonnet` only when the cleanup scope is unusually large (>20 files) or when the naming consistency step requires understanding broader project conventions.

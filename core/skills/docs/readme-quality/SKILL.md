# README quality

> Audit (and optionally improve) the project's main README and adjacent landing documents — orientation, install path, common tasks, troubleshooting. The goal is that a new contributor or new user can be productive within ten minutes.

## Trigger

- "audit the README"
- "improve the README"
- "is this README good?"
- "onboarding doc check"
- "make the install instructions clearer"

## When to use

- Before public release.
- After significant changes to install or build steps.
- When new contributors report friction during onboarding.
- Periodically — README drift is constant.

## When NOT to use

- Internal-only repos with established team practice and no external readers (low ROI; defer).
- Single-file scripts where the README is the script's docstring (out of scope).

## Process

1. **Read it as a stranger would** — the agent treats itself as a new arrival who knows nothing about the project's history.
2. **Orientation pass** — within the first screen, can the reader tell what the project is, who it is for, and what state it is in (alpha / beta / stable)?
3. **Install + run pass** — follow the install steps mentally (or actually). Note every place an assumption is hidden, a step is missing, or an OS-specific quirk is unaddressed.
4. **Common-task pass** — does the README cover the next two or three things a new contributor or user is likely to want?
5. **Troubleshooting pass** — are common errors documented with their fixes? If not, propose adding the top three.
6. **Maintenance signals** — license, code of conduct, contribution path, issue templates. Flag missing pieces but do not require all of them.
7. **Cross-link pass** — links inside and outside the repo all resolve.
8. **Stale-content pass** — references to commands, files, or APIs that no longer exist.

## Output

A README audit report with:
- Verdict (clean / needs-edit / needs-rewrite).
- Findings ordered by reader impact, not file order.
- Proposed edits as concrete diffs where the change is small.
- Recommended additions (e.g., new "Troubleshooting" section) where the change is larger.

## References

- [_schema.md](../../_schema.md)
- [../../audit/cleanup/SKILL.md](../../audit/cleanup/SKILL.md)
- [api-docs-baseline/SKILL.md](../api-docs-baseline/SKILL.md)
- [../../../roles/tech-writer.md](../../../roles/tech-writer.md)

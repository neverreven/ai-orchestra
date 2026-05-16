# Pre-release

> A full pre-release audit before a tag, deploy, or PR-to-main. Combines cleanup with code consistency, infrastructure-doc sync, and a final go/no-go gate (tests, build, lint, docs, infra readiness).

## Trigger

- "routine"
- "pre-release"
- "before the PR"
- "pre-commit audit"
- "release check"
- "ready for deploy?"

## When to use

- A feature is implemented and the team is preparing to merge / tag / deploy.
- A milestone is closing and a holistic pass is needed before announcing.
- A long-lived branch is about to be merged into main.

## When NOT to use

- A tiny change (single-line typo, doc-only edit). The skill's overhead exceeds the value.
- During a hotfix — speed beats thoroughness for sev-1 patches.
- Daily incremental work (use [cleanup](../cleanup/SKILL.md) instead).

## Process

1. **Cleanup pass** — run [cleanup](../cleanup/SKILL.md) over recent changes; merge its findings.
2. **Lint + format** — run the project's linter and formatter. Fix any introduced violations; flag pre-existing ones for explicit deferral.
3. **Tests** — run the full test suite (or the highest-value subset if the suite is slow). Confirm all relevant tests pass; investigate any new failures regardless of whether they look related.
4. **Build** — run the production build target. Confirm clean output and no new warnings.
5. **Docs sync** — diff the project's "always-on" project context (e.g., `AGENTS.md`, `_documentation/PROJECT_DOC*.md`, top-level READMEs) against the actual implementation. Update entries that have drifted.
6. **Infra sync** — verify CI configurations and adapter-installed AI infrastructure (rules, skills, hooks, MCP wiring) reflect current reality. If the project has an [ai-infra-audit](../ai-infra-audit/SKILL.md) skill installed, run it.
7. **Release notes / changelog** — add an entry summarising what is shipping, what changed, and any operator notes (migrations, env vars, feature flags).
8. **Final gate report** — a numbered checklist with pass/fail for each step. Anything that fails blocks the release until resolved or explicitly waived.

## Output

A structured release-readiness report:
- Cleanup findings (acted on + deferred).
- Lint / format / test / build status.
- Docs that were updated and why.
- Infra drift surfaced and resolved.
- Release notes draft.
- Open items the team must resolve before ship.

## References

- [_schema.md](../../_schema.md)
- [cleanup/SKILL.md](../cleanup/SKILL.md)
- [ai-infra-audit/SKILL.md](../ai-infra-audit/SKILL.md)
- [../../../roles/qa-engineer.md](../../../roles/qa-engineer.md)
- [../../../roles/devops-sre.md](../../../roles/devops-sre.md)
- [../../../roles/product-manager.md](../../../roles/product-manager.md)

## Model hint

- **Preferred:** `sonnet`
- **Reason:** Multi-phase sweep covering cleanup, lint, tests, build, docs sync, and infra sync. Sonnet handles the reasoning and pattern-checking well. Upgrade to `opus` only for large pre-release audits involving >50 changed files or complex infra drift. `haiku` is too shallow for doc and infra sync steps.

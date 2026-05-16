# CI pipeline audit

> Review the project's continuous integration pipeline for correctness, speed, hygiene, and safety. The output is a prioritised list of pipeline-level improvements, not application code changes.

## Trigger

- "audit the CI"
- "review pipeline"
- "is our CI healthy?"
- "speed up the build"
- "secrets in CI"

## When to use

- New project bootstrap with CI just added.
- Pipeline failures are increasingly flaky or slow.
- A new stage is being added (deploy, security scan, mobile build).
- Periodic — pipelines drift faster than application code.

## When NOT to use

- A specific application test is failing — that is a code or test issue, not a pipeline issue.
- The project has no CI configured — that is a separate decision belonging to [decision-log](../../docs/decision-log/SKILL.md) or [write-technical-spec](../../docs/write-technical-spec/SKILL.md).

## Process

1. **Inventory configurations** — `.github/workflows/`, `.gitlab-ci.yml`, `.circleci/`, `azure-pipelines.yml`, `Jenkinsfile`, etc.
2. **Map stages and dependencies** — what triggers what, in what order, with what concurrency.
3. **Cache hygiene** — are dependency caches keyed correctly, invalidated on lockfile change, and never poisoned across stages?
4. **Secrets handling** — secrets pulled from a vault / IDE-native secret store, never echoed, never logged, scoped to least privilege per job.
5. **Speed pass** — slow steps (long installs, full-suite runs blocking PRs), parallelisation opportunities, redundant matrix entries.
6. **Reliability pass** — retries on flaky external services, timeouts on every step, hard stops on cascade failures.
7. **Coverage pass** — does CI run the same lint/test/build/security stages that pre-release runs locally? Mismatches are a frequent source of "passes locally, fails in CI."
8. **Branch / tag policy** — what runs on PR, what runs on main, what runs on tag. Are deploys gated correctly?
9. **Findings** — categorised `must-fix` (security, broken stages), `should-fix` (speed, hygiene), `nit`.

## Output

A pipeline audit report with:
- Verdict (clean / improve / overhaul).
- Per-finding entry: stage, severity, what to change, why.
- Recommended re-ordering (sometimes the cheap win is just running things in a different order).
- Estimated time / complexity for each fix.

## References

- [_schema.md](../../_schema.md)
- [deployment-checklist/SKILL.md](../deployment-checklist/SKILL.md)
- [observability-baseline/SKILL.md](../observability-baseline/SKILL.md)
- [../../quality/security-baseline/SKILL.md](../../quality/security-baseline/SKILL.md)
- [../../quality/secrets-scan/SKILL.md](../../quality/secrets-scan/SKILL.md)
- [../../../roles/devops-sre.md](../../../roles/devops-sre.md)

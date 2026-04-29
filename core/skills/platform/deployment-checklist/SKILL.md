# Deployment checklist

> Pre-deploy verification across infrastructure, application code, configuration, and operational readiness. Run before each release, with depth scaled to the release's risk.

## Trigger

- "ready to deploy?"
- "deployment checklist"
- "pre-deploy verification"
- "go / no-go for release"
- "what's left before we ship?"

## When to use

- Final pass before a tag or production deploy.
- Before merging a long-lived feature branch into main when main auto-deploys.
- After a hotfix is built and before it goes out.

## When NOT to use

- Daily incremental work that does not deploy.
- Internal staging deploys that have a clear rollback and limited blast radius.

## Process

1. **Code health** — main branch is green, no force-push since the last green CI, no bypassed merges.
2. **Tests** — full suite green; flaky tests quarantined with explicit ownership; new behaviour has matching tests.
3. **Migrations** — any schema migration in this release has been reviewed via [db-migration-review](../../code/db-migration-review/SKILL.md). Order vs application deploy is correct (`expand → migrate → contract` for changing types).
4. **Configuration** — every new environment variable or feature flag is set in the target environment; defaults are sane; secrets exist.
5. **Feature flags** — flags default to off (or to last-deployed state); rollout plan is documented.
6. **Observability** — new code paths emit logs/metrics/traces consistent with the project's [observability-baseline](../observability-baseline/SKILL.md). Alert rules updated if needed.
7. **Rollback** — explicit rollback procedure that the on-call can execute without the original author.
8. **Capacity** — anticipated load fits headroom; queues, rate limits, downstream dependencies have been considered.
9. **Communications** — release notes / changelog drafted; affected teams notified; status page updated if relevant.
10. **On-call readiness** — someone owns this release for the deployment window; their contact path is known.

## Output

A go / no-go report with:
- Per-step pass/fail/waived; waivers carry an owner and rationale.
- Verdict: ready / ready-with-watch / not-ready.
- Required follow-ups post-deploy (e.g., enable a flag at T+1h, run a backfill).
- Rollback procedure attached.

## References

- [_schema.md](../../_schema.md)
- [ci-pipeline-audit/SKILL.md](../ci-pipeline-audit/SKILL.md)
- [observability-baseline/SKILL.md](../observability-baseline/SKILL.md)
- [../../code/db-migration-review/SKILL.md](../../code/db-migration-review/SKILL.md)
- [../../audit/pre-release/SKILL.md](../../audit/pre-release/SKILL.md)
- [../../../roles/devops-sre.md](../../../roles/devops-sre.md)
- [../../../roles/backend-engineer.md](../../../roles/backend-engineer.md)

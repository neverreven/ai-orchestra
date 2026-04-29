# Performance audit

> Audit application performance across the dimensions that matter to users — load time, interactivity, runtime efficiency, asset weight. Stack-agnostic at v1; stack packs (PR 6) provide profiling tools and framework-specific patterns.

## Trigger

- "performance audit"
- "the app feels slow"
- "bundle size check"
- "Lighthouse score"
- "what's expensive in this code path?"

## When to use

- Users report slowness; we need to measure before we optimise.
- A release is approaching and we want to verify performance has not regressed.
- A feature involves heavy data, animations, or complex interactions.
- Periodic — performance debt accumulates silently.

## When NOT to use

- Speculative optimisation without evidence — measure first.
- Tiny changes already covered by [code-review](../../code/code-review/SKILL.md).
- Backend throughput tuning at very large scale (out of v1 baseline; needs stack-specific depth).

## Process

1. **Define the workload** — which user flow or service path is being measured. Without this, "performance" is a vibe, not a metric.
2. **Establish baseline** — capture current numbers (load times, frame rates, bundle sizes, request rates, p95 latencies). Without a baseline, "improvement" is unprovable.
3. **Frontend pass (if applicable)** — bundle size, asset count, render budget, hydration time, hot paths in profilers, image strategy.
4. **Backend pass (if applicable)** — request latency, database query plans, n+1 patterns, blocking calls in async contexts, caching opportunities.
5. **Mobile pass (if applicable)** — startup time, first interaction, frame budget, battery impact.
6. **Asset + network pass** — compression, content type, caching headers, CDN, preload/prefetch strategy.
7. **Findings + cost / benefit** — for each, an estimated win and an estimated effort. Optimisations rank-ordered by ratio.
8. **Risk surfacing** — call out optimisations that increase complexity for marginal wins; prefer the boring fix.

## Output

A performance audit report with:
- Baseline measurements (workload + numbers).
- Findings table with: surface, observation, hypothesis, proposed fix, estimated win, estimated effort.
- Recommended profiling-tool setup for ongoing coverage.
- Explicit non-issues — places someone might suspect but the data does not support.

## References

- [_schema.md](../../_schema.md)
- [../../code/code-review/SKILL.md](../../code/code-review/SKILL.md)
- [accessibility-audit/SKILL.md](../accessibility-audit/SKILL.md)
- [../../audit/pre-release/SKILL.md](../../audit/pre-release/SKILL.md)
- [../../../roles/frontend-engineer.md](../../../roles/frontend-engineer.md)
- [../../../roles/mobile-engineer.md](../../../roles/mobile-engineer.md)
- [../../../roles/backend-engineer.md](../../../roles/backend-engineer.md)

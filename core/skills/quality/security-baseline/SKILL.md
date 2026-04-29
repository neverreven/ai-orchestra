# Security baseline

> Establish a minimum security posture appropriate for the project's stage — defaults, headers, transport, env management, dependency hygiene, container/IaC review. The skill is calibrated to "stop the cheap mistakes," not to deliver a SOC 2 audit.

## Trigger

- "security baseline"
- "are we secure enough?"
- "harden this app"
- "production security check"
- "OWASP basics"

## When to use

- New project or service approaching production.
- Existing project that has never had a security pass.
- Post-incident review when a baseline gap was implicated.
- Periodic — defaults drift, dependencies age.

## When NOT to use

- Specific incident response (use a runbook; this skill is too slow for fire-fighting).
- Pen-test depth — recommend external engagement.
- Compliance certification body of work (separate from a baseline check).

## Process

1. **Transport** — HTTPS everywhere, HSTS appropriate to the stage, no mixed content, certificates renewed automatically.
2. **HTTP headers** — CSP (or at least a deliberate decision to defer it), X-Content-Type-Options, X-Frame-Options or CSP frame-ancestors, Referrer-Policy, Permissions-Policy.
3. **Cookies** — `Secure`, `HttpOnly`, `SameSite` appropriate to flow.
4. **Auth** — credentials hashed with a current algorithm; sessions / tokens scoped and revocable; cross-reference [auth-flow-review](../auth-flow-review/SKILL.md).
5. **Secrets management** — no secrets in repo, in build logs, in client bundles; cross-reference [secrets-scan](../secrets-scan/SKILL.md).
6. **Dependency hygiene** — cross-reference [dependency-audit](../../code/dependency-audit/SKILL.md); flag missing process for periodic checks.
7. **Container + IaC** — base images current, non-root user, minimal package set, IaC under review, network policies consistent.
8. **Logging + leakage** — no PII or secrets in logs; cross-reference observability decisions.
9. **Privacy + retention** — data is collected only when needed; retention defaults exist; deletion paths exist where regulation requires them.
10. **Findings** — categorised `must-fix` (no transport encryption, secrets in repo, broken auth), `should-fix` (header gaps, dep drift), `nit`.

## Output

A security baseline report with:
- Verdict (baseline-met / baseline-with-gaps / baseline-not-met).
- Per-finding entry: area, severity, what to change, why.
- Recommended cadence for re-running this skill (e.g., quarterly + on every pre-release).

## References

- [_schema.md](../../_schema.md)
- [secrets-scan/SKILL.md](../secrets-scan/SKILL.md)
- [auth-flow-review/SKILL.md](../auth-flow-review/SKILL.md)
- [../../code/dependency-audit/SKILL.md](../../code/dependency-audit/SKILL.md)
- [../../platform/mcp-server-audit/SKILL.md](../../platform/mcp-server-audit/SKILL.md)
- [../../../roles/security-engineer.md](../../../roles/security-engineer.md)
- [../../../roles/devops-sre.md](../../../roles/devops-sre.md)

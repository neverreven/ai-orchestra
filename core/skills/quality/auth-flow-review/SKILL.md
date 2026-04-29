# Auth flow review

> Review changes (or current state) of authentication and session handling — login, logout, token issuance, token refresh, MFA, OAuth flows, role/permission checks.

## Trigger

- "review this login flow"
- "session handling check"
- "is this OAuth correct?"
- "auth review"
- "permissions audit"

## When to use

- A PR touches login, logout, password reset, session, token, OAuth/OIDC, JWT issuance, refresh logic, or role/permission middleware.
- A new role or permission is being introduced.
- A new third-party identity provider is being integrated.
- Periodic — auth code is high-blast-radius and benefits from regular eyes.

## When NOT to use

- Pure UI changes on already-authenticated screens that do not touch the session contract.
- Pure non-auth backend changes (use [code-review](../../code/code-review/SKILL.md) and [api-design-review](../../code/api-design-review/SKILL.md)).

## Process

1. **Surface the flow** — list each step from credential entry to authenticated request, including error and recovery paths.
2. **Credential handling** — never logged, never persisted in cleartext, transferred only over secure channels.
3. **Session / token lifecycle** — issuance is bound to user identity; expiration is finite; refresh is idempotent and revocable; logout actually invalidates.
4. **Storage location** — cookies (with right flags), localStorage / sessionStorage (only when justified), IndexedDB / native keychain. Each choice has consequences; flag risky ones.
5. **OAuth / OIDC specifics (if applicable)** — PKCE on public clients, state + nonce, redirect URIs validated, scopes minimal, ID tokens verified.
6. **MFA + recovery** — where present, recovery paths cannot bypass MFA; reset flows do not become a silent backdoor.
7. **Authorisation** — role and permission checks happen on the server; client-side gating is a UX hint, never the security boundary.
8. **Logging + leakage** — auth events logged for audit, but tokens/credentials never end up in logs.
9. **Findings** — categorised `must-fix` (broken auth, replayable tokens, leaked credentials), `should-fix` (hardening), `nit`.

## Output

An auth-flow review with:
- Sequence diagram or numbered flow description.
- Per-finding entry: step, severity, what to change, why.
- Risk classification of the change (low / medium / high) for downstream reviewers.

## References

- [_schema.md](../../_schema.md)
- [security-baseline/SKILL.md](../security-baseline/SKILL.md)
- [secrets-scan/SKILL.md](../secrets-scan/SKILL.md)
- [../../code/api-design-review/SKILL.md](../../code/api-design-review/SKILL.md)
- [../../../roles/security-engineer.md](../../../roles/security-engineer.md)
- [../../../roles/backend-engineer.md](../../../roles/backend-engineer.md)

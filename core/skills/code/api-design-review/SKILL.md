# API design review

> Contract-first review of new or changed APIs (REST, GraphQL, gRPC, RPC). Focused on naming, shape stability, error handling, versioning, and the costs of choices that look small today.

## Trigger

- "review this endpoint"
- "API design review"
- "is this contract OK?"
- "does this break existing clients?"
- "should this be REST or RPC?"

## When to use

- A new endpoint, mutation, or method is being added.
- An existing contract is being changed in a way that may break clients.
- A new resource or aggregate is being introduced.
- Before publishing a public-facing API change (SDK, partner contract).

## When NOT to use

- Internal-helper functions (use [code-review](../code-review/SKILL.md)).
- Entire architectural redesigns (use [write-technical-spec](../../docs/write-technical-spec/SKILL.md)).
- Implementation-level review of a method that already passes design review (use code-review).

## Process

1. **Scope the contract change** — list the surface: paths/methods (REST), types/queries/mutations (GraphQL), services/methods (gRPC).
2. **Naming + consistency** — does each new name match the project's existing conventions (resource-vs-action, plural-vs-singular, field casing)? Flag inconsistency clearly.
3. **Shape stability** — are field names ones the team can live with for the foreseeable future? Are nullable vs required choices defensible? Are enums extensible?
4. **Versioning + compatibility** — what happens to existing clients? Is the change additive, deprecating, or breaking? Is there a migration path?
5. **Error model** — does the change reuse the project's error shape (status codes, error envelopes)? Does it leak implementation details?
6. **Pagination + filtering + sorting** — for list endpoints, are these handled consistently with the rest of the API?
7. **Auth + rate limiting** — what is the auth scope? Should this be rate-limited? Do callers need new permissions?
8. **Documentation** — is there a place where this contract gets documented? Recommend [api-docs-baseline](../../docs/api-docs-baseline/SKILL.md) if not.
9. **Findings** — categorised `must-fix` (breaks contract, breaks clients, security gap), `should-fix` (consistency, ergonomics), `nit`.

## Output

A design-review report with:
- Summary verdict (approve / approve-with-changes / re-design).
- Per-finding entry: surface element, severity, what to change, why.
- Backward-compatibility notes (clients impacted, migration plan).
- Recommended documentation updates.

## References

- [_schema.md](../../_schema.md)
- [code-review/SKILL.md](../code-review/SKILL.md)
- [../../docs/api-docs-baseline/SKILL.md](../../docs/api-docs-baseline/SKILL.md)
- [../../quality/auth-flow-review/SKILL.md](../../quality/auth-flow-review/SKILL.md)
- [../../../roles/backend-engineer.md](../../../roles/backend-engineer.md)
- [../../../roles/security-engineer.md](../../../roles/security-engineer.md)

# API docs baseline

> Bootstrap a minimum viable API documentation surface when the project ships an API but lacks docs. Aimed at consumers of the API (other teams, external integrators, or the team's own future self).

## Trigger

- "document this API"
- "I need API docs"
- "we have endpoints but no docs"
- "publish the API"
- "OpenAPI / GraphQL schema docs"

## When to use

- The project exposes an API (REST, GraphQL, gRPC, RPC, webhook contracts) without documentation.
- Documentation exists but is materially out of sync with the implementation.
- Before publishing an SDK or an external partner contract.

## When NOT to use

- Docs already exist and are healthy — use [readme-quality](../readme-quality/SKILL.md) for incremental polish.
- The API is genuinely internal-only and disposable.
- Marketing-positioning materials — out of this skill's scope.

## Process

1. **Inventory endpoints / methods** — pull from code and / or any contract files (`openapi.yaml`, `*.graphql`, `*.proto`). Identify gaps between code and contract.
2. **Pick the doc target** — generated docs from a contract file (preferred when one exists) or a hand-written reference doc (when no contract file is feasible).
3. **For each endpoint / method**, document:
   - Path / signature.
   - Request shape (parameters, body, headers, auth).
   - Response shape (success + each error code).
   - Side effects (idempotent, mutating, async).
   - Rate limits and pagination behaviour if applicable.
4. **Examples** — at least one realistic request/response pair per endpoint or method. Examples have a much higher value than prose.
5. **Auth section** — how callers authenticate, what tokens look like, how to scope permissions.
6. **Versioning section** — current version, supported versions, deprecation policy.
7. **Errors section** — central reference for error shape, status codes / GraphQL extensions / gRPC statuses.
8. **Surface gaps** — endpoints found in code with no obvious contract, or vice versa.

## Output

Either:
- A generated docs site / artifact derived from an authoritative contract file, plus a recommendation on how to keep it building in CI; or
- A hand-written reference markdown document covering the points above, placed in the project's existing docs folder.

## References

- [_schema.md](../../_schema.md)
- [../../code/api-design-review/SKILL.md](../../code/api-design-review/SKILL.md)
- [readme-quality/SKILL.md](../readme-quality/SKILL.md)
- [../../../roles/tech-writer.md](../../../roles/tech-writer.md)
- [../../../roles/backend-engineer.md](../../../roles/backend-engineer.md)

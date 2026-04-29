# DB migration review

> Review schema-changing migrations for safety: forward + backward compatibility with running code, lock and downtime profile, data backfill plan, and rollback path.

## Trigger

- "review this migration"
- "is this migration safe?"
- "schema change review"
- "will this lock the table?"
- "rollback plan?"

## When to use

- A migration is being added (`alembic/`, `prisma/migrations/`, `db/migrate/`, `flyway/`, `liquibase/`, raw SQL files).
- A schema change is being authored, even before the tool generates a migration file.
- An existing migration is being edited (almost always a red flag — flag it).

## When NOT to use

- Code-only changes that do not touch schema or migration files.
- Seed-data adjustments that do not change schema.
- Pure data import scripts that do not run as part of the migration pipeline.

## Process

1. **Identify the change kind** — additive (new table/column), modifying (rename, type change, constraint change), destructive (drop), or backfill (data write).
2. **Forward compatibility** — can the deployed application code (current and previous versions) operate while this migration is partway through? Big tables means big locks, means long windows.
3. **Backward compatibility** — can the migration be rolled back without data loss if the deploy fails? Is the rollback path written?
4. **Lock profile** — what locks does this migration take, on which tables, for roughly how long? Flag table-rewriting operations on large tables.
5. **Data backfill** — if columns are added with defaults, or data is being moved, is the backfill chunked? Does it tolerate restart? Is it idempotent?
6. **Index changes** — concurrent / online build available? If the engine supports it, the migration should use it.
7. **Constraint changes** — adding NOT NULL, foreign keys, unique constraints often requires a multi-step expand-contract pattern. Verify it.
8. **Test path** — does the project run migrations against a representative dataset in CI? Recommend it if not.
9. **Findings** — categorised `must-fix` (data-loss risk, prod-lock risk, rollback impossible), `should-fix` (better pattern available), `nit`.

## Output

A migration-review report with:
- Verdict (approve / approve-with-changes / re-design).
- Per-finding entry: migration step, severity, what to change, why.
- Required deployment ordering (`code → migrate`, `migrate → code`, `expand → migrate → contract`).
- Rollback procedure that should accompany the change.

## References

- [_schema.md](../../_schema.md)
- [code-review/SKILL.md](../code-review/SKILL.md)
- [../../platform/deployment-checklist/SKILL.md](../../platform/deployment-checklist/SKILL.md)
- [../../../roles/backend-engineer.md](../../../roles/backend-engineer.md)
- [../../../roles/devops-sre.md](../../../roles/devops-sre.md)

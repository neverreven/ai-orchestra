# Python — database patterns

## When this applies

Apply when working with database access code in a Python project: SQLAlchemy (Core or ORM), Django ORM, `asyncpg`, `psycopg3`, `sqlite3`, Alembic migrations, or raw SQL. Adapter glob: `**/models.py`, `**/repositories/*.py`, `**/db/*.py`, `**/migrations/*.py`, `**/*_repository.py`.

## Patterns to follow

### Query discipline

- **Parameterised queries only.** Never build SQL with f-strings or `%` formatting on user-controlled input. SQLAlchemy text clauses: `text("SELECT * FROM users WHERE id = :id").bindparams(id=user_id)`. `asyncpg` / `psycopg3`: use `$1` placeholders. Raw `%s` in `psycopg2` is acceptable; f-strings never are.
- **Explicit column selection.** `SELECT *` transfers columns the application does not need, bloats network payloads, and breaks when a column is added with a default that conflicts with the model. Select only the columns the code uses.
- **LIMIT on unbounded queries.** Any query that reads from a large table without a `WHERE` clause must have a `LIMIT`. Absence of a limit is a latent production incident. If the call site believes "there will never be many rows", add a sanity limit (e.g., 10 000) and log a warning if it is reached.
- **Indexed columns in `WHERE`.** Adding a `WHERE user_id = :id` clause on an unindexed column causes a full-table scan. Verify indexes exist before deploying queries on tables > 10 000 rows. Use `EXPLAIN ANALYZE` in development.

### ORM patterns (SQLAlchemy)

- **Use `Session` as a unit of work.** Open a session, perform all reads and writes, commit or roll back, close. Do not keep a session alive for the duration of a web request without explicitly managing the transaction boundary.
- **`expire_on_commit=False` for async sessions.** The default `expire_on_commit=True` triggers lazy loads on expired attributes after commit — which fails in async contexts because there is no implicit I/O allowed outside an async context. Set `expire_on_commit=False` on `AsyncSession` factories and reload explicitly when needed.
- **Explicit eager loading for relationships.** Lazy loading is the SQLAlchemy default and causes the N+1 problem. Use `selectinload` or `joinedload` for relationships that are always accessed together: `select(User).options(selectinload(User.orders))`.
- **`selectin` over `joined` for collections.** `joinedload` on one-to-many relationships duplicates the parent row for each child in the result set, multiplying the data transfer. `selectinload` issues a second `IN` query — typically cheaper.
- **Session per request, not per application.** Never use a module-level `Session` object for a web application. Each request gets its own session, opened at the start of the request handler and closed in a `finally` block (or via a dependency-injection framework like FastAPI's `Depends`).

### Django ORM

- **`select_related` and `prefetch_related` explicitly.** Django's ORM is lazy by default. Accessing `order.user.email` in a loop without `select_related('user')` fires one query per iteration. Profile with `django-debug-toolbar` and eliminate N+1 queries before merging.
- **`only()` and `defer()` for heavy models.** Large models with `TextField` or `BinaryField` columns transfer all columns by default. Use `.only('id', 'name')` when the view only needs a subset.
- **`update()` and `delete()` over loops.** `User.objects.filter(active=False).delete()` is one SQL statement. A Python loop calling `user.delete()` for each is N statements. Use bulk operations for set updates.
- **Custom managers for complex queries.** Business-logic queries (`User.objects.active()`, `Order.objects.overdue()`) belong in a custom manager method, not scattered across views and serialisers.

### Migrations

- **Migrations in version control.** Migration files are part of the codebase, not generated artefacts. They are committed, reviewed, and applied in the same sequence as code changes.
- **Never edit a committed migration.** Once a migration has been applied in any environment, treat it as immutable. Create a new migration for corrections. Editing applied migrations breaks the history for everyone who has already run them.
- **Reversible migrations.** Write `downgrade()` / `backwards()` methods for every migration. A migration that cannot be rolled back is a deployment risk. If a downgrade is genuinely impossible (destructive data migration), document that explicitly.
- **Test migrations in CI.** Run the full migration sequence (up and down) against a real database in the CI pipeline. Schema-level errors are invisible until the migration runs.
- **`alembic autogenerate` as a starting point, not a final answer.** Autogenerate misses: partial indexes, custom types, computed columns, trigger definitions. Always review the generated file before committing.

### Connection pooling

- **Use a connection pool for web applications.** Opening a new connection per request is expensive (100–300 ms for TLS + auth). Use SQLAlchemy's built-in pool or `asyncpg`'s pool. Size the pool to `db_max_connections / num_workers` with headroom.
- **`pool_pre_ping=True` for long-lived pools.** Idle connections can be closed by the DB server or a load balancer. `pool_pre_ping` issues a lightweight check before returning a connection from the pool, avoiding "connection closed" errors after idle periods.
- **Close sessions and connections in `finally`.** Resource leaks exhaust the pool silently. Use `async with session_factory()` or `with Session(engine)` to ensure cleanup even on exception.

## Anti-patterns to avoid

- **Secrets in migration files.** A migration that hardcodes a default password, API key, or email address in `op.execute("INSERT INTO ...")` is a security incident waiting to happen. Use environment-derived constants or placeholder values with a comment.
- **Schema changes in application code.** `Base.metadata.create_all(engine)` is for tests and local bootstrapping only. Production schema changes must go through migration scripts that are reviewed and audited.
- **`merge=True` in Alembic heads for production.** Multiple alembic heads indicate a branched migration history. Resolve before deploying by creating a merge migration and testing the full sequence.
- **Raw SQL strings as f-strings.** Even for non-user input, f-strings in SQL are a habit that eventually leads to injection when user input is added later. Always use parameterised queries as the default.
- **`all()` on potentially large querysets.** `User.objects.all()` on a table with 1 million rows loads 1 million ORM objects into memory. Add a `.filter()` or a `.values()` / `.values_list()` to return only what is needed.

## References

- `async-patterns.md` — async SQLAlchemy and `asyncpg` concurrency patterns
- `fastapi.md` — database dependency injection in FastAPI
- `django.md` — Django-specific ORM patterns

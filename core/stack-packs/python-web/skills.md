# python-web — skills addenda

## Layering principle

These addenda are added on top of the universal skills under [`../../skills/`](../../skills/). They do not replace the universal procedure; they extend it with stack-specific checklist items, gotchas, and refinements that apply when the project's source is Python. The agent runs the universal skill's process and consults this file to expand any step that has a Python-specific consideration.

If a universal skill is not listed here, run it as-is.

## Per-skill addenda

### code-review

Extends [`../../skills/code/code-review/SKILL.md`](../../skills/code/code-review/SKILL.md).

Stack-specific checks:
- **Type-checker output is clean.** Run `mypy` or `pyright` and confirm no new errors. Refusal to type a function counts as drift.
- **No `Any` introduced unjustified.** Each new `Any` requires a comment with the reason. Default position: type it properly.
- **Mutable default arguments.** Search for `def f(x=[]` / `x={}` patterns and confirm none in the diff.
- **Bare `except:` or broad `except Exception` without re-raise.** Each must justify why it cannot be more specific.
- **Async / sync mixing.** A sync function calling an async function (or vice versa) without `asyncio.run` / `to_thread` is a bug.
- **Database query patterns (Django).** New `.objects.filter(...)` chains in views without `.select_related` / `.prefetch_related` for related-field access.
- **Database session leaks (Flask / FastAPI).** New view functions properly scope DB sessions.
- **Pydantic v1 deprecations in v2 codebases.** `class Config:`, `@validator`, `parse_obj` — flag and migrate.
- **Logging at the right level.** `logger.error` vs `logger.warning` vs `logger.info` used appropriately. Production logs flooded with `INFO` are useless.

### dependency-audit

Extends [`../../skills/code/dependency-audit/SKILL.md`](../../skills/code/dependency-audit/SKILL.md).

Stack-specific checks:
- **Lockfile present and committed.** `requirements.txt` from `pip-compile`, or `poetry.lock`, or `uv.lock`. CI installs from it.
- **`pip-audit` or `safety` runs in CI at high severity.** Build fails on known CVEs at high or critical severity.
- **Direct dependencies pinned, transitives via lockfile.** `pyproject.toml` declares ranges; lockfile pins exact versions. Direct unpinned (`requests`, with no version) is a smell.
- **No multiple Python versions in `pyproject.toml` `requires-python`.** A single supported range, e.g., `>=3.11,<3.13`. Open-ended `>=3.10` invites breakage.
- **Native deps documented.** Packages with C/Rust extensions (psycopg, lxml, cryptography, numpy) need build-system info in `Dockerfile` / install docs.
- **License audit.** GPL / AGPL deps incompatible with the project's licence. Run `pip-licenses` and compare.

### db-migration-review

Extends [`../../skills/code/db-migration-review/SKILL.md`](../../skills/code/db-migration-review/SKILL.md).

Stack-specific checks:
- **Migration auto-generated, not hand-crafted.** Django: `manage.py makemigrations`. Alembic: `alembic revision --autogenerate`. Hand-crafted migrations are reviewed for the operations the autogen would have produced.
- **Reversible.** Every migration has a `backwards` / `down` method (Alembic) or supports `manage.py migrate <app> <previous>` (Django). Irreversible operations are flagged for explicit approval.
- **No data migrations mixed with schema migrations.** Schema migrations should be fast and DDL-only. Data migrations live in their own file and are tested.
- **Index changes don't lock the table.** PostgreSQL `CREATE INDEX CONCURRENTLY` for new indexes on populated tables. SQLAlchemy and Django both support concurrent indexes via flags.
- **Default values for new NOT NULL columns.** Adding `NOT NULL` without a default rewrites the table on Postgres. Default + later constraint is the safe pattern on big tables.
- **Foreign-key cascade rules explicit.** `on_delete=CASCADE` / `SET_NULL` / `PROTECT` chosen deliberately; the default in some ORMs is `CASCADE`, which is rarely what you want.

### api-design-review

Extends [`../../skills/code/api-design-review/SKILL.md`](../../skills/code/api-design-review/SKILL.md).

Stack-specific checks:
- **OpenAPI schema generated and reviewed.** FastAPI: schema at `/openapi.json`. Django + DRF: `drf-spectacular` or `drf-yasg`. Flask: `flask-smorest` / `apispec`. The schema is the contract; review it.
- **Status codes meaningful.** 200 vs 201 vs 204 chosen correctly. 422 for validation errors (FastAPI default), 400 for malformed requests.
- **Pagination on list endpoints.** Cursor or offset pagination consistently. Unpaginated list endpoints break at scale.
- **Consistent error response shape.** Error responses across the API have the same JSON shape (e.g., `{ "code": "...", "message": "...", "details": [...] }`).
- **Request and response examples in the OpenAPI doc.** FastAPI: `examples=` in Pydantic models. DRF: `OpenApiExample`.
- **Versioning strategy explicit.** URL-based (`/v1/`), header-based (`Accept: application/vnd.example.v1+json`), or "no versioning yet" — all valid; "we'll figure it out later" is not.

### security-baseline

Extends [`../../skills/quality/security-baseline/SKILL.md`](../../skills/quality/security-baseline/SKILL.md).

Stack-specific checks:
- **Django: `SECURE_*` settings on in production.** `SECURE_SSL_REDIRECT`, `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE`, `SECURE_HSTS_SECONDS`. Run `manage.py check --deploy` and address every warning.
- **CSRF protection enabled (Django) or explicit (FastAPI / Flask).** FastAPI does not have CSRF middleware by default; if cookie-based auth is used, CSRF must be added.
- **SQL injection — parameterised queries only.** Audit any `.raw()`, `cursor.execute(...)`, `text(...)` usage.
- **Password hashing via the framework's tools.** Django uses argon2 / pbkdf2 by default; do not roll your own.
- **JWT tokens validated correctly.** Library validates signature, expiry, audience, issuer. Decoding without verification is a bug.
- **CORS configured correctly.** No `*` allow-origin on authenticated endpoints. Per-environment allow-list.
- **`DEBUG = False` in production (Django).** `DEBUG = True` in production exposes settings, source paths, and DB queries on every error page.

### secrets-scan

Extends [`../../skills/quality/secrets-scan/SKILL.md`](../../skills/quality/secrets-scan/SKILL.md).

Stack-specific checks:
- **`.env` gitignored, `.env.example` committed.** Same as JS/TS. Real secrets never in repo.
- **Django `SECRET_KEY` from env.** Default `django-insecure-...` value indicates the secret is hard-coded.
- **No secrets in `settings.py`.** Anything that varies between environments is read via `os.environ`.
- **No secrets in migration files.** Migrations sometimes reference seed data; ensure that data is not sensitive.

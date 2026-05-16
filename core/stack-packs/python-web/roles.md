# python-web — roles addenda

## Layering principle

These addenda are added on top of the universal roles under [`../../roles/`](../../roles/). They do not replace the universal role description; they add stack-specific non-negotiables, primary outputs, and skill-set extensions that apply when the project's source is Python. The agent uses the universal role file to understand the role's mission and triggers, then consults this file to apply stack-specific expectations.

If a universal role is not listed here, use it as-is.

## Per-role addenda

### backend-engineer

Extends [`../../roles/backend-engineer.md`](../../roles/backend-engineer.md).

Stack-specific non-negotiables:
- **Type hints on every public function.** Strict type-checker config (mypy / pyright). See [`rules/python.md`](rules/python.md).
- **Pydantic / dataclasses for data containers.** Plain dicts as DTOs are an anti-pattern. See [`rules/python.md`](rules/python.md) and [`rules/fastapi.md`](rules/fastapi.md).
- **Schema validation at the request boundary.** Every external input parsed and validated before any business logic touches it.
- **Database access through the ORM or a thin repository layer.** Raw SQL only when justified; always parameterised. See [`rules/django.md`](rules/django.md), [`rules/flask.md`](rules/flask.md), [`rules/fastapi.md`](rules/fastapi.md).
- **Async / sync model consistent within a service.** Mixing without explicit `asyncio.to_thread` blocks the event loop.

Primary outputs (additional, beyond universal):
- OpenAPI schema (FastAPI auto-generates; DRF / Flask use spectacular / smorest).
- Migrations (Django / Alembic) reviewed and committed alongside model changes.
- Application factory + per-environment config (Flask, FastAPI) or split-settings (Django).
- Pinned dependencies via lockfile (`requirements.txt` / `poetry.lock` / `uv.lock`).

Skill set additions:
- Comfort with [`../../skills/code/db-migration-review/SKILL.md`](../../skills/code/db-migration-review/SKILL.md) and the addenda in [`skills.md`](skills.md).
- Comfort with [`../../skills/code/api-design-review/SKILL.md`](../../skills/code/api-design-review/SKILL.md) — REST and (where used) GraphQL conventions.
- Familiarity with Python profiling tools — `cProfile`, `py-spy`, `scalene`.
- Comfort with the chosen ORM (Django ORM, SQLAlchemy 2.0, Tortoise, Beanie).

### qa-engineer

Extends [`../../roles/qa-engineer.md`](../../roles/qa-engineer.md).

Stack-specific non-negotiables:
- **`pytest` is the standard.** Even Django projects, while `manage.py test` works, benefit from pytest + `pytest-django` for fixtures and parametrisation.
- **Fixtures over setup/teardown.** Pytest fixtures are composable; class-based setup/teardown is harder to reuse.
- **Database tests transactional and rolled back.** Django's `TestCase` does this. SQLAlchemy with pytest: `pytest-postgresql` + transactional fixtures.
- **No real network in unit tests.** `responses`, `httpretty`, or `vcrpy` for HTTP mocking. End-to-end tests live in their own suite.
- **Type-check passes in CI.** mypy / pyright as a CI step. New errors fail the build.
- **Coverage tracked but not gamed.** `pytest --cov`, with thresholds documented. 100% line coverage is not the goal; meaningful behaviour coverage is.

Primary outputs (additional):
- Test plans aligned with [`../../skills/docs/write-test-plan/SKILL.md`](../../skills/docs/write-test-plan/SKILL.md), naming pytest, hypothesis (property-based testing), and any framework-specific tooling.
- Fixture catalogue: shared fixtures live in `conftest.py` at the appropriate scope; document their intent.
- Coverage configuration in `pyproject.toml` with branch coverage enabled.

### devops-sre

Extends [`../../roles/devops-sre.md`](../../roles/devops-sre.md).

Stack-specific non-negotiables:
- **Python version pinned.** `pyproject.toml` `requires-python`, `.python-version` (pyenv) or `runtime.txt` (some platforms). CI / Docker / production all the same.
- **CI installs from lockfile.** `pip install -r requirements.txt` (when `requirements.txt` is the lockfile), `poetry install --no-root --sync`, `uv sync --frozen`. Never `pip install <unpinned>` in CI.
- **Multi-stage Docker builds.** Build deps separate from runtime; final image small (slim / distroless / alpine, framework-permitting).
- **WSGI / ASGI server in production, not the dev server.** Gunicorn (sync), uvicorn or hypercorn (async). Worker count and timeout configured for the workload.
- **Migrations run as a deploy step, not on app start.** Concurrent app instances racing migrations corrupts state.

Primary outputs (additional):
- Dockerfile that copies the lockfile, installs deps in a build stage, then copies source — for layer-cache friendliness.
- Pipeline (GitHub Actions / GitLab) defined in code, with Python version matrix where supported.
- Deployment runbook including migration step and rollback procedure.
- Health-check endpoints wired in the deployment platform (Django: `django-health-check`; FastAPI: simple `/healthz`).

Skill set additions:
- Comfort with [`../../skills/platform/ci-pipeline-audit/SKILL.md`](../../skills/platform/ci-pipeline-audit/SKILL.md) — addenda for pip / poetry / uv caching and Python-version matrix.
- Comfort with [`../../skills/platform/deployment-checklist/SKILL.md`](../../skills/platform/deployment-checklist/SKILL.md) — Python deployment specifics.

### security-engineer

Extends [`../../roles/security-engineer.md`](../../roles/security-engineer.md).

Stack-specific non-negotiables:
- **`pip-audit` / `safety` in CI at high severity.** Build fails on known CVEs.
- **Django: `manage.py check --deploy` clean.** Every warning addressed or justified.
- **No `eval` / `exec` on user input.** Search the diff; reject any new occurrence.
- **No `pickle.load` on untrusted input.** Pickle is RCE; always use JSON or a typed format for cross-trust-boundary data.
- **CSRF protection on cookie-authenticated endpoints.** Django enables by default; FastAPI / Flask require explicit middleware.
- **JWT validation library, not hand-rolled.** PyJWT or python-jose, with audience and issuer checks enabled.
- **Secrets in env or platform secret stores only.** Never committed; never in image layers.

Primary outputs (additional):
- Threat model that addresses SQL injection, RCE via deserialization, CSRF, dependency-supply-chain risk.
- `.env.example` describing every secret the app reads.
- Security headers configuration (Django middleware, FastAPI dependency, Flask `Talisman`).

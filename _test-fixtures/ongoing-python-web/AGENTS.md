# AGENTS.md — fixture-ongoing-python-web

> **This file pre-exists in the fixture.** The ai-orchestra must NOT overwrite it. The orchestra extends a managed section between explicit start/end markers per the Cursor adapter's mappings.

## Project context (project-owned)

This is a small FastAPI service. Conventions specific to this project:

- All routes return Pydantic-validated responses.
- The app factory pattern (`create_app() -> FastAPI`) is used; module-level `app = FastAPI()` is forbidden.
- Database layer is intentionally out of scope (no migrations in this fixture).

## Coding standards (project-owned)

- Line length: 100 (configured in `pyproject.toml#tool.ruff`).
- Type hints required on every public function.
- Tests live in `tests/`; pytest configured via `pyproject.toml#tool.pytest.ini_options`.

## Validation expectation

The ai-orchestra install plan must:

1. Preserve every line above this section verbatim.
2. Insert an orchestra-managed section below this section, delimited by
   `<!-- ai-orchestra: managed-section start -->` and
   `<!-- ai-orchestra: managed-section end -->`.
3. Append the python-web stack pack roles addenda inside that managed section.
4. Leave any content the user adds outside the managed-section markers untouched on subsequent re-runs.

If the orchestra's plan produces an `action: create` for this file or attempts to replace its content, validation MUST fail.

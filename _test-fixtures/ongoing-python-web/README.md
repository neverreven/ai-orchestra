# Fixture: ongoing-python-web

A FastAPI service that already has **partial agentic infrastructure** — a project-specific `AGENTS.md` and a custom Cursor rule. The orchestra must respect what's there: extend, don't overwrite.

## What this fixture exercises

- **Detection:**
  - `python-web` stack at high confidence (strong signals: `pyproject.toml` present, FastAPI dependency).
  - Frameworks: `fastapi`.
  - Test framework: `pytest`.
- **Existing infra (the point of this fixture):**
  - Pre-existing top-level [`AGENTS.md`](AGENTS.md) with project-specific content.
  - Pre-existing [`.cursor/rules/python-style.mdc`](.cursor/rules/python-style.mdc) (a project-specific style rule).
- **Install path:** the conflict-resolution path. The orchestra extends `AGENTS.md` via its managed-section markers, registers its own rules alongside the existing one, and never touches the project-owned files.
- **Stack pack layering:** `core/stack-packs/python-web/` rules + skills + roles addenda are applied per [`../../core/stack-packs/_overview.md`](../../core/stack-packs/_overview.md) §3.
- **Idempotency:** a synthetic re-run produces a stable diff. The pre-existing rule and the orchestra-installed rules coexist on both runs.

## Source files

| File | Purpose |
|------|---------|
| [`pyproject.toml`](pyproject.toml) | Strong `python-web` signal; declares FastAPI + pytest. |
| [`app/__init__.py`](app/__init__.py) | Package marker. |
| [`app/main.py`](app/main.py) | FastAPI app factory and a tiny route. |
| [`app/models.py`](app/models.py) | Pydantic model. |
| [`tests/test_main.py`](tests/test_main.py) | pytest smoke test. |
| [`AGENTS.md`](AGENTS.md) | **Pre-existing project context** the orchestra must preserve and extend (not overwrite). |
| [`.cursor/rules/python-style.mdc`](.cursor/rules/python-style.mdc) | **Pre-existing project-specific rule** the orchestra must leave untouched. |

The fixture has no `requirements.txt`, no lockfile (the `pyproject.toml` declares deps), and no actual installed venv. The orchestra still detects `python-web` at high confidence from `pyproject.toml` alone.

## What is NOT in this fixture (deliberately)

- No prior `.ai-orchestra/install.json` — this is a fresh-install scenario, not an upgrade. (A future fixture could exercise the upgrade-and-audit path; v1 leaves that to the audit skill's own tests.)
- No `CLAUDE.md` / `.github/copilot-instructions.md` / `.codex/`. The fixture is Cursor-specific in its existing infra; other adapters are validated against this fixture in fresh-install mode (no IDE-specific existing infra for them).
- No CI workflow.
- No production `Dockerfile`. Server-engineer role addenda will surface deployment-checklist guidance, but the fixture does not need to satisfy it.

## Expected outcome

See [`EXPECTED.md`](EXPECTED.md) for the contract.

# Signal: python (Python web + general)

> First-class stack in v1. Detects Python codebases, with framework sub-detection focused on web frameworks.

**Stack id:** `python-web` (when a web framework is detected) or `python` (generic Python without web framework — reduced confidence into stack pack selection)
**Stack pack:** `core/stack-packs/python-web/` (PR 6)

## Strong signals (weight 3 each)

| Signal | Match | Notes |
|--------|-------|-------|
| `pyproject.toml` exists at root | File presence | Modern Python project marker. |
| `requirements.txt` or `requirements-*.txt` exists at root | File presence | Older Python project marker. |
| `setup.py` exists at root | File presence | Legacy but still valid Python project. |

## Medium signals (weight 2 each)

| Signal | Match |
|--------|-------|
| Lockfile present | Any of: `poetry.lock`, `Pipfile.lock`, `uv.lock`, `pdm.lock`. |
| Virtual env directory present | Any of: `.venv/`, `venv/`, `env/` (only if it contains a `pyvenv.cfg`). |
| `tox.ini`, `noxfile.py`, or `pytest.ini` present | Project test orchestration. |
| `Pipfile` present at root | Legacy pipenv project. |

## Weak signals (weight 1 each)

| Signal | Match |
|--------|-------|
| Any `*.py` file in tracked code | Excluding `__pycache__/`, `.venv/`, `venv/`, `dist/`, `build/`. |
| `__pycache__/` directories present | Indicates a previously executed Python codebase. |
| `.python-version` present | pyenv pin. |
| `mypy.ini` or `mypy` section in `pyproject.toml` | Type-checking config. |
| `.flake8`, `ruff.toml`, or `ruff` section in `pyproject.toml` | Lint config. |
| `.pre-commit-config.yaml` with Python hooks | Common in Python projects. |

## Detected frameworks (web focus)

For projects clearing the threshold, additionally detect:

| Framework | Match |
|-----------|-------|
| `django` | `django` in dependencies, `manage.py` at root, `*/settings.py` files. |
| `flask` | `flask` in dependencies, `app.py` or `wsgi.py` with `Flask(__name__)` import. |
| `fastapi` | `fastapi` in dependencies. |
| `starlette` | `starlette` in dependencies (often with FastAPI). |
| `tornado` | `tornado` in dependencies. |
| `pyramid` | `pyramid` in dependencies. |
| `aiohttp` | `aiohttp` in dependencies (when used as web server, not just HTTP client). |
| `litestar` | `litestar` in dependencies. |

If any web framework is detected, set the stack id to `python-web`. If none, set to `python`.

## Other framework hints

| Framework | Stack signal |
|-----------|--------------|
| `pandas`, `numpy`, `scikit-learn`, `polars` | Data/ML. Raises AI/ML role relevance. |
| `pytorch`, `tensorflow`, `transformers`, `langchain` | AI/ML. Raises AI/ML role relevance. |
| `streamlit`, `gradio` | Data app. May warrant frontend-style rules. |
| `celery`, `dramatiq`, `rq` | Background tasks. Adds DevOps relevance. |

## Test framework detection

Scan dependencies for: `pytest`, `unittest` (always available, but check for `tests/` directory), `nose2`, `hypothesis`, `pytest-asyncio`, `pytest-django`, `pytest-cov`, `coverage`. Add each to `profile.testFrameworks`.

## Known false positives / refinements

- A small repo with only a single utility script and no dependency manifest should not trigger first-class stack treatment. The strong signal protects against this.
- A project using `pyproject.toml` purely for tooling configuration (e.g., a JS project that uses ruff for some Python helper scripts) may score above threshold but have no real Python codebase. Cross-check with the count of `.py` files outside `scripts/`.

## References

- [DETECTION.md](../DETECTION.md) — overall probe procedure.
- `core/stack-packs/python-web/` — stack-specific content (PR 6).

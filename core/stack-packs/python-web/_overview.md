# Python web — stack pack

## Identity

- **Pack id:** `python-web`
- **Pack version:** `1.0.0-alpha`
- **Compatible orchestra versions:** `1.0.x`
- **Primary detection signal:** [`../../discovery/signals/python.md`](../../discovery/signals/python.md)
- **Frameworks covered:** Django, Flask, FastAPI, plus generic Python web service patterns

## What this pack adds

Python web is the second first-class pack in v1. It captures patterns for the three dominant Python web frameworks — Django, Flask, FastAPI — plus the cross-cutting Python discipline (typing, async, project layout, packaging) that applies to all of them. The pack assumes Python 3.11+ in 2026; older versions are supported in the wild but new projects should not target them.

Where the frameworks diverge, the pack ships separate rule files so the agent can scope its guidance to the right framework. Where they converge (typing, project layout, virtualenv hygiene), the guidance lives in [`rules/python.md`](rules/python.md).

## File index

- [`_overview.md`](_overview.md) — this file (pack identity and layering).
- [`rules/python.md`](rules/python.md) — universal Python discipline (typing, project layout, async, packaging).
- [`rules/django.md`](rules/django.md) — Django-specific patterns (models, views, ORM, migrations).
- [`rules/flask.md`](rules/flask.md) — Flask-specific patterns (app factory, blueprints, extensions).
- [`rules/fastapi.md`](rules/fastapi.md) — FastAPI-specific patterns (Pydantic, dependency injection, async).
- [`skills.md`](skills.md) — Python-specific addenda for universal skills.
- [`roles.md`](roles.md) — Python-specific addenda for universal roles.

## Detection

The pack is selected when [`../../discovery/signals/python.md`](../../discovery/signals/python.md) reports a positive match. The signal is positive when any of the following are present at the project root: `pyproject.toml`, `requirements*.txt`, `setup.py`, `setup.cfg`, `Pipfile`, `manage.py` (Django), `app.py` / `wsgi.py` / `asgi.py`. The framework discriminators are detected separately and recorded in the install marker so the right rule files apply.

## Layering rules

This pack follows the universal layering rules in [`../_overview.md`](../_overview.md) §3:

- Roles in [`../../roles/`](../../roles/) are unchanged. [`roles.md`](roles.md) supplies stack-specific non-negotiables that adapters render alongside the universal role content.
- Skills in [`../../skills/`](../../skills/) are unchanged. [`skills.md`](skills.md) lists per-skill addenda the agent applies when running a universal skill against Python code.
- Each [`rules/<topic>.md`](rules/) is rendered into the IDE's rule location with the file-glob declared in the rule's `## When this applies` section as the rule's activation condition.

[`rules/python.md`](rules/python.md) applies to all Python files. The framework-specific rules (`django.md`, `flask.md`, `fastapi.md`) apply only when their framework is detected; if the project uses two frameworks (rare but possible — e.g., Django for the admin and FastAPI for the public API), both rule files apply.

## What this pack does NOT include

- Python data-science / ML stack (pandas, NumPy, scikit-learn, PyTorch). Tracked separately in the future `python-ml` pack.
- Python desktop or game development (PyQt, Pygame).
- Specific cloud-platform SDK opinions (boto3, google-cloud-python). Patterns reference cloud abstractions generically.
- Specific testing-library opinions (pytest is referenced but unittest is acceptable; both are mentioned).
- Project-specific code, scaffolding generators, or migration scripts.
- Python 2 patterns. End-of-life since 2020; not supported.

## References

- [`../_overview.md`](../_overview.md) — stack-packs framework overview.
- [`../_schema.md`](../_schema.md) — stack-pack file shape this pack conforms to.
- [`../../discovery/signals/python.md`](../../discovery/signals/python.md) — detection signals that select this pack.
- [`../../roles/backend-engineer.md`](../../roles/backend-engineer.md) — universal role that [`roles.md`](roles.md) extends.
- [`../../roles/devops-sre.md`](../../roles/devops-sre.md) — universal role that [`roles.md`](roles.md) extends.
- [`../../skills/code/code-review/SKILL.md`](../../skills/code/code-review/SKILL.md) — universal skill that [`skills.md`](skills.md) extends.
- [`../../skills/code/db-migration-review/SKILL.md`](../../skills/code/db-migration-review/SKILL.md) — universal skill that [`skills.md`](skills.md) extends.
- [`../../skills/code/api-design-review/SKILL.md`](../../skills/code/api-design-review/SKILL.md) — universal skill that [`skills.md`](skills.md) extends.
- [`../../skills/code/dependency-audit/SKILL.md`](../../skills/code/dependency-audit/SKILL.md) — universal skill that [`skills.md`](skills.md) extends.

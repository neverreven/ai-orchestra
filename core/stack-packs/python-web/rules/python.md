# Python patterns

## When this applies

Apply when working with any Python file. Adapter glob: `**/*.py`, `pyproject.toml`, `requirements*.txt`, `setup.cfg`.

These rules are the universal Python discipline that applies regardless of framework. Framework-specific rules ([`django.md`](django.md), [`flask.md`](flask.md), [`fastapi.md`](fastapi.md)) layer on top.

## Patterns to follow

- **Type hints everywhere.** `def f(x: int) -> str:` for every function signature, including private ones. Type hints make the type-checker (mypy / pyright / pylance) useful, communicate intent, and double as documentation.
- **Strict type-checker config.** `mypy --strict` or pyright with `strict` mode in `pyproject.toml`. Equivalent of `tsconfig.strict` in TypeScript.
- **`pyproject.toml` is the source of truth.** Project metadata, dependencies, tool config (ruff, mypy, pytest) all live here. No `setup.py` for new projects.
- **Virtualenvs are mandatory.** Use `venv`, `uv`, `poetry`, or `hatch` — pick one per project. Do not install dependencies globally.
- **`requirements.txt` (or lock file) committed.** `pip-compile` for `requirements.txt`; `poetry.lock` for poetry; `uv.lock` for uv. CI installs from the lock file.
- **Black + ruff for formatting and linting.** Black is non-negotiable for formatting (reduces diff noise to actual changes). Ruff replaces flake8 / pylint / isort and is configurable via `pyproject.toml`.
- **`logging` module for logs, not `print`.** Configure once at app startup; loggers per module via `logging.getLogger(__name__)`. Production logs in JSON (e.g., `python-json-logger`).
- **Dataclasses or Pydantic for data containers.** Plain dicts as DTOs are an anti-pattern. Dataclasses for internal types; Pydantic when validation against external input is needed.
- **Pathlib for filesystem paths.** `from pathlib import Path; Path("foo") / "bar"`. Avoid raw string concatenation and `os.path.join`.
- **Context managers for resources.** `with open(...)`, `with db.session()`, `with self.lock`. Releasing resources without context managers is a leak waiting to happen.
- **`async def` is contagious.** Mixing sync and async in the same call chain breaks the event loop. Pick one execution model per service; if you must bridge, use `asyncio.to_thread` (sync-in-async) or `loop.run_until_complete` (async-in-sync entry).
- **`__all__` defined in modules with public APIs.** Controls `from module import *` behaviour and signals which names are public.

## Anti-patterns to avoid

- **Mutable default arguments.** `def f(x=[]):` shares the same list across calls. Always use `None` as the default and assign inside.
- **Bare `except:`.** Catches `KeyboardInterrupt`, `SystemExit`, and other base-class exceptions. Use `except Exception:` at minimum; specific exceptions whenever possible.
- **`from module import *`.** Pollutes namespace, breaks IDE navigation, hides shadowing bugs.
- **Comparing with `==` to `None` or `True` / `False`.** `if x is None:`, `if x:`. The `==` comparison invokes `__eq__` and is wrong for these.
- **`type(x) == cls`.** Use `isinstance(x, cls)`. The former fails for subclasses.
- **`exec` / `eval` on user input.** Code execution from input. Refactor to a dispatch dict or a parser.
- **String concatenation in SQL.** SQL injection. Always use parameterised queries (Django ORM, SQLAlchemy `text(...).bindparams`, raw psycopg's `cursor.execute(query, params)`).
- **`global` for mutable shared state.** Refactor into a class or module-level singleton with explicit accessors.
- **Sync `requests` in async code.** Blocks the event loop. Use `httpx` (async-aware) or `aiohttp`.
- **Catching and re-raising as the same type.** `try: ... except Foo as e: raise Foo(...) from e` loses the original traceback. Use `raise` (re-raise) or `raise NewError() from e` (chain).

## When to deviate

- **Library code.** Public libraries cannot assume the caller has type-checking; runtime validation may be necessary even when the type hints look right.
- **Performance-critical inner loops.** Type-hint overhead is zero, but Pydantic validation is not. For hot loops, validate at the boundary, then pass plain dataclasses through.
- **Compatibility with older Python.** If the project must run on Python 3.9 or earlier, some syntax (PEP 604 union types, `Self` from `typing`) is unavailable. Use the older equivalents and document.
- **Migration from untyped legacy.** The first pass of adding types reasonably uses `Any`. Track in an issue, rip it out incrementally.

## References

- [Python typing docs](https://docs.python.org/3/library/typing.html).
- [PEP 8 — Style Guide](https://peps.python.org/pep-0008/).
- [PEP 484 — Type Hints](https://peps.python.org/pep-0484/).
- [Ruff documentation](https://docs.astral.sh/ruff/).
- [`django.md`](django.md), [`flask.md`](flask.md), [`fastapi.md`](fastapi.md) — framework-specific rules.
- [`../skills.md`](../skills.md) — Python skill addenda.
- [`../../../skills/code/code-review/SKILL.md`](../../../skills/code/code-review/SKILL.md) — universal code-review skill.

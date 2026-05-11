# Python — async / concurrency patterns

## When this applies

Apply when working with `async def`, `await`, `asyncio`, `aiohttp`, `httpx`, `anyio`, or any async-based framework (FastAPI, Starlette, Litestar). Adapter glob: `**/*.py` files containing `async def` or `asyncio.`. Consult alongside `fastapi.md` when the project uses FastAPI.

## Patterns to follow

### `asyncio` fundamentals

- **`async` all the way down from the event loop.** An `async def` function must be awaited; calling it without `await` creates a coroutine that is never scheduled. Linters (`flake8-async`, `asyncio-mode` in Pytest) catch this.
- **`asyncio.create_task` for true concurrency.** When two I/O-bound operations are independent, wrap them in `asyncio.create_task()` and gather with `asyncio.gather(*tasks)`. Sequential `await` on independent ops serialises them unnecessarily.
- **`asyncio.gather` vs `asyncio.wait`.** Use `gather` when all tasks must complete (raises on first exception by default; pass `return_exceptions=True` to collect). Use `wait` when you need `FIRST_COMPLETED` or `FIRST_EXCEPTION` control.
- **Timeouts on every external I/O call.** Wrap network or file I/O in `asyncio.timeout(seconds)` (Python 3.11+) or `asyncio.wait_for(coro, timeout=N)`. Absence of a timeout creates hangs that neither crash nor recover.
- **Context variables over global state.** Use `contextvars.ContextVar` for per-request context (request ID, user, tenant). Module-level global variables shared across concurrent requests are a race condition.

### Thread and process offloading

- **`loop.run_in_executor` for blocking I/O.** Synchronous blocking operations (file reads via `open()`, `boto3`, `sqlite3`, CPU-heavy `PIL` operations) must be offloaded with `await loop.run_in_executor(None, blocking_fn, arg)`. Blocking the event loop freezes all concurrent requests.
- **`ProcessPoolExecutor` for CPU-bound work.** The GIL prevents true parallelism in threads. Use `ProcessPoolExecutor` for sustained CPU work (model inference, image encoding, heavy parsing). Size the pool to `os.cpu_count() - 1`.
- **Do not mix threads and coroutines naively.** If a sync library calls `asyncio.run()` internally (some older SDKs do), wrapping it in `run_in_executor` causes nested event-loop errors. Use `nest_asyncio` only as a transitional measure with a comment explaining the plan to remove it.

### Error handling

- **Propagate cancellation.** `asyncio.CancelledError` must never be swallowed in a `except Exception` block. It inherits from `BaseException` in Python 3.8+. Always re-raise it or let it propagate.
- **Finalise resources in `try/finally` or async context managers.** `asyncio.CancelledError` can fire at any `await`. Resources (DB connections, open files, locks) must be released in `finally` blocks or via `async with`.
- **`TaskGroup` for scoped concurrent tasks (Python 3.11+).** `async with asyncio.TaskGroup() as tg: tg.create_task(...)` ensures all tasks are cancelled and awaited if any raises. Prefer it over bare `create_task` + manual exception handling.

### Testing async code

- **`pytest-asyncio` for async tests.** Decorate with `@pytest.mark.asyncio`. Configure `asyncio_mode = "auto"` in `pyproject.toml` to avoid decorating every test individually.
- **Never share event loop across tests.** Use the default `function`-scoped `event_loop` fixture (or `asyncio_mode = "auto"`). Sharing a loop between tests allows state leakage.
- **Mock time with `freezegun` or `time-machine`.** `asyncio.sleep` respects the system clock in tests. Use `freezegun` to avoid real delays.

## Anti-patterns to avoid

- **`asyncio.run()` inside an already-running loop.** Nested event loops crash on all standard implementations. Use `await coroutine` or `asyncio.create_task` instead.
- **Bare `except:` around `await` expressions.** This swallows `CancelledError`. Use `except Exception:` at most, and handle `CancelledError` explicitly above it.
- **Fire-and-forget tasks without a handle.** `asyncio.create_task(coro())` that is not stored or awaited runs until the loop exits, with no way to cancel or join it. Store the task and cancel on shutdown.
- **Mixing `requests` with `async` view functions.** `requests` is synchronous and blocks the event loop. Use `httpx.AsyncClient` or `aiohttp.ClientSession` in async contexts.
- **Passing a sync callback to an async scheduler.** `asyncio`'s `call_soon` / `call_later` accept sync callables; passing an `async def` creates an unawaited coroutine silently. Use `create_task` or `call_soon(loop.create_task, coro())`.

## References

- `fastapi.md` — FastAPI-specific async patterns
- `python.md` — base Python discipline

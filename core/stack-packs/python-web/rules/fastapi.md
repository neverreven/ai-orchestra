# FastAPI patterns

## When this applies

Apply when working with a FastAPI project — files importing from `fastapi`, projects with `fastapi` in dependencies, `app = FastAPI()` instantiations, `pydantic` models used as request/response schemas. Adapter glob: any `**/*.py` file importing `fastapi.*`.

## Patterns to follow

- **Pydantic models for request and response schemas.** Every route's input is a Pydantic model (or `Query` / `Path` parameters with type hints). Every response is annotated with `response_model=`. The OpenAPI doc and the runtime validation derive from the same source.
- **Pydantic v2.** Use Pydantic v2's API (`model_config = ConfigDict(...)`, `field_validator`, `model_validator`) — not v1's deprecated patterns.
- **Dependency injection via `Depends`.** Database sessions, auth, settings — all injected, never module globals. Tests override with `app.dependency_overrides` for isolation.
- **Settings via `pydantic-settings`.** A `BaseSettings` subclass that reads from env and validates. Cached via `@lru_cache` and injected with `Depends(get_settings)`.
- **Router-per-domain.** `APIRouter()` per area (`auth`, `users`, `posts`), included in the main `app` with `app.include_router(...)`. Same idea as Flask blueprints; better-typed.
- **Async-first.** `async def` route handlers. ORM calls use async-compatible drivers (`asyncpg`, `aiomysql`, SQLAlchemy 2.0 async). Mixing sync and async without `asyncio.to_thread` blocks the event loop.
- **Background tasks via `BackgroundTasks` (light) or a real queue (heavy).** `BackgroundTasks` runs after the response is sent in the same process. For anything needing retries, persistence, or scaling, use Celery / RQ / arq.
- **Tag and document every route.** `@router.get("/users", tags=["users"], summary="List users")`. The OpenAPI doc is the API contract; treat it as such.
- **Status codes via `status` constants.** `from fastapi import status; status.HTTP_404_NOT_FOUND`. Don't hard-code integers.
- **`HTTPException` for client errors.** Server-side bugs raise to the framework's exception handler and return 500. Domain errors map to typed exceptions caught in `@app.exception_handler`.
- **Tests via `httpx.AsyncClient` or `TestClient`.** `TestClient` for sync; `AsyncClient` for async tests. No real network in unit tests.

## Anti-patterns to avoid

- **`def` (sync) handlers using async libraries.** `async def get_thing(): result = httpx.get(...)` blocks the event loop. Either go async all the way or use the sync version of the library.
- **Pydantic v1 style in v2 codebases.** `class Config:`, `@validator`, `__fields_set__` — all deprecated in v2. Migrate.
- **Dependency overrides not reverted in tests.** If a test sets `app.dependency_overrides[get_db] = test_db` and doesn't clean up, subsequent tests inherit it. Use a fixture with teardown.
- **`response_model=` omitted.** Without it, the response shape is whatever the handler returns — including stray fields. The OpenAPI doc lies.
- **Massive Pydantic models with everything optional.** A signal that the API doesn't have a clear contract. Split into request-, response-, and persistence-shaped models.
- **Database session as a module global.** Sessions need request-scoping for safety. `Depends(get_db)` is the only correct pattern.
- **`FastAPI()` instantiated multiple times.** One per process. Multiple apps mean multiple OpenAPI docs and confused tests.
- **Pydantic field validation logic that mutates external state.** Validators are pure. Side effects belong in services.

## When to deviate

- **FastAPI as an API gateway with no business logic.** Patterns simplify: routes are thin proxies; Pydantic still validates.
- **Sync FastAPI in legacy contexts.** Possible but loses the framework's main advantage. If the project is stuck on a sync ORM, weigh migration cost vs. accepting the perf hit.
- **GraphQL via Strawberry-FastAPI.** GraphQL changes the routing and validation model entirely. Defer to Strawberry's docs.
- **Streaming responses.** `StreamingResponse` for SSE / large CSV / log streams. Patterns above (`response_model`) don't apply directly; document the stream shape in the OpenAPI description.

## References

- [FastAPI docs](https://fastapi.tiangolo.com/).
- [Pydantic v2 docs](https://docs.pydantic.dev/latest/).
- [SQLAlchemy 2.0 async ORM](https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html).
- [`python.md`](python.md) — universal Python discipline that applies to FastAPI code.
- [`flask.md`](flask.md) — closest sibling framework; some patterns shared.
- [`../skills.md`](../skills.md) — Python skill addenda, including FastAPI-specific notes.
- [`../../../skills/code/api-design-review/SKILL.md`](../../../skills/code/api-design-review/SKILL.md) — universal API-design-review.

# Flask patterns

## When this applies

Apply when working with a Flask project — files importing from `flask`, `app.py` / `wsgi.py`, project structure with `flask` listed in dependencies. Adapter glob: any `**/*.py` file that imports `flask.*` or instantiates `Flask(__name__)`.

## Patterns to follow

- **Application factory pattern.** A `create_app(config: Config) -> Flask` function that constructs and returns the app. Tests instantiate their own app with a test config. Production calls it via WSGI entry. Module-level `app = Flask(__name__)` is a maintenance hazard.
- **Blueprints for modularity.** Each major area (auth, api, admin) is a blueprint registered in `create_app`. Routes live with their blueprint, not in one mega `app.py`.
- **`Flask-SQLAlchemy` (or plain SQLAlchemy 2.0) with explicit session management.** SQLAlchemy 2.0 style (`session.execute(select(Model))`, not the deprecated `Model.query`). Sessions opened per request via the app's request lifecycle.
- **Configuration via classes.** `class Config:` for default; `class DevConfig(Config):`, `class ProdConfig(Config):`. `app.config.from_object("project.config.ProdConfig")` chooses based on env.
- **Secrets via env.** `Config.SECRET_KEY = os.environ["SECRET_KEY"]`. Crash on missing — fail fast.
- **Schema validation at the edge.** Pydantic, marshmallow, or attrs+cattrs for incoming JSON validation. Refuse to read `request.json["foo"]` directly.
- **Error handling via `@app.errorhandler`.** Centralised error responses; never bare exception with HTML stack trace in production. `Flask-RESTful` / `flask-smorest` give similar centralisation for API apps.
- **`url_for` for internal links.** Hard-coded URLs break when routes change.
- **Tests via `app.test_client()` with the test config.** No real network. The test client bypasses WSGI and is fast.
- **Logging configured in `create_app`.** A logger per module via `logging.getLogger(__name__)`; format and handlers attached during app construction.

## Anti-patterns to avoid

- **`app = Flask(__name__)` at module top level.** Singleton app makes test isolation hard, prevents multi-config, and leaks state between test cases.
- **Database calls in view functions without explicit session management.** SQLAlchemy sessions need a request-lifecycle scope. Without it, sessions leak or serve stale data.
- **`g` (request-local global) abused for cross-route state.** `g` is per-request. State that outlives a request belongs in a cache or DB.
- **Threading + SQLAlchemy without scoped sessions.** Sessions are not thread-safe. Use scoped sessions or a session-per-task pattern.
- **`request.form` / `request.args` accessed directly without validation.** User input into business logic without checking is a CVE waiting.
- **Returning HTML strings without escaping.** Use templates (Jinja2 auto-escapes) or `Markup` deliberately. `return "<p>" + name + "</p>"` is XSS.
- **`@app.before_first_request`.** Deprecated. Initialise in `create_app` or via `app.cli` / Flask 2.3+ lifecycle hooks.
- **Catching `Exception` and returning `500` with the message.** Leaks internal details. Log the full exception; return a generic message + correlation id.

## When to deviate

- **Single-file Flask apps for tiny services.** Application factory is overkill for a 50-line Lambda handler. Be honest; don't over-engineer.
- **Async with Quart.** Quart is API-compatible with Flask but adds async. Most patterns carry over with `async def`. The framework's docs override these patterns where they conflict.
- **Flask + GraphQL via Strawberry / Ariadne.** GraphQL adds its own conventions; the validation and routing patterns above no longer fully apply.
- **Migration to FastAPI.** When the API surface grows past trivial, FastAPI's automatic OpenAPI / typed-deps approach saves effort. Plan the migration; don't half-do it.

## References

- [Flask docs — Application Factories](https://flask.palletsprojects.com/en/stable/patterns/appfactories/).
- [Flask docs — Blueprints](https://flask.palletsprojects.com/en/stable/blueprints/).
- [SQLAlchemy 2.0 docs](https://docs.sqlalchemy.org/en/20/).
- [`python.md`](python.md) — universal Python discipline that applies to Flask code.
- [`fastapi.md`](fastapi.md) — closest sibling framework; some patterns shared.
- [`../skills.md`](../skills.md) — Python skill addenda, including Flask-specific code-review notes.
- [`../../../skills/code/api-design-review/SKILL.md`](../../../skills/code/api-design-review/SKILL.md) — universal API-design-review.

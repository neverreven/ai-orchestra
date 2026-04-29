# Django patterns

## When this applies

Apply when working with a Django project — files importing from `django`, `manage.py`, `settings.py` / `settings/*.py`, files inside `<app>/models.py`, `<app>/views.py`, `<app>/urls.py`, `<app>/admin.py`, `<app>/migrations/*.py`. Adapter glob: any project containing `manage.py` plus `**/*.py` files importing `django.*`.

## Patterns to follow

- **Settings split per environment.** `settings/base.py`, `settings/dev.py`, `settings/prod.py`, with `DJANGO_SETTINGS_MODULE` chosen per environment. No single 800-line `settings.py` with `if DEBUG:` everywhere.
- **`SECRET_KEY` and DB credentials from env.** Read with `os.environ` or `django-environ`. Never committed.
- **One model per concept; one app per bounded context.** Apps are small, focused, and named after what they own (`accounts`, `billing`, `inventory`). Avoid the `core` / `utils` / `common` mega-app.
- **Migrations checked in.** Every model change generates a migration via `manage.py makemigrations`. The migration file is reviewed and committed. Squashing only when the migration history grows unwieldy and has been deployed everywhere.
- **`select_related` / `prefetch_related` for foreign keys you'll touch.** The N+1 query problem is the most common Django performance bug. The Django Debug Toolbar surfaces it in development.
- **Querysets are lazy; evaluate intentionally.** A queryset is a query plan, not a result. `list(qs)`, `[x for x in qs]`, `qs.first()` evaluate. Be aware where evaluation happens and avoid evaluating in template loops.
- **`@transaction.atomic` around multi-step writes.** Either the whole sequence succeeds or none of it does.
- **Class-based views or function-based views — pick one per app.** Mixing both in the same app is unnecessary cognitive load. New code: function-based for simple cases, generic CBVs for CRUD.
- **`ALLOWED_HOSTS` populated in production.** Empty `ALLOWED_HOSTS` with `DEBUG = False` returns 400. Document the values in your deployment guide.
- **Static files via `collectstatic` + a CDN or static server.** Never serve `STATIC_URL` from Django itself in production. WhiteNoise is acceptable for small deployments; CDN is the norm.
- **Form / serializer validation centralised.** Don't validate inputs in views; let the form (Django Forms) or DRF serializer enforce.

## Anti-patterns to avoid

- **Custom user model added late.** Always start with a custom user model (subclass `AbstractUser` or `AbstractBaseUser`), even if it adds no fields initially. Migrating to a custom user later is painful.
- **`null=True, blank=True` everywhere.** Most fields should be `NOT NULL`. Use `null=True` only when the database column genuinely has no value (and use `blank=True` for form-level optionality, which is independent).
- **`auto_now` and `auto_now_add` on the same field.** They conflict; one wins. Use one with a clear semantic.
- **`signals` for cross-cutting business logic.** Signals are powerful and surprising. They make code hard to trace. Prefer explicit calls or service-layer functions.
- **`__str__` returning database queries.** `str(obj)` runs in admin lists, debug logs, error pages — anywhere. Hitting the DB there causes N+1.
- **Raw SQL through `.raw()` without parameterisation.** SQL injection. Always use the second argument: `Model.objects.raw('SELECT * FROM t WHERE x = %s', [value])`.
- **Tests hitting the real DB without `TestCase`.** `TestCase` wraps each test in a transaction that's rolled back. Without it, tests pollute the DB and fail in CI.
- **`LOGGING = {}` in `settings.py` until production breaks.** Configure logging from day one, even if just to file in dev.
- **`urls.py` deep regex without view names.** `path()` (not `re_path()`) for new code; every route gets a `name=` for `reverse()`.

## When to deviate

- **Async views (`async def`).** Django 4.1+ supports them. The patterns above mostly hold; ORM calls inside async views need `sync_to_async` or the new async ORM (Django 4.2+). Don't sprinkle async without a plan.
- **Read-only replicas / multi-DB routing.** When the project has multiple databases, `DATABASE_ROUTERS` is unavoidable. Document the routing rule clearly.
- **Custom QuerySet / Manager classes.** Encapsulating business queries in managers is good. Just don't let the manager file grow unbounded — split per concern.
- **Headless API-only Django (with DRF).** Some patterns (templates, static files) drop out. The core ORM and migration patterns still apply.

## References

- [Django docs — Models](https://docs.djangoproject.com/en/stable/topics/db/models/).
- [Django docs — Migrations](https://docs.djangoproject.com/en/stable/topics/migrations/).
- [Django docs — Database access optimization](https://docs.djangoproject.com/en/stable/topics/db/optimization/).
- [`python.md`](python.md) — universal Python discipline that applies to Django code.
- [`../skills.md`](../skills.md) — Python skill addenda, including Django-specific code-review and migration-review notes.
- [`../../../skills/code/db-migration-review/SKILL.md`](../../../skills/code/db-migration-review/SKILL.md) — universal db-migration-review.

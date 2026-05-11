# Python — testing patterns

## When this applies

Apply when writing, reviewing, or refactoring tests in a Python project. Adapter glob: `tests/**/*.py`, `test_*.py`, `*_test.py`. Works with `pytest` (primary), `unittest`, `hypothesis`, `pytest-asyncio`, `factory_boy`.

## Patterns to follow

### Structure

- **`pytest` as the default runner.** Use `pytest` for all new projects. `unittest` is acceptable in legacy code; do not mix both in the same test suite.
- **Conftest-driven fixtures.** Shared fixtures live in `conftest.py` at the appropriate scope (root, package, or sub-package). Do not import fixtures across files — `pytest` picks them up automatically.
- **Fixture scope discipline.** `function` scope is the safe default. `session` scope is acceptable for expensive-to-create objects (DB connections, test containers) that are genuinely read-only. Never use `session` scope for fixtures that mutate state.
- **Test function naming.** `test_<what>_<when>_<expected>` — e.g., `test_get_user_not_found_returns_none`. The name should be a minimal specification of the behaviour being verified.
- **Arrange / Act / Assert.** Separate the three phases with blank lines. Fixtures handle Arrange; the test body handles Act and Assert.

### Assertions

- **`assert` over `assertEqual`.** `pytest` rewrites `assert` statements to produce detailed failure diffs. Bare `assert a == b` is both more readable and gives better output than `self.assertEqual(a, b)`.
- **`pytest.raises` for expected exceptions.** Use the context-manager form and assert on the exception message: `with pytest.raises(ValueError, match="user not found"):`. Catching exceptions with `try/except` in a test file is almost always wrong.
- **Avoid `assert True` / `assert not_none`.** These pass trivially and provide no information. Assert the actual expected value; at worst, `assert value is not None, f"expected a user, got {value!r}"`.

### Mocking and isolation

- **`pytest-mock` (`mocker` fixture) over `unittest.mock.patch`.** `mocker.patch` automatically cleans up after the test. `@patch` decorators require understanding decorator application order and are less readable.
- **Patch at the point of use, not the definition.** `mocker.patch('myapp.services.email.send_email')` patches where it is imported and used. `mocker.patch('external_lib.send_email')` may not intercept the call if the module already imported the function.
- **`factory_boy` for model instances.** Use `Factory.build()` for in-memory (no DB) instances and `Factory.create()` for persisted ones. Avoid hand-constructing ORM objects in tests — factories survive model changes more gracefully.
- **Fake dependencies over mocks when possible.** An in-memory implementation of a repository interface is more resilient than a mock that tracks method calls. Fakes test behaviour; mocks test interactions.

### Database tests

- **Transactional rollback between tests.** Wrap each test in a database transaction and roll back at the end. Django's `TestCase` does this automatically; for SQLAlchemy, use a `session`-scoped connection with per-test nested transactions.
- **Never share fixtures that create unique rows across concurrent tests.** Concurrent `pytest-xdist` runs with shared DB state cause unique-constraint failures. Use `--numprocesses auto` only when tests are fully isolated.
- **Test the query, not the ORM.** When testing a repository method, assert on the data returned by a subsequent query, not just on mock call arguments. Queries that are "mocked away" cannot catch SQL errors.

### Parametrize

- **`@pytest.mark.parametrize` over duplicated tests.** When the same logic is tested with different inputs, parametrize over the inputs: `@pytest.mark.parametrize('email', ['', ' ', 'not-email'])`. Duplicated tests with small input variation are maintenance debt.
- **`pytest.param(..., id='descriptive-id')` for readability.** Generated test IDs like `test_foo[0]` and `test_foo[1]` are opaque in CI output. Add explicit `id=` to each `pytest.param`.

### Coverage

- **`pytest-cov` as the coverage tool.** Configure in `pyproject.toml`: `[tool.pytest.ini_options] addopts = "--cov=src --cov-report=term-missing"`. Fail the build on < 80% branch coverage: `--cov-fail-under=80`.
- **`# pragma: no cover` with justification.** When excluding a line from coverage, add a comment explaining why: `# pragma: no cover — reached only via OS signal handler`.

## Anti-patterns to avoid

- **Tests with no assertions.** A test that calls code but asserts nothing passes even when the code raises and the exception is swallowed. Every test must have at least one `assert` or `pytest.raises`.
- **`monkeypatch` on real third-party SDKs in unit tests.** Patching `boto3.client` at the function boundary is fragile across SDK version updates. Hide the SDK behind an interface and test the interface.
- **Deeply nested `setUp` / `tearDown` logic.** Long setup methods that are hard to read make test failures hard to diagnose. Break large test classes into smaller ones or migrate to fixtures.
- **`import *` in test files.** Wildcard imports make it impossible to tell where a name comes from. They also pollute the namespace and can cause accidental fixture shadowing.
- **`time.sleep` in tests.** Delays make tests slow and flaky. Use `freezegun` / `time-machine` for time-dependent code; mock out the delay function.

## References

- `async-patterns.md` — async-specific testing (`pytest-asyncio`)
- `python.md` — base Python discipline

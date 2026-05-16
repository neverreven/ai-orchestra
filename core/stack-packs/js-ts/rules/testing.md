# JavaScript / TypeScript — testing patterns

## When this applies

Apply when writing, reviewing, or refactoring tests in a JavaScript or TypeScript project. Adapter glob: `**/*.{test,spec}.{js,ts,jsx,tsx}`, `**/__tests__/**/*.{js,ts,jsx,tsx}`. Works alongside any testing framework (Vitest, Jest, Mocha, Playwright, Cypress, Testing Library).

## Patterns to follow

### Structure

- **One test file per module.** `Foo.ts` → `Foo.test.ts` (or `Foo.spec.ts`), colocated beside the source file, not in a distant `tests/` folder. Flat `tests/` directories make file-to-test navigation expensive.
- **AAA — Arrange / Act / Assert.** Every test has three clear phases. A blank line between phases signals the boundary. Tests that mix phases (assert while still arranging) are harder to debug.
- **Describe + it naming.** `describe('UserService')` groups by subject; `it('returns null when user is not found')` names the specific behaviour. Assertions should rarely need a message — a good test name makes the failure self-explanatory.
- **One logical assertion per test.** A test that checks five independent conditions fails for any of them with no indication of which. One condition per test means one fix per failure. Grouping related assertions on the same value (`expect(obj).toEqual({ ... })`) is fine.
- **Test the public API, not the implementation.** Call the function or component the way consumers do. Do not call private methods, reach into internal state, or test that a specific private function was called. When an implementation changes without breaking behaviour, tests should stay green.

### Mocks and isolation

- **Mock at the boundary.** Mock network, file system, clocks, and external services. Do not mock functions within the module under test — that collapses the test into a tautology.
- **Prefer test doubles over real infrastructure in unit tests.** Use in-memory stores, mock transport layers, or dependency injection rather than spinning up real databases or HTTP servers in unit tests. Reserve the real infrastructure for integration tests.
- **Reset all mocks between tests.** `beforeEach(() => jest.resetAllMocks())` (or Vitest equivalent). A test that passes because a previous test set state is not a test — it is a coincidence.
- **Avoid snapshot tests for logic.** Snapshot tests are appropriate for UI component output (`toMatchSnapshot()`). They are a poor substitute for assertion-based tests of business logic — a passing snapshot means nothing changed, not that the result is correct.

### Coverage

- **Cover the sad path first.** Error handling, validation failures, and null inputs are the cases most likely to reach production unfixed. If there is only time for three tests, write: happy path, empty/null input, and error thrown by a dependency.
- **100% coverage is a vanity metric; 0% is recklessness.** Aim for meaningful coverage of critical paths. Coverage gating at 80% (branches + lines) is a reasonable floor — it prevents regressions while not forcing trivial getter/setter tests.
- **Mutation score over line coverage.** When the project uses a mutation testing tool (Stryker, mutmut), a mutation score > 60% is a better signal of test quality than 80% line coverage.

### Performance

- **Tests must be fast.** Unit tests should complete in < 50 ms each; the full unit suite should finish in < 30 seconds. Slow tests are skipped or disabled, which defeats their purpose. Profile with `--verbose` or `--reporter=verbose` and target anything > 100 ms.
- **Parallel safe.** Do not use shared mutable state at module scope. Each test must be able to run in isolation and in any order. `beforeEach` / `afterEach` are the right scoping tools; module-scope `let` variables shared across tests are a smell.
- **No `setTimeout` or `sleep` in tests.** Use fake timers (`vi.useFakeTimers()` / `jest.useFakeTimers()`) to advance time without waiting. Real waits make test suites brittle and slow.

### Integration and E2E

- **Integration tests own a real runtime.** If you need a DB, use a real in-process DB (SQLite, `@databases/sqlite`, or Postgres via `testcontainers`) spun up in `beforeAll` and torn down in `afterAll`. Sharing a long-lived container between test files requires each file to operate on isolated data (unique tenant id, unique schema prefix).
- **E2E tests cover critical user flows.** Playwright / Cypress tests are expensive. Write them for the paths that matter most: login, checkout, primary CRUD operations. Do not write E2E tests for every unit-level behaviour.
- **Avoid `page.waitForTimeout` in Playwright.** Wait for a specific condition: `page.waitForSelector`, `expect(page.locator(...)).toBeVisible()`, `page.waitForResponse`. Arbitrary delays are flake waiting to happen.

## Anti-patterns to avoid

- **`it.only` / `test.only` committed to the repo.** These silently disable the entire test suite. Add a linting rule (`no-focused-tests` in eslint-plugin-jest or Vitest's equivalent) to catch them in CI.
- **Tests with no assertions.** An `it('does something', async () => { await doThing() })` with no `expect` passes even when `doThing` throws a swallowed error. Every test must have at least one assertion.
- **Asserting on mock call counts when the behaviour is what matters.** `expect(myMock).toHaveBeenCalledTimes(3)` is an implementation detail. The test should assert on the observable effect (what the mock returned, what state changed). Call-count assertions are fragile when refactoring.
- **Giant `beforeAll` that sets up everything.** A `beforeAll` block that exceeds 50 lines is doing too much work shared across unrelated tests. Break the describe block into smaller groups, each with targeted setup.
- **Re-exporting internal implementation for the sake of testing.** Do not add `export` to a function purely to test it. If testing internals is tempting, the module's design may need revision (extract a smaller, independently testable module).

## References

- `react.md` — React-specific testing patterns (Testing Library, hook testing)
- `typescript.md` — TypeScript compiler strictness as a first line of defence against bugs

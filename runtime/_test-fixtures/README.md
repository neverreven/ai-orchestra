# Runtime Test Fixtures

> Minimal, self-contained scenarios for verifying core runtime behaviours.
> These are **not** full integration tests — they are fixtures that can be
> exercised manually or wired into a future test runner.

## Fixtures

### `scope-enforcement/`

Verifies the `ScopeEnforcer` logic:

- `allowed-read.json` — read on a `readOnly` path → expect `allow`
- `allowed-write.json` — write on a `readWrite` path → expect `allow`
- `denied-write-on-readonly.json` — write on a `readOnly` path → expect `deny`
- `denied-forbidden.json` — read on a `forbidden` path → expect `deny`
- `denied-global-forbidden.json` — read `.env` → expect `deny` (global)
- `traversal-attempt.json` — path with `../../` escape → expect `deny`

### `bus-roundtrip/`

Verifies `BusHandle` message lifecycle:

- `initial-state.json` — expected empty state after `openBus()` call
- `after-delegate.json` — expected inbox state after Lead delegates a task
- `after-report.json` — expected outbox + task status after a role agent reports

### `auth-middleware/`

Verifies `AuthManager` decisions:

- `owner-allowed.json` — owner ID → expect `allow`
- `stranger-denied.json` — unknown user ID → expect `deny` (silent)
- `invited-user-allowed.json` — user added via `/allow` → expect `allow`
- `revoked-user-denied.json` — user removed via `/revoke` → expect `deny`
- `rate-limited.json` — same user 21 messages in 60s → expect `rateLimit` on 21st

## How to use

```bash
# Future: bun test (once test runner is wired)
# For now: manually inspect fixture JSON and run against framework units
```

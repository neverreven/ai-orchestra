# Node server patterns

## When this applies

Apply when working with Node.js HTTP services — Express, Fastify, Hono, Koa, or hand-rolled `http.createServer`. Adapter glob: any file under a `server/`, `api/`, or `backend/` directory; any file importing `express`, `fastify`, `hono`, `koa`, or `node:http`; standalone `*.server.ts` / `*.server.js`.

## Patterns to follow

- **Twelve-factor config.** All configuration via env vars. The server boots from a typed `config` module that reads `process.env`, validates with Zod / valibot / arktype, and fails fast with a clear error if something is missing or wrong.
- **No secrets on the filesystem.** `.env` files are dev-only and gitignored. Production reads from the platform secret store. The `config` module should not even know what a `.env` file is.
- **Structured logging from day one.** JSON logs (pino, bunyan, Winston in JSON mode), one log entry per request with a request id, status, duration, and any contextual fields. Avoid `console.log` in production code paths.
- **Graceful shutdown.** Listen for `SIGTERM` / `SIGINT`, stop accepting new connections, drain in-flight requests with a timeout, then exit. Container platforms send `SIGTERM`; ignoring it loses requests during deploys.
- **Health checks.** Two endpoints: `/healthz` (liveness — process is alive) and `/readyz` (readiness — process is ready to serve, including dependent services like the DB). Keep them cheap and side-effect-free.
- **Request validation at the edge.** Every incoming body / query / params is parsed and validated before any downstream code sees it. Reject early with structured 4xx errors. Do not rely on TypeScript types alone — they are erased at runtime.
- **Errors carry codes.** Domain errors are typed with a stable `code` string (`E_USER_NOT_FOUND`, `E_RATE_LIMIT`) so the client can branch reliably. HTTP status alone is insufficient.
- **Async work is bounded.** Long-running operations (background jobs, file processing) live in a queue, not in HTTP handlers. The handler returns 202 with a job id; the worker processes asynchronously.
- **Database access through a single repository / data layer.** Routes call repositories; repositories call the DB driver. No SQL strings inline in route handlers. This makes testing, observability, and schema changes manageable.
- **Connection pooling configured.** Libraries that hide the pool size (`mongoose`, `prisma`) still have one — confirm the configured value. Default of 10 is rarely right for real workloads.
- **Rate limiting on public endpoints.** Even if the app is "internal", every public-facing route gets a sane rate limit. Cheaper than learning the answer in incident retrospective.

## Anti-patterns to avoid

- **`app.use(bodyParser())` with unlimited size.** Default body parsers in Express ship without size limits. Always cap (e.g., `1mb`) and override per route only when needed.
- **Catching errors silently.** `try/catch` that logs and swallows hides failures from monitoring. Either rethrow, return a typed error, or log AND mark the request as failed.
- **`process.exit()` from non-startup code.** Production should die only by `SIGTERM` and graceful shutdown. Calling `process.exit()` mid-request loses every other in-flight request.
- **Database queries in middleware.** Middleware runs for every request. A DB query there is a per-request cost paid even when the route doesn't need it. Hoist to the route or use a lazy-loaded context object.
- **`await`-ing inside loops without `Promise.all`.** Sequential awaits cost N × latency. When operations are independent, `Promise.all` reduces it to 1 × max-latency. Be careful with N being large; rate-limit your concurrency with `p-limit` or similar.
- **Returning user-input strings directly in error messages.** Reflecting input verbatim is a path to XSS in error pages and a leak of internal state. Sanitise or describe.
- **`Date.now()` for ordering / dedup.** Clocks skew, especially across replicas. Use a monotonic source (database row id, ULID, sequence) for ordering.

## When to deviate

- **Edge / serverless runtimes.** Cloudflare Workers, Vercel Edge, Deno Deploy do not have full Node APIs. Many patterns above (graceful shutdown, persistent connection pools) do not apply. Defer to the runtime's docs.
- **Event-driven architectures.** When the service is mostly an event consumer (Kafka, SQS, NATS), HTTP-route patterns matter less; queue-consumer patterns dominate. Most rules carry over (typed errors, bounded async, structured logs).
- **WebSocket-heavy services.** Long-lived connections invalidate per-request rate-limiting and add their own resource-management concerns. Rate-limit per-connection events instead.
- **Performance-critical microservices.** Logging, validation, and middleware add latency; in extreme cases, narrowed-down hot paths skip them. Be explicit about it; do not let the optimisation creep into normal paths.

## References

- [Node.js docs — Process Events](https://nodejs.org/api/process.html#process-events).
- [The Twelve-Factor App](https://12factor.net/).
- [`typescript.md`](typescript.md) — TypeScript discipline that applies to server code.
- [`../skills.md`](../skills.md) — JS/TS skill addenda, including server-side code-review and dependency-audit notes.
- [`../../../skills/quality/auth-flow-review/SKILL.md`](../../../skills/quality/auth-flow-review/SKILL.md) — universal auth-flow review (often relevant for Node servers).
- [`../../../skills/quality/security-baseline/SKILL.md`](../../../skills/quality/security-baseline/SKILL.md) — universal security baseline.
- [`../../../skills/platform/observability-baseline/SKILL.md`](../../../skills/platform/observability-baseline/SKILL.md) — universal observability baseline.

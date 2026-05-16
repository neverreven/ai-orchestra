# Node.js — API service patterns

## When this applies

Apply when working on a Node.js HTTP API service — Express, Fastify, Hono, NestJS, or plain Node HTTP. Adapter glob: `server/**/*.{js,ts}`, `api/**/*.{js,ts}`, `src/routes/**/*.{js,ts}`. Consult alongside `typescript.md` when the project uses TypeScript.

## Patterns to follow

### Structure

- **Thin route handlers.** Route files own only: input parsing, a single service call, and the response shape. Business logic belongs in a service layer; database queries belong in a data-access layer. A route handler that exceeds 30 lines is almost certainly doing too much.
- **Explicit error middleware.** All async errors must be caught and forwarded to a centralised error-handling middleware (`next(err)` in Express; `reply.send(err)` in Fastify). Never `try/catch` in every handler without a fallback — one missed catch leaks a 500 with a stack trace in production.
- **Route grouping by domain.** Group routes as `router.get('/users', ...)` in a `users.routes.ts` file, mounted with `app.use('/users', usersRouter)`. Do not pile all routes into a single file.
- **Validate at the boundary.** Use a schema library (Zod, Joi, Yup, Fastify schema) to validate request body, query, and path params before they reach the service layer. Type assertions on raw `req.body` are not validation.
- **Return early on bad input.** Check for validation errors and return `400` before entering business logic. Don't nest happy-path code inside `if (valid)` blocks.
- **HTTP status codes with intent.** `200` success, `201` created, `400` bad request, `401` unauthenticated, `403` unauthorised, `404` not found, `409` conflict, `422` unprocessable, `500` internal error. Use them precisely; `200` for everything is a red flag.

### Async

- **Async all the way down.** Mix of async and sync I/O on the same thread blocks the event loop. Any operation that may block (file I/O, DB, network) must be async; any sync operation that takes > 1 ms (heavy computation, crypto, image processing) should be offloaded to a worker thread or a job queue.
- **`Promise.all` for independent async ops.** When fetching from two independent data sources, parallelise with `Promise.all`. Sequential awaits are only appropriate when there is a data dependency.
- **Reject with typed errors.** Reject with an `Error` subclass that carries a `statusCode` and `code` string — not with plain strings or bare `new Error('message')`. The error middleware maps these to HTTP responses deterministically.

### Security

- **Never trust `req.body` shape.** Validate and strip unknown keys (strict schema mode). Log unrecognised keys at `debug` level but do not echo them back in error responses.
- **Avoid `eval`, `Function()`, and `vm.runInNewContext` on user input.** These are code injection vectors.
- **Rate-limit public endpoints.** Apply a rate limiter middleware (`express-rate-limit`, Fastify's built-in rate plugin) to all unauthenticated or public routes before launch.
- **Log request IDs, never secrets.** Attach a `requestId` (uuid v4) to every request's log context. Never log `Authorization` header values, passwords, or raw tokens — log only the last 4 characters or the token's `jti` claim.
- **Set security headers.** Use `helmet` (Express) or equivalent. At minimum: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Content-Security-Policy`.
- **SQL parameters, never string concatenation.** Parameterised queries only. ORMs and query builders are acceptable when they escape by default; raw SQL must use `?` / `$1` placeholders.

### Observability

- **Structured logging.** Use `pino` or `winston` configured for JSON output. `console.log` is acceptable in local dev but must not reach production. Each log entry must carry: `level`, `requestId`, `service`, `timestamp`.
- **Health endpoint.** Expose `GET /health` returning `{ status: "ok" }` and a DB connectivity check. Keep it unauthenticated and fast (< 50 ms).
- **Graceful shutdown.** Listen for `SIGTERM`; close the HTTP server with `server.close()`, then drain the DB connection pool. Container orchestrators send `SIGTERM` before killing the process — honour it.

## Anti-patterns to avoid

- **`process.exit()` on unhandled errors in handler code.** A single request's error should not kill the server. Use error middleware; only crash for truly unrecoverable startup failures.
- **Unhandled promise rejections.** Any `async` function that can throw must either be awaited inside a `try/catch` or have its promise `.catch(next)` attached (Express pattern). Unhandled rejections crash Node since v15.
- **Reading `process.env` inside route handlers.** Read configuration once at startup (a config module) and pass it down. Inline `process.env` access makes tests fragile and hides missing variables until runtime.
- **`app.use(cors())` with `origin: '*'` in production.** Wildcard CORS is acceptable in development; production should restrict to known origins via an allowlist.
- **Blocking the event loop with `JSON.parse` on massive payloads.** Set an explicit body size limit (`express.json({ limit: '1mb' })`). Streaming parsers exist for larger payloads.
- **In-process session storage (`MemoryStore`).** In-process stores leak memory and break horizontal scaling. Use Redis or a DB-backed store in any environment with more than one instance.

## References

- `typescript.md` — TypeScript standards (apply alongside this file for TypeScript APIs)
- `node-server.md` — the existing js-ts pack file; this rule deepens the patterns established there

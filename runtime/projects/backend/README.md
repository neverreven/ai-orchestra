# Backend Engineer Agent

Handles all server-side and API work:
- REST / GraphQL / tRPC API development
- Database schema, migrations, queries
- Authentication and session management
- Node.js / Python / Go / Rust server code

**Scope:** Read-write access to `server/`, `api/`, `db/`, `migrations/`.
Write-forbidden on `src/` (frontend), `.env*`.

## Setup
```bash
cp .env.example .env
# Fill in TELEGRAM_BOT_TOKEN, CWD
```

## Run
```bash
bun run dev backend
```

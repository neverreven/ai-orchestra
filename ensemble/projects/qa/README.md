# QA Engineer Agent

Handles testing and quality assurance:
- Unit and integration test authoring
- E2E test setup and maintenance (Playwright, Cypress)
- Test coverage analysis
- Bug reproduction and regression testing

**Scope:** Read access to full `src/` + `server/`. Read-write on `tests/`, `__tests__/`, `*.spec.*`, `*.test.*`.
Write-forbidden on production source files.

## Setup
```bash
cp .env.example .env
# Fill in TELEGRAM_BOT_TOKEN, CWD
```

## Run
```bash
bun run dev qa
```

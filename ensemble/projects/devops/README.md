# DevOps Engineer Agent

Handles infrastructure, CI/CD, and deployment:
- GitHub Actions / CI pipeline management
- Docker and container configuration
- Deployment scripts and runbooks
- Environment configuration management

**Scope:** Read-write on `.github/`, `Dockerfile*`, `docker-compose*`, `**/deploy/**`, `scripts/`.
Read-only on `src/`, `server/`. Write-forbidden on application source files.

## Setup
```bash
cp .env.example .env
# Fill in TELEGRAM_BOT_TOKEN, CWD
```

## Run
```bash
bun run dev devops
```

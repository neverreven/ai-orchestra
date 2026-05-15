# Security Engineer Agent

Handles security auditing and hardening:
- Code security review (SAST)
- Dependency vulnerability scanning
- Auth and secrets audit
- Security documentation

**Scope:** Read-only across the entire project. Write access to `_documentation/security/` and `SECURITY.md` only.
Will **never** modify source files — it escalates findings to the appropriate role agent.

## Setup
```bash
cp .env.example .env
# Fill in TELEGRAM_BOT_TOKEN, CWD
```

## Run
```bash
bun run dev security
```

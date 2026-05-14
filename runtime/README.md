# AI Orchestra — Runtime (v2)

> A multi-agent orchestration system: a Lead Agent + specialised Role Agents, coordinated via a file-system message bus and exposed as a private Telegram bot team.

## What is this?

The `runtime/` directory is the **active, executing** part of AI Orchestra v2.
The `ai-orchestra/` directory alongside it remains the **spec** (Cursor rules,
skill templates, role definitions). They complement each other:

| Layer | Location | Purpose |
|-------|----------|---------|
| **Spec** | `../` | Cursor rules, role prompts, skill definitions, stack packs |
| **Runtime** | `runtime/` | Live agents that actually run, communicate, and make code changes |

## Architecture

```
User (Telegram)
    │
    ▼
Lead Orchestrator bot
    │  delegates via .state/ message bus
    ├──▶ Frontend Agent
    ├──▶ Backend Agent
    ├──▶ QA Agent
    ├──▶ DevOps Agent
    └──▶ Security Agent
```

**Key properties:**
- Each agent is a separate Telegram bot with its own token
- Agents communicate via a file-system bus (`.state/` directory)
- Three-tier filesystem scope enforcement prevents agents from touching out-of-scope files
- All agent responses stream to Telegram with a live cursor — never a frozen screen
- A `[■ Stop]` button lets you cancel any in-progress response
- OS keep-awake prevents the host machine from sleeping during AFK operation
- Graceful shutdown saves interrupted tasks; resume/discard on next start

## Quick start

```bash
# Install dependencies
cd runtime
bun install

# Run the interactive setup wizard
bun run setup

# Start the Lead Orchestrator
bun run dev lead

# Or start all configured agents
bun run dev
```

See [RUN.md](./RUN.md) for the full operational guide.

## Agent roles

| Agent | Telegram bot | Scope |
|-------|-------------|-------|
| **Lead** | `@your_lead_bot` | Full project read, `.state/` + docs write |
| **Frontend** | `@your_frontend_bot` | `src/`, `public/`, styles |
| **Backend** | `@your_backend_bot` | `server/`, `api/`, `db/` |
| **QA** | `@your_qa_bot` | Tests read+write, source read-only |
| **DevOps** | `@your_devops_bot` | `.github/`, Docker, deploy scripts |
| **Security** | `@your_security_bot` | Full read, security docs write only |

## Project structure

```
runtime/
├── agents-framework/    # Shared TypeScript library
│   └── src/
│       ├── types.ts     # Shared types (mirrors OpenSpec schemas)
│       ├── config.ts    # Env loading, preflight, AgentConfig builder
│       ├── scope.ts     # Three-tier filesystem access enforcement
│       ├── auth.ts      # Telegram auth, rate limiting, user management
│       ├── bus.ts       # File-system inter-agent message bus
│       ├── agent.ts     # System prompt builder (Lead + Role)
│       ├── bot.ts       # Grammy bot factory, streaming, Stop button
│       ├── state.ts     # JsonStore, session history, shutdown markers
│       ├── keepawake.ts # OS sleep prevention (macOS / Linux / Windows)
│       └── logger.ts    # Structured JSON logger (daily log files)
│
├── openspec/            # JSON Schema contracts
│   ├── task.schema.json
│   ├── bus-message.schema.json
│   ├── delegation.schema.json
│   ├── report.schema.json
│   ├── escalation.schema.json
│   ├── scope.schema.json
│   └── agent-manifest.schema.json
│
├── projects/            # Individual agent entry points
│   ├── lead/src/index.ts
│   ├── frontend/src/index.ts
│   ├── backend/src/index.ts
│   ├── qa/src/index.ts
│   ├── devops/src/index.ts
│   └── security/src/index.ts
│
└── scripts/             # Workspace utilities
    ├── setup.ts         # Interactive first-run wizard
    ├── dev.ts           # Start one or all agents
    └── list.ts          # Show project status
```

## Security model

- **Private bots only** — unauthorized messages are silently dropped
- **Owner + allowlist** — only the owner can use `/allow`/`/revoke` to add users
- **Rate limiting** — 20 messages per 60 seconds per user
- **Three-tier scope** — `readWrite` / `readOnly` / `forbidden` per agent role
- **Global forbidden** — `.env*`, private keys, secrets are always off-limits
- **Bash guard** — dangerous shell patterns are blocked before execution

## OpenSpec contracts

Inter-agent messages are validated against JSON Schemas in `openspec/`. See
[openspec/_overview.md](./openspec/_overview.md) for the design rationale and
a guide to adding new message types.

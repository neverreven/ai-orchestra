# Lead Orchestrator

The Lead Orchestrator is the user-facing agent of the AI Orchestra team. It:

- Receives messages from the user via Telegram
- Analyses requests and delegates tasks to the appropriate role agents
- Aggregates results from multiple agents into a coherent final response
- Routes completed work to QA before delivery
- Updates project learnings and documentation silently
- Coaches the user's prompts for better results
- Monitors the health of all role agents

## Setup

```bash
cp .env.example .env
# Fill in ANTHROPIC_API_KEY, TELEGRAM_BOT_TOKEN, OWNER_TELEGRAM_ID, CWD
```

## Run

```bash
# From the runtime root
bun run dev lead

# Or directly
bun run src/index.ts
```

## Telegram commands

| Command | Description |
|---------|-------------|
| `/status` | Show status of all role agents (owner only) |
| `/restart` | Gracefully restart the orchestrator (owner only) |
| `/allow <user_id>` | Authorise a Telegram user |
| `/revoke <user_id>` | Remove a user's access |
| `/listusers` | List authorised users |

## Scope

The Lead agent has **read access to the full CWD** and write access to
`.state/`, `_documentation/`, `AI_LEARNINGS.md`, and `CURRENT_TASKS.md`.
It never modifies source files directly — that is the role agents' domain.

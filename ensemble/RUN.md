# Running AI Orchestra Runtime

> Quick reference for starting, stopping, and managing the agent team.

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| [Bun](https://bun.sh) | ≥ 1.1 | Runtime + package manager |
| [Anthropic API key](https://console.anthropic.com) | — | Credit card needed |
| [Telegram bots](https://t.me/BotFather) | — | One bot per agent |

## First-time setup

```bash
cd runtime
bun install         # install all workspace dependencies
bun run setup       # interactive configuration wizard
```

The wizard will ask for:
1. **Anthropic API key** — validated live against the API
2. **Your Telegram user ID** — find it by messaging @userinfobot
3. **Target project CWD** — the root of the project the agents will work on
4. **Bot tokens** (optional — can be deferred)

Configuration is stored in:
- `runtime/.env` — shared secrets (API key, owner ID)
- `runtime/projects/<name>/.env` — per-agent token and CWD

## Starting agents

```bash
# Start all configured agents
bun run dev

# Start only the Lead Orchestrator
bun run dev lead

# Start a specific agent
bun run dev backend
```

## Stopping agents

Send `SIGINT` (`Ctrl+C`) or `SIGTERM`. Agents will:
1. Mark any in-progress tasks as `INTERRUPTED`
2. Flush state to `.state/`
3. Write a shutdown marker
4. Stop the OS keep-awake process

## Checking status

```bash
# List all projects and their setup status
bun run list
```

Or from Telegram, send `/status` to the Lead bot.

## Resuming after a crash or restart

On startup the Lead agent automatically detects interrupted tasks from the last
session and notifies you on your first Telegram message. Reply **"resume"** or
**"discard"** to decide what happens to each interrupted task.

## OS keep-awake

When any agent starts, it spawns an OS-level keep-awake process to prevent the
host machine from sleeping during AFK operation:

| OS | Method |
|----|--------|
| macOS | `caffeinate -i -w <pid>` |
| Linux | `systemd-inhibit --what=sleep sleep infinity` |
| Windows | PowerShell `SetThreadExecutionState(ES_CONTINUOUS)` |

For production, consider running agents on a VPS, Raspberry Pi, or cloud VM
that doesn't sleep.

## Production deployment

For persistent hosting without a local laptop:

1. **Railway / Fly.io / Render** — push the `runtime/` directory, set env vars in the dashboard, and set the start command to `bun run dev`.
2. **VPS** — use `pm2` or a `systemd` unit to keep agents alive after reboot.
3. **Docker** — a `Dockerfile` is planned for a future release.

## Directory structure

```
runtime/
├── .env                     # shared secrets (gitignored)
├── .state/                  # runtime state (gitignored)
│   ├── lead/                # lead agent state
│   │   ├── tasks.json
│   │   ├── inbox.json
│   │   ├── sessions.json
│   │   └── logs/
│   └── <role>/              # per-role state
├── agents-framework/        # shared runtime library
├── openspec/                # JSON Schema contracts
├── projects/                # individual agent projects
│   ├── lead/
│   ├── frontend/
│   ├── backend/
│   ├── qa/
│   ├── devops/
│   └── security/
└── scripts/                 # dev / setup / list utilities
```

# Running AI Orchestra Ensemble

> Quick reference for starting, stopping, and managing the agent team.

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| [Bun](https://bun.sh) | ≥ 1.1 | Runtime + package manager |
| [Anthropic API key](https://console.anthropic.com) | — | Credit card needed |
| [Telegram bots](https://t.me/BotFather) | — | One bot per agent (optional if using Slack or web UI only) |

## First-time setup

```bash
cd .ai-orchestra/ensemble
bun install         # install all workspace dependencies
bun run setup       # interactive configuration wizard
```

The wizard will ask for:
1. **Anthropic API key** — validated live against the API
2. **Your Telegram user ID** — find it by messaging @userinfobot (skip if not using Telegram)
3. **Target project CWD** — the root of the project the agents will work on
4. **Bot tokens** (optional — can be deferred)

Configuration is stored in:
- `.ai-orchestra/ensemble/.env` — shared secrets (API key, owner ID)
- `.ai-orchestra/ensemble/projects/<name>/.env` — per-agent token and CWD

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

Or from Telegram/Slack/web, send `/status` to the Lead.

## Resuming after a crash or restart

On startup the Lead agent automatically detects interrupted tasks from the last
session and notifies you on your first message. Reply **"resume"** or
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

## Process daemon (recommended for persistent local use)

Run the ensemble under the built-in restart daemon instead of `bun run dev`
directly. The daemon applies exponential backoff on crashes and writes a PID file:

```bash
bun run daemon        # start ensemble under the daemon
bun run daemon:stop   # graceful stop
```

## System service (auto-start on boot)

Generate and install a platform service file so the ensemble starts automatically:

```bash
bun run install-service          # generates service file + prompts to install
bun run install-service --dry    # print the generated file without installing
```

| OS | Service type | Location |
|----|-------------|---------|
| macOS | launchd plist | `~/Library/LaunchAgents/` |
| Linux | systemd user unit | `~/.config/systemd/user/` |
| Windows | Task Scheduler XML | registered via `schtasks` |

Or ask your agent: _"set up orchestra daemon"_

## Production deployment

For persistent hosting without a local laptop:

1. **Docker (recommended)** — build and run the provided `Dockerfile` + `docker-compose.yml`:
   ```bash
   cd ensemble
   cp .env.example .env   # fill in ANTHROPIC_API_KEY, bot tokens, etc.
   docker compose up -d
   docker compose logs -f
   ```
   See `ensemble/docker-compose.yml` for volume mounts and project bind-mounts.
   Or ask your agent: _"deploy with Docker"_

2. **Railway / Fly.io / Render** — push the `ensemble/` directory, set env vars in the dashboard, start command `bun run dev`.

3. **VPS** — install the system service (see above) or use `pm2` to keep agents alive after reboot.

## Directory structure

```
ensemble/
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

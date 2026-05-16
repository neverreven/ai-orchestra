# AI Orchestra — Ensemble (Tier 2 + 3)
a guide to adding new message types.
## Communication channels

The Lead agent exposes multiple channels simultaneously. Any channel can send tasks; all channels receive streamed responses.

| Channel | Enable | How |
|---------|--------|-----|
| **Web dashboard** | `ENABLE_WEB_UI=true` | `npx @neverreven/ai-orchestra chat` — opens `localhost:WEB_UI_PORT` |
| **Telegram** | `ENABLE_TELEGRAM=true` + bot tokens | `npx @neverreven/ai-orchestra setup-telegram` |
| **Slack** | `ENABLE_SLACK=true` + `SLACK_BOT_TOKEN` + `SLACK_APP_TOKEN` | ask agent _`\"set up Slack\"`_ |

Voice messages sent via Telegram are transcribed automatically using the OpenAI Whisper API (`OPENAI_API_KEY` required).

## GitHub integration

The web server exposes `POST /github` as a webhook receiver.

1. In your GitHub repo, add a webhook pointing to `https://<host>/github` (content type: `application/json`).
2. Set `GITHUB_WEBHOOK_SECRET` in `ensemble/.env`.
3. Set `GITHUB_TOKEN` for posting PR reviews.
4. Enable `GITHUB_CHECK_RUN=true` to create CI check runs on pull requests.

On a `pull_request` event the Lead routes each changed file's diff to the appropriate role agent, collects
reviews, and posts the aggregated result as a PR comment. See `core/skills/setup/setup-github/SKILL.md`.

## Docker deployment

```bash
cd ensemble
cp .env.example .env    # fill in ANTHROPIC_API_KEY, bot tokens, etc.
docker compose up -d    # builds image + starts ensemble
docker compose logs -f  # stream logs
```

Project directories must be bind-mounted into the container. Edit `docker-compose.yml`:

```yaml
volumes:
  - /path/to/your/project:/projects/my-project:ro
```

Then register the path in the Lead agent via the web dashboard or Telegram: `add project /projects/my-project`.

See `core/skills/setup/deploy-docker/SKILL.md` for the full walkthrough.

## Autonomous project orchestration

The Lead agent can autonomously bootstrap Tier 1 into any project from a single command:

- **Telegram / Slack:** `/orchestrate /path/to/project`
- **Web dashboard:** type `orchestrate /path/to/project` in the Chat tab
- **CLI:** `bun run scripts/orchestrate-project.ts /path/to/project`

Flow: detect stack → generate adapter files via Claude → present diff → write on confirmation → update registries.

See `core/skills/setup/orchestrate-project/SKILL.md` for details.

# AI Orchestra — Ensemble (Tier 2 + 3)

> A multi-agent orchestration system: a Lead Agent + specialised Role Agents, coordinated via a file-system message bus and optionally exposed as a private Telegram bot team for remote orchestration.

## What is this?

The `ensemble/` layer is the **active, executing** tier of AI Orchestra — the agents who actually perform. The `score/` layer alongside it is the **spec** (rules, skill templates, role definitions). They complement each other:

| Layer | Location | Tier | Purpose |
|-------|----------|------|---------|
| **Score** | `score/` | 1 — Solo Agent | IDE rules, skill templates, role definitions, Director system |
| **Ensemble** | `ensemble/` | 2 — Agentic Team | Lead + Role agents running as background processes |
| **Remote** | Telegram config | 3 — Remote Orchestration | Telegram bots exposing the ensemble to your phone |

## Architecture

```
User (IDE session)                 ←— Tier 1: Score
User (Telegram, remote)            ←— Tier 3: Remote

    ↓
Lead Orchestrator agent
    │  delegates via .state/ message bus
    ├──▶ Frontend Agent
    ├──▶ Backend Agent
    ├──▶ QA Agent
    ├──▶ DevOps Agent
    └──▶ Security Agent
```
                                       ←— Tier 2: Ensemble

**Key properties:**
- Each agent runs as an independent Bun process on your machine
- Agents communicate via a file-system bus (`.state/` directory)
- Three-tier filesystem scope enforcement prevents agents from touching out-of-scope files
- All agent responses stream to Telegram with a live cursor — never a frozen screen
- A `[■ Stop]` button lets you cancel any in-progress response
- OS keep-awake prevents the host machine from sleeping during AFK operation
- Graceful shutdown saves interrupted tasks; resume/discard on next start

## Activation

### Standard (project-local)

The ensemble is activated from the score layer. In your project, ask your agent:

```
"set up agentic team"
```

Or use the CLI directly:

```bash
npx @neverreven/ai-orchestra setup-ensemble
```

### System-global (shared across all projects)

Install the ensemble at `~/.ai-orchestra/ensemble/` — one ensemble, all your projects:

```bash
npx @neverreven/ai-orchestra setup-ensemble --location=system-global
```

Or ask your agent: _"set up agentic team at system level"_

Once system-global, you can **migrate an existing project-local ensemble**:

```
"migrate ensemble to system level"
```

And **bootstrap score/ into any other project** from the Lead agent:

```
"add project at /path/to/my-other-project"
```

### Tier 3: Telegram remote access

After ensemble is running, activate Telegram bots:

```bash
npx @neverreven/ai-orchestra setup-telegram
```

### Local web chat (no Telegram required)

Enable the browser-based chat UI in your `.env`:

```
ENABLE_WEB_UI=true
WEB_UI_PORT=3847
```

Then restart the Lead agent and open the chat:

```bash
npx @neverreven/ai-orchestra chat
```

The web chat streams responses in real time with a Stop button. Telegram and web chat can both be active simultaneously — they are independent channels to the same Lead agent.

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
ensemble/
├── agents-framework/    # Shared TypeScript library
│   └── src/
│       ├── types.ts       # Shared types (mirrors OpenSpec schemas)
│       ├── config.ts      # Env loading, preflight, AgentConfig builder
│       ├── scope.ts       # Three-tier filesystem access enforcement
│       ├── auth.ts        # Telegram auth, rate limiting, user management
│       ├── bus.ts         # File-system inter-agent message bus
│       ├── agent.ts       # System prompt builder (Lead + Role)
│       ├── bot.ts         # TelegramAdapter (ChannelAdapter impl): Grammy bot, streaming, Stop button, voice messages
│       ├── web-server.ts  # Web dashboard: 5-tab dark-mode UI; REST+WebSocket; GitHub webhook receiver
│       ├── state.ts       # JsonStore, session history, shutdown markers
│       ├── keepawake.ts   # OS sleep prevention (macOS / Linux / Windows)
│       └── logger.ts      # Structured JSON logger (daily log files)
        ├── channel.ts     # ChannelAdapter interface + ChannelMessage / StreamSession types
        ├── runner.ts      # Shared Anthropic streaming + channel-agnostic agent flow
        ├── slack.ts       # SlackAdapter (@slack/bolt Socket Mode): streaming, Stop, user management
        ├── voice.ts       # Voice message transcription via OpenAI Whisper
        ├── github.ts      # GitHub webhook utils: signature verify, PR diff routing, Octokit wrappers
        ├── detector.ts    # Programmatic project detection (7 stacks, frameworks, CI, sub-projects)
        └── adapter-generator.ts  # AI-driven Tier 1 adapter file generation (detector output → Claude → plan)
│
├── web-ui/              # Browser-based chat UI
│   └── index.html       # Full-featured dark-mode chat UI (standalone, no build step)
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
│   ├── lead/src/index.ts    # Lead Orchestrator (starts web server if ENABLE_WEB_UI=true)
│   ├── frontend/src/index.ts
│   ├── backend/src/index.ts
│   ├── qa/src/index.ts
│   ├── devops/src/index.ts
│   └── security/src/index.ts
│
└── scripts/             # Workspace utilities
    ├── setup.ts         # Interactive first-run wizard (API keys + project scope)
    ├── new.ts           # Bootstrap score/ into a target project path
    ├── dev.ts           # Start one or all agents
    └── list.ts          # Show project status
    └── orchestrate-project.ts  # Autonomous Tier 1 orchestration: detect stack, generate adapters, confirm, write
    └── daemon.ts               # Process daemon: exponential-backoff restart loop, PID file, signal forwarding
    └── install-service.ts      # Generate launchd / systemd / Task Scheduler service file for boot auto-start
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

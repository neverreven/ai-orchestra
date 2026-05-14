# AI Orchestra Runtime

> The runtime layer for AI Orchestra v2. Provides a Bun/TypeScript multi-agent system with Telegram bot integration, scoped role agents, inter-agent message bus, and a self-improving Lead agent.

## Prerequisites

- [Bun](https://bun.sh) >= 1.1
- Node.js >= 18 (for tooling)
- Anthropic API key
- Telegram bot tokens (one per agent — create via [@BotFather](https://t.me/BotFather))

## Quick start

```bash
cd runtime
cp .env.example .env        # fill in ANTHROPIC_API_KEY + OWNER_TELEGRAM_ID
bun install
bun run setup               # interactive first-run configurator (Phase 6)
bun run dev                 # start all agents
```

## Structure

```
runtime/
├── agents-framework/   Shared runtime package (all agent logic lives here)
├── projects/           One subfolder per role agent bot
│   ├── lead/           Orchestrator — delegates, aggregates, monitors
│   ├── frontend/       Frontend Engineer agent
│   ├── backend/        Backend Engineer agent
│   ├── qa/             QA Engineer agent
│   ├── devops/         DevOps/SRE agent
│   └── security/       Security Engineer agent
├── scripts/            Orchestration utilities (dev, setup, new, list)
├── openspec/           JSON Schema contracts between agents
└── .state/             Runtime working state (gitignored)
```

## Implementation status

This is the Phase 1 scaffold. Each module in `agents-framework/src/` contains a stub with a `TODO` marker indicating which phase implements it. See the plan for the full implementation roadmap.

## Security

- All bots are private by default. Unauthorized messages are silently dropped.
- Scope enforcement middleware prevents any agent from accessing files outside its declared scope.
- Bot tokens and API keys are gitignored and never committed.

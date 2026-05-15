# Setup Ensemble

> Activate Tier 2 of the AI Orchestra — a team of background agents (Lead + Role agents) that run independently of your IDE session. The Lead agent receives tasks, reasons about decomposition, delegates sub-tasks to role-specific agents (Frontend, Backend, QA, DevOps, Security), aggregates results, and returns the finished work. The ensemble is the bridge between "one agent reading a score" and "a team performing together."

## Trigger

- "set up agentic team"
- "activate ensemble"
- "upgrade to ensemble tier"
- "set up lead and role agents"
- "I want the agents to work as a team"
- After `npx @neverreven/ai-orchestra setup-ensemble`.

## When to use

- The project already has Tier 1 (score) installed and the developer wants the agents to operate as a coordinated team rather than a single IDE agent.
- The developer needs agents that continue working after the IDE session ends (background processing).
- The developer wants to delegate complex, multi-concern tasks ("build this feature end-to-end") and let a Lead agent handle decomposition and delegation.
- The developer is preparing for Tier 3 (Telegram remote orchestration) and needs the ensemble layer first.

## When NOT to use

- The project does not yet have Tier 1 (no `score/` or legacy `ai-orchestra/` folder). Run the full install from [RUN.md](../../../../RUN.md) first.
- The developer only needs a single agent within their IDE — Tier 1 is sufficient and carries zero infrastructure overhead.
- A hotfix is in progress — finish it first; ensemble setup changes the project's `.ai-orchestra/` directory.

## Prerequisites

| Requirement | Why | How to check |
|-------------|-----|--------------|
| Tier 1 installed | Ensemble builds on top of the score layer | `score/` folder exists in project root (or legacy `ai-orchestra/`) |
| Bun runtime | Ensemble agents are Bun/TypeScript processes | `bun --version` succeeds |
| Anthropic API key | Agents use Claude for reasoning | User provides during setup wizard |
| Disk space | Ensemble dependencies are ~50 MB | Standard bun install |

If Bun is not installed, the setup wizard prints instructions:
- macOS / Linux: `curl -fsSL https://bun.sh/install | bash`
- Windows: `powershell -c "irm bun.sh/install.ps1 | iex"`
- Or via npm: `npm install -g bun`

## Process

1. **Verify Tier 1 is present** — check that `score/` (or legacy `ai-orchestra/`) exists in the project root. If absent, tell the user to run the Tier 1 install first and stop.

2. **Run the CLI command** — execute:
   ```bash
   npx @neverreven/ai-orchestra setup-ensemble
   ```
   This copies the ensemble source from the npm package into `.ai-orchestra/ensemble/`, runs `bun install`, and launches the interactive setup wizard.

3. **Guide through the setup wizard** — the wizard prompts for:
   - **Anthropic API key** (validated live against the API — the key must start with `sk-ant-`)
   - **Owner Telegram ID** (numeric; find it by messaging `@userinfobot` on Telegram — this is for bot ownership even if Telegram bots are deferred to Tier 3)
   - **Target project CWD** (the root of the project the agents will operate on — typically the current project root)
   - **Telegram bot tokens** (the wizard offers to skip this; if skipped, Tier 3 can be activated later via `setup-telegram`)

   All configuration is written to:
   - `.ai-orchestra/ensemble/.env` — shared secrets (API key, owner ID)
   - `.ai-orchestra/ensemble/projects/<role>/.env` — per-agent CWD and optional bot token

4. **Verify the ensemble starts** — after the wizard completes, confirm the Lead agent can start:
   ```bash
   cd .ai-orchestra/ensemble && bun run dev:lead
   ```
   If it starts without errors, the ensemble is operational. Stop it with `Ctrl+C`.

5. **Update the install marker** — if `.ai-orchestra/install.json` exists, update:
   - `tier` → `2`
   - `ensemble.installed` → `true`
   - `ensemble.path` → `.ai-orchestra/ensemble/`
   - `ensemble.version` → the ensemble's `package.json` version
   - Append a history entry: `{ "action": "tier-upgrade", "from": 1, "to": 2 }`

6. **Inform the user of available commands** — print:
   - `bun run dev:all` — start all configured agents
   - `bun run dev:lead` — start the Lead agent only
   - `bun run dev <role>` — start a specific role agent
   - `bun run list` — check setup status of all agents
   - `bun run setup` — re-run the wizard to change configuration

## What the ensemble gives you (that Tier 1 does not)

| Capability | Tier 1 (Score) | Tier 2 (Ensemble) |
|-----------|----------------|-------------------|
| Agent count | 1 (the IDE agent) | 1 Lead + up to 5 Role agents |
| Runs when | IDE session is open | Background process, always-on |
| Task delegation | Manual — you direct the agent | Lead decomposes and delegates automatically |
| QA routing | Manual | Lead sends completed work to QA agent for review |
| Inter-agent communication | None | File-system message bus (`.state/` directory) |
| Scope enforcement | IDE-level | Three-tier filesystem access per role |
| Concurrent work | One agent at a time | Multiple agents work in parallel |

## Output

A running ensemble:
- `.ai-orchestra/ensemble/` — working installation with dependencies
- `.ai-orchestra/ensemble/.env` — configured with API key and owner ID
- `.ai-orchestra/install.json` — `tier: 2` recorded
- Instructions for starting, stopping, and managing the ensemble

## References

- [_schema.md](../../_schema.md)
- [setup-telegram/SKILL.md](../setup-telegram/SKILL.md) — Tier 3 activation (adds Telegram bots to the ensemble).
- [../../audit/upgrade/SKILL.md](../../audit/upgrade/SKILL.md) — non-destructive upgrade procedure for the score layer.
- [../../../../ensemble/README.md](../../../../ensemble/README.md) — ensemble architecture and documentation.
- [../../../../ensemble/RUN.md](../../../../ensemble/RUN.md) — ensemble operational guide.
- [../../../registry/install.schema.md](../../../registry/install.schema.md) — install marker schema (tier + ensemble fields).
- [../../../roles/_overview.md](../../../roles/_overview.md) — role registry; maps to the ensemble's agent projects.

## Model hint

- **Preferred:** `sonnet`
- **Reason:** The setup process is a structured walkthrough — verify prerequisites, run a CLI command, confirm the result. Sonnet handles the step-by-step guidance well. `opus` is unnecessary unless the developer's environment has unusual constraints (non-standard Bun install, corporate proxy, monorepo with multiple score installs) requiring creative problem-solving.

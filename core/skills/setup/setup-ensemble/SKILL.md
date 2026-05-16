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

- The developer only needs a single agent within their IDE — Tier 1 is sufficient and carries zero infrastructure overhead.
- A hotfix is in progress — finish it first; ensemble setup writes new directories.

> **Note:** Tier 1 (`score/`) is no longer a hard prerequisite for Tier 2 when using the system-global install path. A developer can install the ensemble at the system level first and then use it to bootstrap `score/` into any project (see `setup-project` skill). If the developer already has Tier 1 in place, that is the standard flow.

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

1. **Check for Tier 1** — check whether `score/` (or legacy `ai-orchestra/`) exists in the current project root.
   - If **present**: standard flow — proceed to step 2.
   - If **absent**: ask the user whether they want to install the ensemble at the **system level** first (no project required), or install Tier 1 first. If system-global, proceed to step 2 with `location = system-global`. If they prefer Tier 1 first, tell them to run `npx @neverreven/ai-orchestra init` and stop.

2. **Choose install location** — ask the user:

   > _"Where should the ensemble live?"_
   >
   > **A — Project-local** (`.ai-orchestra/ensemble/` inside this project)
   > — Simple to start with; ensemble is scoped to this project's folder.
   > — Can be migrated to system-global later with the `migrate-ensemble` skill.
   >
   > **B — System-global** (`~/.ai-orchestra/ensemble/` on this machine)
   > — One ensemble serves all projects on the machine.
   > — Required for the multi-project bootstrapping capability (`setup-project` skill).
   > — Recommended if you plan to manage more than one project.
   >
   > **Default: Project-local** (safe starting point; upgrade when you need it).

3. **Run the CLI command** — execute:
   ```bash
   npx @neverreven/ai-orchestra setup-ensemble
   ```
   Pass `--location=system-global` if the user chose system-global. This copies the ensemble source from the npm package into the chosen directory, runs `bun install`, and launches the interactive setup wizard.

4. **Guide through the setup wizard** — the wizard prompts for:
   - **Anthropic API key** (validated live — must start with `sk-ant-`)
   - **Install location** (if not already passed via flag — confirms project-local vs system-global)
   - **Target project CWD** (the root of the project the agents will operate on; for system-global installs, this registers the first project in `~/.ai-orchestra/projects.json`)
   - **Owner Telegram ID** (numeric; find it by messaging `@userinfobot` on Telegram; required even if Telegram bots are deferred to Tier 3, as it is the auth identity)
   - **Local web chat UI** (ask: _"Enable local web chat? [Y/n]"_; if yes, choose or confirm port, default `3847`; the web UI runs at `http://localhost:PORT` in any browser; no Telegram needed)
   - **Telegram bot tokens** (offer to skip; if skipped, activate later via `setup-telegram`)

   All configuration is written to:
   - `<ensemble-path>/.env` — shared secrets (API key, owner ID, web UI settings)
   - `<ensemble-path>/projects/<role>/.env` — per-agent CWD and optional bot token

   Where `<ensemble-path>` is `.ai-orchestra/ensemble/` (project-local) or `~/.ai-orchestra/ensemble/` (system-global).

5. **Verify the ensemble starts** — after the wizard completes, confirm the Lead agent can start:
   ```bash
   cd <ensemble-path> && bun run dev:lead
   ```
   If it starts without errors, the ensemble is operational. Stop it with `Ctrl+C`.

5b. **Web chat** — if the user enabled the web UI, inform them:
   > The local web chat is available at `http://localhost:<PORT>` while the ensemble is running. Open it in any browser on this machine (or any device on your local network). To open it directly, run:
   > ```bash
   > npx @neverreven/ai-orchestra chat
   > ```
   > The web UI and Telegram can both be active at the same time — they are independent channels to the same Lead agent.

6. **Update the install marker** — update `.ai-orchestra/install.json` (project-local) or `~/.ai-orchestra/install.json` (system-global):
   - `tier` → `2`
   - `ensemble.installed` → `true`
   - `ensemble.location` → `"project-local"` or `"system-global"`
   - `ensemble.path` → the absolute path to the ensemble directory
   - `ensemble.version` → the ensemble's `package.json` version
   - `ensemble.webUiEnabled` → `true` / `false`
   - `ensemble.webUiPort` → port number or `null`
   - Append a history entry: `{ "action": "tier-upgrade", "from": 1, "to": 2, "location": "<value>" }`

7. **Inform the user of available commands** — print:
   - `bun run dev:all` — start all configured agents
   - `bun run dev:lead` — start the Lead agent only
   - `bun run dev <role>` — start a specific role agent
   - `bun run list` — check setup status of all agents
   - `bun run setup` — re-run the wizard to change configuration
   - `npx @neverreven/ai-orchestra chat` — open the web chat UI in a browser (if enabled)
   - `npx @neverreven/ai-orchestra setup-telegram` — add Telegram bots (Tier 3, optional)
   - Ask agent `"migrate ensemble to system level"` — to move the ensemble to system-global later

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
- `<ensemble-path>/` — working installation with dependencies (project-local or system-global)
- `<ensemble-path>/.env` — configured with API key, owner ID, and web UI settings
- `.ai-orchestra/install.json` — `tier: 2`, `ensemble.location`, `ensemble.webUiEnabled` recorded
- Web chat available at `http://localhost:<PORT>` (if enabled)
- Instructions for starting, stopping, and managing the ensemble

## References

- [_schema.md](../../_schema.md)
- [setup-telegram/SKILL.md](../setup-telegram/SKILL.md) — Tier 3 activation (adds Telegram bots to the ensemble).
- [migrate-ensemble/SKILL.md](../migrate-ensemble/SKILL.md) — move ensemble from project-local to system-global after initial install.
- [setup-project/SKILL.md](../setup-project/SKILL.md) — bootstrap score/ into any new project from the running ensemble (system-global only).
- [../../audit/upgrade/SKILL.md](../../audit/upgrade/SKILL.md) — non-destructive upgrade procedure for the score layer.
- [../../../../ensemble/README.md](../../../../ensemble/README.md) — ensemble architecture and documentation.
- [../../../../ensemble/RUN.md](../../../../ensemble/RUN.md) — ensemble operational guide.
- [../../../registry/install.schema.md](../../../registry/install.schema.md) — install marker schema (tier + ensemble fields).
- [../../../roles/_overview.md](../../../roles/_overview.md) — role registry; maps to the ensemble's agent projects.

## Model hint

- **Preferred:** `sonnet`
- **Reason:** The setup process is a structured walkthrough — verify prerequisites, run a CLI command, confirm the result. Sonnet handles the step-by-step guidance well. `opus` is unnecessary unless the developer's environment has unusual constraints (non-standard Bun install, corporate proxy, monorepo with multiple score installs) requiring creative problem-solving.

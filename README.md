# ai-orchestra

> Universal, project-agnostic agentic toolkit. Drop it into any project's root, ask any agent in any IDE to "run the orchestra", and the orchestra will investigate the project, respect what's already there, and install a tailored agentic infrastructure — skills, sub-agents, rules, hooks, MCP slots, and a self-improving learnings system — that fits the stack and roles of the project.

**Quick start** — run from your project root, then ask your agent _"run the orchestra"_:

```bash
npx @neverreven/ai-orchestra@latest init
```

> This is a spec folder your AI agent reads and acts on, not a code library. The `init` command copies the `score/` specification folder into your project. Your agent does the rest.

---

## What it is

AI Orchestra is a three-tier metaframework. You activate as many tiers as you need:

| Tier | Name | What you get | How to activate |
|------|------|-------------|----------------|
| **1** | **Score** | IDE agent + full spec infrastructure (rules, skills, learnings doc, session protocol). The agent reads the score and performs. | `npx @neverreven/ai-orchestra init` then ask agent _"run the orchestra"_ |
| **2** | **Ensemble** | Lead agent + Role agents running as background processes. Lead decomposes tasks, delegates to role agents (Frontend, Backend, QA, DevOps, Security), QA-reviews results, and returns the aggregated output. | `npx @neverreven/ai-orchestra setup-ensemble` or ask agent _"set up agentic team"_ |
| **3** | **Remote** | Private Telegram bot per agent. Delegate tasks from your phone, receive streaming responses, stop agents mid-run — all while AFK. | `npx @neverreven/ai-orchestra setup-telegram` or ask agent _"set up Telegram"_ |

Each tier builds on the previous. You start with Tier 1 — the solid spec foundation — and opt into higher tiers when you want them.

The names reflect what they are in a real orchestra: the **score** is the written specification every performer reads; the **ensemble** is the group of performers playing together.

## What it is not

- A monolithic agent.
- A framework you import in code.
- A service that calls home, collects telemetry, or requires an account.
- A replacement for any specific IDE's native features.

It is a **set of markdown specifications** that any sufficiently capable IDE agent can read and act on — with an optional live agent runtime on top when you want more.

---

## Install

```bash
npx @neverreven/ai-orchestra@latest init
```

Run this from your project's root. It copies the `score/` specification folder into the current directory and writes a tiny `.ai-orchestra/install.json` marker. **It does not modify `AGENTS.md`, `.cursor/`, `.claude/`, `.vscode/`, or any other agentic config** — that is the IDE agent's job once you ask it to _"run the orchestra"_.

The CLI is a pure copy-from-package operation: no network calls, no telemetry.

| Option | What it does |
|--------|-------------|
| `--force` | Overwrite an existing `score/` folder. |
| `--include-fixtures` | Also copy `_test-fixtures/` (orchestra development only; not needed for regular use). |
| `--no-marker` | Don't write `.ai-orchestra/install.json`. |
| `--version` / `-v` | Print the installed CLI/orchestra version. |
| `--help` / `-h` | Print full usage. |

> **What gets copied:** the `score/` spec folder (~170 KB of markdown). Test fixtures are excluded by default.

### Upgrading an existing install

```bash
# 1. Pull the latest spec files into the project
npx @neverreven/ai-orchestra@latest init --force

# 2. Ask your agent to apply the upgrade
#    "upgrade orchestra"
```

The `upgrade` skill applies changes **non-destructively**:

- **Orchestra-managed artifacts** (the Director rule, unmodified core skills, stack-pack rules) are updated automatically.
- **Project-owned content** — your `AI_LEARNINGS.md`, `SESSION_STATE.md`, and any skills you have adapted for your project — is **never touched**.
- **Adapted skills** — the agent shows you a diff of the upstream changes and asks for explicit consent before applying.
- **Folder rename (v2 → v3)** — if your project has the old `ai-orchestra/` folder name, the upgrade skill detects it and offers a one-time `git mv ai-orchestra score` migration. You can accept or skip; the upgrade proceeds either way.

The upgrade skill reads `.ai-orchestra/install.json` to determine what version is installed and what scope was chosen. It then compares that against the current package and presents only the changes that apply to your install.

### Extracting to a standalone folder

If your team wants to version or share the orchestra spec independently of the host project:

```bash
# From inside the host project (the one that has score/ in its root)
npx @neverreven/ai-orchestra extract

# Extract to a specific destination and initialise a git repo
npx @neverreven/ai-orchestra extract --to=../my-orchestra --git

# Extract and remove from the host in one step
npx @neverreven/ai-orchestra extract --to=../my-orchestra --git --clean
```

| Option | What it does |
|--------|-------------|
| `[project-root]` | Root of the host project (defaults to current dir). |
| `--from=<path>` | Explicit path to the `score/` folder (if not at `<root>/score/`). |
| `--to=<path>` | Destination (defaults to `../ai-orchestra-standalone`). |
| `--force` | Overwrite destination if non-empty. |
| `--clean` | Delete the source `score/` after copying. |
| `--git` | Run `git init` and create an initial commit in the destination. |

---

## How to use

Once installed, ask your agent in any supported IDE one of:

> "Go to the score folder and run the orchestra."
> "run the orchestra"
> "run the score folder"
> "set up the orchestra in this project"
> "what is this score folder?"
> "investigate the orchestra"

Any natural variant works. The agent reads `score/RUN.md` and follows it from Phase 0.5 onward, autonomously.

**Phase 0.5 always begins with a structured orientation** — the user is told what the orchestra is, what is about to happen, and what the install options are, before any probe runs. Nothing is written without explicit consent.

### What the orchestra does (5 steps)

The first 4 steps are completely read-only. Only step 5 ever writes a file, and only after you say `apply`.

1. **Detect the IDE** — determines whether you are running in Cursor, Claude Code, Codex CLI, or VS Code.
2. **Probe the project** — detects stacks, frameworks, build setup, and existing agentic infrastructure (rules, skills, hooks, learnings docs, shared agent folders).
3. **Inventory existing AI infrastructure** — assesses quality, identifies per-role ownership, flags conflicts and overlaps.
4. **Build a dry-run install plan** — presents a plain-language summary plus a structured diff of every file that would be created or modified. Recommends an install scope based on what was found.
5. **Apply the plan** — only after you reply `apply`. Files are created, managed-section marker pairs extended, hooks merged, and the install marker written.

### Install scope options

You pick one of four scopes during the orientation. The orchestra recommends one based on the inventory; you can always override.

| Mode | What it installs | Best for |
|------|-----------------|----------|
| **Full kit** | All 10 roles (Frontend, Backend, QA, Analytics, DevOps, Security, Mobile, AI/ML, Tech-Writer, PM) with their full skill sets. | Greenfield projects, or teams that want the complete baseline. |
| **Selected roles** | A subset you pick from a checkbox list. Universal roles (QA, Security, Tech-Writer) stay in by default. | Projects where one or more roles are externally owned. |
| **Primary + collaborators** | One primary role plus its declared collaborators as opt-in add-ons. | Focused installs — e.g. "Frontend with QA support". |
| **Core only** | Director rule, learnings doc, audit skill, install marker. No role library. | Teams that want the session protocol without the role concept. |

If the inventory finds external ownership of a role (e.g. a hand-written `backend/AGENTS.md`), the orchestra recommends `selected-roles` excluding that role. Quality issues in existing infrastructure are surfaced with `improve` / `replace` / `preserve` options — never auto-applied.

### Safety promise

- **Dry-run first.** Every install plan is shown to you before any file is touched.
- **Never overwrite hand-written content.** When a target file exists without orchestra marker pairs, the orchestra writes alongside (`<basename>.orchestra.<ext>`) rather than replacing.
- **No telemetry, no network calls** outside what the discovery probe explicitly needs (typically nothing).
- **Conservative deletions.** Scope changes never auto-delete files — the orchestra surfaces a `propose` row for each one.

### Starting fresh — greenfield projects

If your project has no agentic infrastructure yet, one guided session installs a complete, self-maintaining baseline:

| What you get | Details |
|-------------|---------|
| **Session protocol** | Director rule that loads project context at the start of every session and reviews for learnings at the end. |
| **Self-improving memory** | `_documentation/AI_LEARNINGS.md` — grows automatically as the agent captures patterns, decisions, and preferences across sessions. |
| **Role library** | Up to 10 roles (Frontend, Backend, QA, DevOps, Security, Mobile, AI/ML, Tech-Writer, Analytics, PM). You pick which apply — or take the full kit. |
| **30+ skills** | Audit, cleanup, pre-release, code review, security baseline, deployment checklist, dependency audit, and more. Invoked by trigger phrases in any chat. |
| **Stack-specific rules** | Auto-detected patterns for your stack (React, TypeScript, Next.js, Node, Python/FastAPI/Django, Salesforce, mobile, Rust/Tauri, and more). |
| **Stop-hook** | In Cursor and Claude Code, a session-end hook automatically reviews the conversation and updates the learnings doc — no manual step needed. |
| **MCP slots** | Pre-wired placeholder slots for the roles you installed. Fill them in when you add MCP servers. |
| **Install marker** | `.ai-orchestra/install.json` — tracks the installed version and scope, enabling future upgrades and drift detection. |
| **Non-destructive upgrades** | `npx @neverreven/ai-orchestra@latest init --force` then ask the agent `"upgrade orchestra"`. The upgrade skill refreshes managed artifacts, shows diffs for any skills you adapted, and never touches your learnings, session state, or customisations. |
| **Tier 2 - Agentic Team** | Ask the agent `\"set up agentic team\"` or run `npx @neverreven/ai-orchestra setup-ensemble`. Lead + Role ensemble as background processes. Open web dashboard: `npx @neverreven/ai-orchestra chat`. |
| **Tier 3 - Remote Orchestration** | Ask the agent `\"set up Telegram\"` or run `npx @neverreven/ai-orchestra setup-telegram`. Private Telegram / Slack bots - delegate from phone or workspace, voice messages auto-transcribed. Requires Tier 2. |

Nothing is written until you review the dry-run plan and say `apply`.

```bash
# 1. Copy the spec into your project
npx @neverreven/ai-orchestra@latest init

# 2. Open the project in your IDE and ask your agent:
#    "run the orchestra"
#    The agent reads score/RUN.md and guides you through the rest.
```

For a new project the recommended scope is **Full kit** — you can always remove roles later.

---

## What's in the package

| Feature | Since |
|---------|-------|
| Core spec scaffold | v1.0 |
| Role library — 10 roles (Frontend, Backend, QA, Analytics, DevOps, Security, Mobile, AI/ML, Tech-Writer, PM), 30+ skills, schema linter | v1.0 |
| Director rule, Learnings doc, Stop-hook, Scheduler/Notifications contracts | v1.0 |
| Cursor adapter (full); Claude Code / Codex / VS Code adapter baselines | v1.0 |
| Stack content packs — JS/TS, Python web, Salesforce / Commerce Cloud, Mobile, Rust / Tauri | v1.0–v1.4 |
| Validation harness + test fixtures (incl. adversarial: broken-markers, name-collision, upgrade-from-v1) | v1.0 |
| Four install scope modes with inventory-driven recommendation | v1.1 |
| Stop-hook overlap detection and resolution | v1.2 |
| Sub-project detection, always-on rule ceiling check, skill/pack overlap disambiguation | v1.3 |
| Scheduler runner, multi-project orchestration (global registry + upgrade-all) | v1.4 |
| `extract` CLI subcommand | v1.4 |
| **`upgrade` skill** — non-destructive upgrades: managed/project-owned boundary, diff-and-consent for adapted skills, `ai-orchestra/` → `score/` rename migration | v3.0 |
| **Director rule §0 project-root anchoring** — resolves paths relative to the owning project; fixes multi-root workspace and monorepo sub-project context bleed | v3.0 |
| **SESSION_STATE.md handoff template** — machine-readable session snapshot written at session end, read at session start | v3.0 |
| **Model hint in skill schema** — `preferred_model: haiku \| sonnet \| opus` in skill files | v3.0 |
| **Cross-IDE skill path portability** — project-root-relative paths in `AGENTS.md` / `CLAUDE.md` | v3.0 |
| **Three-tier architecture** — `score/` (spec layer), `ensemble/` (agent layer), Remote (Telegram); both first two wired into the npm package | v3.0 |
| **Ensemble (Tier 2)** — Lead + Role agents as background Bun/TypeScript processes; file-system message bus; per-role scope enforcement | v3.0 |
| **Telegram remote orchestration (Tier 3)** — private bots, streaming responses, `[■ Stop]` cancellation, owner + allowlist auth, OS keep-awake | v3.0 |
| **`setup-ensemble` + `setup-telegram` skills** — agent-driven Tier 2 and Tier 3 activation guides with prerequisite checks and wizard walkthrough | v3.0 |
| **Adapter path consistency** — `{{INSTALLED_FOLDER}}` placeholder across all adapter spec files | v3.0.1 |
| **README cleanup** — self-contained npm page, no dead links, deduplicated feature table, MIT license stated inline | v3.0.2 |
| **System-global ensemble install** - single ensemble at `~/.ai-orchestra/ensemble/` serves all projects on the machine | v3.1 |
| **Multi-project bootstrap** - Lead agent bootstraps Tier 1 into any registered project without opening an IDE | v3.1 |
| **`migrate-ensemble` skill** - non-destructive migration from project-local to system-global | v3.1 |
| **Local web chat UI** - Bun HTTP + WebSocket server; `npx @neverreven/ai-orchestra chat` opens it | v3.1 |
| **`~/.ai-orchestra/projects.json` global registry** - tracks all orchestra-managed projects | v3.1 |
| **`ChannelAdapter` abstraction** - all channels share a common interface; agent logic written once in `runner.ts` | v3.2 |
| **Slack channel (Tier 3)** - `@slack/bolt` Socket Mode bot with streaming, Stop button, user allowlist | v3.2 |
| **Voice messages** - Telegram voice notes auto-transcribed via OpenAI Whisper; routed as text to agent | v3.2 |
| **Full web operations dashboard** - 5-tab UI: Chat, Status, Tasks, Projects, Logs; WebSocket push | v3.2 |
| **GitHub webhook + PR review** - `POST /github` validates signature; routes events to role agents; posts PR review | v3.2 |
| **Docker deployment** - `Dockerfile` + `docker-compose.yml` with named volumes, bind-mounts, health check | v3.2 |
| **Programmatic project detection** - TypeScript impl of DETECTION.md: 7 stacks, frameworks, CI, sub-projects | v3.2 |
| **Autonomous IDE orchestration** - Lead detects stack, generates Tier 1 files via Claude, shows diff, writes on confirm | v3.2 |
| **Process daemon + service installer** - exponential-backoff restart; generates launchd / systemd / Task Scheduler service files | v3.2 |
| **5 new setup skills** - `setup-slack`, `setup-github`, `deploy-docker`, `orchestrate-project`, `setup-daemon` | v3.2 |

Current version: **3.2.0**

---

## Supported IDEs

| IDE | Coverage |
|-----|---------|
| Cursor | Full adapter (rules, skills, hooks, MCP slots, stop-hook) |
| Claude Code | Baseline adapter (commands, CLAUDE.md section, MCP slots, stop-hook) |
| Codex CLI | Baseline adapter (AGENTS.md skill catalog, MCP slots) |
| VS Code (with Copilot) | Baseline adapter (prompt files, MCP slots) |

Adapters for additional tools (Windsurf, Continue, Cody) are planned for v4.

## Supported stacks (first-class)

- **JavaScript / TypeScript web** — React, Vue, Svelte, Next.js, Vite, Node.js
- **Python web** — Django, Flask, FastAPI
- **Salesforce / Commerce Cloud** — Apex, LWC, SFRA, sfdx
- **Mobile** — Capacitor, React Native, Flutter, MAUI, Android native, iOS native
- **Rust / Tauri** — ownership + borrowing patterns, error handling, async/Tokio, Tauri v2

Other stacks are detected by generic signals and receive the universal role/skill set. Deep stack-specific guidance for additional stacks is planned for future releases.

---

## Installed folder structure

After `npx @neverreven/ai-orchestra init`, your project gains:

```
score/                 # ← the spec folder (installed at project root)
├── README.md          # this file
├── RUN.md             # canonical entry point — ask your agent to "run the orchestra"
├── MIGRATION.md       # version-upgrade guidance and compatibility policy
├── CHANGELOG.md       # full version history
├── VERSION            # SemVer (currently 3.2.1)
├── _v3.x-backlog.md   # v3.x improvement backlog
├── core/              # project-agnostic, tool-agnostic content
│   ├── _lint.md       # schema linter contract
│   ├── install-scope.md          # four install scope modes + resolver
│   ├── install-plan-template.md  # canonical install plan format (dry-run summary + diff)
│   ├── discovery/     # probe + signals + existing-infra detection
│   ├── roles/         # role definitions (10 roles + schema + overview)
│   ├── skills/        # universal skill specs (30+ skills + schema)
│   ├── director/      # Director rule template + learnings doc template
│   ├── scheduler/     # scheduler contract + runner
│   ├── notifications/ # notifications contract
│   ├── conflict/      # conflict-resolution contracts (stop-hook overlap, etc.)
│   ├── registry/      # install.json + projects.json schemas
│   └── stack-packs/   # stack-specific content layered onto the universal core
│       ├── js-ts/           # React/Vue/Svelte/Next/Vite/Node + TypeScript
│       ├── python-web/      # Django, Flask, FastAPI + universal Python
│       ├── salesforce/      # Apex, LWC, SFRA (Commerce Cloud), sfdx
│       ├── mobile/          # Capacitor, React Native, Flutter, MAUI, Android, iOS
│       └── rust/            # Rust + Tauri v2
├── adapters/          # IDE-specific install logic
│   ├── _contract.md   # adapter interface specification
│   ├── _stop-hook.md  # stop-hook contract
│   ├── cursor/        # full Cursor adapter
│   ├── claude-code/   # Claude Code adapter baseline
│   ├── codex/         # Codex CLI adapter baseline
│   └── vscode/        # VS Code (Copilot) adapter baseline
└── _test-fixtures/    # sample projects for agent-driven validation
    ├── empty-js/                 # fresh React+Vite, no existing infra
    ├── ongoing-python-web/       # FastAPI with pre-existing AGENTS.md + Cursor rule
    ├── salesforce-cartridge/     # sfdx + SFRA polyglot Salesforce project
    ├── broken-markers/           # [adversarial] malformed managed-section markers
    ├── name-collision/           # [adversarial] project-owned skill collides with orchestra skill
    └── upgrade-from-v1/          # [adversarial] pre-existing v1.0.0 install requires upgrade

.ai-orchestra/         # hidden config dir (at project root, outside score/)
└── install.json       # install marker: version, scope, adapter, tier, installedFolder
```

Additionally, the npm package includes an `ensemble/` folder for Tier 2 agent runtime (activated separately via `setup-ensemble`).

---

## Version history

| Version | Key changes |
|---------|------------|
| v1.0 | Core scaffold, 10 roles, 30+ skills, Cursor adapter, Director rule, Stop-hook, Learnings doc, 3 stack packs |
| v1.1 | Four install scope modes, inventory-driven recommendation, quality-aware install |
| v1.2 | Stop-hook overlap detection, npm distribution |
| v1.3 | Sub-project detection, mobile stack pack, skill/pack overlap disambiguation |
| v1.4 | Scheduler runner, Rust/Tauri stack pack, multi-project orchestration, `extract` CLI subcommand, adapter parity (Claude Code, Codex, VS Code render-rules) |
| v3.0 | Three-tier architecture (`score/` + `ensemble/` + Telegram Remote); non-destructive `upgrade` skill; Director §0 project-root anchoring; SESSION_STATE handoff; model hint; cross-IDE path portability; Ensemble Tier 2 agent runtime; Telegram Tier 3 remote orchestration |
| v3.0.1 | Adapter path consistency — `{{INSTALLED_FOLDER}}` placeholder across all adapter spec files |
| v3.0.2 | README self-contained for npm page; no dead links; deduplicated feature table |
| v3.1 | System-global ensemble install; multi-project bootstrap from Lead agent; `migrate-ensemble` skill; local web chat UI (Bun WebSocket server); global `~/.ai-orchestra/projects.json` registry |
| v3.2 | ChannelAdapter abstraction (Telegram + Slack channels); voice message transcription (Whisper); full 5-tab web operations dashboard; GitHub webhook + automated PR review; Docker deployment (Dockerfile + docker-compose); programmatic project detection (7 stacks); autonomous Tier 1 IDE orchestration from Lead; process daemon + platform service installer; 5 new setup skills |

---

## License

[AGPL-3.0](LICENSE) for open-source use.
Commercial use in proprietary products requires a separate commercial license.
See [GRANTS.md](GRANTS.md) for entities with granted exceptions, or contact the author.


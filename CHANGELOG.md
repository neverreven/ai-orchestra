# Changelog

All notable changes to the `ai-orchestra` core are recorded here.

The orchestra core follows [Semantic Versioning](https://semver.org/). Per-project installations record the version they were generated against in `.ai-orchestra/install.json`.

The format is loosely based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

## [3.2.1] - License change to AGPLv3 + GRANTS.md

### Changed
- License changed from MIT to **AGPLv3** (AGPL-3.0-only).
  Open-source use remains free. Commercial use in proprietary products requires a separate commercial license.
- Added GRANTS.md — lists entities granted a free commercial license by the copyright holder.
- Added LICENSE file (full AGPLv3 text) to the repository and npm package.
- Updated README.md license section to reference the new license and grants document.
- package.json license field updated from MIT to AGPL-3.0-only.

## [3.2.0] — Communication abstraction, voice, full dashboard, GitHub, Docker, autonomous orchestration, daemon

Major capability release spanning 7 workstreams (v3.2–v4 roadmap, phases 1–7). The ensemble is now production-grade: Slack runs alongside Telegram via a shared channel adapter, voice messages transcribe automatically, the web chat expands into a full operations dashboard, GitHub events route to agents for automated PR review, Docker deployment is first-class, the Lead agent autonomously bootstraps Tier 1 into new projects, and a process daemon plus service installer keep everything running without manual intervention.

### Added — W1: Channel abstraction + Slack (v3.2)

- **`ensemble/agents-framework/src/channel.ts`** — `ChannelAdapter` interface + `ChannelMessage` / `StreamSession` types. All communication channels implement this interface.
- **`ensemble/agents-framework/src/runner.ts`** — Shared `runAgentStream` (Anthropic streaming) and `runChannelAgentFlow` (channel-agnostic agent logic + bus drain). Extracted from `bot.ts` so both Telegram and Slack share identical agent logic.
- **`TelegramAdapter` class** in `bot.ts` — implements `ChannelAdapter`. Wraps Grammy bot with the full streaming UI (two-message pattern: control + stream), Stop button, auth via `AuthManager`. `createBotApp` kept for backward compatibility with role agents.
- **`ensemble/agents-framework/src/slack.ts`** — `SlackAdapter implements ChannelAdapter` using `@slack/bolt` Socket Mode. Streaming via `chat.update` throttled at `STREAM_INTERVAL_MS`. Stop button via Block Kit action. Auth: owner (`OWNER_SLACK_USER_ID`) + allowlist managed via `/allow` / `/revoke` text commands. `createSlackAdapter()` factory returns `null` when tokens are absent.
- **`lead/src/index.ts` updated** — starts both `TelegramAdapter` (when `ENABLE_TELEGRAM!=false`) and `SlackAdapter` (when Slack tokens present) in parallel. Shared `handleChannelMessage()` registered on both.
- **`core/skills/setup/setup-slack/SKILL.md`** — guided Slack App creation, Socket Mode token, bot scopes, owner user ID, env var setup.
- **`.env.example`** — `SLACK_BOT_TOKEN`, `SLACK_APP_TOKEN`, `OWNER_SLACK_USER_ID`, `ENABLE_SLACK`, `ENABLE_TELEGRAM` variables added.

### Added — W2: Voice messages in Telegram (v3.2)

- **`ensemble/agents-framework/src/voice.ts`** — `transcribeVoice(opts, apiKey)` using OpenAI Whisper (`whisper-1` model). Accepts `audio/ogg` (Telegram default) and other formats. `downloadTelegramFile(fileId, botToken)` helper for fetching voice message bytes.
- **`message:voice` handler** in `TelegramAdapter._wire()` — transcribes via Whisper, shows "🎤 Transcribing…" status, edits to show transcript, routes transcript as a text message through the existing agent flow. Gracefully declines with a helpful error when `OPENAI_API_KEY` is absent.

### Added — W7: Full web dashboard (v3.2)

- **`ensemble/web-ui/index.html` rewritten** — five-tab dark-mode dashboard (Chat, Status, Tasks, Projects, Logs). Chat tab: existing UX preserved with suggestion chips. Status tab: agent health cards with live heartbeat data. Tasks tab: active/blocked task list across all roles. Projects tab: registered project cards with "Orchestrate" shortcut button. Logs tab: streaming log output with auto-scroll toggle.
- **`web-server.ts` updated** — new WebSocket server push types: `{ type: "status_update", agents }` every 5s, `{ type: "tasks_update", tasks }` on tick, `{ type: "log_line", line }` streamed from log files. New REST endpoints: `GET /api/projects` (projects.json), `GET /api/status` (agent health).
- **`{ type: "subscribe", feed }` client message** — clients subscribe to `status`, `tasks`, or `logs` feeds; server sends an immediate snapshot then keeps pushing.

### Added — W3: GitHub webhook + PR review (v3.3)

- **`ensemble/agents-framework/src/github.ts`** — `verifyWebhookSignature`, `parseGitHubEvent` (pull_request, push, issues), `getPRDiff`, `postPRReview`, `createCheckRun`, `splitDiffByFile`, `routeDiffToRoles` (classifies files to frontend/backend/qa/security/devops agents), `postToLeadInbox` (direct inbox write for webhook context), `buildGitHubTaskTitle`.
- **`POST /github` endpoint** in `web-server.ts` — validates `X-Hub-Signature-256`, parses event type, calls `postToLeadInbox` with a structured task payload so the Lead agent processes the event on its next message loop tick.
- **`core/skills/setup/setup-github/SKILL.md`** — PAT creation, webhook registration, ngrok/Cloudflare Tunnel options, PR review workflow description.
- **`.env.example`** — `GITHUB_TOKEN`, `GITHUB_WEBHOOK_SECRET`, `GITHUB_CHECK_RUN` variables added.

### Added — W4: Docker / docker-compose deployment (v3.3)

- **`ensemble/Dockerfile`** — multi-stage Bun image. Copies manifests first for layer caching, installs frozen deps, copies source, creates non-root `orchestra` user. Exposes port 3847. Health check via `fetch('http://localhost:3847/')`.
- **`ensemble/docker-compose.yml`** — single `ensemble` service with `restart: unless-stopped`. Named volumes for `.state` and `logs`. Bind-mount for `~/.ai-orchestra` (global registry). Port mapping `${WEB_UI_PORT:-3847}:3847`. JSON-file log driver with rotation.
- **`ensemble/.dockerignore`** — excludes `node_modules/`, `.state/`, `logs/`, `.env`, `dist/`.
- **`core/skills/setup/deploy-docker/SKILL.md`** — build, run, day-2 ops (update, logs, remove). Nginx reverse proxy and Cloudflare Tunnel examples for public URL exposure.
- **`ensemble/package.json`** — `daemon` and `install-service` scripts added.

### Added — W5: Autonomous IDE orchestration from Lead (v3.4)

- **`ensemble/agents-framework/src/detector.ts`** — `detectProject(root)` — TypeScript implementation of DETECTION.md. Hardcoded signal definitions for 7 stacks (js-ts, python, rust, go, dotnet, mobile, salesforce). Auxiliary detection (lockfiles, package managers, test frameworks, CI systems, documentation files). Sub-project detection (up to 20 entries). Polyglot resolution. Confidence scoring per spec. Returns `{ profile: ProjectProfile, log: string[] }`.
- **`ensemble/agents-framework/src/adapter-generator.ts`** — `generateAdapterFiles(profile, ide, scope, apiKey, orchestraSrcRoot)` — calls Claude (sonnet) to generate director rule + AGENTS.md additions + AI_LEARNINGS.md stub. `formatPlanSummary(plan)` for user-readable diff. `IDE` and `InstallScope` type exports. File-exists check sets action to `update` vs `create`.
- **`ensemble/scripts/orchestrate-project.ts`** — CLI runner: detects project → asks IDE/scope → generates plan → shows diff → writes files on confirmation → updates install.json + projects.json. Flags: `--ide`, `--scope`, `--yes` (auto-confirm).
- **`/orchestrate <path>` command** in `lead/src/index.ts` — Telegram command that routes to the orchestration flow via the existing channel message handler.
- **`core/skills/setup/orchestrate-project/SKILL.md`** — describes the 3-phase flow (detect → generate → confirm/write), IDE choices, scope choices, limitations, and the recommended follow-up IDE verification pass.

### Added — W6: Process daemon + service installer (v3.4)

- **`ensemble/scripts/daemon.ts`** — restart-loop wrapper for `bun run dev:all`. Exponential backoff (1s → 60s max), stable-run detection (30s threshold), configurable crash limit (20). PID file at `~/.ai-orchestra/ensemble.pid`. Log file at `~/.ai-orchestra/daemon.log`. Forwards SIGTERM/SIGINT to child for graceful shutdown.
- **`ensemble/scripts/install-service.ts`** — platform-aware service generator. macOS → launchd plist (`~/Library/LaunchAgents/ai.orchestra.ensemble.plist`). Linux → systemd user unit (`~/.config/systemd/user/ai-orchestra-ensemble.service`). Windows → Task Scheduler XML. `--auto` flag installs immediately; `--print` just prints the file.
- **`core/skills/setup/setup-daemon/SKILL.md`** — platform-specific activation steps for macOS/Linux/Windows, daemon-only mode, log tailing instructions.

### Changed

- **`bot.ts`** refactored: `TelegramAdapter` class exported alongside legacy `createBotApp`. `runAgentStream` moved to `runner.ts` (import path updated in `bot.ts`).
- **`lead/src/index.ts`** rewritten: multi-adapter startup, shared message handler, `/orchestrate` command, Slack + Telegram parallel start.

## [3.1.0] — Ensemble expansion: system-global mode, multi-project bootstrap, local web chat

Feature release. Tier 2 ensemble gains three new capabilities: install at system level (shared across all projects), bootstrap score/ into any project from the Lead agent, and communicate via a local browser-based chat UI without Telegram.

### Added

- **System-global ensemble install** (`--location=system-global` flag on `setup-ensemble`) — installs the ensemble at `~/.ai-orchestra/ensemble/` so it lives independently of any single project and can serve all projects on the machine.
- **`ensemble.location` field in `install.schema.md`** — `"project-local"` (default) or `"system-global"`. `ensemble.webUiEnabled` and `ensemble.webUiPort` fields also added to the schema.
- **`migrate-ensemble` skill** (`core/skills/setup/migrate-ensemble/SKILL.md`) — non-destructive migration from project-local to system-global: copies `.ai-orchestra/ensemble/` to `~/.ai-orchestra/ensemble/`, re-runs `bun install`, verifies, then removes the source. Updates `install.json` and global registry.
- **`setup-project` skill** (`core/skills/setup/setup-project/SKILL.md`) — Lead agent bootstraps `score/` into any project path on the machine. Validates path, confirms with user, runs `npx @neverreven/ai-orchestra init --target`, registers in `~/.ai-orchestra/projects.json`. Requires system-global ensemble.
- **`ensemble/scripts/new.ts`** — CLI runner backing the `setup-project` skill. Validates the target directory, runs `npx @neverreven/ai-orchestra@latest init --target=<path>`, and updates the global registry. Usage: `bun run new <path>`.
- **`~/.ai-orchestra/projects.json` global registry** — tracks all orchestra-managed projects on the machine (`path`, `name`, `ide`, `tier`, `lastSeenVersion`, `lastSeenAt`).
- **Local web chat UI** (`ensemble/agents-framework/src/web-server.ts` + `ensemble/web-ui/index.html`) — Bun HTTP server with WebSocket streaming. Serves a full-featured dark-mode chat interface. Real-time response streaming with Stop button, suggestion chips, reconnect handling. Auth via `WEB_UI_TOKEN` env var (optional).
- **`ENABLE_WEB_UI`, `WEB_UI_PORT`, `WEB_UI_TOKEN`** environment variables — control web chat activation, port (default `3847`), and optional token auth.
- **Lead agent starts web server on boot** when `ENABLE_WEB_UI=true` — logs `Web chat available at http://localhost:<PORT>`.
- **`chat` CLI command** (`npx @neverreven/ai-orchestra chat`) — opens the web chat URL in the default browser. Auto-detects port from `~/.ai-orchestra/ensemble/.env` or `--port=N` flag.
- **`--target=<path>` flag for `init` command** — programmatic alternative to positional argument, enabling the `new.ts` runner to invoke init non-interactively.
- **`--location=system-global` flag for `setup-ensemble` command** — mirrors the skill-guided choice.
- **`setup-ensemble` skill updated** — location choice step (A: project-local / B: system-global), web UI activation step, updated output and references to new skills.

### Changed

- `.env.example` updated to document `ENABLE_WEB_UI`, `WEB_UI_PORT`, `WEB_UI_TOKEN`.
- `setup-ensemble` no longer hard-requires Tier 1 to be present when `--location=system-global` is used.
- `updateInstallMarkerTier` in `bin/init.mjs` now accepts `ensembleUpdates` for writing `location`, `path`, `webUiEnabled`, `webUiPort` in one pass.

## [3.0.2] — README self-contained for npm page

Patch release. No spec changes; documentation corrections only.

### Fixed

- **README fully self-contained** — removed all relative file links from body text (dead on npmjs.com); replaced with inline descriptions.
- **Duplicate feature table rows** — the `What's in the package` table had duplicate v3.0.0 rows from a previous partial edit; deduplicated.
- **Version history section** — added inline version history table replacing the dead `CHANGELOG.md` link in See also.
- **See also section removed** — all content it referenced is now inline; dead links on npm page eliminated.
- **`Supported IDEs` table** — expanded with coverage details; removed internal path references.
- **Repository layout comments** — removed internal `PR N —` build markers from folder tree comments.
- **`score/VERSION`** — updated to `3.0.2`.

## [3.0.1] — Adapter path consistency ({{INSTALLED_FOLDER}} variable)

Patch release completing the v3.0 spec-folder rename work. No new features; no breaking changes.

### Fixed

- **`{{INSTALLED_FOLDER}}` placeholder** — all adapter `render-rules.md` files gain a new `{{INSTALLED_FOLDER}}` placeholder (source: `installedFolder` in `.ai-orchestra/install.json`; default: `score`). The placeholder is now used everywhere the orchestra core folder is referenced in rendered output — skill catalog entries, stop-hook scheduler paths, `{{ORCHESTRA_VERSION}}` source, post-install checks, skill source path descriptions, MCP comment strings.
- **Adapter files updated to use `{{INSTALLED_FOLDER}}`** — `adapters/codex/render-rules.md`, `target-schema.md`, `mappings.md`, `INSTALL.md`; `adapters/cursor/render-rules.md`, `mappings.md`; `adapters/claude-code/render-rules.md`, `mappings.md`, `target-schema.md`; `adapters/vscode/render-rules.md`, `mappings.md`, `target-schema.md`, `INSTALL.md`; `adapters/_contract.md`; `adapters/V4-RENDER-RULES-DESIGN.md`.
- **`core/_lint.md`** — lint scope descriptions updated from `ai-orchestra/core/` to `score/core/` (with legacy note).
- **`core/roles/_schema.md` + `core/skills/_schema.md`** — link-constraint descriptions updated to reference the orchestra spec folder generically.
- **`core/discovery/DETECTION.md`** — target project root description updated.
- **`core/install-plan-template.md`** — diff table `source` column header updated.
- **`core/scheduler/RUNNER.md`** — skill-execution path updated.
- **`ensemble/RUN.md`** — first-time setup paths corrected (`cd .ai-orchestra/ensemble`; config paths use `.ai-orchestra/ensemble/`).
- **`adapters/codex/post-install-checks.md`** — `core.preserved` check now uses `installedFolder` to determine which folder name to verify.
- **`_v3.x-backlog.md`** — `{{INSTALLED_FOLDER}}` and `_lint.md` backlog items marked as completed.
- **`package.json`** — `ensemble/bunfig.toml` added to `files` array (required for Bun workspace); description updated; keywords expanded.

## [3.0.0] — Three-Tier Architecture: Score + Ensemble + Remote

This release unifies the spec and runtime layers into a single npm package under a progressive three-tier model, and applies the v2.1 spec improvements accumulated since the v2.0 runtime release.

### Added — Three-tier architecture

- **Tier model** — progressive activation: Tier 1 (Score: IDE agent + spec), Tier 2 (Ensemble: Lead + Role agents as background processes), Tier 3 (Remote: Telegram bot orchestration). Each tier builds on the previous and is opt-in.
- **`score/` folder** — spec layer (Tier 1) renamed from `ai-orchestra/` in the installed project. All internal path references updated to `score/core/`, `score/adapters/`, etc. Legacy `ai-orchestra/` installs continue to work; the `upgrade` skill offers a one-time `git mv ai-orchestra score` migration on explicit user consent.
- **`ensemble/` folder** — runtime layer (Tier 2+3) renamed from `runtime/`. Included in the npm package under `ensemble/`. Activated via `npx @neverreven/ai-orchestra setup-ensemble` or agent trigger `"set up agentic team"`.
- **`bin/init.mjs` — `setup-ensemble` subcommand** — copies `ensemble/` into `.ai-orchestra/ensemble/`, verifies Bun, runs `bun install`, launches the interactive setup wizard, updates install marker to `tier: 2`.
- **`bin/init.mjs` — `setup-telegram` subcommand** — guides through BotFather bot creation, runs `bun run setup:bots`, updates install marker to `tier: 3`.
- **`core/skills/setup/setup-ensemble/SKILL.md`** — Tier 2 activation skill: prerequisite checks, wizard walkthrough, install-marker update, post-setup verification, model hint `sonnet`.
- **`core/skills/setup/setup-telegram/SKILL.md`** — Tier 3 activation skill: BotFather instructions inline, connectivity verification, security posture summary, model hint `sonnet`.
- **Install marker schema** — new fields: `tier` (1/2/3), `installedFolder` ("score" or "ai-orchestra" for legacy), `ensemble` (`installed`, `path`, `version`, `telegramEnabled`). Fully backward-compatible (existing markers read without the fields; upgrade skill adds them).

### Added — v2.1 spec improvements (ported from v2.x branch)

- **`core/skills/audit/upgrade/SKILL.md`** — non-destructive upgrade skill: managed/project-owned boundary, diff-and-consent for adapted skills, SESSION_STATE opt-in, `ai-orchestra/` → `score/` folder rename migration step, post-upgrade audit, model hint `sonnet`.
- **Director rule §0 project-root anchoring** — agent locates `.ai-orchestra/install.json` first and resolves all paths relative to the owning project root (not the IDE workspace root). Fixes multi-root workspace and monorepo sub-project context bleed.
- **`core/director/session-state-template.md`** — machine-readable session handoff template: current phase, last commit, active model, active work items, blocked items, decisions, model routing used, next session starting point. Written at session end, read at session start. Offered (opt-in) by the upgrade skill if not yet present.
- **`core/skills/_schema.md` — `## Model hint` section** — optional skill field `preferred_model: haiku | sonnet | opus`. Prevents model-tier mismatch. Applied to: cleanup (`haiku`), pre-release (`sonnet`), ai-infra-audit (`sonnet`), upgrade (`sonnet`), setup-ensemble (`sonnet`), setup-telegram (`sonnet`).
- **`adapters/_contract.md` — cross-IDE path portability** — adapter contract now requires project-root-relative core paths in cross-IDE files (`AGENTS.md`, `CLAUDE.md`) rather than IDE-specific paths. Ensures skills are reachable from any agent.

### Breaking — folder name change (lazy migration)

- **`score/` vs `ai-orchestra/`** — the `init` CLI now copies the spec folder as `score/` instead of `ai-orchestra/`. **Existing installs are not affected** — the upgrade skill handles migration on a per-project basis with explicit user consent. New projects get `score/` automatically.

### Unchanged

The spec layer content (core, adapters, stack packs, roles, skills) is backward-compatible. All v1.x and v2.x workflows continue to work under the new `score/` name.

## [2.0.0] — Multi-Agent Runtime (v2)

This is the major release that transforms AI Orchestra from a **pure spec toolkit** into a **live, executing multi-agent orchestration system**. The existing `ai-orchestra/` spec layer is preserved unchanged — it now powers the agent prompts of the new runtime.

### Added — Runtime: `runtime/` Bun monorepo

- **`runtime/agents-framework/`** — shared TypeScript library:
  - `types.ts` — all shared types mirroring OpenSpec JSON Schemas (`AgentRole`, `Task`, `BusMessage`, `ScopeDefinition`, `AgentManifest`, `GLOBAL_FORBIDDEN_PATTERNS`, etc.)
  - `config.ts` — environment loading, preflight validation, interactive API key prompting, `AgentConfig` builder, `DEFAULT_MANIFESTS` + `DEFAULT_SCOPES` for all six roles
  - `scope.ts` — three-tier filesystem scope enforcement (`readWrite` / `readOnly` / `forbidden`), glob matching, path traversal guard, Bash guard, `createToolInterceptor` for Claude SDK tool wrapping
  - `auth.ts` — Telegram auth middleware (owner + allowlist), rate limiting (20 msg/60s), silent drop for unauthorized messages, group chat protection, `/allow` `/revoke` `/listusers` commands
  - `bus.ts` — file-system inter-agent message bus (`BusHandle`): typed message builders (`delegate`, `report`, `escalate`, `statusUpdate`), task lifecycle management, `CURRENT_TASKS.md` renderer, interrupted task recovery
  - `agent.ts` — dynamic system prompt builder for Lead and Role agents, embedding critical rules, delegation logic, scope description, Bus Inbox rules, Task State rules, Telegram interaction rules
  - `bot.ts` — Grammy bot factory with two-message streaming UI (control + stream message), `[■ Stop]` inline button, typing indicator loop, orphaned process cleanup, overflow chunking for long responses
  - `state.ts` — `JsonStore<T>` (atomic read/write), `SessionStore`, `writeCurrentTasksMd`, `writeShutdownMarker` / `readShutdownMarker`
  - `keepawake.ts` — OS-level sleep prevention: `caffeinate` (macOS), `systemd-inhibit` (Linux), `PowerShell SetThreadExecutionState` (Windows)
  - `logger.ts` — structured JSON logger with daily log files, scope-violation hashing (no PII), task/bus event helpers

- **`runtime/openspec/`** — 7 JSON Schema 2020-12 contracts:
  - `task.schema.json`, `bus-message.schema.json`, `delegation.schema.json`, `report.schema.json`, `escalation.schema.json`, `scope.schema.json`, `agent-manifest.schema.json`
  - `_overview.md` — OpenSpec design principles and guide for adding new message types

- **`runtime/projects/`** — six agent entry points (Lead, Frontend, Backend, QA, DevOps, Security) each with `src/index.ts`, `.env.example`, and role-specific `README.md`

- **`runtime/scripts/`** — workspace utilities:
  - `setup.ts` — interactive first-run wizard (API key validation, owner ID, CWD, per-agent bot token setup with optional skip)
  - `dev.ts` — start one or all configured agents as child processes; forwards SIGINT/SIGTERM
  - `list.ts` — tabular project status report
  - `_shared.ts` — shared env loading and project discovery utilities

- **`runtime/RUN.md`** — full operational guide (setup, start/stop, keep-awake, production deployment)
- **`runtime/README.md`** — architecture overview, security model, OpenSpec reference

### Breaking — none

The existing spec layer (`ai-orchestra/`, `bin/`, `core/`, `roles/`, `skills/`) is unchanged.
All v1.x `npm install @neverreven/ai-orchestra` workflows continue to work as before.
The v2 runtime is opt-in via `cd runtime && bun install && bun run setup`.

## [1.4.1] — README UX improvements

Replaced the confrontational `[!IMPORTANT]` "don't use npm install" banner with a concise, welcoming Quick Start callout. The postinstall script (v1.3.1) already handles the accidental `npm install` case gracefully, so the hard warning was redundant and set a poor first impression.

Added a **"Starting fresh — greenfield projects"** section to the README explaining exactly what a first-time install on a project with no agentic infrastructure produces: session protocol, self-improving memory, role library, 30+ skills, stack-specific rules, stop-hook, MCP slots, and install marker. Includes a two-command quick-start example.

## [1.4.0] — Scheduler, stack pack depth rules, adapter parity, adversarial fixtures, Rust pack, extract CLI

This release ships seven coordinated improvements spanning the scheduler runtime, all four adapters, four stack packs, the test fixture set, and the CLI. The theme: **production-ready depth** — every previously baseline adapter now has a full `render-rules.md` specification; the scheduler has an executable runner; stack packs have expert-level depth rules; error-handling edge cases have adversarial fixture contracts; and the CLI can extract the orchestra out of a host repo.

### Added — V2: Scheduler runner

- `core/scheduler/RUNNER.md` — agent-executable procedure for the scheduler. Covers prerequisites, job evaluation (skip conditions, due determination, missed-run policy, concurrency), execution by run kind (`skill`, `hook`, `script`), lifecycle events, marker updates, and summary reporting.
- `core/scheduler/jobs/periodic-audit.job.json` — default shipped job descriptor for the weekly `ai-infra-audit` run. Ships in `manual` mode (v1 safe); upgrade path to `cron` documented inline.
- `core/director/RULE.md` updated with `## Scheduler` section referencing `RUNNER.md`.
- Adapter stop-hook prompts updated (Cursor `render-rules.md` §6, Claude Code `target-schema.md`, Codex/VS Code fallback messages in `mappings.md` §5) to run overdue jobs before the learnings review.

### Added — V3: Stack pack depth rules

- `core/stack-packs/js-ts/rules/next-rsc.md` — Next.js App Router / React Server Components patterns.
- `core/stack-packs/js-ts/rules/node-api.md` — Node.js API service patterns (structure, async, security, observability).
- `core/stack-packs/js-ts/rules/testing.md` — JavaScript/TypeScript testing patterns (Vitest/Jest, mocks, coverage, E2E).
- `core/stack-packs/python-web/rules/async-patterns.md` — Python async/concurrency patterns (asyncio, thread/process offloading, error handling).
- `core/stack-packs/python-web/rules/testing.md` — Python testing patterns (pytest, fixtures, parametrize, coverage, DB).
- `core/stack-packs/python-web/rules/database.md` — Python database patterns (SQLAlchemy/Django ORM, migrations, pooling).
- `core/stack-packs/salesforce/rules/omnistudio.md` — OmniStudio patterns (OmniScripts, FlexCards, DataRaptors, Integration Procedures).
- `core/stack-packs/salesforce/rules/flow.md` — Salesforce Flow patterns (Screen, Record-Triggered, Autolaunched, Scheduled, Platform Event).
- `core/stack-packs/salesforce/rules/security.md` — Salesforce security patterns (Apex FLS/sharing, SOQL injection, LWC CSP, Named Credentials).
- All three pack `_overview.md` files bumped to version `1.1.0`.

### Added — V1: Multi-project orchestration

- `core/registry/global-registry.md` — v2 schema, mutation rules, reading semantics, and cross-project operations for `~/.ai-orchestra/projects.json`.
- `core/skills/orchestration/multi-project-audit/SKILL.md` — cross-project health check skill.
- `core/skills/orchestration/upgrade-all/SKILL.md` — batch upgrade skill for all orchestra-managed projects.
- Adapter `INSTALL.md` activation messages updated to mention the global registry.

### Added — V4: Adapter parity — render-rules.md for Claude Code, Codex, VS Code

- `adapters/claude-code/render-rules.md` — exact rendering rules for `CLAUDE.md` managed sections, `.claude/commands/<skill>.md` frontmatter + body, stop-hook prompt body, and idempotency contract.
- `adapters/codex/render-rules.md` — exact rendering rules for `AGENTS.md` managed section, skill catalog format, and idempotency contract.
- `adapters/vscode/render-rules.md` — exact rendering rules for `.github/copilot-instructions.md` managed sections, `.github/prompts/<skill>.prompt.md` frontmatter, and idempotency contract.
- All three adapters' `INSTALL.md` §7 tables updated with `render-rules.md` row.
- All three adapters' `post-install-checks.md` §9 enriched with `idempotency.history-stable` check and explanatory note.
- All three adapters' `mappings.md` §11 updated with `render-rules.md` cross-reference.

### Added — V5: Adversarial test fixtures

- `_test-fixtures/broken-markers/` — FastAPI project with malformed markers in `CLAUDE.md` (unclosed start), `AGENTS.md` (nested starts), and `.github/copilot-instructions.md` (transposed). EXPECTED.md requires critical-conflict blocks, no auto-repair, and partial-install for unblocked artifacts.
- `_test-fixtures/name-collision/` — React/Vite/TS project with project-owned `cleanup` skill in all three adapter locations. EXPECTED.md requires suffix-rename, `[Orchestra]` prefix, originals untouched, and overlap report.
- `_test-fixtures/upgrade-from-v1/` — React/TS project with v1.0.0 install marker. EXPECTED.md requires upgrade mode, `propose` for stale orchestra files, `create` for new skills, `extend-section` for AGENTS.md, `skip` for learnings doc, v1→v2 schema migration, and history append.
- `_test-fixtures/_overview.md` updated with §1.1 adversarial fixture table.

### Added — V7: Rust/Tauri stack pack

- `core/stack-packs/rust/_overview.md` — pack identity, detection (`.rs` files + `Cargo.toml`), layering rules, Tauri sub-flavour.
- `core/stack-packs/rust/rules/ownership-and-borrowing.md` — ownership, borrowing, and lifetime patterns.
- `core/stack-packs/rust/rules/error-handling.md` — `?` operator, `thiserror`, `anyhow`, context, panics, `Option`.
- `core/stack-packs/rust/rules/async-tokio.md` — async Rust with Tokio (spawning, channels, cancellation, blocking, testing).
- `core/stack-packs/rust/rules/tauri.md` — Tauri v2 patterns (commands, state, plugins, security, build/distribution).
- `core/stack-packs/rust/skills.md` — Rust addenda for universal skills.
- `core/stack-packs/rust/roles.md` — Rust addenda for universal roles.
- `core/discovery/signals/rust.md` updated with live cross-link to the new pack.

### Changed — `init` default: fixtures excluded

- `_test-fixtures/` is now **excluded by default** when running `npx @neverreven/ai-orchestra init`. Users who want fixtures (orchestra contributors / harness runners) can opt in with `--include-fixtures`. The old `--skip-fixtures` flag is removed. This makes a default install ~170 KB instead of ~250 KB and avoids shipping test scaffolding into production projects.

### Added — V6: `extract` CLI subcommand

- `bin/init.mjs`: new `extract` subcommand. Copies `ai-orchestra/` from a host project to a standalone directory. Writes a minimal `package.json` (private: true). Optionally initialises a git repo (`--git`). Optionally removes the source (`--clean`).
- `README.md`: documents the `extract` command with options table and example; updates status table; updates repository layout to reflect new files; adds Rust to supported stacks.

## [1.3.1] — npm postinstall guidance + README version fix

Added a `postinstall` npm script to `package.json` that prints a one-line redirect message when users run `npm i @neverreven/ai-orchestra`. The message explains the package is a spec folder (not a code library) and directs to `npx @neverreven/ai-orchestra init`. Updated the README `currently 1.2.0` line to `1.3.0` (caught late), README now reflects correct version.

## [1.3.0] — F2 always-on downgrade + F7 mobile pack + F5 skill overlap + F1 polyglot + F3 ceiling + F6 glob filter

This minor release ships six coordinated improvements across the install runtime, the conflict model, the stack-pack catalog, and the validation harness. The theme: **safer installs** (no surprise always-on rule proliferation), **smarter packs** (only install what actually matches the project), and **broader coverage** (mobile-native and cross-platform projects are first-class citizens). All four adapters are updated in parallel; no adapter falls behind.

### Added — F2: always-on rule downgrade on suffix-rename

When an orchestra artifact that carries `alwaysApply: true` (the Director rule or the orchestra-context rule) undergoes `suffix-rename` because the project already owns a rule at the target path, the renamed copy is now **downgraded to manual-trigger** before being written.

- `adapters/cursor/render-rules.md` §5.6 — frontmatter transformation spec for the renamed copy: `alwaysApply: false`, `[Orchestra — manual trigger]` description prefix, explanatory HTML comment.
- `adapters/cursor/mappings.md` §6.1 — always-on downgrade policy: when and why.
- `adapters/cursor/post-install-checks.md` §4.1 — four new checks (`rules.suffix-renamed.downgraded`, `…description-prefix`, `…body-comment`, `…no-double-always-on`).
- Claude Code, Codex, VS Code adapters receive parallel §6.1 downgrade policies and §4.1 post-install checks appropriate to each IDE's always-on mechanism (`CLAUDE.md`, `AGENTS.md`, `copilot-instructions.md`).
- `core/registry/install.schema.md` — `rules[].alwaysOn` and `rules[].sourceAlwaysApply` fields added to support check logic.

### Added — F7: mobile stack pack

New first-class stack pack for mobile development (Capacitor, React Native, Flutter, MAUI, Android native, iOS native).

- `core/stack-packs/mobile/_overview.md` — pack identity, detection, layering rules, and scope.
- `core/stack-packs/mobile/rules/touch-and-viewport.md` — touch targets, safe areas, viewport, pointer-coarse patterns.
- `core/stack-packs/mobile/rules/native-plugin-lifecycle.md` — plugin init, permission flows, platform conditionals, bridge etiquette.
- `core/stack-packs/mobile/rules/offline-and-sync.md` — offline-first patterns, pull-to-refresh, background sync, network-status gating.
- `core/stack-packs/mobile/rules/app-store-readiness.md` — signing, versioning, icons/splash, permissions, privacy manifests, store-submission checklist.
- `core/stack-packs/mobile/skills.md` — mobile-specific addenda for universal skills.
- `core/stack-packs/mobile/roles.md` — mobile-specific non-negotiables for roles (mobile-engineer, devops-sre, qa-engineer, security-engineer).
- `core/discovery/signals/mobile.md` — cross-link to new pack added.

### Added — F5: skill name overlap disambiguation

When an orchestra skill undergoes `suffix-rename` because the project already has a skill of the same id, the renamed copy's description is now prefixed with `[Orchestra]` and includes a disambiguation note pointing to the project's skill.

- `adapters/cursor/render-rules.md` §5.5 — description disambiguation spec for suffix-renamed skills.
- `adapters/cursor/post-install-checks.md` §5.1 — three new checks (`skills.overlap.description-prefix`, `…disambiguation-note`, `…report`).
- Claude Code `mappings.md` §4 and Codex `mappings.md` §3 (catalog entry level) receive equivalent disambiguation specs.
- VS Code `mappings.md` §4 updated.
- Post-install report now includes an `## Overlapping skills` section when any skill overlap was detected.

### Added — F1: secondary scan for sub-project detection

Discovery now performs a lightweight secondary scan (depth-1 subdirectories only) to detect sub-packages within the repository.

- `core/discovery/DETECTION.md` §3.4 — secondary scan procedure (10 manifest types, 20-entry cap, 1-second budget).
- `core/registry/install.schema.md` — `subProjects[]` field added (each entry: `path`, `manifest`, `type`). In v1.3, stack packs remain root-scoped; the field is informational.
- All four adapter `post-install-checks.md` — §8.6 sub-project detection checks (`marker.subprojects.scanned`, `…paths-valid`).
- All three fixture `EXPECTED.md` files updated to assert `subProjects: []`.

### Added — F3: always-on rule ceiling check

A new non-blocking post-install warning fires when the number of always-on rules/context sources exceeds 4 after install.

- `adapters/cursor/post-install-checks.md` §8.7 — counts `.mdc` files with `alwaysApply: true`; warns if > 4.
- Claude Code, Codex, VS Code adapters receive §8.7 equivalents appropriate to their always-on loading mechanism (number of auto-loaded `CLAUDE.md` / `AGENTS.md` / `copilot-instructions.md` files).
- Non-blocking: the check lists each always-on source so the user can decide which to demote; the orchestra never auto-demotes.

### Added — F6: pack rule glob filtering

Pack rules whose `## When this applies` globs match zero tracked files in the target project are now **skipped** at install time rather than installed unconditionally.

- `adapters/cursor/mappings.md` §7.1 — glob-filter procedure, `installedPackRules[]`, `skippedPackRules[]`, audit re-evaluation.
- Claude Code, Codex, VS Code `mappings.md` §7 — parallel pack rule glob filtering specs.
- `core/registry/install.schema.md` — `stacks[].installedPackRules[]` and `stacks[].skippedPackRules[]` fields added.
- All four adapter `post-install-checks.md` — §8.8 pack rule filter checks (`packs.<stack>.filter.recorded`, `…skipped-rules.no-files`/`…not-in-managed-section`).
- All three fixture `EXPECTED.md` files updated to reflect filtered vs. installed rules and the new marker fields.

### Changed — fixture EXPECTED.md contracts updated

All three validation fixtures (`empty-js`, `ongoing-python-web`, `salesforce-cartridge`) updated to reflect the new v1.3.0 expectations: `subProjects[]` field, `installedPackRules[]`/`skippedPackRules[]` marker fields, glob-filter decisions per fixture, and ceiling check pass conditions.

### Backward compatibility

- v1.2 install markers without `subProjects`, `installedPackRules`, or `skippedPackRules` are valid. The audit adds these fields on the next upgrade run.
- The section §5.5 in `render-rules.md` (previously "always-on downgrade") is now §5.6; §5.5 is the new "skill disambiguation" section. The only cross-reference to the old §5.5 in `post-install-checks.md` has been updated.
- No adapter section numbering changed for §6 / §7 / §8 / §9 / §10 / §11 of any adapter's `mappings.md`. New subsections are additive (§7.1, §7.2, §8.6–§8.8).
- The `core/stack-packs/` directory gains `mobile/` as a new subdirectory. No existing stack pack was modified.

## [1.2.0] — npm distribution + F4 stop-hook overlap resolution

This minor release ships two coordinated workstreams: a real distribution mechanism (`npx @neverreven/ai-orchestra@latest init`) so the orchestra can be dropped into any project without copying the folder by hand, and the v1.x backlog's highest-priority finding (F4 — stop-hook conceptual overlap). The release leaves the `-alpha` suffix behind: the orchestra core has stabilised, the four adapters cover their declared surfaces with explicit gaps, and the universal contracts (install scope, install plan template, stop-hook overlap) have settled enough to call this a real `1.x` minor.

### Added — npm distribution (`@neverreven/ai-orchestra`)

The orchestra now ships as an npm package so any project can install it with one command:

- `package.json` — package manifest. Name `@neverreven/ai-orchestra`, public access, `bin: { "ai-orchestra": "./bin/init.mjs" }`. Files include the spec folders (`core/`, `adapters/`, `_test-fixtures/`) and the top-level docs (`README.md`, `RUN.md`, `MIGRATION.md`, `CHANGELOG.md`, `VERSION`, `_v1.x-backlog.md`); excludes `.git/`, `.github/`, and `node_modules/`.
- `bin/init.mjs` — Node.js installer CLI (no runtime dependencies, ESM, Node ≥ 18). Subcommand `init [target-dir]` copies the orchestra spec folder into the target project's root and writes `<target>/.ai-orchestra/installed-from.json` with the package version + ISO timestamp. Flags: `--force` (overwrite an existing folder), `--skip-fixtures` (omit `_test-fixtures/` to save ~80 KB), `--no-marker` (skip the install marker file). Help text and version reporting via `--help` / `--version`.
- `.npmignore` — controls what ships in the published tarball; complements `package.json#files`.
- `.github/workflows/release.yml` — GitHub Actions release workflow. Triggers on `v*.*.*` and `v*.*.*-*` tags. Validates `VERSION` ↔ `package.json#version` ↔ git tag, smoke-tests the CLI (`--version`, `--help`), publishes to npm with `--access public` (pre-release tags get `--tag next`), then creates a GitHub Release with notes extracted from this changelog. Requires the repo secret `NPM_TOKEN`.
- `README.md` — new "Install" section near the top documenting the `npx` workflow and the upgrade path (`init --force`).

This finding was previously listed as a v2 candidate ("Distribution mechanism") in `_v1.x-backlog.md`. Shipping it in v1.2.0 unblocks adoption — agents in any IDE can now ask the user to run `npx @neverreven/ai-orchestra@latest init` instead of guiding the user through a manual git-clone / copy step.

### Added — F4: stop-hook overlap detection and resolution

When a host project already has a stop hook (or an IDE-fallback equivalent) that updates the same learnings document the orchestra would target, pre-v1.2.0 silently appended the orchestra's hook alongside it — both fired on every session end and both edited the same file. v1.2.0 detects the overlap before merging and asks the user how to resolve it.

- `core/conflict/stop-hook-overlap.md` — new universal contract (`core/conflict/` is a new directory introduced for cross-IDE conflict-resolution specs). Defines the four-signal detection scheme (C1 tagged-orchestra, C2 path co-reference, C3 verb co-reference, C4 type-prompt-with-no-path), the three-choice resolution flow (`skip-orchestra` / `replace-with-orchestra` / `adopt-existing`), the install-marker fields, and the audit behaviour for each recorded resolution.
- `core/discovery/existing-infra.md` — new §3.11 (Stop-hook conceptual overlap). Detection-side spec consumed by the universal contract. Outputs `existingInfra.stopHookOverlap` to the inventory. Performance budget: bounded by the typical 1–3 entries under `hooks.stop`, stays within the 2-second Phase 3 budget.
- `core/registry/install.schema.md` — `installScope.stopHookOverlapResolution` field added with full field-reference documentation. Records `value`, `detectedAt`, `decidedAt`, `decidedBy`, plus `replacedEntryEvidence` (when `value === "replace-with-orchestra"`) or `adoptedEntryDigest` (when `value === "adopt-existing"`). Markers without the field (v1.0 / v1.1 markers) are valid and treated as `value: null`, `decidedBy: "default-no-overlap"`; the audit migrates them on first run.
- `adapters/cursor/mappings.md` §5 — overlap branch added to the `.cursor/hooks.json` merge logic. The "no orchestra entry" merge row splits into "no overlap detected" (existing append behaviour) and "overlap detected" (route through the universal contract). New "Overlap branch" subsection documents what the adapter writes per choice.
- `adapters/claude-code/mappings.md` §5 — same shape as Cursor for `.claude/settings.json`. Overlap branch only executes on Claude Code versions that support hooks; on older versions the existing `skip-with-gap` row applies and the audit re-evaluates overlap on every audit invocation.
- `adapters/codex/mappings.md` §5 — overlap-with-fallback branch added under the existing declared-gap section. Codex has no native session-end hook, so `replace-with-orchestra` degrades to `propose` (the adapter cannot rewrite a saved system prompt or `AGENTS.md` "session protocol" passage automatically). `skip-orchestra` and `adopt-existing` work as defined; the marker's `evidence.degradedTo: "propose"` flag records the degradation when relevant.
- `adapters/vscode/mappings.md` §5 — overlap-with-fallback branch added with the same shape as Codex. The fallback locations VS Code Copilot users adopt include `.github/copilot-instructions.md` "session protocol" passages, saved Copilot Chat prompts, and VS Code tasks wired to save / window-close events. Same `replace-with-orchestra` → `propose` degradation rule.
- `adapters/cursor/post-install-checks.md` §8.5 — five new checks: `cursor.hooks.overlap.recorded`, `…skip-honoured`, `…replace-honoured`, `…adopt-honoured`, `…no-overlap-clean`. Verify the chosen resolution was honoured and surface drift on `adopt-existing` digest mismatch.
- `adapters/claude-code/post-install-checks.md` §8.5 — same five checks under `claude.hooks.overlap.*` ids. Skipped when the Claude Code hook gap applies (`hooks.Stop.registered === false`).
- `adapters/codex/post-install-checks.md` §8.5 — same five checks under `codex.hooks.overlap.*` ids, with the `replace-with-orchestra` check verifying `evidence.degradedTo: "propose"` is recorded (since the adapter cannot natively rewrite the fallback).
- `adapters/vscode/post-install-checks.md` §8.5 — same five checks under `vscode.hooks.overlap.*` ids, same `replace-with-orchestra → propose` degradation as Codex.

The audit (per [`core/skills/audit/ai-infra-audit/SKILL.md`](core/skills/audit/ai-infra-audit/SKILL.md)) re-runs detection on every audit invocation and surfaces drift per [`core/conflict/stop-hook-overlap.md`](core/conflict/stop-hook-overlap.md) §6: a recorded `adopt-existing` resolution warns when the `adoptedEntryDigest` no longer matches; a recorded `replace-with-orchestra` warns when the project re-introduces an overlapping hook; a recorded `skip-orchestra` proposes offering the orchestra hook on next upgrade if the user removed their project hook.

### Backward compatibility

- v1.0 / v1.1 install markers without `installScope.stopHookOverlapResolution` are valid and read as `value: null`, `decidedBy: "default-no-overlap"`. The audit re-runs detection on first invocation against a pre-1.2.0 marker and writes the field with the current verdict.
- The npm package is purely additive — projects that previously copied the orchestra by hand continue to work without change. The `bin/init.mjs` CLI is a thin convenience over the same copy operation.
- All adapter section numbers are stable. The new "Overlap branch" subsection in §5 of each adapter's `mappings.md` is appended within §5 — no renumbering of §6 / §7 / §8 / §9 / §10 / §11.
- The `core/conflict/` directory is new. No existing file was moved or renamed.

### Deferred — F1, F2, F3, F5, F6, F7 + mobile pack (v1.3.0 scope)

The remaining v1.x backlog items (`_v1.x-backlog.md` F2, F5, F1, F7, F3, F6, in their declared ship order) and the F7 mobile stack pack are deferred to v1.3.0. F4 was prioritised in v1.2.0 because it was the highest-impact UX issue surfaced by the pilot and produced silent duplicate work on the second invocation — the most trust-eroding scenario the orchestra could present. The remaining findings (Director rule double-load, skill name overlap, polyglot detection, always-on rule ceiling, pack rule glob filtering, mobile pack content) are quality-of-life and content-coverage improvements that don't gate adoption. v1.3.0 will batch them behind a single validation harness re-run + EXPECTED.md updates across all three fixtures.

### Bookkeeping

- `VERSION` bumped to `1.2.0` (no `-alpha` suffix; the orchestra core is stable).
- `package.json#version` aligned with `VERSION`.
- `_v1.x-backlog.md` — F4 entry moved to the new "Shipped" section with a back-link to this changelog entry; remaining entries unchanged.
- `README.md` — Status table updated to reflect v1.2.0; new "Install" section for the npm distribution.

## [1.1.0-alpha] — Role scope and quality-aware install

This minor release adds four install-scope modes, an inventory-driven recommendation engine that proposes a default mode based on what the orchestra finds in the target project, and a quality assessment of the existing AI structure that surfaces weak or corrupted artifacts to the user with `improve` / `replace` / `preserve` options. None of the changes are breaking. v1.0.x install markers without `installScope` continue to validate and are treated as `mode: "full-kit"`, `decidedBy: "default"`.

### Added — install scope modes

The orchestra now supports four mutually exclusive install scope modes, defined authoritatively in a new contract document and consumed uniformly by all four adapters:

- `core/install-scope.md` — new file. Defines the four modes (`full-kit`, `selected-roles`, `primary-plus-collaborators`, `core-only`), the resolver that turns a chosen mode into a deterministic `selectedRoleIds[]` and `selectedSkillIds[]`, the `## Collaboration` parser that drives `primary-plus-collaborators`, the universal-roles rule (`Always auto-installed` roles per `core/roles/_overview.md` §2 stay in scope unless explicitly opted out), the universal-skills set (`cleanup`, `pre-release`, `ai-infra-audit` always installed regardless of mode), the recommendation-engine decision table that maps `existingInfra.roles[]` and `existingInfra.quality.overall` to a recommended mode, and the validation rules the audit applies on every run.
- `core/registry/install.schema.md` — added `installScope` field to the install marker (next to `skillPlacementStrategy`). Records `mode`, `primaryRole` (only when `mode` is `primary-plus-collaborators`), `selectedRoles[]`, `optedOutUniversals[]`, `decidedAt`, `decidedBy` (`default` / `user` / `user-accepted-recommendation` / `user-override`), and the `recommendation` engine's proposed mode + rationale. The `roles[]` and `skills[]` fields are now described as outputs of the `install-scope.md` resolver. No `schemaVersion` bump — the field is additive and has a documented default for older markers.

### Added — per-role ownership and quality assessment

The existing-infra inventory now produces per-role ownership signals and a quality classification of the existing AI structure, both used by the recommendation engine and surfaced in the install plan:

- `core/discovery/existing-infra.md` §3.9 — new section. Detects when one or more orchestra roles are already owned externally (e.g., a `backend/AGENTS.md` your team maintains) using three generic signals (role-shaped subfolder context files, rule files whose name or `description` matches a role alias, hand-written role-shaped sections in main rule files exceeding 300 chars). Includes a per-role alias map (`frontend`, `fe`, `ui`, `client` → `frontend-engineer`, etc.) so detection works without hardcoded project names. Emits `existingInfra.roles[]` with per-role `ownership` (`external` / `partial` / `none`) and evidence.
- `core/discovery/existing-infra.md` §3.10 — new section. Runs the schema linter from `core/_lint.md` against detected rules and skills, plus three additional checks: freshness (git log if available, file mtime fallback), coherence (orphan cross-links, duplicate rule titles), and coverage (presence of a Director-equivalent always-on rule and a learnings doc). Emits `existingInfra.quality` with `overall` (`solid` / `partial` / `weak` / `corrupted` / `none`), strengths, issues (each with severity + `proposedAction` of `improve` / `replace` / `preserve`), and suggestions. Each issue carries an `id` like `lint.no-frontmatter` or `coverage.missing-director` that downstream rows in the install plan can reference.

### Added — quality-aware install plan

The install plan now surfaces quality findings and proposed actions to the user as a first-class part of the consultative install flow:

- `core/install-plan-template.md` Part A §2.3 — new conditional subsection "AI INFRASTRUCTURE ASSESSMENT". Rendered only when the inventory reports `quality.overall != "solid"` or any role has `ownership: "external"`. Three plain-language subsections (Strengths, Findings with severity + proposed action, Suggestions) restate `core/discovery/existing-infra.md` §3.10 findings for human review. Existing §2.3 RATIONALE renumbered to §2.4 and gains an Install scope mode bullet that explains the chosen scope and the recommendation that drove the default.
- `core/install-plan-template.md` Part B §3.1 — new `improve` action (rewrite a managed-section block in place to address a quality issue) and new `targetIssue` column (links Part B rows to the originating `core/discovery/existing-infra.md` §3.10 issue id). The `replace` semantic from §3.10 is rendered as `suffix-rename` with `targetIssue` populated, reusing existing machinery.
- `core/install-plan-template.md` §4 — new Phase 6 question forms in the prescribed order (scope first, then ownership confirmation, then quality issues, then placement, then stop-hook overlap, then below-threshold detections, then final apply): §4.4 Install scope mode (always asked, with the engine's recommendation), §4.5 External-ownership confirmation (per externally-owned role, default exclude), §4.6 Quality issues (group by severity, four resolution options including "walk through each individually"). Existing §4.4 final apply prompt renumbered to §4.7. The intro paragraph explicitly states the agent must skip questions whose precondition does not hold — no placeholder questions.

### Added — Phase 6 consultative flow in RUN.md

`RUN.md` is the canonical agent-facing procedure; the install-plan template is the canonical question-form spec. v1.1.0 keeps that separation while threading the new questions in:

- `RUN.md` Phase 0.5 — orientation message extended. Bullet 3 mentions per-role ownership and quality detection. Bullet 4 mentions the recommended install scope. Bullet 5 mentions the AI INFRASTRUCTURE ASSESSMENT subsection and per-finding proposed actions.
- `RUN.md` Phase 3 — inventory list extended with §3.9 and §3.10 entries plus a paragraph explaining how the findings feed the recommendation engine and the assessment subsection.
- `RUN.md` Phase 5 — Part A description extended to four sections (third is conditional). Part B description extended with the `improve` action and `targetIssue` column. RATIONALE bullets gain an Install scope mode item.
- `RUN.md` Phase 6 — open-question list reordered into the canonical six categories (scope → ownership → quality → placement → stop-hook overlap → below-threshold) plus the final apply prompt. Each item references the scripted form in `core/install-plan-template.md` §4 rather than duplicating it.
- `RUN.md` References — added `core/install-scope.md` and updated existing-infra cross-link to mention §3.7 / §3.9 / §3.10.

### Added — adapter scope handling

All four IDE adapters honour `installScope.mode` consistently:

- `adapters/cursor/mappings.md` — new §9 (Install scope handling). Per-mode rendering matrix covering Director rule, learnings doc, install marker, universal audit skills, `orchestra-context.mdc` (skipped for `core-only`), per-skill files (filtered by `selectedSkills`), AGENTS.md role list, and stack packs (unaffected by scope). `improve` action semantics with managed-marker preconditions; `replace` proposal rendered as `suffix-rename` with `targetIssue` linkage; conservative deletion policy on scope-down transitions (no auto-delete; `propose` rows for out-of-scope artifacts). Existing §9 Idempotency renumbered to §10; §10 References to §11.
- `adapters/claude-code/mappings.md` — new §9 with the same shape. Per-mode matrix covers the `CLAUDE.md` managed section, the `AGENTS.md` mirror, learnings doc, per-skill slash-commands under `.claude/commands/` (filtered by `selectedSkills`), the stop-hook entry, install marker, and stack packs.
- `adapters/codex/mappings.md` — new §9 with the same shape, accommodating Codex's `register-only` skill placement. The mode primarily affects the AGENTS.md managed-section content (role list and skill catalog) plus skill files under `<sharedPath>` when `skillPlacementStrategy.type` is `shared` or `hybrid`-degraded-to-`shared`. Stop-hook gap behaviour is unchanged across modes. The `improve` action commonly applies to the AGENTS.md skill catalog (e.g., regenerating from the resolved skill set after a quality issue).
- `adapters/vscode/mappings.md` — new §9 with the same shape, mirroring Cursor for prompt files under `.github/prompts/`. Per-mode matrix covers `.github/copilot-instructions.md` managed section, the `AGENTS.md` mirror, prompt files (filtered by `selectedSkills`), stop-hook gap, MCP slots, install marker, and stack packs.

All four adapters renumber Idempotency contract → §10 and References → §11. Each adapter's References section adds links to `core/install-scope.md`, the §3.9 / §3.10 inventory inputs, and the `targetIssue` column conventions.

### Added — first-encounter discoverability

A developer dropping `ai-orchestra/` into a project's root for the first time should be able to invoke the orchestra with any natural variant of the trigger phrase and receive a structured "what / how / options" overview before any probe runs. v1.1.0 closes the previous discoverability gap with two coordinated additions:

- `RUN.md` top — new "Recognising the invocation" section. Explicitly lists the vague trigger phrases the agent should treat as orchestra invocations (`run ai-orchestra`, `run the ai-orchestra folder`, `set up ai-orchestra`, `what is this ai-orchestra folder?`, `audit ai-orchestra`, etc.) and notes that vague invocations route to Phase 0.5's expanded orientation. Existing wording at the very top of the file generalised to "do something with the `ai-orchestra/` folder" so it covers investigate / audit / install equally.
- `RUN.md` Phase 0.5 — restructured into two passes plus a branching reply handler. Pass A is a structured "what this is" message covering what the orchestra is, the three modes of engagement (`investigate only`, `investigate + propose plan`, `audit`), the four install scope options at a glance, and the safety promise (dry-run, no overwrites, no auto-deletes). Pass B is the procedural 5-step overview (existing content, kept). After both, the agent waits for the user's reply and routes to one of five branches: proceed-equivalent → Phase 1; `investigate only` → Phase 1 + stop after Phase 3 with a findings-only report; `audit` → Phase 3 with prior-install detection; `abort` → stop; ambiguous (user picks a scope upfront) → record preference and continue.
- `README.md` — "How to use" expanded with the canonical list of trigger-phrase variants, a "What the orchestra does (5 steps)" subsection, an install scope options table mapping each mode to its target use case, and a safety-promise subsection. Whichever file an agent reads first (README.md or RUN.md), the user gets a consistent structured overview.

### Bookkeeping

- `VERSION` bumped to `1.1.0-alpha`.
- `README.md` updated to reference v1.1.0-alpha and the new `core/install-scope.md`, plus the expanded "How to use" structure described above.

### Backward compatibility

- Install markers from v1.0.0 / v1.0.1 without `installScope` are accepted by the audit and read as `{ mode: "full-kit", decidedBy: "default" }`. The audit proposes a one-time migration that records the inferred field on the next run; no roles or skills are added or removed by the migration.
- The new `improve` action and `targetIssue` column on Part B rows are additive; rows from v1.0.x plans (which never used them) round-trip unchanged.
- All renumbered adapter sections (§9 → §10, §10 → §11) had no external references in v1.0.x; existing cross-references to §3 / §4 / §5 / §6 / §7 / §8 are unchanged.
- The `roles[]` and `skills[]` fields on the install marker continue to be the operational source of truth for "what was installed". `installScope.selectedRoles` mirrors `roles[]` and is recorded for audit self-containment; the two are kept consistent by the resolver.

## [1.0.1-alpha] — Installer hardening

This patch release closes three concerns surfaced during the first real-world install of the orchestra by an external user. None of the changes are breaking; the v1.0 install marker schema is forward-compatible (the new `skillPlacementStrategy` field defaults to `ide-specific` for installs that predate v1.0.1, matching pre-existing behaviour).

### Removed — placeholder URL collision

- `core/registry/install.schema.md` — dropped the `$schema` field from the example install marker. The field previously held an aspirational URL on a domain pattern matching the orchestra's own name; that pattern was meant as a placeholder identifier per JSON Schema convention but happened to point to a third-party domain owned by an unrelated commercial product also called "AI Orchestra". The collision created a false impression that the orchestra depended on or was derived from that product. The field is removed; `schemaVersion` continues to identify the schema version, and the schema document itself is the canonical reference. The field-reference table is updated with a one-line note explaining the deliberate absence.
- `core/_lint.md` — added URL-hygiene rules. Section 2.4 prohibits any URL whose host contains `ai-orchestra` (or other fictional / aspirational orchestra-owned domain patterns) anywhere under `ai-orchestra/core/`, `ai-orchestra/adapters/`, or the top-level documentation files. The rule registry adds two new ids: `url.fictional-orchestra-host` (critical) and `url.unreserved-example-domain` (warning). The verification command `grep -nrE "https?://[^/]*ai-orchestra" ai-orchestra/` is now part of the section's contract — passing zero hits is the success criterion.

### Added — generic shared-folder detection

Real projects often maintain a tool-agnostic folder at the repository root for AI skills (commonly `.agents/`, `.ai/`, `prompts/`, `docs/agents/`, but the convention is unstable across teams). Pre-v1.0.1, the orchestra ignored such folders and installed all skills under the IDE-specific path, producing duplicates. v1.0.1 detects the pattern generically and respects it.

- `core/discovery/existing-infra.md` — new section 3.7 (Tool-agnostic / portable agentic patterns). Defines a heuristic probe: scan top-level directories (excluding IDE folders, build/dependency junk, and the orchestra itself) for folders matching either a named convention (`agents`, `ai`, `prompts`, `.agents`, etc.) or containing `.md` files with skill-shaped headings (`## When to use`, `## Trigger`, `## Procedure`, etc.). Cap the candidate list at 5. Append findings to `existingInfra.shared.candidates[]` with evidence signals so the installer can rank candidates. The probe stays under the 2-second budget by reading only the first ~50 lines of each candidate `.md`.
- `core/registry/install.schema.md` — added the `skillPlacementStrategy` field to the install marker. Type is one of `ide-specific` (default; backward-compatible with v1.0.0 installs that have no candidate folder), `shared` (skills under a user-nominated tool-agnostic folder), or `hybrid` (skills under both, with the IDE-folder copy as a stub pointing to the canonical file). Records `sharedPath`, `decidedAt`, and `decidedBy` (`user` for explicit Phase 6 choice, `default` for absence of a candidate).
- `adapters/cursor/mappings.md` — new §8 (Skill placement strategy). Documents the three strategies, the stub format for hybrid (`.cursor/skills/<skill-id>/SKILL.md` becomes a one-line pointer to the canonical `<sharedPath>/<skill-id>/SKILL.md`), conflict policy when the shared folder already contains a same-named skill, and idempotency under each strategy. Master mapping table row 5 cross-references §8. Idempotency contract renumbered to §9; References to §10.
- `adapters/claude-code/mappings.md` — new §8 with the same shape, mapping the IDE-folder stub to `.claude/commands/<skill-id>.md` as a slash-command pointer file. Renumbering parallels Cursor.
- `adapters/codex/mappings.md` — new §8 with the same shape, but acknowledges that Codex has no IDE-specific skill folder analogous to `.cursor/skills/`. Hybrid degrades to shared transparently; the marker records `degradedTo: "shared"` for clarity. Default behaviour (`register-only` against the orchestra core) is unchanged when no candidate is detected. Renumbering parallels.
- `adapters/vscode/mappings.md` — new §8 with the same shape, mapping the IDE-folder stub to `.github/prompts/<skill-id>.prompt.md` as a Copilot prompt-file pointer. Renumbering parallels.

### Added — pre-install transparency

The orchestra now opens every install with an explicit orientation message, separates the install plan into a human-readable summary and a structured diff, and resolves open questions in Phase 6 consultatively before asking the apply / skip / abort question.

- `RUN.md` — new Phase 0.5 (Orient the user). Before any probing, the agent sends the user a short message describing the five steps about to happen: detect IDE → probe project → inventory existing infra → build plan → present NEW / PRESERVED / RATIONALE. The message replaces the implicit "trust me" of a silent install with explicit consent.
- `RUN.md` — Phase 3 inventory list extended to include shared agentic patterns alongside the existing rules / skills / hooks / learnings / MCP entries.
- `RUN.md` — Phase 5 restructured into a two-part plan format. Part A (user-facing summary) has three sections — NEW (additions, grouped by kind), PRESERVED (untouched paths with sizes and a one-line description each), RATIONALE (non-default choices including the skill placement strategy). Part B (the diff table) keeps its existing structured form with `path / action / source / rationale / conflict` columns plus side-channels for MCP slots, install marker content, global registry, and open questions.
- `RUN.md` — Phase 6 restructured to lead with Part A, resolve open questions interactively (below-threshold detections, skill placement strategy, stop-hook overlap), then ask the final apply / skip / abort question. The user finishes Phase 6 having read the summary in plain language before being asked to consent.
- `core/install-plan-template.md` — new file. The canonical Part A + Part B template, with rendered examples for greenfield and existing-infra-rich projects, the four scripted Phase 6 question forms (below-threshold detection, skill placement, stop-hook overlap, final apply), and renderer notes (Part A under ~40 lines, Part B has no length budget).

### Bookkeeping

- `VERSION` bumped to `1.0.1-alpha`.
- `README.md` updated to reference v1.0.1-alpha and the new `core/install-plan-template.md`.

### Backward compatibility

- Existing v1.0.0-alpha install markers without `skillPlacementStrategy` are read as `{ type: "ide-specific", sharedPath: null, decidedBy: "default" }` — matching pre-existing behaviour. The audit skill writes the field on the next audit run, no user action required.
- The `$schema` field removal is a forward-compatible content change; readers that ignored the field continue to work, and readers that required it would have been broken at v1.0.0 already (the field pointed to a 404).
- All renumbered adapter sections (§8 → §9, §9 → §10) had no external references in v1.0.0; existing cross-references to §3 / §4 / §5 / §6 / §7 are unchanged.

### Added — v1.x backlog tracking

- `_v1.x-backlog.md` — project-agnostic record of the eight findings (F1–F8) captured during the post-v1 pilot. Each finding has a priority (high / medium / low), a neutral observation, a concrete proposal for v1.x, the rationale ("why"), and a list of orchestra files the proposal would touch. F8 is explicitly deferred to v2; the rest are scoped to v1.x in the recommended ship order F4 → F2 → F5 → F1 → F7 → F3 → F6. The file owns its own "Shipped" section so closed findings move there with a back-link to the changelog entry that closed them. v1 is unaffected; this is purely planning content for the next release.

### Added — PR 7 (Validation Harness + Documentation Polish)

- `_test-fixtures/_overview.md` — what fixtures are, the v1 fixture set (3 fixtures), folder shape, what fixtures verify (detection, install plan, existing-infra respect, idempotency, honesty), what's out of scope for v1, host-project isolation requirements, and how to add a new fixture.
- `_test-fixtures/VALIDATION.md` — agent-driven validation procedure. Six phases (enumerate fixtures → per-fixture dry-run with detection / plan / idempotency / honesty checks → aggregate report → output). Defines the structured report format, pass/fail/notes scheme, and explicit non-mutability constraints.
- `_test-fixtures/empty-js/` — fresh React + TypeScript + Vite project with zero existing agentic infrastructure. 8 files: README, EXPECTED, package.json, tsconfig.json, vite.config.ts, index.html, src/main.tsx, src/App.tsx. Tests detection of `js-ts` stack with React + Vite frameworks; full install path with no conflicts.
- `_test-fixtures/ongoing-python-web/` — FastAPI service with pre-existing `AGENTS.md` and `.cursor/rules/python-style.mdc`. 9 files: README, EXPECTED, pyproject.toml, app/__init__.py, app/main.py, app/models.py, tests/test_main.py, AGENTS.md, .cursor/rules/python-style.mdc. Tests `python-web` stack detection with FastAPI; existing-infra preservation; managed-section `extend-section` action on `AGENTS.md`; `skip` action on the project-owned rule; idempotent re-run.
- `_test-fixtures/salesforce-cartridge/` — sfdx + SFRA polyglot Salesforce project. 12 files: README, EXPECTED, sfdx-project.json, package.xml, AccountController.cls + meta, accountList LWC bundle (3 files), int_my_storefront cartridge (cartridge.json + Account.js controller + show.isml). Tests multi-sub-flavour detection (`salesforce-sfdx` + `salesforce-sfra`), all four salesforce-pack rule files rendering, and the negative case where `.js` files inside cartridges do NOT trigger a false-positive `js-ts` detection.
- `MIGRATION.md` — orchestra version-upgrade guidance. Documents the agent-driven migration model (re-run + audit-skill drift detection), SemVer compatibility policy (patch / minor / major behaviour), install-marker backward-compatibility guarantees, per-version migration notes (with placeholders for future versions), migration from non-orchestra setups, IDE switching, and rollback procedure.

### Changed — PR 7

- `README.md` — final v1 status table (all seven PRs shipped); repository layout updated to include `_test-fixtures/` subtree and `MIGRATION.md`; See-also entries for the new files.
- `eslint.config.js` (host-project file outside the orchestra core) — added `ai-orchestra/_test-fixtures` to the global ignore list. This prevents the host project's lint pipeline from processing fixture source code as if it were host code. Disappears when the orchestra is extracted to its own repo.

### Notes — PR 7

- The validation harness is **declarative and agent-driven**. There is no runtime test runner in v1 — agents read `VALIDATION.md`, execute the procedure, and produce a structured markdown report. v2 backlog includes optional CI runtime support.
- Each fixture's `EXPECTED.md` is the **contract** the orchestra must satisfy when run against that fixture. Drift between core and `EXPECTED.md` is caught the next time the harness runs; the audit skill is the recommended owner of detecting that drift.
- The fixture set is deliberately minimal: 3 fixtures covering the v1 surface (clean install, existing-infra preservation, polyglot detection). v1.x and v2 will grow the set (Go, Rust, mobile, adversarial fixtures, etc.).
- The post-v1 pilot — dry-running the orchestra against the host project on a dedicated experiment branch — uses this harness as its skeleton, but the pilot is itself separate work that runs **after** the aggregator merges to master.
- All cross-links verified: 0 broken across the orchestra docs.

### v1 close-out

This PR completes v1 of the orchestra (all seven planned PRs shipped). The version remains `1.0.0-alpha` until the post-v1 pilot validates against a real codebase; the version will move to `1.0.0` once the pilot signs off, per the policy in [`MIGRATION.md`](MIGRATION.md) §4. v1 backlog (multi-project orchestration runtime, scheduler runner, notifications router, distribution mechanism, additional stack packs, deeper non-Cursor adapter coverage) is tracked in the project plan; none of it ships in v1.

### Added — PR 6 (Stack Content Packs)

- `core/stack-packs/_overview.md` — framework explaining what stack packs are, how they layer onto the universal core (roles unchanged, skills unchanged, packs add content additively), the three first-class v1 packs, install ordering, pack versioning, and how to add a future pack.
- `core/stack-packs/_schema.md` — required structure of any stack pack folder: `_overview.md` + `rules/<topic>.md` files + `skills.md` + `roles.md`. Defines section order, length budgets, lint rules with severities, and the cross-validation that `### <skill-id>` and `### <role-id>` headings reference real universal skills/roles.
- `core/stack-packs/js-ts/` — first-class pack for JavaScript / TypeScript web. Six files: `_overview.md`; `rules/react.md`, `rules/typescript.md`, `rules/vite.md`, `rules/node-server.md`; `skills.md` extending six universal skills; `roles.md` extending five universal roles. Frameworks covered: React, Vue, Svelte, Next, Vite, Node, plain JS/TS.
- `core/stack-packs/python-web/` — first-class pack for Python web. Six files: `_overview.md`; `rules/python.md` (universal Python discipline); `rules/django.md`, `rules/flask.md`, `rules/fastapi.md`; `skills.md` extending six universal skills; `roles.md` extending four universal roles.
- `core/stack-packs/salesforce/` — first-class pack for Salesforce / Commerce Cloud B2C. Six files: `_overview.md`; `rules/apex.md` (governor limits, bulk-safe code, SOQL/DML discipline, test classes); `rules/lwc.md` (Lightning Web Components: wire service, events, lifecycle); `rules/sfra.md` (Storefront Reference Architecture: cartridge layering, controllers, models, hooks); `rules/sfdx.md` (project layout, scratch orgs, deployment); `skills.md` extending six universal skills with Apex/LWC/SFRA/sfdx checks; `roles.md` extending five universal roles, including the unique mapping of Salesforce engineering surfaces (Apex → backend, LWC → frontend, sfdx → devops).

### Notes — PR 6

- Pack content is **stack-specific but project-agnostic**. Patterns capture what most React / Django / Apex projects benefit from; opinions about specific company codebases are excluded by design.
- The `salesforce` pack treats Salesforce engineering on its own terms (governor limits, bulk-safe code, the platform's testing requirements, sfdx project model) rather than forcing generic web idioms onto it. Apex maps to backend; LWC maps to frontend; sfdx maps to devops; SFRA is its own thing under the backend role.
- Each pack's [`skills.md`](core/stack-packs/js-ts/skills.md) entry uses `### <skill-id>` headings that match a real folder under [`core/skills/`](core/skills/) (verified by the lint rule `pack.skills.heading-references`). Same for [`roles.md`](core/stack-packs/js-ts/roles.md) and `### <role-id>` headings against [`core/roles/`](core/roles/) (rule `pack.roles.heading-references`).
- Pack versioning is independent of orchestra core version. Each pack's `_overview.md` declares `pack.version` and `compatibleOrchestraVersions`. The install marker records both.
- Adapter changes are **not required** for PR 6. Adapters consume pack content via the universal layering rules in [`core/stack-packs/_overview.md`](core/stack-packs/_overview.md) §3. The Cursor adapter's `mappings.md` already had a deferred reference to stack packs noted in PR 4; that reference now resolves.
- The remaining stacks detected by [`core/discovery/signals/`](core/discovery/signals/) (Go, Rust, .NET, generic mobile) do not have first-class packs in v1. The audit reports their detection as `info`-severity drift and the v1.x / v2 backlog tracks pack creation. v1 is honest about this limitation.
- All cross-links verified: 0 broken across the orchestra docs.

### Added — PR 5 (Other-IDE Adapter Baselines)

- `adapters/claude-code/` — five spec files (INSTALL, mappings, target-schema, mcp, post-install-checks) defining how the orchestra installs into Claude Code. Renders the Director rule + project context + role list + skill catalog into a managed section of `CLAUDE.md` (mirrored to `AGENTS.md`). Skills are copied to `.claude/commands/<skill-id>.md` (single-file slash commands). Stop-hook is wired into `.claude/settings.json` (`hooks.Stop`) on supported Claude Code versions; older versions get a declared gap with manual fallback. MCP slots register into the project-root `.mcp.json` using the same shape as Cursor.
- `adapters/codex/` — five spec files defining how the orchestra installs into Codex CLI. Distinctively, **skills are not copied** — they are referenced by id and trigger phrase from a "Skill catalog" section inside `AGENTS.md`, with the agent following links into the orchestra core (`ai-orchestra/core/skills/<category>/<skill-id>/SKILL.md`). This avoids content duplication and lets skill updates flow automatically when the orchestra core is updated. Codex has no session-end hook in v1, so the stop-hook is a declared gap with three manual fallbacks. MCP slots write to `.codex/mcp.json` with a documented caveat that the user may need to copy them into Codex's runtime config.
- `adapters/vscode/` — five spec files defining how the orchestra installs into VS Code with the GitHub Copilot agent extension. The Director rule + project context + roles + skill list render into a managed section of `.github/copilot-instructions.md` (mirrored to `AGENTS.md`). Each skill becomes a Copilot custom-prompt file at `.github/prompts/<skill-id>.prompt.md` with `mode: 'agent'` frontmatter, invokable as `/<skill-id>` in Copilot Chat. MCP slots write to `.vscode/mcp.json` using VS Code's `servers` top-level key (rather than `mcpServers`). VS Code Copilot has no session-end hook in v1, so the stop-hook is a declared gap.

### Notes — PR 5

- All three baselines satisfy [`adapters/_contract.md`](adapters/_contract.md) with **explicit declared gaps** per §6 of the contract. No clause is silently skipped — every gap is recorded in the install marker's `history[].summary` and surfaced in the post-install report.
- Slot ids and metadata are **portable across all four adapters**. The same orchestra slot (e.g., `orchestra-analytics-database`) maps to the same id, purpose, and metadata regardless of IDE; only the wrapper file location and (for VS Code) the top-level JSON key (`servers` vs `mcpServers`) differ.
- The Codex skill-referencing strategy is a deliberate design choice that introduces a new dependency (the orchestra core must remain in the repo). The post-install checks verify this with a `core.preserved` check and a `core.skills.preserved` check; the audit warns prominently when the core is missing.
- All three baselines mirror the project context to `AGENTS.md` for tool-agnostic agents. Consistent with the Cursor adapter, this lets users mix IDEs in the same project without the orchestra needing to know which IDE will be used next.
- All four adapters (Cursor full + three baselines) share identical action-set vocabulary (`create` / `skip` / `extend-section` / `merge-json` / `merge-missing-sections` / `suffix-rename` / `propose` / `skip-with-gap` / `register-only`), making the audit skill's drift detection uniform across IDEs.
- All cross-links verified: 0 broken across the orchestra docs.

### Added — PR 4 (Cursor Adapter — Full)

- `adapters/cursor/INSTALL.md` — top-level Cursor-specific install procedure. Walks the agent through every RUN.md phase from a Cursor perspective (detection signals, existing-infra extensions, plan building, application order, post-install verification, activation). Declares the adapter as **full** v1 with zero gaps against `_contract.md`.
- `adapters/cursor/mappings.md` — the master mapping table: every orchestra core artifact (Director rule, learnings doc, project context, skills, stop hook, MCP slots, install marker, global registry) → target path → action → conflict policy. Defines the `<!-- ai-orchestra: managed-section start/end -->` marker convention for `AGENTS.md`, the `.cursor/hooks.json` merge logic (preserves existing entries, dedups via `metadata.orchestra: true`), and stable serialisation rules that guarantee idempotent re-runs.
- `adapters/cursor/target-schema.md` — the "after" state. Filesystem layout diagram, frontmatter schema for `.mdc` rule files, skill-folder structure, hook-entry shape, MCP-entry shape, marker field guarantees, and global-registry entry shape. Lists what the adapter explicitly does NOT touch (source code, `~/.cursor/`, etc.).
- `adapters/cursor/render-rules.md` — exact rendering rules for `.mdc` rule files, `SKILL.md` skill files, and the stop-hook prompt. Placeholder substitution table for the Director rule, conditional rendering for missing optional placeholders, body-template for the `orchestra-context.mdc` always-on rule, deterministic-rendering rules, and the full stop-hook prompt body with substitutions.
- `adapters/cursor/mcp.md` — MCP slot mapping for `.cursor/mcp.json`. Slot id convention (`orchestra-<role>-<purpose>`), v1 default slot list per role, placeholder-entry shape (inert `echo` command + metadata), merge rules, permission policy, and treatment of user-managed servers.
- `adapters/cursor/post-install-checks.md` — Phase 8 health checks. ~35 deterministic, file-only checks across filesystem presence, JSON validity, frontmatter structure, skill folders, hook entries, MCP slots, and marker consistency. Each check has id / what / how / pass / fail / severity (`critical` / `warning` / `info`).

### Changed — PR 4

- `core/registry/install.schema.md` — extended `hooks.<event>` entries with `contractVersion` (per [`adapters/_stop-hook.md`](adapters/_stop-hook.md), `"1.0"` in v1) and `lastRun` (ISO 8601 timestamp updated by future hook firings, `null` until first fire). The Cursor adapter (and all other adapters) write these fields. Backward-compatible: pre-existing markers without these fields are migrated by the audit skill on next run.

### Notes — PR 4

- The Cursor adapter is the orchestra's **reference implementation**. PR 5 (other-IDE adapters baseline) follows the patterns established here; PR 7 (validation harness) dry-runs the orchestra against fixture projects via this adapter.
- The adapter has zero declared gaps against `_contract.md` and `_stop-hook.md` in v1. Two v2-deferred enhancements are explicitly noted in the docs: per-artifact `contentHash` storage in the marker (currently relies on byte-identity comparison against re-rendered templates) and stack-pack content layering (the marker reserves `stacks[].stackPack`, but pack contents arrive in PR 6).
- Idempotency is guaranteed by deterministic rendering (sorted iteration over roles / skills / slots, no system time in rendered content, byte-stable JSON serialisation). The post-install checks include an `idempotency.zero-diff` check that flags non-`skip` actions on re-runs as a critical adapter bug.
- All cross-links verified: 0 broken, 0 mismatched display/target across `ai-orchestra/`.

### Added — PR 3 (Director + Contracts)

- `core/director/_overview.md` — explains the Director system (always-on rule + living learnings doc), lifecycle (install / session-start / during-session / session-end), document-health rules, per-IDE notes, and how the Director relates to other orchestra components.
- `core/director/RULE.md` — IDE-agnostic Director rule template. Renders into the IDE's native rule format (Cursor `.mdc`, Claude Code rule, Codex `AGENTS.md` segment, VS Code instruction file). Defines placeholder substitution rules and adapter responsibilities.
- `core/director/learnings-template.md` — seed for the project's `_documentation/AI_LEARNINGS.md` (or equivalent). Six fixed sections: Established Patterns, Anti-Patterns, User Preferences, Decision Log, Environment Notes, Consolidation Log. Ships with no example entries — the agent populates the doc from real session activity.
- `adapters/_stop-hook.md` — sibling-of-`_contract.md` contract. Defines the stop-hook that delivers the Director's session-end behaviour: required and optional inputs, output outcomes (`noop` / `learnings-update` / `learnings-conflict` / `error`), idempotency rules, safety constraints, per-IDE mappings (Cursor `hooks.json`, Claude Code session-end, etc.), failure modes, and audit conformance.
- `core/scheduler/CONTRACT.md` — declared interface for scheduled jobs. Job descriptor schema (id, schedule, runs, concurrency, missed-run policy), schedule formats (cron, interval, calendar, manual), run targets (skill / hook / script — script disabled in v1), isolation guarantees, lifecycle events. Runner ships in v2; v1 records descriptors only.
- `core/notifications/CONTRACT.md` — declared interface for notifications. Event taxonomy (15 v1 events across install / audit / learnings / mcp / scheduler categories), severity model (`info` / `warning` / `error`), payload schema, channel abstraction, deduplication policy, acknowledgement model. Privacy: zero outbound by default; external-service channels gated to v2 opt-in.

### Changed — PR 3

- `core/skills/audit/ai-infra-audit/SKILL.md` — Process expanded from 9 to 10 steps to include Director-system verification and stop-hook conformance check; converted prose references to scheduler/notifications contracts into proper links; References section enriched with all new PR 3 files plus the linter contract.
- `adapters/_contract.md` — fixed stop-hook reference to point at the new `_stop-hook.md` (was an inline placeholder); References section enriched with Director / scheduler / notifications / stop-hook / linter cross-links.
- `RUN.md` — Phase 5 input list converted to proper links and extended with stop-hook contract reference; References section grew to enumerate every PR 3 deliverable.
- `README.md` — Status table marks PR 1 + PR 2 as shipped, PR 3 as landing; repository-layout block reflects actual contents (Director, scheduler, notifications, stop-hook all present).

### Notes — PR 3

- The `ai-infra-audit` skill spec was originally listed as a PR 3 deliverable. It shipped early in PR 2 because many other skills cross-link to it; PR 3 deepens it (Director + stop-hook checks, contract validation) rather than re-introducing it.
- All v2 runtime work (the scheduler runner, the notifications router, automatic stop-hook firing on IDEs that need polyfills) is intentionally **out of scope for v1**. v1 ships only the contracts, exhaustively described, so v1 components can declare against them forward-compatibly.
- All cross-links verified: 0 broken, 0 mismatched display/target across `ai-orchestra/`.

## [1.0.0-alpha] — 2026-04-29

### Added — PR 2 (Role Library v1)

- `core/roles/_overview.md` — registry of the ten v1 roles with the responsibility matrix, trigger conditions, and skill mapping.
- `core/roles/_schema.md` — required structure of a role file (sections, length budget, validation rules, severities).
- Ten role definitions in `core/roles/`: `frontend-engineer`, `backend-engineer`, `qa-engineer`, `analytics-engineer`, `devops-sre`, `security-engineer`, `mobile-engineer`, `ai-ml-engineer`, `tech-writer`, `product-manager`. Each declares mission, triggers, primary outputs, skill set, collaboration, and out-of-scope.
- `core/skills/_schema.md` — required structure of a skill file (sections, length budget, validation rules, severities).
- 30 universal skill specs in `core/skills/<category>/<skill>/SKILL.md`:
  - `audit/`: cleanup, pre-release, ai-infra-audit (3).
  - `code/`: code-review, dependency-audit, api-design-review, db-migration-review (4).
  - `docs/`: write-prd, write-test-plan, write-technical-spec, decision-log, readme-quality, api-docs-baseline (6).
  - `platform/`: ci-pipeline-audit, deployment-checklist, observability-baseline, mcp-server-audit (4).
  - `quality/`: accessibility-audit, performance-audit, security-baseline, auth-flow-review, secrets-scan (5).
  - `analytics/`: event-taxonomy-design, analytics-implementation-audit, dashboard-spec (3).
  - `mobile/`: platform-parity-check, build-config-review (2).
  - `ai-ml/`: model-evaluation-spec, prompt-quality-audit, eval-harness-spec (3).
- `core/_lint.md` — schema linter contract: validation rules, severities, structured result schema, and rule registry. Runner ships with `ai-infra-audit` in PR 3.

### Notes — PR 2

- All role and skill content is **stack-agnostic**. Stack-specific patterns (React/Vue/Django/FastAPI/Apex/LWC/etc.) arrive in PR 6 via `core/stack-packs/<stack>/`, layered on top of these universal specs at install time.
- The skill set has been deliberately oversized relative to the original v1 sketch (30 skills vs. the ~26 originally outlined) because the analytics, AI/ML, and mobile categories each had a clean three-skill triad worth shipping together.
- Skills cross-link bidirectionally with role files (each skill names the roles that pull it; each role names every skill it pulls). The audit skill (PR 3) will validate this graph.

## [1.0.0-alpha] — 2026-04-29

### Added — PR 1 (Foundation + Discovery)

- Top-level scaffold: `README.md`, `RUN.md` canonical entry point, `VERSION`, `CHANGELOG.md`.
- `core/discovery/DETECTION.md` describing the probe process.
- `core/discovery/signals/` detector definitions for JS/TS, Python, Salesforce, Go, Rust, .NET, mobile, and MCP configurations.
- `core/discovery/existing-infra.md` describing how to detect prior agentic setup (Cursor, Claude Code, Codex, VS Code) before any install.
- `core/registry/install.schema.md` defining the per-project `.ai-orchestra/install.json` marker.
- `adapters/_contract.md` defining the adapter interface — the binding between core content and IDE-native installation.

### Notes

- This is an alpha release. The orchestra core is structurally complete for PR 1, but role library, director system, adapters, and stack packs are intentionally not present yet — they arrive in subsequent PRs.
- v1 ships with no runtime code. All deliverables are markdown specifications consumed by an external agent at install time.

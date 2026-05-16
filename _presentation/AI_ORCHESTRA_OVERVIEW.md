# AI Orchestra — Full Overview for Presentation

> This document is written as a source for NotebookLM to generate a technical presentation. It covers the problem, the concept, the architecture, the workflow, what gets installed, supported environments, safety guarantees, and a before/after comparison. It is intentionally comprehensive so NotebookLM can extract the right level of detail for each slide.

---

## 1. The Problem This Solves

### 1.1 The agentic infrastructure gap

Modern AI-assisted development relies on IDE agents (Cursor, Claude Code, Codex, VS Code Copilot). Each of these agents becomes dramatically more effective when given the right context: who owns what, what the project's rules are, what tools (skills) the agent should use for specific tasks, and how to accumulate knowledge across sessions.

Setting this infrastructure up correctly is non-trivial:

- It requires writing `AGENTS.md`, `.cursor/rules/`, `.claude/commands/`, `.github/copilot-instructions.md`, stop-hooks, learnings documents, and MCP server configurations — all by hand.
- Every project starts from zero. There is no reuse across projects.
- The infrastructure drifts silently: rules become stale, learnings documents stop being updated, skills fall out of date, and no one notices until the agent starts giving bad advice.
- Different IDEs have different conventions. A team using both Cursor and Claude Code must maintain two separate infrastructures manually.
- There is no standard for "what good agentic infrastructure looks like" — everyone invents their own.

### 1.2 The result without orchestration

- Agents that repeat the same mistakes session after session (no persistent memory).
- Agents that don't know the project's rules, conventions, or architecture.
- Agents that can't invoke specialised workflows (code review, deployment checklist, security scan) because no one taught them how.
- Agentic infrastructure that is unique to one engineer's machine and never shared with the team.
- No visibility into what the agent "knows" or "can do" in a given project.

---

## 2. What AI Orchestra Is

### 2.1 One-sentence definition

AI Orchestra is a universal, IDE-agnostic agentic toolkit that installs a complete, tailored, self-improving agentic infrastructure into any software project — in one guided session, with full transparency and no forced overwrites.

### 2.2 The three-layer model

AI Orchestra is structured as three layers:

**Layer 1 — The core spec (the orchestra folder)**
A project-agnostic, tool-agnostic folder of markdown specifications (~170 KB). It contains: the Director rule template, 10 role definitions, 30+ skill specs, 5 stack content packs (JS/TS, Python web, Salesforce, Mobile, Rust/Tauri), a scheduler contract, a notifications contract, conflict resolution protocols, and a validation harness. This is the "conductor's score" — it describes what should exist, not what does exist.

**Layer 2 — The per-project installed orchestration**
Generated from the core by the IDE agent, tailored to the project. Lives in IDE-native locations: `.cursor/rules/`, `.cursor/skills/`, `.claude/commands/`, `.github/prompts/`, `AGENTS.md`, `_documentation/AI_LEARNINGS.md`. This is what the agent actually reads during development sessions.

**Layer 3 — The IDE (clean session runtime)**
The IDE itself. The orchestra never tries to manage what the IDE already does well. It only fills the gap between "raw IDE" and "context-aware, skill-equipped, self-improving agent."

### 2.3 What it is NOT

- Not a monolithic agent or chatbot.
- Not a framework you import in code (zero runtime dependencies — v1 ships zero executable code).
- Not a service that calls home, collects telemetry, or requires an account.
- Not a replacement for the IDE. It works with the IDE's native features.
- Not opinionated about the stack — it detects the stack and installs patterns specific to it.

### 2.4 The key insight

The orchestra is purely markdown. Any sufficiently capable IDE agent can read it and act on it. This makes it IDE-agnostic: the same core spec works in Cursor, Claude Code, Codex CLI, and VS Code with Copilot. The adapter layer translates the universal spec into the specific file conventions each IDE expects.

---

## 3. How It Works — The Installation Flow

### 3.1 Step 0: Drop in the spec

The user runs one command from their project root:

```bash
npx @neverreven/ai-orchestra@latest init
```

This copies the `ai-orchestra/` specification folder into the project. Nothing is modified — no rules, no agents files, nothing. The folder is just sitting there, waiting to be read.

### 3.2 Step 1: Ask the agent to run it

The user opens their IDE and asks the agent any natural variant of:

> "run the ai-orchestra"
> "set up ai-orchestra in this project"
> "what is this ai-orchestra folder?"

The agent reads `ai-orchestra/RUN.md` — a 12-phase procedure — and follows it. Everything from this point forward is agent-driven. The agent narrates every step.

### 3.3 The 5 agent-driven steps (read-only until the last one)

**Step 1 — Detect the IDE.** The agent identifies which IDE it is running in (Cursor, Claude Code, Codex, VS Code) and routes to the correct adapter. Each adapter knows the IDE's native file conventions.

**Step 2 — Probe the project.** The agent scans the project for stack signals: `package.json`, `tsconfig.json`, `pyproject.toml`, `Cargo.toml`, `sfdx-project.json`, mobile config files, and 50+ other signals. It builds a confidence-scored profile: which stacks are present, which frameworks, which sub-projects.

**Step 3 — Inventory existing AI infrastructure.** The agent reads every existing agentic file: rules, skills, hooks, learnings documents, shared agent folders, per-role ownership signals. It assesses the quality of what's already there — not to replace it, but to understand what to preserve and what to improve.

**Step 4 — Build a dry-run install plan.** The agent constructs a complete diff: every file that would be created, every section that would be extended, every conflict that needs resolving. It presents this in plain language AND as a structured table. The user can read exactly what will happen before anything is touched. The agent recommends an install scope (full kit, selected roles, primary + collaborators, or core only) based on what it found — and explains why.

**Step 5 — Apply (only after explicit consent).** The user says `apply` (or approves specific parts). Only then does the agent write any files. It creates, extends, merges, and registers — but never overwrites hand-written content without the user's explicit confirmation.

### 3.4 After installation: what a session looks like

Once installed, every development session is automatically enriched:

- **Session start:** The agent loads project context, architecture docs, and accumulated learnings before doing any work.
- **During the session:** The user can invoke any of 30+ skills by trigger phrase ("run a code review", "run the security baseline", "cleanup the mess"). The agent knows exactly which skill to run and follows its spec.
- **Session end:** In supported IDEs (Cursor, Claude Code), a stop-hook automatically reviews the conversation and updates `AI_LEARNINGS.md` with any new patterns, decisions, or preferences discovered in the session — without the user having to ask.

---

## 4. What Gets Installed

### 4.1 Core infrastructure (every install)

| Component | Location | Purpose |
|-----------|----------|---------|
| Director rule | `.cursor/rules/orchestra-director.mdc` (or equivalent) | Always-on session protocol: loads context at start, reviews for learnings at end. |
| Project context rule | `.cursor/rules/orchestra-context.mdc` (or equivalent) | Project identity, stack list, installed roles and skills — always available to the agent. |
| AI Learnings document | `_documentation/AI_LEARNINGS.md` | Accumulates patterns, anti-patterns, user preferences, architecture decisions, and environment notes across sessions. Grows automatically via the stop-hook. |
| AGENTS.md managed section | `AGENTS.md` | Machine-readable agent instructions: identity, Director protocol, roles, skills catalog. |
| Install marker | `.ai-orchestra/install.json` | Records installed version, scope, roles, skills, and history. Enables future upgrades and drift detection. |

### 4.2 Role library (scope-dependent)

The orchestra includes 10 roles. Each role is a coherent slice of project concern — not a job title. One person can carry multiple roles; one role can be carried by multiple people.

| Role | Auto-installed when |
|------|-------------------|
| Frontend Engineer | JS/TS stack detected |
| Backend Engineer | Python-web, Node API, or Salesforce detected |
| QA Engineer | Always (every project has quality concerns) |
| DevOps / SRE | CI configuration or infrastructure-as-code detected |
| Security Engineer | Always (security applies to every project) |
| Mobile Engineer | Mobile stack detected (Capacitor, React Native, Flutter, etc.) |
| AI / ML Engineer | AI/ML dependencies detected |
| Analytics Engineer | Analytics dependencies detected |
| Tech Writer | Always (documentation applies to every project) |
| Product Manager | Product projects (opt-out for libraries/hobby code) |

Each role pulls in its associated skill set. Roles can be overridden — the user picks exactly which ones apply.

### 4.3 Skill library (30+ skills)

Skills are reusable, invocable workflows. Each skill has a trigger phrase, a defined process, and a defined output. The user invokes them in natural language during any chat session.

| Category | Example skills |
|----------|----------------|
| Audit | ai-infra-audit, cleanup, pre-release |
| Code quality | code-review, api-design-review, db-migration-review, dependency-audit |
| Documentation | readme-quality, write-prd, write-technical-spec, write-test-plan, api-docs-baseline |
| Platform | ci-pipeline-audit, deployment-checklist, mcp-server-audit, observability-baseline |
| Quality & security | security-baseline, secrets-scan, performance-audit, accessibility-audit, auth-flow-review |
| Analytics | analytics-implementation-audit, dashboard-spec, event-taxonomy-design |
| AI/ML | prompt-quality-audit, model-evaluation-spec, eval-harness-spec |
| Mobile | build-config-review, platform-parity-check |
| Orchestration | multi-project-audit, upgrade-all |

### 4.4 Stack-specific content packs

When a stack is detected, the orchestra layers in stack-specific patterns on top of the universal foundation:

| Stack | Patterns included |
|-------|-----------------|
| JavaScript / TypeScript | React patterns, TypeScript strictness, Vite config, Next.js App Router / RSC, Node API structure, testing (Vitest/Jest) |
| Python web | FastAPI / Django / Flask idioms, async patterns (asyncio), database patterns (SQLAlchemy, Django ORM), testing (pytest) |
| Salesforce / Commerce Cloud | Apex, LWC, SFRA cartridges, sfdx, OmniStudio, Flow best practices, security (FLS, SOQL injection, Named Credentials) |
| Mobile | Touch and viewport rules, native plugin lifecycle, offline and sync, app store readiness |
| Rust / Tauri | Ownership and borrowing, error handling (thiserror, anyhow), async with Tokio, Tauri v2 commands and security |

### 4.5 Scheduler

A built-in scheduler runs the `ai-infra-audit` skill on a configurable cadence (default: weekly). The audit detects rule drift, stale learnings, version mismatches, and missing skills — and surfaces findings before they accumulate into real problems.

---

## 5. Supported IDEs and Adapters

| IDE | Support level | Key mechanism |
|-----|--------------|---------------|
| Cursor | Full | `.cursor/rules/*.mdc` (always-on + file-scoped), `.cursor/skills/*/SKILL.md`, `hooks.json` stop-hook |
| Claude Code | Baseline | `CLAUDE.md` managed section, `.claude/commands/*.md` slash commands, `.claude/settings.json` stop-hook |
| Codex CLI | Baseline | `AGENTS.md` managed section, skill catalog with trigger phrases, no per-skill files |
| VS Code + Copilot | Baseline | `.github/copilot-instructions.md` managed section, `.github/prompts/*.prompt.md` slash commands |

All four adapters share the same core content. The adapter layer handles the IDE-specific file formats and conventions. A project can be used with any of the four IDEs — the same `ai-orchestra/` folder serves all of them.

---

## 6. The Self-Improving Loop

This is the most distinctive capability of ai-orchestra: the system gets smarter over time without manual effort.

**How it works:**

1. A development session happens. The agent helps with code, decisions, debugging, architecture.
2. At session end, the stop-hook fires automatically (or the user asks "review this session for learnings").
3. The agent reviews the conversation and identifies: patterns the team should keep doing, anti-patterns to avoid, user preferences stated explicitly, architecture decisions made, environment quirks discovered.
4. If any qualify, the agent updates `AI_LEARNINGS.md` — appending to the right section, never overwriting existing entries.
5. The next session starts by reading this document. The agent knows more than it did before.

**Over time, the learnings document becomes the project's institutional memory for AI-assisted development.** It captures things that are project-specific and would otherwise be lost between sessions: "we always use named exports", "the team prefers 3-bullet PR descriptions", "the auth layer uses a custom token format", "the CI pipeline has a known flakiness on Windows".

The weekly audit skill additionally checks whether the learnings document has grown stale, whether new skills have been added to the orchestra that the project hasn't installed, and whether the version in the install marker is drifting from the latest published version.

---

## 7. Safety Guarantees

These are non-negotiable properties of the orchestra — not optional features:

**Dry-run first, always.** The install plan is always shown before anything is written. The user sees exactly what will change, as a plain-language summary and a structured diff table. No surprises.

**Never overwrites hand-written content.** If a target file exists without orchestra marker pairs (meaning a human wrote it), the orchestra writes its version alongside as `<filename>.orchestra.<ext>`. The original is never touched.

**Conservative deletions.** If a scope change means a role is no longer needed, the orchestra never deletes the file automatically. It surfaces a propose row: "this file is no longer in scope — delete, keep, or mark obsolete?" The user decides.

**Marker pairs preserve user content.** Within files the orchestra does manage (like `AGENTS.md`), it uses HTML comment markers to define its section. Everything outside those markers is never touched.

**No telemetry, no network calls.** The CLI copies files. The agent reads markdown. Zero phone-home, zero account required, zero data collection.

**Idempotent re-runs.** Running the orchestra twice on the same project produces zero changes on the second run. If the rendered content is byte-identical to what's on disk, the action is `skip`. This makes upgrades safe and predictable.

---

## 8. Before and After

### A project without ai-orchestra

- Agent starts every session with no project context — must be re-briefed manually or not at all.
- No persistent memory: patterns discovered in session 1 are forgotten by session 2.
- No standard skills: the user types long, repetitive prompts to get a code review, deployment check, or security scan — and gets inconsistent results.
- No rules: the agent doesn't know the project's coding conventions, architecture, or off-limits areas.
- Infrastructure is ad-hoc, personal, and non-transferable between team members.
- Moving to a new IDE means starting over from scratch.

### A project with ai-orchestra (after one install session)

- Agent loads full project context at the start of every session automatically.
- Memory grows session over session: the agent knows the team's preferences, past decisions, and known gotchas without being told.
- 30+ skills available instantly: "run a code review", "run the security baseline", "generate a deployment checklist" — all consistent, all following the project's defined process.
- Stack-specific rules applied automatically: React patterns, TypeScript strictness, API structure conventions.
- Infrastructure is version-controlled, shared across the team, and upgradable with one command.
- Works in Cursor, Claude Code, Codex, and VS Code — same spec, different adapters.

---

## 9. Key Technical Properties

- **Zero runtime code.** v1 ships pure markdown specifications. The executable intelligence is the IDE agent reading them.
- **IDE-agnostic.** The same `ai-orchestra/` folder serves Cursor, Claude Code, Codex, and VS Code. No fork required.
- **Stack-aware.** 50+ detection signals across JS/TS, Python, Salesforce, mobile, and Rust stacks. Stack packs layer on automatically.
- **Idempotent.** Re-running produces zero changes when the install is current. Upgrades are diff-based.
- **Conflict-safe.** Six conflict resolution strategies: extend-section, merge-json, append, suffix-rename, skip-with-gap, propose. Never silently overwrites.
- **Self-auditing.** The `ai-infra-audit` skill detects drift, stale content, and version mismatches. Runs automatically on a weekly schedule.
- **Extractable.** The spec folder can be extracted from a host project into its own standalone repository using the `extract` subcommand, for teams that want to version it independently.
- **Open and inspectable.** The entire spec is human-readable markdown. There is no black box. Any team member can read exactly what the agent will do before it does it.

---

## 10. How to Get It

```bash
# Install into a project
npx @neverreven/ai-orchestra@latest init

# Then open the project in your IDE and ask:
# "run the ai-orchestra"
```

- npm package: `@neverreven/ai-orchestra` (public)
- Current version: 1.4.1
- Supported Node.js: 18+
- No dependencies: zero npm dependencies at runtime
- Upgrade: `npx @neverreven/ai-orchestra@latest init --force`

---

## 11. Frequently Asked Questions (for audience Q&A)

**Q: Does it work if we already have our own AGENTS.md / rules / skills?**
A: Yes. The inventory phase detects everything that already exists. The orchestra never overwrites hand-written content. It writes its content into managed sections (marker-delimited), leaving everything outside those markers untouched. If a conflict is detected, the user chooses: improve, replace, or preserve.

**Q: What if we only want the session memory and Director rule, not the full role library?**
A: Use the "Core only" scope during installation. You get the Director rule, the learnings document, the audit skill, and the install marker — nothing else. You can always add roles later.

**Q: Does it work for existing projects with years of history?**
A: Yes. The existing-infra probe is specifically designed for this. It detects per-role ownership signals (e.g., if `backend/AGENTS.md` already has a hand-crafted backend guide, it recommends excluding the Backend Engineer role). It surfaces quality issues in existing agentic files and lets you decide what to do with each one.

**Q: How does it handle multiple team members using different IDEs?**
A: Each adapter generates IDE-specific files from the same core spec. The `ai-orchestra/` folder in the repo is IDE-agnostic. A Cursor user and a Claude Code user working on the same project both get the right files for their IDE from the same source of truth.

**Q: What happens when we upgrade to a new version of ai-orchestra?**
A: Run `npx @neverreven/ai-orchestra@latest init --force`. The agent's audit skill detects the version delta and proposes updates to stale files. It never silently overwrites — it shows you a diff of what changed and asks for confirmation.

**Q: Is there a cost or account requirement?**
A: No. Zero cost, zero account, zero telemetry. The package is MIT-licensed, published on npm, and contains no executable runtime code.

**Q: Can we use it for our internal tools / private projects?**
A: Yes. It works with any project regardless of whether it's open source or private. The npm package is public but using it requires no credentials — it's a pure file copy.

**Q: How does the self-improving memory work in practice?**
A: At the end of each IDE session, the stop-hook fires. The agent reviews the conversation, identifies anything that qualifies as a reusable learning, and appends it to `AI_LEARNINGS.md`. The next session starts by reading this file. Over weeks and months the document grows to contain the team's actual working patterns — not generic advice, but project-specific knowledge.

**Q: What is the "scheduler" and when does it run?**
A: The scheduler is a contract built into the Director rule. By default it runs the `ai-infra-audit` skill weekly (at the start of the first session of each week). The audit checks for rule drift, stale learnings, version mismatches, and missing skills. In v1 it runs in `manual` mode (fires at session start); v2 will add true cron scheduling.

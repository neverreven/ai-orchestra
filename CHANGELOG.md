# Changelog

All notable changes to the `ai-orchestra` core are recorded here.

The orchestra core follows [Semantic Versioning](https://semver.org/). Per-project installations record the version they were generated against in `.ai-orchestra/install.json`.

The format is loosely based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

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

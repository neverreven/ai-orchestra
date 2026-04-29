# Changelog

All notable changes to the `ai-orchestra` core are recorded here.

The orchestra core follows [Semantic Versioning](https://semver.org/). Per-project installations record the version they were generated against in `.ai-orchestra/install.json`.

The format is loosely based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

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

# Changelog

All notable changes to the `ai-orchestra` core are recorded here.

The orchestra core follows [Semantic Versioning](https://semver.org/). Per-project installations record the version they were generated against in `.ai-orchestra/install.json`.

The format is loosely based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

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

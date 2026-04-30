# Schema linter — specification

> The orchestra's schema linter is a **contract**: a deterministic procedure that validates role files and skill files against the schemas defined in [`roles/_schema.md`](roles/_schema.md) and [`skills/_schema.md`](skills/_schema.md). It produces a structured result that other components (the installer, the audit skill, IDE adapters) can consume.

The runner that executes this contract ships with the [`ai-infra-audit`](skills/audit/ai-infra-audit/SKILL.md) skill in PR 3. PR 2 establishes the rules and the result format.

---

## 1. Why a linter exists

- The role / skill libraries are large and evolve continuously. Without enforcement, sections get renamed, links rot, and the install adapter starts producing inconsistent IDE artifacts.
- The orchestra promises "honest gap reporting." A schema linter is the smallest credible enforcement of that promise on the orchestra's own content.
- Schema-conformant files are easier for an agent to read at install time — every adapter knows where to find each section without parsing prose.

---

## 2. What the linter validates

For each **role file** in `core/roles/*.md` (excluding files starting with `_`):

- All required sections from `roles/_schema.md` `## 1. Required sections` are present, in order, with exact heading text.
- `## Skills` is a markdown table whose first column links to an existing skill file.
- `## Triggers` has at least one bullet.
- `## Collaboration` links to at least one other role file.
- The file's name is kebab-case ending in `.md`.
- The file's first heading matches `# <Display Name>` (no extra punctuation).
- Total length is within budget (warning, not failure, when exceeded).

For each **skill file** in `core/skills/<category>/<skill>/SKILL.md`:

- All required sections from `skills/_schema.md` `## 1. Required sections` are present, in order, with exact heading text.
- `## Trigger` has at least one bullet.
- `## Process` has at least three numbered steps.
- All links in `## References` resolve to existing files inside `ai-orchestra/`.
- The skill folder name is kebab-case.
- The file is named exactly `SKILL.md`.
- `## When NOT to use` has at least one bullet (warning when missing).
- Total length is within budget (warning when exceeded).

For **cross-references**:

- Every skill linked in a role file's `## Skills` table resolves.
- Every role file referenced from a skill's `## References` resolves.
- No file links to a path outside `ai-orchestra/`.

For **URL hygiene** (applies to every markdown file under `ai-orchestra/`, not just roles and skills):

- No URL uses a host containing `ai-orchestra` or any other fictional / aspirational orchestra-owned domain pattern. The orchestra is name-collision-prone (the name is generic enough that real third-party products with the same name exist), so URLs that look like they belong to an orchestra-owned domain are treated as content leakage.
- Allowed external URLs are: real authoritative sources (e.g., `semver.org`, `keepachangelog.com`, `modelcontextprotocol.io`, `vitejs.dev`, `react.dev`, `python.org`, `developer.salesforce.com`), and RFC 2606 reserved domains (`example.com`, `example.org`, `example.net`, any `*.invalid`, any `*.test`, any `*.example`).
- Verification command: `grep -nrE "https?://[^/]*ai-orchestra" ai-orchestra/` must return zero hits **outside** `_test-fixtures/` and `core/_lint.md`.
- The `_test-fixtures/` subtree is exempt: its files are deliberately realistic-looking (e.g., Salesforce metadata XMLs use real `http://soap.sforce.com/...` schema URIs because real Salesforce metadata does too).
- This file (`core/_lint.md`) is self-exempt for the patterns it documents: the rule's own description must reference the prohibited pattern shape (`ai-orchestra.dev`, `ai-orchestra.io`, etc.) so a reader understands what the rule catches. The rule does not apply to its own description text. No other file in `core/`, `adapters/`, or the top-level documentation may reference such URLs.
- Otherwise the lint scope for this rule is `ai-orchestra/core/`, `ai-orchestra/adapters/`, and the top-level documentation files (`README.md`, `RUN.md`, `CHANGELOG.md`, `MIGRATION.md`, `_v1.x-backlog.md`).

---

## 3. Severity and outcomes

The linter classifies each finding into one of three severities:

| Severity | Behaviour at install time | Behaviour during audit |
|----------|---------------------------|------------------------|
| `critical` | Blocks installing the affected role/skill; install proceeds with the rest. | Surfaced as a required fix; auto-fix only if obviously safe (e.g., trailing whitespace). |
| `warning` | Logged in the dry-run plan and post-install report; install proceeds. | Surfaced as recommended fix; never auto-applied without consent. |
| `info` | Logged for visibility; never blocks. | Logged for visibility; never blocks. |

Critical findings are **always** surfaced, even when the user has elected silent install.

---

## 4. Result format

The linter emits a structured JSON-shaped result so downstream tools can consume it programmatically. The textual report is a rendering of the same data.

Schema (illustrative):

- `summary`
  - `roles_checked: int`
  - `skills_checked: int`
  - `critical: int`
  - `warning: int`
  - `info: int`
  - `clean: bool`
- `findings: array` of:
  - `target_kind: "role" | "skill" | "cross-link"`
  - `target_path: string` (path inside `ai-orchestra/`)
  - `rule_id: string` (e.g., `role.required-section-missing`, `skill.process-too-short`)
  - `severity: "critical" | "warning" | "info"`
  - `message: string` (one-line, human-readable)
  - `detail: string?` (optional, multi-line, for context)
  - `auto_fix_proposal: string?` (optional patch description; never an auto-apply)

The runner produces both representations: the JSON for downstream tools and a markdown report for human consumption.

---

## 5. Rule registry

Each rule has a stable id. New rules are added in subsequent PRs; existing rules' ids never change (renames are deprecation + new id). The initial registry:

| Rule id | Severity | What it catches |
|---------|----------|-----------------|
| `role.required-section-missing` | critical | Role file is missing one of the required headings. |
| `role.section-out-of-order` | critical | Required sections present but not in the schema's prescribed order. |
| `role.skills-table-empty` | critical | `## Skills` has no rows. |
| `role.skills-link-broken` | critical | A skill linked from `## Skills` does not resolve. |
| `role.triggers-empty` | critical | `## Triggers` has no bullets. |
| `role.collab-no-role-link` | warning | `## Collaboration` does not link to any other role. |
| `role.length-over-budget` | warning | File exceeds 150 lines. |
| `role.mission-not-paragraph` | warning | `## Mission` is bullets instead of a paragraph. |
| `skill.required-section-missing` | critical | Skill file is missing a required heading. |
| `skill.section-out-of-order` | critical | Required sections present but not in prescribed order. |
| `skill.trigger-empty` | critical | `## Trigger` has no bullets. |
| `skill.process-too-short` | critical | `## Process` has fewer than three numbered steps. |
| `skill.references-broken` | critical | A link in `## References` does not resolve. |
| `skill.skill-md-misnamed` | critical | Skill folder contains a markdown file other than `SKILL.md`. |
| `skill.when-not-empty` | warning | `## When NOT to use` has no bullets. |
| `skill.length-over-budget` | warning | File exceeds 100 lines. |
| `cross.external-link` | critical | A link points outside `ai-orchestra/`. |
| `url.fictional-orchestra-host` | critical | A URL uses a host containing `ai-orchestra` (e.g., `ai-orchestra.dev`, `ai-orchestra.io`). These look real but are not orchestra-owned and risk colliding with unrelated third-party products. |
| `url.unreserved-example-domain` | warning | An example URL uses a non-reserved domain where an RFC 2606 reserved domain (`example.com`, `example.invalid`, `*.test`) would be safer. |

The audit skill's runner consumes this registry verbatim in PR 3.

---

## 6. Auto-fix policy

The linter never silently auto-applies fixes. When `auto_fix_proposal` is present on a finding, the orchestra's audit flow may apply it under one of these conditions:

- The user has explicitly enabled auto-fix for non-critical drift.
- The finding's `severity` is `warning` or `info`.
- The patch is mechanical (whitespace, re-ordering of already-present sections, link slug normalisation).

Critical findings are **never** auto-fixed. The audit flow surfaces them with a proposed diff for human review.

---

## 7. Performance + scope

- Linting is local, in-process, and dependency-free. No external services.
- The default scope is the orchestra's own content (`ai-orchestra/core/roles/`, `ai-orchestra/core/skills/`). The linter does not validate target-project files.
- The runtime budget for a full lint is well under one second on the v1 content size; an order-of-magnitude growth still fits a sensible budget.

---

## 8. Extensions

Future versions may add:

- Front-matter-based schema validation (when a frontmatter format is adopted).
- Style rules (sentence length, passive voice) — explicitly out of scope for v1; the linter is structural.
- Project-side validation hooks (lint role/skill files contributed by stack packs in PR 6).

---

## 9. References

- [`roles/_schema.md`](roles/_schema.md) — role file schema.
- [`skills/_schema.md`](skills/_schema.md) — skill file schema.
- [`skills/audit/ai-infra-audit/SKILL.md`](skills/audit/ai-infra-audit/SKILL.md) — runner skill (spec ships in PR 3).
- [`registry/install.schema.md`](registry/install.schema.md) — install marker that the audit reads alongside the lint result.

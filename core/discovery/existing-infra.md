# existing-infra.md — Inventorying Prior Agentic Setup

> Read by an agent during Phase 3 of [RUN.md](../../RUN.md). Produces an **existing-infra inventory** that the install plan must respect (extend, never overwrite).

This step is read-only and runs **before** the adapter is loaded, so the inventory shape is IDE-agnostic. The adapter consumes the inventory in Phase 5 to compute conflict-handling actions.

---

## 1. Why this matters

Many projects already have partial agentic infrastructure: a hand-written `AGENTS.md`, one Cursor rule, a `.cursor/skills/` folder with two skills, an `AI_LEARNINGS.md` started by a previous attempt, an MCP config with three servers attached. The orchestra's job is to **extend** what's there, not replace it. Skipping this phase is the most common path to silently destroying a user's work.

---

## 2. Inventory output schema

Append a single object to the project profile under `profile.existingInfra`:

```json
{
  "existingInfra": {
    "agentsMd": { "present": true, "path": "AGENTS.md", "size": 12450, "hasOrchestraSection": false },
    "claudeMd": { "present": false },
    "copilotInstructions": { "present": false },
    "cursor": {
      "rules": [
        { "path": ".cursor/rules/project-context.mdc", "alwaysApply": true, "title": "project-context" }
      ],
      "skills": [
        { "path": ".cursor/skills/cleanup/SKILL.md", "name": "cleanup" }
      ],
      "hooks": { "present": true, "path": ".cursor/hooks.json", "events": ["stop"] },
      "mcp": { "present": true, "path": ".cursor/mcp.json", "servers": ["github", "filesystem"] }
    },
    "claudeCode": {
      "commands": [],
      "mcp": { "present": false }
    },
    "codex": {
      "agentsMd": { "present": true, "path": "AGENTS.md", "shared": true },
      "mcp": { "present": false, "supported": false }
    },
    "vscode": {
      "settings": { "present": true, "path": ".vscode/settings.json" },
      "copilotInstructions": { "present": false },
      "mcp": { "present": false, "supported": false }
    },
    "learnings": {
      "present": true,
      "path": "_documentation/AI_LEARNINGS.md",
      "lastUpdated": "2026-04-15"
    },
    "orchestraInstall": {
      "present": false
    },
    "shared": {
      "candidates": [
        {
          "path": ".agents",
          "skillCount": 4,
          "namedConvention": true,
          "skillShapedMd": true,
          "evidence": ["named-convention", "contains-md-files-with-skill-headings"]
        }
      ],
      "userNominated": null
    },
    "roles": [
      {
        "roleId": "backend-engineer",
        "ownership": "external",
        "evidence": [
          { "type": "sub-agents-md", "path": "backend/AGENTS.md", "size": 4200 }
        ]
      }
    ],
    "quality": {
      "overall": "partial",
      "strengths": ["AI_LEARNINGS.md updated within the last 30 days"],
      "issues": [
        {
          "id": "coverage.missing-director",
          "severity": "warning",
          "summary": "No always-on session-protocol rule detected.",
          "proposedAction": "improve"
        }
      ],
      "suggestions": ["Add a Director-equivalent always-on rule."]
    },
    "miscDocs": [
      "_documentation/PROJECT_DOC.md",
      "_documentation/PLAN_Launch.md"
    ]
  }
}
```

Every section is **optional**. Use `{ "present": false }` for absent items rather than omitting them — downstream code is easier to reason about with explicit absence.

---

## 3. Files and folders to inventory

Walk through these in order. For each, record presence + minimal metadata. **Do not** read large file bodies into memory; size and a few high-level fields are enough.

### 3.1 Top-level project context files

| File | Field |
|------|-------|
| `AGENTS.md` | `agentsMd` |
| `CLAUDE.md` | `claudeMd` |
| `.github/copilot-instructions.md` | `copilotInstructions` |
| `CONTRIBUTING.md`, `README.md`, `*-DOC*.md` | `miscDocs[]` (paths only — used for context, not for conflict resolution) |

For `AGENTS.md` and `CLAUDE.md`, also detect whether the file already contains an orchestra-managed section (look for the marker comment `<!-- ai-orchestra: managed-section start -->` written by previous installs). Set `hasOrchestraSection: true` if found.

### 3.2 Cursor

| Path | Field |
|------|-------|
| `.cursor/rules/*.mdc` | `cursor.rules[]` |
| `.cursor/skills/*/SKILL.md` | `cursor.skills[]` |
| `.cursor/hooks.json` | `cursor.hooks` |
| `.cursor/mcp.json` | `cursor.mcp` |
| `.cursor/commands/*.md` | `cursor.commands[]` (if present) |

For each rule, parse the YAML frontmatter to extract: `alwaysApply`, `globs`, `description`, and the title (first `# ` heading). Do not load rule body content.

For hooks.json, list the event names registered (`stop`, `pre-tool-call`, etc.).

For mcp.json, list server names only (no commands, no env). Mask all values to avoid leaking credentials.

### 3.3 Claude Code

| Path | Field |
|------|-------|
| `CLAUDE.md` | covered above in 3.1 |
| `.claude/commands/*.md` | `claudeCode.commands[]` |
| `.claude/mcp_settings.json` | `claudeCode.mcp` |
| `.claude/agents/*.md` (if present in the user's setup) | `claudeCode.agents[]` |

### 3.4 Codex CLI

| Path | Field |
|------|-------|
| `AGENTS.md` | covered above in 3.1; mark `codex.agentsMd.shared: true` because Codex shares the file with other tools |
| `.codex/` (any structure) | `codex.misc[]` (path inventory only) |
| `.codex/mcp.toml` (provisional) | `codex.mcp` |

If the Codex MCP convention is unconfirmed at PR 5 build-time, leave `codex.mcp.supported: false`.

### 3.5 VS Code (with GitHub Copilot)

| Path | Field |
|------|-------|
| `.vscode/settings.json` | `vscode.settings` |
| `.vscode/extensions.json` | `vscode.extensions` |
| `.github/copilot-instructions.md` | `vscode.copilotInstructions` |
| `.vscode/mcp.json` (provisional) | `vscode.mcp` |

### 3.6 Learnings document

The orchestra's "AI_LEARNINGS" pattern lives at `_documentation/AI_LEARNINGS.md` by convention. Detect it at:

| Candidate path | Notes |
|----------------|-------|
| `_documentation/AI_LEARNINGS.md` | Preferred location. |
| `docs/AI_LEARNINGS.md` | Alternative. |
| `AI_LEARNINGS.md` (root) | Some projects place it at root. |

Record the first match. Read only the YAML / metadata header (if any) for `lastUpdated`.

### 3.7 Tool-agnostic / portable agentic patterns (shared skill home)

Many projects already maintain a tool-agnostic folder at the repository root that stores AI skills, instructions, or prompts in a way that any IDE agent can consume — independent of `.cursor/`, `.claude/`, `.codex/`, or `.vscode/`. The convention is unstable across teams: common names include `.agents/`, `.ai/`, `prompts/`, `.prompts/`, `agents/`, `ai/`, `docs/agents/`, `docs/ai/`, but a project may use any name. **The orchestra must detect this pattern generically rather than hardcoding folder names**, so an installation respects the user's existing convention instead of duplicating skills under the IDE-specific path.

Probe procedure:

1. Scan top-level directory entries (one level deep) plus a single layer of nesting under `docs/`. Skip:
   - IDE folders: `.cursor/`, `.claude/`, `.codex/`, `.vscode/`.
   - Build / dependency junk: `node_modules/`, `dist/`, `build/`, `target/`, `out/`, `.next/`, `.nuxt/`, `coverage/`, `vendor/`, `.git/`, `.idea/`.
   - Orchestra and fixture folders: `ai-orchestra/`, `_test-fixtures/`, `.ai-orchestra/`.
2. For each remaining folder, evaluate two **evidence signals**:
   - **Named convention** — folder name (case-insensitive) matches one of: `agents`, `.agents`, `ai`, `.ai`, `prompts`, `.prompts`, or appears under `docs/` with one of those names.
   - **Skill-shaped markdown** — folder contains at least one `.md` or `.txt` file whose body includes any of these heading patterns: `## When to use`, `## Trigger`, `## Triggers`, `## Procedure`, `## Process`, `## Use when`. Read only enough of the file to match (first ~50 lines).
3. A folder is a **candidate** when at least one signal fires. Record both signals so the installer can rank candidates (named-convention + skill-shaped is high confidence; skill-shaped alone is medium; named-convention alone with empty contents is low).
4. Cap the candidate list at 5. If more candidates exist, keep the 5 with the strongest evidence and surface the count in the install plan so the user knows the list was truncated.

Append findings to `existingInfra.shared`:

```json
{
  "shared": {
    "candidates": [
      { "path": ".agents", "skillCount": 4, "namedConvention": true, "skillShapedMd": true, "evidence": ["named-convention", "contains-md-files-with-skill-headings"] }
    ],
    "userNominated": null
  }
}
```

`userNominated` stays `null` during Phase 3. The installer presents the list to the user during Phase 6 of [`../../RUN.md`](../../RUN.md) and records their choice (one of the candidate paths, or `null` for "do not use") into the install marker as `skillPlacementStrategy` (defined in [`../registry/install.schema.md`](../registry/install.schema.md)).

Performance budget: probing remains under the 2-second budget by reading at most the first 50 lines of each candidate `.md` and stopping after the first heading match.

### 3.8 Previous orchestra install

The presence of `.ai-orchestra/install.json` indicates a previous orchestra install. Read it and validate against [../registry/install.schema.md](../registry/install.schema.md). Record:

```json
{
  "orchestraInstall": {
    "present": true,
    "path": ".ai-orchestra/install.json",
    "version": "1.0.0-alpha",
    "ide": "cursor",
    "stacks": ["js-ts"],
    "roles": ["frontend-engineer", "qa-engineer"],
    "installedAt": "2026-04-29T08:00:00Z"
  }
}
```

This signals to RUN.md Phase 3.5 to switch into **upgrade-and-audit mode**.

### 3.9 Per-role ownership detection

Some teams already maintain their own agentic flow for one or more roles — a backend group with its own `backend/AGENTS.md`, a UI guild with hand-written `.cursor/rules/frontend-*.mdc`, or a security team owning `.github/copilot-instructions.md` for the auth surface. The orchestra must detect this so [`../install-scope.md`](../install-scope.md) §4 can recommend a scope that excludes externally-owned roles instead of duplicating them.

The probe is generic — no project-specific names are hardcoded. It walks three signal classes per role id (the role ids come from `roles/<role>.md` filenames, see [`../roles/_overview.md`](../roles/_overview.md)).

Each role id has a small alias map used for fuzzy name matching:

| Role id | Aliases (case-insensitive substring matches) |
|---------|---------------------------------------------|
| `frontend-engineer` | `frontend`, `fe`, `ui`, `client`, `web` |
| `backend-engineer` | `backend`, `be`, `api`, `server` |
| `qa-engineer` | `qa`, `test`, `testing`, `e2e` |
| `analytics-engineer` | `analytics`, `data`, `metrics`, `events` |
| `devops-sre` | `devops`, `sre`, `ops`, `infra`, `platform` |
| `security-engineer` | `security`, `sec`, `appsec`, `infosec` |
| `mobile-engineer` | `mobile`, `ios`, `android`, `rn`, `capacitor` |
| `ai-ml-engineer` | `ai`, `ml`, `llm`, `model`, `prompt` |
| `tech-writer` | `docs`, `writer`, `technical-writer`, `documentation` |
| `product-manager` | `pm`, `product`, `prd` |

The alias map lives in this section so adapters and the recommendation engine agree on a single source. When new roles are added in v2+, this table grows accordingly.

Signals (per role):

1. **Role-shaped subfolder context file.** A subdirectory at the project root whose name matches the role's aliases and contains an `AGENTS.md`, `CLAUDE.md`, or `.github/copilot-instructions.md`. Strong signal.
2. **Rule file name or description match.** A file under any inventoried rules folder (`.cursor/rules/`, `.github/copilot-instructions.md` sections, etc.) whose filename or YAML `description` field matches an alias for the role. Medium signal.
3. **Hand-written section in a project-context file.** A heading in `AGENTS.md` / `CLAUDE.md` / equivalent matching an alias, with the section body exceeding 300 characters of unique guidance (i.e., not just a list of links). Read only enough of the file to score the heading. Medium signal.

A role's ownership is classified by signal strength:

| Ownership | Trigger |
|-----------|---------|
| `external` | At least one strong signal, OR two or more medium signals. |
| `partial` | Exactly one medium signal. |
| `none` | No signals. |

Append findings to `existingInfra.roles[]`:

```json
{
  "roles": [
    {
      "roleId": "backend-engineer",
      "ownership": "external",
      "evidence": [
        { "type": "sub-agents-md", "path": "backend/AGENTS.md", "size": 4200 },
        { "type": "rule-name-match", "path": ".cursor/rules/backend-api.mdc", "match": "backend" }
      ]
    },
    {
      "roleId": "frontend-engineer",
      "ownership": "partial",
      "evidence": [
        { "type": "rule-description-match", "path": ".cursor/rules/ui-style.mdc", "match": "ui" }
      ]
    }
  ]
}
```

Roles with `ownership: "none"` may be omitted from the array, or included with an empty `evidence` array — either form is valid; the consuming code defaults absent ids to `none`.

Performance budget: the per-role probe stays within the inventory's overall 2-second budget by reading at most the first 80 lines of any candidate file and bailing out as soon as classification is determined.

### 3.10 Quality assessment of existing AI structure

The orchestra's "respectful integration" promise extends past coexistence: when the existing AI structure is weak or corrupted, the install plan should surface that finding so the user can choose to improve, replace, or preserve. The quality assessment runs over the artifacts inventoried in §3.1–§3.6 and emits a single classification plus a list of issues.

The check has four parts:

1. **Schema lint.** Apply [`../_lint.md`](../_lint.md) to every detected rule file (frontmatter validity, required fields, broken relative links inside the rule body) and every detected skill spec (skill schema in [`../skills/_schema.md`](../skills/_schema.md)). A rule that fails the lint produces a `critical` issue; a warning-level violation produces a `warning` issue.
2. **Freshness.** For each detected rule, skill, and the learnings document, record the last modification time. Use `git log -1 --format=%cI -- <path>` if a `.git/` folder is present and the path is tracked; fall back to filesystem `mtime` otherwise. Mark any artifact older than 365 days as a `info` issue (`stale` — not necessarily wrong, but worth flagging).
3. **Coherence.** Detect duplicate rule titles (two or more rules whose first `# ` heading matches). Detect orphan cross-links inside rule bodies (a relative link that does not resolve to a real file). Each pair / each orphan is a `warning` issue.
4. **Coverage.** Check whether the existing infra includes (a) at least one always-on rule that mentions a session protocol or learnings document, and (b) a learnings document at any of the paths listed in §3.6. If both are absent, emit a `warning` `coverage.missing-director` issue. If only the learnings doc is absent, emit a `warning` `coverage.missing-learnings` issue.

Each issue carries a `proposedAction`:

- `improve` — the orchestra can rewrite the artifact in place if the user agrees (only safe when the artifact has marker pairs or is missing entirely).
- `replace` — the orchestra would write a sibling `*.orchestra.<ext>` and mark the original as superseded for one cycle.
- `preserve` — the issue is informational; the orchestra does nothing.

The `overall` classification rolls up the per-issue severities:

| Overall | Trigger |
|---------|---------|
| `none` | Inventory is essentially empty (no rules, no skills, no learnings doc). |
| `solid` | At least one detected artifact, zero `critical` issues, zero `warning` issues. |
| `partial` | Zero `critical` issues, between one and two `warning` issues. |
| `weak` | One or two `critical` issues, OR three or more `warning` issues. |
| `corrupted` | Three or more `critical` issues, OR every detected rule fails the schema lint. |

Append findings to `existingInfra.quality`:

```json
{
  "quality": {
    "overall": "weak",
    "strengths": [
      "AI_LEARNINGS.md updated within the last 30 days",
      ".cursor/rules/project-context.mdc has valid frontmatter and resolves all cross-links"
    ],
    "issues": [
      {
        "id": "lint.no-frontmatter",
        "severity": "critical",
        "path": ".cursor/rules/legacy-style.mdc",
        "summary": "Rule file is missing required frontmatter.",
        "proposedAction": "replace"
      },
      {
        "id": "coverage.missing-director",
        "severity": "warning",
        "summary": "No always-on rule referencing a session protocol or learnings document was detected.",
        "proposedAction": "improve"
      }
    ],
    "suggestions": [
      "Add a Director-equivalent always-on rule that orients each new session.",
      "Refresh the legacy style rule's frontmatter or replace it with the orchestra's role-scoped equivalent."
    ]
  }
}
```

Each `issue.id` follows the convention `<area>.<short-name>` so the install plan can reference the issue from the diff table's `targetIssue` column (see [`../install-plan-template.md`](../install-plan-template.md)).

Performance budget: the quality assessment runs in addition to the rest of Phase 3 within the same 2-second budget. Schema lint reads only frontmatter and the first 200 lines of each artifact; coverage checks rely on already-inventoried metadata.

---

## 4. What the inventory does NOT include

Out of scope for the existing-infra inventory:

- **Source code patterns.** The discovery probe (DETECTION.md) handles those.
- **Dependency lists.** Same.
- **Git state, branches, commits.** Not relevant to install planning.
- **Secrets, API keys, credentials.** Never read into the inventory. The MCP detector explicitly masks these.
- **Large file bodies.** Read only metadata. The agent must avoid pulling 10k-line documents into context.

---

## 5. How the inventory is used

The adapter (Phase 4 / 5 of RUN.md) reads this inventory and, for every file it would write, applies the conflict-handling rules from its `mappings.md`. Typical rules:

- If `AGENTS.md` exists and has no orchestra section → `extend-section` (append a new `<!-- ai-orchestra: managed-section start -->` block).
- If `AGENTS.md` exists and has an orchestra section → `extend-section` inside the marker, replacing only the orchestra-managed content.
- If a rule with the same name exists → `suffix-rename` to `<original-name>.orchestra.mdc`.
- If `.cursor/mcp.json` has a server with a name that collides with an orchestra-registered slot → prefix the slot name with `orchestra-` to disambiguate.
- If `_documentation/AI_LEARNINGS.md` exists → `append` only the orchestra's seed sections (never overwrite human-curated content).

The inventory also feeds the install plan's "Detected agentic infrastructure" section, shown to the user before confirmation.

---

## 6. Performance budget

The inventory phase should complete in **under 2 seconds** on a typical project. It is read-only and shallow — file existence + small metadata reads.

---

## 7. References

- [DETECTION.md](DETECTION.md) — discovery probe (Phase 2).
- [signals/mcp.md](signals/mcp.md) — MCP detector consumed here.
- [../registry/install.schema.md](../registry/install.schema.md) — schema for the previous-install marker (and the `installScope` field that consumes §3.9 / §3.10 findings).
- [../install-scope.md](../install-scope.md) — recommendation engine that consumes `existingInfra.roles[]` and `existingInfra.quality`.
- [../install-plan-template.md](../install-plan-template.md) — Part A's "AI INFRASTRUCTURE ASSESSMENT" section that surfaces §3.10 findings to the user.
- [../_lint.md](../_lint.md) — schema-lint contract used in §3.10's quality check.
- [../../RUN.md](../../RUN.md) — overall bootstrap procedure.
- [../../adapters/_contract.md](../../adapters/_contract.md) — adapter consumption of the inventory.

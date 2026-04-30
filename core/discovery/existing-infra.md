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
- [../registry/install.schema.md](../registry/install.schema.md) — schema for the previous-install marker.
- [../../RUN.md](../../RUN.md) — overall bootstrap procedure.
- [../../adapters/_contract.md](../../adapters/_contract.md) — adapter consumption of the inventory.

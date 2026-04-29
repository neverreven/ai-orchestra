# RUN.md — How to Run the Orchestra

> **You are an AI agent.** A user asked you to "run the orchestra" or some natural variant of that. This file tells you what to do, step by step. Follow it from top to bottom, exactly. When this file's instructions and your built-in IDE conventions conflict, prefer this file.

This file is **identical regardless of IDE**. It works the same in Cursor, Claude Code, Codex, VS Code with Copilot, and any other agentic IDE that can read markdown and execute file operations.

The orchestra is **declarative**. Every action you will take is described in markdown specs in this folder. There is no runtime code in v1. You are the executor.

---

## 0. Prerequisites and ground rules

Before you do anything else, internalise these rules. They are non-negotiable.

1. **Default to dry-run.** Your first run **must** produce a dry-run diff and stop. Never write any file in the target project until the user explicitly confirms the diff.
2. **Never overwrite existing files.** If a destination file already exists, the orchestra extends/appends/suffix-renames per the conflict-handling rules in the matching adapter. A blind overwrite is a critical bug.
3. **Never edit `ai-orchestra/core/`.** The orchestra core is read-only during install. You only mutate the **target project's** files.
4. **Idempotent runs.** A second `run the orchestra` invocation on an already-installed project must produce a stable diff (only proposing genuinely new changes, never re-doing already-applied work).
5. **Be honest about gaps.** If a baseline adapter does not support a feature, say so in the install plan. Do not silently downgrade.
6. **No telemetry, no network calls** unless absolutely required for discovery (e.g., reading a public package registry to disambiguate a dependency). Default to fully offline operation.
7. **One IDE per run.** If multiple IDE markers are detected, ask the user which adapter to use. Do not install for two IDEs in a single run.

If you cannot satisfy any of these, stop and ask the user.

---

## 1. Phase 1 — Detect the IDE you are running in

Probe the environment for the IDE in this order (first match wins):

| Signal | IDE | Adapter |
|--------|-----|---------|
| Environment variable `CURSOR_TRACE_ID` set, or running inside a Cursor agent context | Cursor | `adapters/cursor/` |
| Process tree includes `claude-code`, or `.claude/` exists in the target project, or env var `CLAUDE_CODE` set | Claude Code | `adapters/claude-code/` |
| Process tree includes `codex` CLI, or env var `CODEX_*` set, or invocation is via Codex agent runner | Codex | `adapters/codex/` |
| Running inside VS Code agent mode (env var `VSCODE_PID`, `.vscode/` present, GitHub Copilot agent context) | VS Code | `adapters/vscode/` |

If you cannot determine the IDE confidently, **ask the user**:

> "I'm about to run the orchestra. I detected the following IDE candidates: [list]. Please confirm which one to install for, or tell me to abort."

Record the chosen IDE; you will pass it to every subsequent phase.

---

## 2. Phase 2 — Discover the project

Read [core/discovery/DETECTION.md](core/discovery/DETECTION.md). It describes the probe process in detail. Apply it now.

The probe will produce a **project profile**: a structured summary of the project containing:

- Stack identifiers (e.g. `js-ts`, `python-web`, `salesforce`) and their confidence scores.
- Frameworks (React, FastAPI, Apex, etc.).
- Package manager(s) and lockfile presence.
- Test framework and coverage tooling.
- CI / CD configuration (GitHub Actions, GitLab CI, etc.).
- Documentation files at the root (`README.md`, `AGENTS.md`, `CONTRIBUTING.md`, `*-DOC.md`).
- Polyglot indicators (multiple distinct stacks above threshold).

For each detected stack, read [core/discovery/signals/{stack}.md](core/discovery/signals/) for the detector definition.

If any detection is **below confidence threshold (0.6)**, surface it in the install plan as a question for the user (do not assume).

---

## 3. Phase 3 — Inventory existing agentic infrastructure

Read [core/discovery/existing-infra.md](core/discovery/existing-infra.md). It tells you which files and folders to inspect to determine what agentic setup already exists in the target project.

Capture an inventory:

- Existing `AGENTS.md`, `CLAUDE.md`, or other top-level project-context files.
- Existing rules folders (`.cursor/rules/`, `.github/copilot-instructions.md`, etc.).
- Existing skills, sub-agents, hooks, slash commands.
- Existing learnings document (under `_documentation/`, `docs/`, or root).
- Existing MCP configs (`.cursor/mcp.json`, `.claude/mcp_settings.json`, IDE-specific equivalents).
- Existing `.ai-orchestra/install.json` (indicates a previous install).

This inventory is the single most important input to the install plan. **Anything that exists must be preserved or extended, never overwritten.**

If `.ai-orchestra/install.json` is found and its `version` matches `ai-orchestra/VERSION`, the project is already installed at the current orchestra version. In that case, switch to **upgrade-and-audit mode**: only propose changes that close drift between the current install and the codebase (the audit skill's job, defined in PR 3).

---

## 4. Phase 4 — Load the adapter for the detected IDE

Read `adapters/<detected-ide>/INSTALL.md`. This file is the IDE-specific procedure for the rest of the run.

Each adapter implements the contract in [adapters/_contract.md](adapters/_contract.md). The contract guarantees that the adapter can answer the same questions in the same shape regardless of IDE:

- Where do rule templates land?
- Where do skill specs land?
- Where does the learnings doc land?
- Where does the project-context document land (`AGENTS.md` or equivalent)?
- Where do hooks land?
- Where do MCP entries land (and how are they merged)?
- Where does the registry marker (`.ai-orchestra/install.json`) land?

If the contract cannot be satisfied (e.g., the IDE has no equivalent for hooks at the time of v1), the adapter must declare the gap in its `INSTALL.md` and gracefully degrade — the install proceeds, with the gap visible in the plan.

---

## 5. Phase 5 — Build the install plan (dry-run diff)

Using:

- The project profile from Phase 2,
- The existing-infra inventory from Phase 3,
- The adapter's mappings from Phase 4,
- The role library and skill specs in [core/roles/](core/roles/) and [core/skills/](core/skills/),
- Stack-specific content from `core/stack-packs/<detected-stack>/` (where available),
- Director/learnings templates from [core/director/](core/director/_overview.md),
- Scheduler/notifications contracts from [core/scheduler/CONTRACT.md](core/scheduler/CONTRACT.md) and [core/notifications/CONTRACT.md](core/notifications/CONTRACT.md),
- Stop-hook contract from [adapters/_stop-hook.md](adapters/_stop-hook.md),

…produce a **dry-run diff**. The diff must contain, for every file the orchestra would touch in the target project:

| Field | Description |
|-------|-------------|
| `path` | Absolute or repo-relative path of the target file. |
| `action` | One of: `create`, `append`, `extend-section`, `suffix-rename` (when conflict), `skip` (when already present and identical). |
| `source` | Which orchestra core file produced this change (for traceability). |
| `rationale` | One sentence explaining why this file is in the plan. |
| `conflict` | If a conflict was detected, the resolution applied (per the adapter's rules). |

Also include in the plan, separately:

- **MCP slot registrations** — non-destructive merges into the IDE's MCP config. List slot ids, the role that requested each slot, and what the user must do (if anything) to attach a real server.
- **Registry write** — content of the `.ai-orchestra/install.json` that will be written.
- **Optional global registry append** — line that will be added to `~/.ai-orchestra/projects.json`.
- **Open questions** — any below-threshold detections from Phase 2, any ambiguity in Phase 3.

Save the plan as a markdown document in chat (or as a temporary file in the target project under `.ai-orchestra/last-plan.md` if your IDE supports persistent artifacts).

---

## 6. Phase 6 — Present the plan and wait for user confirmation

Show the plan to the user. Ask:

> "Here is the orchestra's install plan. Review the diff and respond with one of: `apply`, `apply but skip [paths]`, `revise [reason]`, or `abort`."

You **must not** proceed to Phase 7 until the user replies with `apply` (or `apply but skip ...`).

If the user replies `revise`, return to Phase 2 with their feedback as additional input.
If the user replies `abort`, stop. Do nothing.

---

## 7. Phase 7 — Apply the install

Only when the user has confirmed:

1. For each plan entry whose action is not `skip` and not in the user's skip list:
   - `create` → write the file with the rendered template content.
   - `append` → read existing content, append the new content with a clear separator (per the adapter's conflict rules).
   - `extend-section` → locate the named section, append within it.
   - `suffix-rename` → write the new file with the suffix specified by the conflict rule (typically `.orchestra.<ext>`), leaving the original untouched.
2. Write `.ai-orchestra/install.json` per [core/registry/install.schema.md](core/registry/install.schema.md).
3. Append to `~/.ai-orchestra/projects.json` (create the file if it does not exist; never overwrite existing entries — match by `path` and update only if the install version changed).
4. Apply MCP slot registrations using the adapter's `mcp.md` rules.
5. Install hooks per the adapter's hook mapping (if applicable).

If any step fails, **stop and report**. Do not roll back applied steps automatically; report the partial state and let the user decide.

---

## 8. Phase 8 — Post-install verification

Read the adapter's `post-install-checks.md` and execute every check. Examples:

- Rule frontmatter is valid YAML.
- Skill specs resolve (every referenced file exists).
- Hooks file parses as valid JSON.
- MCP config parses as valid JSON.
- `.ai-orchestra/install.json` matches the schema.
- Director rule's directives reference existing files.

Report check results. If any check fails, surface it; do not declare the install successful.

---

## 9. Phase 9 — Activation

The installed orchestration becomes active automatically on the next IDE session — the always-on rules pick it up, the stop hook (if applicable) is registered, and the audit skill is now available.

In your final message, tell the user:

- What was installed.
- Which orchestra version they got.
- How to invoke the audit skill (and when).
- How to upgrade later (re-run the orchestra; the audit will produce a focused diff).
- Any gaps you noted (e.g., adapter limitations, below-threshold detections that the user should disambiguate).

---

## 10. Edge cases

### The target project already has an `.ai-orchestra/install.json`

Switch to upgrade-and-audit mode. Skip the role-library install (already done). Use `core/skills/audit/ai-infra-audit/SKILL.md` (PR 3) to detect drift between the codebase and the installed orchestration. The plan should be much smaller — only drift items.

### Discovery returns no first-class stack

The project may be a hobby project, a documentation-only repo, or a stack we don't yet support first-class. Install the **universal core** (director, learnings, audit, generic role skills) and skip stack packs. Note the gap in the plan.

### Discovery returns multiple stacks above threshold (polyglot project)

This is normal (e.g., JS frontend + Python backend). Install all relevant stack packs. The audit skill uses the registry marker to know which packs are active; per-rule `appliesTo` patterns will scope rules to the right files.

### The user has multiple IDEs in the same project (e.g., `.cursor/` AND `.claude/` exist)

Ask which adapter to install for *this run*. The user can re-run the orchestra later for the other IDE. The orchestra will detect the existing sibling install and complement rather than conflict.

### A required core file is missing

Stop. Report the missing file. Do not improvise content — that breaks the project-agnostic guarantee.

### The user invokes "run the orchestra" without the orchestra folder being present

Tell the user: "I cannot find `ai-orchestra/` in the project root. Make sure the orchestra folder has been copied or cloned to the project root before invoking it."

---

## 11. Glossary

- **Core** — the contents of `ai-orchestra/core/`. Project-agnostic and tool-agnostic. Read-only at install time.
- **Adapter** — the IDE-specific install logic in `ai-orchestra/adapters/<ide>/`. Maps core artifacts to IDE-native file locations.
- **Project profile** — structured summary of the target project produced by the discovery probe.
- **Existing-infra inventory** — list of agentic infrastructure already present in the target project, gathered before any install.
- **Install plan** — the dry-run diff describing every file the orchestra would write/extend/skip.
- **Registry marker** — `.ai-orchestra/install.json` at the target project root. Records what the install did, when, and at which orchestra version.
- **Global registry** — `~/.ai-orchestra/projects.json` (optional). Lightweight list of all installed projects on this machine. Local-only, never transmitted.
- **Director** — the always-on rule that orients each session. Lives in the installed project.
- **Learnings doc** — `_documentation/AI_LEARNINGS.md` (or equivalent). Project's growing memory across sessions.
- **Audit skill** — `ai-infra-audit`. Detects drift, auto-fixes non-critical issues, proposes critical changes for review.
- **MCP slot** — a slot registered in the IDE's MCP configuration. The orchestra registers slots; the user attaches real MCP servers.
- **Stack pack** — `core/stack-packs/<stack>/`. Stack-specific content (code-review checklists, test patterns, architecture rules) added to the install when the matching stack is detected.

---

## 12. References

- [README.md](README.md) — orchestra overview.
- [VERSION](VERSION) — current orchestra core version.
- [CHANGELOG.md](CHANGELOG.md) — orchestra evolution log.
- [MIGRATION.md](MIGRATION.md) — version-upgrade guidance and compatibility policy.
- [core/discovery/DETECTION.md](core/discovery/DETECTION.md) — discovery probe procedure.
- [core/discovery/signals/](core/discovery/signals/) — per-stack detector definitions.
- [core/discovery/existing-infra.md](core/discovery/existing-infra.md) — existing-infra inventory procedure.
- [core/director/_overview.md](core/director/_overview.md) — Director system overview (rule + learnings).
- [core/director/RULE.md](core/director/RULE.md) — Director rule template.
- [core/director/learnings-template.md](core/director/learnings-template.md) — learnings document seed.
- [core/scheduler/CONTRACT.md](core/scheduler/CONTRACT.md) — scheduler contract (v2 runner).
- [core/notifications/CONTRACT.md](core/notifications/CONTRACT.md) — notifications contract (v2 router).
- [core/registry/install.schema.md](core/registry/install.schema.md) — install marker schema.
- [core/stack-packs/_overview.md](core/stack-packs/_overview.md) — stack-pack framework and layering rules.
- [core/_lint.md](core/_lint.md) — schema linter contract.
- [adapters/_contract.md](adapters/_contract.md) — adapter interface specification.
- [adapters/_stop-hook.md](adapters/_stop-hook.md) — stop-hook contract.
- [core/skills/audit/ai-infra-audit/SKILL.md](core/skills/audit/ai-infra-audit/SKILL.md) — audit skill that validates the installed orchestra.
- [_test-fixtures/_overview.md](_test-fixtures/_overview.md) — test fixtures (agent validators run here, not against real projects).
- [_test-fixtures/VALIDATION.md](_test-fixtures/VALIDATION.md) — agent-driven validation procedure.

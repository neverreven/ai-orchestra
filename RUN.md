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

## 0.5. Phase 0.5 — Orient the user

**Before** you start probing, tell the user (in plain language, in chat) what is about to happen and why. The orchestra is consultative, not transactional — the user must feel in control of the install before any file is read.

Send a short message in this shape (paraphrase as needed; do not parrot it verbatim):

> "I'm about to run the orchestra. Before I touch any file, I will:
>
> 1. Detect which IDE I'm running in.
> 2. Probe the project to identify stacks, frameworks, and build setup.
> 3. Inventory existing AI infrastructure — rules, skills, hooks, learnings docs, any shared agentic folder you may already use (`.agents/`, `.ai/`, `prompts/`, etc.), per-role ownership (e.g., a `backend/AGENTS.md` your team already maintains), and the overall quality of what's there.
> 4. Build a proposed install plan with a recommended **install scope** based on what I found — one of `full-kit`, `selected-roles`, `primary + collaborators`, or `core-only`. You can always override the recommendation.
> 5. Show you, in plain language, what is **NEW** (what the orchestra will add), what is **PRESERVED** (what stays untouched), an **AI INFRASTRUCTURE ASSESSMENT** if I detected weaknesses or external ownership in your existing setup (with proposed improve/replace/preserve actions for each finding), and the **RATIONALE** for the choices I made — including the chosen scope and where to place portable skills if you have a shared folder convention.
>
> I will not write a single file until you approve. If anything in the plan looks wrong, you can ask me to revise, skip specific items, or abort entirely."

This message replaces the implicit "trust me" of a silent install with explicit consent. After sending, proceed to Phase 1. The probe is allowed to run silently from here on; the user has been told the shape of the work.

If the user has already invoked the orchestra with a specific instruction (e.g., "run the orchestra and skip the AGENTS.md update"), incorporate it as input to Phase 5 but still send the orientation message — the user benefits from seeing what the orchestra is going to do regardless.

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
- **Existing tool-agnostic / portable agentic folders** (`.agents/`, `.ai/`, `prompts/`, `docs/agents/`, or any folder a heuristic identifies as a shared skill home — see [core/discovery/existing-infra.md](core/discovery/existing-infra.md) §3.7). The user may have a cross-IDE convention the orchestra must respect rather than duplicate.
- Existing `.ai-orchestra/install.json` (indicates a previous install).
- **Per-role ownership signals** — see [core/discovery/existing-infra.md](core/discovery/existing-infra.md) §3.9. The probe scans for evidence that one or more orchestra roles are already owned externally (e.g., a `backend/AGENTS.md` containing 4 KB of hand-written backend guidance, or a `.cursor/rules/frontend-style.mdc` whose description matches the frontend role). External ownership is a strong signal to the recommendation engine that the install should be narrower than `full-kit`.
- **Quality signals on the existing AI structure** — see [core/discovery/existing-infra.md](core/discovery/existing-infra.md) §3.10. The probe runs the schema linter ([core/_lint.md](core/_lint.md)) over detected rule and skill files, plus freshness, coherence, and coverage checks. The output classifies the existing structure as `solid` / `partial` / `weak` / `corrupted` and lists per-issue proposed actions (`improve` / `replace` / `preserve`).

This inventory is the single most important input to the install plan. **Anything that exists must be preserved or extended, never overwritten.** The §3.9 and §3.10 findings additionally feed Phase 5's recommendation engine ([core/install-scope.md](core/install-scope.md) §4) and the AI INFRASTRUCTURE ASSESSMENT subsection of Part A.

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

## 5. Phase 5 — Build the install plan (two-part: summary + diff)

Using:

- The project profile from Phase 2,
- The existing-infra inventory from Phase 3 (including any candidate shared agentic folders),
- The adapter's mappings from Phase 4,
- The role library and skill specs in [core/roles/](core/roles/) and [core/skills/](core/skills/),
- Stack-specific content from `core/stack-packs/<detected-stack>/` (where available),
- Director/learnings templates from [core/director/](core/director/_overview.md),
- Scheduler/notifications contracts from [core/scheduler/CONTRACT.md](core/scheduler/CONTRACT.md) and [core/notifications/CONTRACT.md](core/notifications/CONTRACT.md),
- Stop-hook contract from [adapters/_stop-hook.md](adapters/_stop-hook.md),

…produce a **two-part install plan** following the canonical format in [core/install-plan-template.md](core/install-plan-template.md). The plan has two parts that travel together:

### Part A — User-facing summary (Phase 6 leads with this)

Three or four sections in plain language, written for the human reviewing the install (the fourth is conditional). Full structure and examples in [core/install-plan-template.md](core/install-plan-template.md) §2:

- **NEW.** What the orchestra will add to the project that does not exist today. Group by kind (rules, skills, hooks, MCP slots, learnings doc, install marker). Example: "I will add 6 rules under `.cursor/rules/`, 12 skills under `.cursor/skills/`, 1 stop-hook entry to `.cursor/hooks.json`, and create `_documentation/AI_LEARNINGS.md` (currently absent)."
- **PRESERVED.** What already exists in the project that the orchestra will not touch, with explicit paths. Example: "Your existing `AGENTS.md` (12 KB, no orchestra section yet) — I will append a managed section at end-of-file but leave your hand-written content intact. Your `.cursor/rules/host-project-context.mdc` (always-on) — untouched. Your `.agents/` folder with 4 skills — untouched."
- **AI INFRASTRUCTURE ASSESSMENT (conditional).** Rendered only when the inventory reported `existingInfra.quality.overall != "solid"` or any role has `ownership: "external"`. Three subsections: Strengths, Findings (each with severity + proposed `improve` / `replace` / `preserve` action), and Suggestions (improvements the orchestra recommends but will not apply without explicit consent). Findings are resolved interactively in Phase 6 §4.6.
- **RATIONALE.** The non-default choices the orchestra made and why. Always include, when applicable: (a) the **install scope mode** chosen (one of `full-kit`, `selected-roles`, `primary-plus-collaborators`, `core-only`) and the recommendation engine's rationale per [core/install-scope.md](core/install-scope.md) §4; (b) the **skill placement strategy** (`ide-specific` / `shared` / `hybrid`) and the candidate folder it was based on; (c) any conflict-handling action invoked (suffix-rename, extend-section, improve); (d) any below-threshold stack detection treated as an open question.

### Part B — Diff table (the existing structured format)

For every file the orchestra would touch:

| Field | Description |
|-------|-------------|
| `path` | Absolute or repo-relative path of the target file. |
| `action` | One of: `create`, `append`, `extend-section`, `improve` (rewrite a managed-section block to address a §3.10 quality issue), `suffix-rename` (when conflict, or when proposing a `replace` for a §3.10 quality issue), `merge-json`, `merge-missing-sections`, `register-only`, `skip` (when already present and identical), `propose` (critical decision deferred to user). Full semantics in [core/install-plan-template.md](core/install-plan-template.md) §3.1. |
| `source` | Which orchestra core file produced this change (for traceability). |
| `rationale` | One sentence explaining why this file is in the plan. |
| `conflict` | If a conflict was detected, the resolution applied (per the adapter's rules). |
| `targetIssue` | The `issue.id` from [core/discovery/existing-infra.md](core/discovery/existing-infra.md) §3.10 when this row originated from a quality finding; empty otherwise. |

Plus, separately (still in Part B):

- **MCP slot registrations** — non-destructive merges into the IDE's MCP config. List slot ids, the role that requested each slot, and what the user must do (if anything) to attach a real server.
- **Registry write** — content of the `.ai-orchestra/install.json` that will be written, including the `installScope` and `skillPlacementStrategy` fields per [core/registry/install.schema.md](core/registry/install.schema.md) §1.2.
- **Optional global registry append** — line that will be added to `~/.ai-orchestra/projects.json`.
- **Open questions** — any below-threshold detections from Phase 2, any ambiguity in Phase 3, the install-scope question (always present unless the user has already specified the mode out-of-band), the external-ownership confirmation when any role has `ownership: "external"`, the quality-issues question when AI INFRASTRUCTURE ASSESSMENT was rendered, and (when a candidate shared agentic folder was found) the placement-strategy question — all resolved in Phase 6.

Save the plan as a markdown document in chat (or as a temporary file in the target project under `.ai-orchestra/last-plan.md` if your IDE supports persistent artifacts).

---

## 6. Phase 6 — Present the plan, resolve open questions, wait for confirmation

Lead with **Part A** (the user-facing summary) so the user reads the human-readable narrative first. Part B (the diff table) is a secondary artifact the user can drill into if they want — many users will not need it.

After presenting Part A, resolve any open questions interactively before asking the apply / skip / abort question. The full scripted question forms live in [core/install-plan-template.md](core/install-plan-template.md) §4. Ask only the questions whose precondition holds, in this order:

1. **Install scope mode** — always asked. The recommendation engine ([core/install-scope.md](core/install-scope.md) §4) supplies the default; the user accepts the recommendation, or picks one of `full-kit`, `selected-roles` (with a checkbox-style role selection), `primary-plus-collaborators` (one primary + opt-in collaborators), or `core-only`. Record the answer in `marker.installScope` per [core/registry/install.schema.md](core/registry/install.schema.md) §1.2. Full form in [core/install-plan-template.md](core/install-plan-template.md) §4.4.
2. **External-ownership confirmation** — only when any role has `ownership: "external"` per [core/discovery/existing-infra.md](core/discovery/existing-infra.md) §3.9. For each externally-owned role, ask whether to exclude it (default) or include it anyway. Adjusts `installScope.selectedRoles[]` accordingly. Full form in [core/install-plan-template.md](core/install-plan-template.md) §4.5.
3. **Quality issues** — only when AI INFRASTRUCTURE ASSESSMENT was rendered in Part A (i.e., §3.10 produced one or more issues). Group by severity; let the user accept all proposed actions, accept-with-skips, preserve everything as-is, or walk through each issue individually. Each issue resolves to `improve` / `replace` / `preserve` and updates the corresponding Part B row. The orchestra never auto-applies a fix to a hand-written file — without managed markers `improve` degrades to `propose`. Full form in [core/install-plan-template.md](core/install-plan-template.md) §4.6.
4. **Skill placement strategy** — only when a candidate shared agentic folder was inventoried in §3.7. The user picks `ide-specific`, `shared` (single user-nominated path), or `hybrid` (both, with stub). Record in `marker.skillPlacementStrategy`. Full form in [core/install-plan-template.md](core/install-plan-template.md) §4.2.
5. **Stop-hook overlap** — only when an existing project-owned stop hook targets the same learnings doc the orchestra would update. User picks skip orchestra hook / replace user hook / adopt user hook as orchestra-managed. Full form in [core/install-plan-template.md](core/install-plan-template.md) §4.3.
6. **Below-threshold stack detection** — only when Phase 2 produced one or more detections with confidence below 0.6. User picks install anyway / skip / something else per detection. Full form in [core/install-plan-template.md](core/install-plan-template.md) §4.1.

Once all applicable open questions are resolved, ask the final question:

> "Does this plan match how you want the orchestra installed? Reply with one of: `apply`, `apply but skip [paths]`, `revise [reason]`, or `abort`."

You **must not** proceed to Phase 7 until the user replies with `apply` (or `apply but skip ...`).

If the user replies `revise`, return to Phase 2 with their feedback as additional input. If the user replies `abort`, stop. Do nothing.

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
- [core/discovery/existing-infra.md](core/discovery/existing-infra.md) — existing-infra inventory procedure (including shared agentic folder detection in §3.7, per-role ownership in §3.9, and quality assessment in §3.10).
- [core/install-scope.md](core/install-scope.md) — install-scope modes, resolver, and the recommendation engine consumed by Phase 5 and Phase 6 question 1.
- [core/install-plan-template.md](core/install-plan-template.md) — canonical Part A + Part B install-plan format used in Phases 5 and 6, including the AI INFRASTRUCTURE ASSESSMENT subsection and the scripted Phase 6 question forms.
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

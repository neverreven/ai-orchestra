# VS Code (Copilot) adapter — INSTALL.md

> **You are an AI agent.** You arrived here because [`RUN.md`](../../RUN.md) (Phase 4) routed you to the VS Code adapter after detecting VS Code with GitHub Copilot as the IDE. This file is the VS Code-specific procedure. Read it top-to-bottom and follow it exactly.
>
> The VS Code adapter is a **baseline** v1 adapter. It targets VS Code with the GitHub Copilot agent / chat extension installed. It satisfies every clause of [`../_contract.md`](../_contract.md) for which VS Code + Copilot has a settled convention. Areas without a settled convention are declared as gaps in §6.

---

## 1. What this adapter does

Translates the orchestra's project-agnostic content into VS Code + Copilot-native locations:

- `.github/copilot-instructions.md` (project root) — Copilot's canonical project-context file. The orchestra owns a managed section that consolidates the Director rule, project context, role list, and skill catalog. Pre-existing user content is preserved outside the markers.
- `.github/prompts/<skill-id>.prompt.md` — Copilot custom-prompt files (one per installed skill). Invokable in Copilot Chat as `/<skill-id>`.
- `.vscode/mcp.json` — VS Code's settled project-scoped MCP server registry (read by the MCP extension).
- `_documentation/AI_LEARNINGS.md` (or detected equivalent) — living learnings document.
- `AGENTS.md` (project root) — kept in sync with the `copilot-instructions.md` managed-section content. Useful for tool-agnostic agents and for parity with the other adapters.
- `.ai-orchestra/install.json` — install marker per [`../../core/registry/install.schema.md`](../../core/registry/install.schema.md).
- `~/.ai-orchestra/projects.json` — optional global registry append.

The adapter does NOT touch `.vscode/settings.json` (workspace settings), `.vscode/tasks.json`, or `.vscode/launch.json` — those are project-owned.

---

## 2. Prerequisites

| Requirement | Why | How to verify |
|-------------|-----|---------------|
| VS Code 1.90+ with GitHub Copilot Chat extension | Custom prompts (`.github/prompts/`) and MCP (`.vscode/mcp.json`) require recent versions. | The user can confirm; if unsure, default to v1 baseline behaviour. |
| Project root has writable `.github/` and `.vscode/` (creating them is fine if absent). | Adapter writes there. | Filesystem check. |

---

## 3. Adapter version

| Field | Value |
|-------|-------|
| `ide.id` (in install marker) | `vscode` |
| `ide.adapter` (in install marker) | `adapters/vscode` |
| `ide.adapterVersion` (in install marker) | `1.0.0-alpha` |
| Adapter coverage | `baseline` (informational) |
| Contract version satisfied | `1.0` (with declared gaps — see §6) |
| Stop-hook contract version | `null` — declared gap (VS Code Copilot has no native session-end hook in v1) |

---

## 4. Walkthrough — what to do per RUN.md phase

### Phase 1 — IDE detection (already done)

Confirm via these signals (any one is sufficient):

- Environment variable `VSCODE_PID` is set.
- `.vscode/` already exists in the project (strong but not required).
- The Copilot agent context is detected via the calling tool's metadata.
- The user explicitly confirmed VS Code as the IDE.

### Phase 2 — Discovery (already done)

Use the project profile from RUN.md Phase 2 unchanged.

### Phase 3 — Existing-infra inventory (VS Code-specific check)

Beyond the generic existing-infra inventory in [`../../core/discovery/existing-infra.md`](../../core/discovery/existing-infra.md):

- Read `.github/copilot-instructions.md` if present. Search for the canonical marker pair (see [`mappings.md`](mappings.md) §3). If present, the adapter extends the section; if absent, append a new managed section at end-of-file. If the file itself is absent, create it.
- List every file in `.github/prompts/` (filtering for `.prompt.md`). Capture each prompt file's frontmatter and treat it as user-owned unless the install marker says otherwise.
- Read `.vscode/mcp.json` if present. Note all `servers[*]` entries (VS Code's MCP key is `servers`, not `mcpServers`).
- Read `AGENTS.md` if present. The adapter mirrors the copilot-instructions.md managed section here.

### Phase 4 — Adapter loaded (this file)

You are here.

### Phase 5 — Build the install plan (dry-run)

Produce the plan strictly per [`mappings.md`](mappings.md). The plan must:

1. Have a deterministic order — alphabetical by target path.
2. Include a `source` field on every entry.
3. Mark `action` per [`mappings.md`](mappings.md) §6.
4. Include a `gaps` array — v1 gaps are listed in §6 below.
5. Include the MCP slot list per [`mcp.md`](mcp.md).
6. Include the registry write payload per [`target-schema.md`](target-schema.md) §6.

### Phase 6 — Confirm

Per RUN.md.

### Phase 7 — Apply

Strict order:

1. Create `.github/prompts/` if absent (also `.github/` if needed).
2. Render and write `.github/copilot-instructions.md` (or merge the managed section).
3. Write each skill as `.github/prompts/<skill-id>.prompt.md` per [`target-schema.md`](target-schema.md) §3.
4. Render and write `AGENTS.md` (mirrors the copilot-instructions.md managed-section content).
5. Render and write the learnings document (default `_documentation/AI_LEARNINGS.md`); merge missing sections only when the file already exists.
6. Update `.vscode/mcp.json` per [`mcp.md`](mcp.md). Create `.vscode/` if absent.
7. Write `.ai-orchestra/install.json`.
8. Append to `~/.ai-orchestra/projects.json` (skip silently if blocked).

### Phase 8 — Post-install verification

Read [`post-install-checks.md`](post-install-checks.md) and run every check.

### Phase 9 — Activation message

Tell the user:

- The exact list of files written or modified.
- That `.github/copilot-instructions.md` now seeds Copilot with the orchestra's context — Copilot picks it up at the next chat session.
- Custom prompts available: `/<skill-id>` for each installed skill (e.g., `/ai-infra-audit`, `/cleanup`). Available in Copilot Chat.
- The MCP servers are registered in `.vscode/mcp.json`. The user may need to restart VS Code or run "MCP: Reload Servers" to pick them up.
- The Director's session-end behaviour is **manual** (declared gap — see §6).

---

## 5. Idempotency

A second invocation must produce **only `skip` actions** when nothing has changed. The VS Code adapter achieves this via:

- Byte-identity comparison of each rendered file against the template-rendered content.
- Stable JSON keys in `.vscode/mcp.json` (sorted alphabetically when the adapter writes).
- The managed sections in `.github/copilot-instructions.md` and `AGENTS.md` are content-hashed against the freshly re-rendered template.

---

## 6. Gaps declared by this adapter

Per [`../_contract.md`](../_contract.md) §6, every gap is declared explicitly. The VS Code baseline has these gaps in v1:

| Contract clause | Gap | Reason | User-facing fallback |
|-----------------|-----|--------|----------------------|
| Stop-hook (per [`../_stop-hook.md`](../_stop-hook.md)) | Not satisfied. | VS Code + Copilot has no documented session-end hook for the agent in v1. | The Director protocol embedded in `.github/copilot-instructions.md` asks the agent to review the session for learnings on user request. The audit prompt (`/ai-infra-audit`) and a "review this session for learnings" trigger phrase both work. |
| Per-rule files with file-glob activation (Cursor's `globs:` field) | Partial. Newer Copilot supports `.github/instructions/<name>.instructions.md` with `applyTo` patterns; v1 baseline does NOT use this and consolidates everything into a single `copilot-instructions.md`. | Conservative v1 choice — the multi-file convention is still settling. | Stack-pack content (shipped in PR 6, see [`../../core/stack-packs/`](../../core/stack-packs/)) becomes additional sections in the managed area for v1; v1.x or v2 may opt into `.github/instructions/` per-stack files. |
| Skill folder mirroring (auxiliary `template.md`, `examples/`) | Not used — Copilot custom prompts are single files. | `.github/prompts/<id>.prompt.md` has no folder convention. | Skills that need auxiliary content reference paths inside `ai-orchestra/core/skills/<category>/<skill-id>/` from inside the prompt body. |

These gaps are recorded in the install plan's `gaps[]` array and surfaced in the post-install report. They are NOT silent.

---

## 7. Files in this adapter

| File | Purpose |
|------|---------|
| [`INSTALL.md`](INSTALL.md) (this file) | Top-level procedure. |
| [`mappings.md`](mappings.md) | The mapping table: core artifact → target path → action. |
| [`target-schema.md`](target-schema.md) | The "after" state — what gets written and how. |
| [`mcp.md`](mcp.md) | MCP slot mapping for `.vscode/mcp.json`. |
| [`post-install-checks.md`](post-install-checks.md) | Health checks executed in Phase 8. |

---

## 8. References

- [`../_contract.md`](../_contract.md) — adapter contract this file satisfies (with declared gaps).
- [`../_stop-hook.md`](../_stop-hook.md) — stop-hook contract; declared as a gap for VS Code v1.
- [`../cursor/INSTALL.md`](../cursor/INSTALL.md) — reference full adapter.
- [`../claude-code/INSTALL.md`](../claude-code/INSTALL.md) — sibling baseline (Claude Code).
- [`../codex/INSTALL.md`](../codex/INSTALL.md) — sibling baseline (Codex CLI).
- [`../../RUN.md`](../../RUN.md) — bootstrap procedure that routes here.
- [`../../core/registry/install.schema.md`](../../core/registry/install.schema.md) — install marker schema.
- [`../../core/director/_overview.md`](../../core/director/_overview.md) — Director system rendered into `copilot-instructions.md`.
- [`../../core/skills/audit/ai-infra-audit/SKILL.md`](../../core/skills/audit/ai-infra-audit/SKILL.md) — audit skill that validates this install on every run.

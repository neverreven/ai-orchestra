# Claude Code adapter — INSTALL.md

> **You are an AI agent.** You arrived here because [`RUN.md`](../../RUN.md) (Phase 4) routed you to the Claude Code adapter after detecting Claude Code as the IDE. This file is the Claude Code-specific procedure. Read it top-to-bottom and follow it exactly.
>
> The Claude Code adapter is a **baseline** v1 adapter. It satisfies every clause of [`../_contract.md`](../_contract.md) for which Claude Code has a settled convention. Areas without a settled convention are declared as gaps in §6 — the install proceeds with those gaps visible and surfaces guidance to the user.

---

## 1. What this adapter does

Translates the orchestra's project-agnostic content into Claude Code's native locations:

- `CLAUDE.md` (project root) — Claude Code's canonical context file. The orchestra owns a managed section that consolidates the Director rule, project context, role list, and skill registry. Any pre-existing user content is preserved outside the markers.
- `.claude/commands/<skill-id>.md` — slash-command form of each installed skill (invokable as `/<skill-id>`).
- `.claude/settings.json` — Claude Code settings file. The orchestra writes the `Stop` hook entry under `hooks` (when supported by the installed Claude Code version).
- `.mcp.json` (project root) — Claude Code's settled project-scoped MCP server registry.
- `_documentation/AI_LEARNINGS.md` (or detected equivalent) — living learnings document.
- `.ai-orchestra/install.json` — install marker per [`../../core/registry/install.schema.md`](../../core/registry/install.schema.md).
- `~/.ai-orchestra/projects.json` — optional global registry append.
- `AGENTS.md` (project root) — kept in sync with `CLAUDE.md`'s managed section content. Many projects use both files; the orchestra writes both with the same managed-section pattern (see [`mappings.md`](mappings.md) §3).

---

## 2. Prerequisites

| Requirement | Why | How to verify |
|-------------|-----|---------------|
| Claude Code 0.10+ (recent) | Hooks system in `settings.json` and `.mcp.json` project-scoped MCP support. | Run `claude --version` if available; otherwise the user can confirm. |
| Project root has a writable `.claude/` (creating it is fine if absent). | Adapter writes there. | Filesystem check. |

If the version cannot be confirmed, default to the older-version branch (no hooks, manual stop-hook fallback per §6).

---

## 3. Adapter version

| Field | Value |
|-------|-------|
| `ide.id` (in install marker) | `claude-code` |
| `ide.adapter` (in install marker) | `adapters/claude-code` |
| `ide.adapterVersion` (in install marker) | `1.0.0-alpha` |
| Adapter coverage | `baseline` (informational) |
| Contract version satisfied | `1.0` (with declared gaps — see §6) |
| Stop-hook contract version | `1.0` when hooks supported; `null` (declared gap) on older Claude Code |

---

## 4. Walkthrough — what to do per RUN.md phase

### Phase 1 — IDE detection (already done)

Confirm via these signals (any one is sufficient):

- Process tree includes the `claude` CLI binary.
- `.claude/` already exists in the project (strong but not required).
- Environment variable `CLAUDE_CODE` or `ANTHROPIC_CLAUDE_CODE` is set.
- The user explicitly confirmed Claude Code as the IDE.

### Phase 2 — Discovery (already done)

Use the project profile from RUN.md Phase 2 unchanged.

### Phase 3 — Existing-infra inventory (Claude Code-specific check)

Beyond the generic existing-infra inventory in [`../../core/discovery/existing-infra.md`](../../core/discovery/existing-infra.md):

- Read `CLAUDE.md` if present. Search for the canonical marker pair (see [`mappings.md`](mappings.md) §3). If present, the adapter extends the section; if absent, append a new managed section at end-of-file.
- List every file in `.claude/commands/`. Capture each command's frontmatter `description` and treat it as user-owned unless the install marker says otherwise.
- Read `.claude/settings.json` if present. Note all existing `hooks` entries; the adapter must preserve them all and merge in the orchestra's `Stop` entry.
- Read `.mcp.json` if present. Note all `mcpServers[*]` entries.
- Detect Claude Code version when possible (CLI version flag, settings.json schema markers). Pick the hooks-supported branch or the older-version branch accordingly.

### Phase 4 — Adapter loaded (this file)

You are here.

### Phase 5 — Build the install plan (dry-run)

Produce the plan strictly per [`mappings.md`](mappings.md). The plan must:

1. Have a deterministic order — alphabetical by target path within each artifact category.
2. Include a `source` field on every entry.
3. Mark `action` per [`mappings.md`](mappings.md) §6 (same action set as the Cursor adapter).
4. Include a `gaps` array for every clause of [`../_contract.md`](../_contract.md) the Claude Code baseline cannot fully satisfy. v1 has the gaps listed in §6 below.
5. Include the MCP slot list per [`mcp.md`](mcp.md).
6. Include the registry write payload per [`target-schema.md`](target-schema.md) §6.

### Phase 6 — Confirm

Per RUN.md.

### Phase 7 — Apply

Strict order:

1. Create `.claude/commands/` if absent.
2. Render and write `CLAUDE.md` (or merge the managed section into an existing one — see [`mappings.md`](mappings.md) §3).
3. Write each skill as `.claude/commands/<skill-id>.md` per [`target-schema.md`](target-schema.md) §3.
4. Render and write `AGENTS.md` (mirrors the `CLAUDE.md` managed-section content; see [`mappings.md`](mappings.md) §3).
5. Render and write the learnings document (default `_documentation/AI_LEARNINGS.md`); merge missing sections only when the file already exists.
6. Update `.claude/settings.json` (when hooks are supported) with the orchestra's `Stop` hook entry.
7. Update `.mcp.json` per [`mcp.md`](mcp.md).
8. Write `.ai-orchestra/install.json`.
9. Append to `~/.ai-orchestra/projects.json` (skip silently if blocked).

### Phase 8 — Post-install verification

Read [`post-install-checks.md`](post-install-checks.md) and run every check.

### Phase 9 — Activation message

Tell the user:

- The exact list of files written or modified.
- Slash commands now available: `/<skill-id>` for each installed skill.
- Whether the stop-hook was wired (`Stop` event in `settings.json`) or skipped (older Claude Code — see §6).
- How to invoke the audit skill: `/ai-infra-audit`.

---

## 5. Idempotency

A second invocation on an already-installed project must produce **only `skip` actions** when nothing has changed. The Claude Code adapter achieves this via:

- Byte-identity comparison of each rendered file against the template-rendered content.
- Stable JSON keys in `.claude/settings.json` and `.mcp.json` (sorted alphabetically when the adapter writes).
- The marker's `installedAt` does NOT change on idempotent re-runs; `history[]` only grows on actual change events.

---

## 6. Gaps declared by this adapter

Per [`../_contract.md`](../_contract.md) §6, every gap is declared explicitly. The Claude Code baseline has these gaps in v1:

| Contract clause | Gap | Reason | User-facing fallback |
|-----------------|-----|--------|----------------------|
| Stop-hook (per [`../_stop-hook.md`](../_stop-hook.md)) | Partial: not supported on older Claude Code versions. | The hooks system landed in Claude Code 0.10+. Older versions have no equivalent. | The Director rule's body in `CLAUDE.md` includes a manual review prompt the user can trigger by saying "review this session for learnings" at session end. The `/ai-infra-audit` slash command also runs the same review on demand. |
| Per-rule files (Cursor's `.cursor/rules/*.mdc`) | No equivalent — Claude Code has only `CLAUDE.md`. | Claude Code's design consolidates project context in a single file. | All always-on rules (Director + orchestra-context) are merged into the `CLAUDE.md` managed section. |
| Always-on rules with `globs` (file-scoped activation) | Not supported. | Claude Code reads `CLAUDE.md` for every session unconditionally. | Stack-pack content (PR 6) becomes additional sections in the managed area; cannot be conditionally loaded. |

These gaps are recorded in the install plan's `gaps[]` array and surfaced in the post-install report. They are NOT silent.

---

## 7. Files in this adapter

| File | Purpose |
|------|---------|
| [`INSTALL.md`](INSTALL.md) (this file) | Top-level procedure. |
| [`mappings.md`](mappings.md) | The mapping table: core artifact → target path → action. |
| [`target-schema.md`](target-schema.md) | The "after" state — what gets written and how. |
| [`mcp.md`](mcp.md) | MCP slot mapping for `.mcp.json`. |
| [`post-install-checks.md`](post-install-checks.md) | Health checks executed in Phase 8. |

---

## 8. References

- [`../_contract.md`](../_contract.md) — adapter contract this file satisfies (with declared gaps).
- [`../_stop-hook.md`](../_stop-hook.md) — stop-hook contract; partially mapped (hooks-supported branch).
- [`../cursor/INSTALL.md`](../cursor/INSTALL.md) — reference full adapter; this baseline mirrors the structure.
- [`../../RUN.md`](../../RUN.md) — bootstrap procedure that routes here.
- [`../../core/registry/install.schema.md`](../../core/registry/install.schema.md) — install marker schema.
- [`../../core/director/_overview.md`](../../core/director/_overview.md) — Director system rendered into `CLAUDE.md` by this adapter.
- [`../../core/skills/audit/ai-infra-audit/SKILL.md`](../../core/skills/audit/ai-infra-audit/SKILL.md) — audit skill that validates this install on every run.

# Codex adapter — INSTALL.md

> **You are an AI agent.** You arrived here because [`RUN.md`](../../RUN.md) (Phase 4) routed you to the Codex adapter after detecting Codex CLI as the IDE. This file is the Codex-specific procedure. Read it top-to-bottom and follow it exactly.
>
> The Codex adapter is a **baseline** v1 adapter. It satisfies every clause of [`../_contract.md`](../_contract.md) for which Codex has a settled convention. Areas without a settled convention are declared as gaps in §6.

---

## 1. What this adapter does

Translates the orchestra's project-agnostic content into Codex-native locations:

- `AGENTS.md` (project root) — Codex CLI's canonical project context file, also tool-agnostic. The orchestra owns a managed section that consolidates the Director rule, project context, role list, and a skill catalog with trigger phrases. The orchestra core (checked into the repo at `ai-orchestra/`) is the actual source of skill execution; AGENTS.md tells the agent which file to read for which trigger phrase.
- `_documentation/AI_LEARNINGS.md` (or detected equivalent) — living learnings document.
- `.codex/mcp.json` — Codex's project-scoped MCP server registry (orchestra's chosen baseline path; see §6 for caveats).
- `.ai-orchestra/install.json` — install marker per [`../../core/registry/install.schema.md`](../../core/registry/install.schema.md).
- `~/.ai-orchestra/projects.json` — optional global registry append.

Codex does NOT have a per-skill commands directory equivalent to Cursor's `.cursor/skills/` or Claude Code's `.claude/commands/`. Skills are referenced from `AGENTS.md` by id and trigger phrase; the agent navigates to `ai-orchestra/core/skills/<category>/<skill-id>/SKILL.md` to execute them.

---

## 2. Prerequisites

| Requirement | Why | How to verify |
|-------------|-----|---------------|
| Codex CLI installed and active | Adapter assumes the CLI is the runtime. | Process detection or env vars (`CODEX_*`). |
| Project root writable | Adapter writes to `AGENTS.md`, `.codex/`, `_documentation/`, `.ai-orchestra/`. | Filesystem check. |

---

## 3. Adapter version

| Field | Value |
|-------|-------|
| `ide.id` (in install marker) | `codex` |
| `ide.adapter` (in install marker) | `adapters/codex` |
| `ide.adapterVersion` (in install marker) | `1.0.0-alpha` |
| Adapter coverage | `baseline` (informational) |
| Contract version satisfied | `1.0` (with declared gaps — see §6) |
| Stop-hook contract version | `null` — declared gap (Codex CLI has no native session-end hook in v1) |

---

## 4. Walkthrough — what to do per RUN.md phase

### Phase 1 — IDE detection (already done)

Confirm via these signals (any one is sufficient):

- Process tree includes the `codex` CLI binary.
- Environment variables matching `CODEX_*` are set.
- The user explicitly confirmed Codex CLI as the IDE.

### Phase 2 — Discovery (already done)

Use the project profile from RUN.md Phase 2 unchanged.

### Phase 3 — Existing-infra inventory (Codex-specific check)

Beyond the generic existing-infra inventory in [`../../core/discovery/existing-infra.md`](../../core/discovery/existing-infra.md):

- Read `AGENTS.md` if present. Search for the canonical marker pair (see [`mappings.md`](mappings.md) §3). If present, the adapter extends the section; if absent, append a new managed section at end-of-file.
- Read `.codex/config.toml` and/or `~/.codex/config.toml` if present. Note any MCP-related sections — the adapter does NOT modify Codex's primary config. If the user has MCP servers configured there, the adapter records them as user-managed (non-orchestra) MCP entries.
- Read `.codex/mcp.json` if present. Note all `mcpServers[*]` entries.

### Phase 4 — Adapter loaded (this file)

You are here.

### Phase 5 — Build the install plan (dry-run)

Produce the plan strictly per [`mappings.md`](mappings.md). The plan must:

1. Have a deterministic order — alphabetical by target path.
2. Include a `source` field on every entry.
3. Mark `action` per [`mappings.md`](mappings.md) §6.
4. Include a `gaps` array — v1 gaps are listed in §6 below.
5. Include the MCP slot list per [`mcp.md`](mcp.md).
6. Include the registry write payload per [`target-schema.md`](target-schema.md) §5.

### Phase 6 — Confirm

Per RUN.md.

### Phase 7 — Apply

Strict order:

1. Render and write `AGENTS.md` (or merge the managed section into an existing one — see [`mappings.md`](mappings.md) §3).
2. Render and write the learnings document (default `_documentation/AI_LEARNINGS.md`); merge missing sections only when the file already exists.
3. Update `.codex/mcp.json` per [`mcp.md`](mcp.md). Create `.codex/` if absent.
4. Write `.ai-orchestra/install.json`.
5. Append to `~/.ai-orchestra/projects.json` (skip silently if blocked).

The Codex adapter has fewer write steps than Cursor or Claude Code because skills are NOT copied — they are referenced from `AGENTS.md` and live in `ai-orchestra/core/skills/`.

### Phase 8 — Post-install verification

Read [`post-install-checks.md`](post-install-checks.md) and run every check.

### Phase 9 — Activation message

Tell the user:

- The exact list of files written or modified.
- That AGENTS.md now declares the orchestra's role list, skill catalog, and trigger phrases — Codex CLI will pick this up at the next session.
- Skills execute by reading `ai-orchestra/core/skills/<category>/<skill-id>/SKILL.md` when the agent matches a trigger phrase from `AGENTS.md`. There is no separate commands directory.
- The Director's session-end behaviour is **manual** (declared gap — see §6). Suggest the user say "audit AI infra" or "review this session for learnings" at session end, or run those phrases on a schedule.
- Whether a global registry entry was created or updated at `~/.ai-orchestra/projects.json`. If this is the first install on the machine, mention that multi-project skills (`multi-project-audit`, `upgrade-all`) are now available.

---

## 5. Idempotency

A second invocation on an already-installed project must produce **only `skip` actions** when nothing has changed. The Codex adapter achieves this via:

- Byte-identity comparison of each rendered file against the template-rendered content.
- Stable JSON keys in `.codex/mcp.json` and `.ai-orchestra/install.json` (sorted alphabetically).
- The `AGENTS.md` managed section is content-hashed against the freshly re-rendered template.

---

## 6. Gaps declared by this adapter

Per [`../_contract.md`](../_contract.md) §6, every gap is declared explicitly. The Codex baseline has these gaps in v1:

| Contract clause | Gap | Reason | User-facing fallback |
|-----------------|-----|--------|----------------------|
| Stop-hook (per [`../_stop-hook.md`](../_stop-hook.md)) | Not satisfied. | Codex CLI has no documented session-end hook in v1. | The Director protocol embedded in `AGENTS.md` asks the agent to review the session for learnings at the user's request. The audit skill (`ai-infra-audit`) and a "review this session for learnings" trigger phrase both work. |
| Per-skill commands directory | Not used — Codex has no slash-command equivalent. | Codex matches user input against `AGENTS.md` content; commands are not separately registered. | Skills are listed in the AGENTS.md skill catalog with their trigger phrases; the agent navigates to `ai-orchestra/core/skills/<category>/<skill-id>/SKILL.md` on match. This avoids duplicating skill content into the project. |
| MCP project-scoped config path stability | Partial: orchestra writes `.codex/mcp.json`. | Codex's project-scoped MCP convention is not fully settled in v1; `~/.codex/config.toml` is the documented file but is user-global, not project-scoped. The orchestra's slot intent is preserved in `.codex/mcp.json` regardless; the user copies entries into Codex's runtime config if needed. | The user follows Codex's docs to wire `.codex/mcp.json` entries into the runtime. The orchestra's slot list, ids, and intent stay portable across IDEs. |
| Always-on rules with `globs` (file-scoped activation) | Not supported. | Codex reads `AGENTS.md` for every session unconditionally. | Stack-pack content (shipped in PR 6, see [`../../core/stack-packs/`](../../core/stack-packs/)) becomes additional sections in the managed area; cannot be conditionally loaded. |

These gaps are recorded in the install plan's `gaps[]` array and surfaced in the post-install report. They are NOT silent.

---

## 7. Files in this adapter

| File | Purpose |
|------|---------|
| [`INSTALL.md`](INSTALL.md) (this file) | Top-level procedure. |
| [`mappings.md`](mappings.md) | The mapping table: core artifact → target path → action. |
| [`target-schema.md`](target-schema.md) | The "after" state — what gets written and how. |
| [`mcp.md`](mcp.md) | MCP slot mapping for `.codex/mcp.json`. |
| [`post-install-checks.md`](post-install-checks.md) | Health checks executed in Phase 8. |
| [`render-rules.md`](render-rules.md) | Exact rendering rules for the `AGENTS.md` managed section, skill catalog, and idempotency contract. |

---

## 8. References

- [`../_contract.md`](../_contract.md) — adapter contract this file satisfies (with declared gaps).
- [`../_stop-hook.md`](../_stop-hook.md) — stop-hook contract; declared as a gap for Codex v1.
- [`../cursor/INSTALL.md`](../cursor/INSTALL.md) — reference full adapter; this baseline diverges in skill installation strategy.
- [`../claude-code/INSTALL.md`](../claude-code/INSTALL.md) — sibling baseline that DOES copy skills (to `.claude/commands/`).
- [`../../RUN.md`](../../RUN.md) — bootstrap procedure that routes here.
- [`../../core/registry/install.schema.md`](../../core/registry/install.schema.md) — install marker schema.
- [`../../core/director/_overview.md`](../../core/director/_overview.md) — Director system rendered into `AGENTS.md` by this adapter.
- [`../../core/skills/audit/ai-infra-audit/SKILL.md`](../../core/skills/audit/ai-infra-audit/SKILL.md) — audit skill that validates this install on every run.

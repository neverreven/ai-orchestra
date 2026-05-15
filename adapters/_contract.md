# _contract.md — The Adapter Interface

> Every adapter under `ai-orchestra/adapters/<ide>/` must satisfy this contract end-to-end. The contract is the binding between the orchestra **core** (project-agnostic, tool-agnostic markdown specs) and the **target project's IDE-native files**.

If an adapter cannot satisfy a contract clause, it must declare the gap explicitly in its `INSTALL.md`. Silent gaps are forbidden — they break the "honest coverage" non-negotiable.

---

## 1. What an adapter is

An adapter is a folder of markdown specifications that an external agent reads after the discovery and existing-infra phases of [RUN.md](../RUN.md). The agent uses the adapter to translate **what the orchestra wants installed** (rules, skills, learnings, hooks, MCP slots, registry marker) into **where, in this IDE's conventions, those things must land**.

Adapters do not contain code. They contain:

- **Mappings**: how each core artifact type (rule template, skill spec, learnings, etc.) maps to one or more files in the target project.
- **Conflict-handling rules**: what to do when a target file already exists, broken down per artifact type.
- **Post-install checks**: machine-verifiable statements that prove the install is correctly wired.
- **Gap declarations**: any clause this adapter cannot fully satisfy in v1.

---

## 2. Required files in every adapter

| File | Required | Purpose |
|------|----------|---------|
| `INSTALL.md` | Yes | Top-level install procedure, written for the agent. Cross-references the other files. |
| `mappings.md` | Yes | The full mapping table: core artifact → target path, with conflict-handling. |
| `target-schema.md` | Yes for **full** adapters; recommended for baselines | The shape of the installed configuration in this IDE. Effectively the "after" state diagram. |
| `mcp.md` | Yes | MCP slot mapping. May declare `supported: false` if the IDE has no settled MCP convention at this orchestra version. |
| `post-install-checks.md` | Yes | Health checks executed in Phase 8 of RUN.md. |

A v1 baseline adapter must ship all five. Some files may be terse (just the gaps), but they must exist so consumers can read them deterministically.

---

## 3. Inputs

The agent provides the adapter with:

1. **Project profile** from `core/discovery/DETECTION.md` (Phase 2).
2. **Existing-infra inventory** from `core/discovery/existing-infra.md` (Phase 3).
3. **Detected stacks and corresponding stack packs** (which `core/stack-packs/<stack>/` directories to pull from).
4. **Selected role list** (from `core/roles/`) — which roles to install for. Default: all roles whose triggers match the detected stacks; user may override.
5. **The orchestra core itself** — read-only access to `core/`.
6. **The target project root**.

The adapter must not assume more inputs than these. If an adapter needs additional context, it must request it as an open question in the install plan (Phase 5).

---

## 4. Output deliverables (per adapter)

For every install, the adapter must produce:

| Deliverable | What | Where |
|-------------|------|-------|
| **Project context document** | The orchestra-managed section of the project context document (e.g., `AGENTS.md`, `CLAUDE.md`). | Per IDE convention. Marked with `<!-- ai-orchestra: managed-section start --> ... <!-- ai-orchestra: managed-section end -->`. |
| **Always-on rules** | Rendered rule files from `core/rules/*.template.md`. | IDE-specific (e.g., `.cursor/rules/*.mdc`). |
| **Skills** | Rendered skill specs from selected `core/skills/<cat>/<skill>/SKILL.md`. | IDE-specific (e.g., `.cursor/skills/<skill>/SKILL.md`). |
| **Director rule** | Rendered from `core/director/` templates. Always-on. | IDE-specific. |
| **Learnings document** | Seeded `_documentation/AI_LEARNINGS.md` (or IDE-equivalent location). | Project-relative. |
| **Stop hook** | Per [`_stop-hook.md`](_stop-hook.md) and adapter's hook conventions. May be `gap: true` if IDE has no hooks. | IDE-specific. |
| **MCP slots** | Non-destructive merge into the IDE's MCP config. Per the adapter's `mcp.md`. | IDE-specific. |
| **Registry marker** | `.ai-orchestra/install.json` per `core/registry/install.schema.md`. | Project-relative, always at `.ai-orchestra/install.json`. |
| **Global registry append** | Append/update entry in `~/.ai-orchestra/projects.json`. | User home, always at the same path. |

If a deliverable cannot be produced in this IDE (e.g., no hook system in v1), the adapter's `mappings.md` must mark it as `gap: true` with an explanation; the install plan surfaces the gap to the user.

### 4.1 Cross-IDE path portability for skill references

When an adapter writes references to installed skills into any file that may be read by a **different IDE** (e.g., `AGENTS.md`, `CLAUDE.md`, `AGENTS.md` stubs seen by Claude Code), it must use **project-root-relative paths**, not IDE-specific paths.

| Situation | Correct | Incorrect |
|-----------|---------|-----------|
| Skill referenced in `AGENTS.md` | `ai-orchestra/core/skills/audit/cleanup/SKILL.md` | `.cursor/skills/cleanup/SKILL.md` |
| Skill referenced in `CLAUDE.md` | `ai-orchestra/core/skills/audit/pre-release/SKILL.md` | `.cursor/skills/pre-release/SKILL.md` |
| IDE-native skill (rendered copy) | May use IDE path; must note it is a rendered copy | — |

**Rationale:** `AGENTS.md` is read by all agents in all IDEs. A reference to `.cursor/skills/` embedded in it silently breaks every non-Cursor session. The canonical skill spec lives in `ai-orchestra/core/skills/` and is always present regardless of IDE. Adapters may also install a rendered IDE copy alongside it, but the cross-IDE reference must always point to the core.

**In practice:** when an adapter generates an `AGENTS.md` section that lists available skills (e.g., in a "Skills" table or bullet list), each entry must link to `ai-orchestra/core/skills/<cat>/<slug>/SKILL.md`. The IDE-native rendered copy path is supplementary, not the primary reference.

---

## 5. Conflict-handling framework

Each adapter must implement these conflict-handling actions, declared per artifact type in its `mappings.md`:

| Action | Meaning | Typical use |
|--------|---------|-------------|
| `create` | Create a new file. Used when target does not exist. | Default for fresh installs. |
| `extend-section` | Locate the orchestra-managed section (delimited by markers); replace its content; leave the rest of the file intact. | Project-context documents (AGENTS.md, CLAUDE.md). |
| `append` | Append a clearly-separated block at the end. | Learnings document, when the user has hand-written content. |
| `suffix-rename` | Write the orchestra's file with a suffix; never touch the original. | Rules with name collision. Suffix typically `.orchestra.<ext>`. |
| `prefix-rename` | Write the orchestra's entry under a prefixed name in a shared registry. | MCP slot collision (`orchestra-<role>-<purpose>`). |
| `skip` | Already present and identical. Do nothing. | Idempotent re-runs. |
| `propose` | The adapter believes a change is desirable but cannot apply it safely. Surface to user for manual decision. | Critical changes: new MCP servers, hook event additions. |

The adapter's `mappings.md` must declare which action is used for each artifact type, with rationale.

### 5.1 Marker convention

For `extend-section` actions, the canonical marker is:

```
<!-- ai-orchestra: managed-section start -->
... orchestra-managed content ...
<!-- ai-orchestra: managed-section end -->
```

If the adapter's target format does not support HTML comments (e.g., a JSON file), use the format-appropriate equivalent and document it in `mappings.md`.

---

## 6. Idempotency requirements

A second `run the orchestra` invocation on a project where the orchestra is already installed at the current version must:

1. Produce a stable diff. Stable means: re-running with no changes elsewhere produces a diff with **only** `skip` entries.
2. Never duplicate `extend-section` content. The marker block must be replaced, not appended-to.
3. Never duplicate registry history entries. An idempotent run does not add a new `install` entry to `history[]`; it may add an `audit` entry only if the audit actually ran.
4. Never duplicate MCP slot registrations. If the slot name already exists in the IDE's MCP config under the orchestra prefix, leave it alone.

---

## 7. Dry-run output format

Every adapter, in Phase 5 of RUN.md, must be able to produce a dry-run plan in the same shape regardless of IDE:

```json
{
  "adapter": "cursor",
  "adapterVersion": "1.0.0-alpha",
  "actions": [
    {
      "path": ".cursor/rules/project-context.mdc",
      "action": "create",
      "source": "core/rules/project-context.template.md",
      "rationale": "Always-on project-context rule, rendered with profile.project.name and profile.frameworks.",
      "conflict": null
    },
    {
      "path": "AGENTS.md",
      "action": "extend-section",
      "source": "core/rules/project-context.template.md",
      "rationale": "Existing AGENTS.md found. Orchestra adds a managed section.",
      "conflict": "section-marker"
    },
    {
      "path": ".cursor/mcp.json",
      "action": "extend-section",
      "source": "core/skills/platform/mcp-server-audit/SKILL.md",
      "rationale": "Register orchestra-analytics-database slot. User must attach a real server.",
      "conflict": "json-merge"
    }
  ],
  "registry": {
    "marker": ".ai-orchestra/install.json",
    "globalAppend": "~/.ai-orchestra/projects.json"
  },
  "gaps": [],
  "openQuestions": []
}
```

The plan is rendered to the user as a human-readable diff, but the underlying structure is what subsequent audit runs compare against.

---

## 8. Versioning

| Field | Source | Notes |
|-------|--------|-------|
| `orchestra.version` | `ai-orchestra/VERSION` | The core version. |
| `ide.adapterVersion` | Adapter's own VERSION (or matches core in v1) | Allows adapters to evolve at their own pace later. |
| `schemaVersion` | `core/registry/install.schema.md` | Bumps on breaking schema changes. |
| `scheduler.contractVersion` | `core/scheduler/CONTRACT.md` (PR 3) | Bumps on contract changes. |
| `notifications.contractVersion` | `core/notifications/CONTRACT.md` (PR 3) | Same. |

In v1, all adapter versions match the core version (`1.0.0-alpha`). Drift is permitted from v1.1+.

---

## 9. Gap-handling

Where an IDE has no equivalent for a deliverable in v1 (e.g., no hook system, no settled MCP convention), the adapter must:

1. Declare the gap in `INSTALL.md` under a `## Gaps` section.
2. Mark the relevant entry in `mappings.md` as `gap: true` with an explanation.
3. Surface the gap in the install plan's `gaps[]` array (Phase 5 output).
4. Continue installing everything else.

The orchestra is graceful in the face of partial coverage. It will never refuse to install just because one feature is missing.

---

## 10. Read-only guarantees

Adapters are **read-only against the orchestra core**. They never write to `ai-orchestra/core/`. They never write to `ai-orchestra/adapters/` (their own folder is read-only at install time too). Only the target project and the user's `~/.ai-orchestra/` are written to.

If an adapter detects a need to update orchestra core (e.g., a stack pack is buggy), it surfaces this as a `propose` action in the dry-run; the user must take the change upstream manually. v1 has no in-place core update.

---

## 11. Adapter implementation order in v1

| PR | Adapter | Coverage | This contract |
|----|---------|----------|---------------|
| PR 4 | `cursor/` | Full | Must satisfy every clause without gaps. |
| PR 5 | `claude-code/` | Baseline | Must satisfy clauses 1–6 and 10. Clauses 4 (hooks, MCP) may declare gaps if the convention isn't settled at PR 5 build-time. |
| PR 5 | `codex/` | Baseline | Same as Claude Code. MCP almost certainly a gap in v1. |
| PR 5 | `vscode/` | Baseline | Same. Hooks gap likely; MCP convention to verify. |

Beyond v1, adapters move toward full parity with `cursor/`.

---

## 12. References

- [../RUN.md](../RUN.md) — bootstrap procedure that drives the adapter.
- [_stop-hook.md](_stop-hook.md) — sibling contract: stop-hook interface adapters wire into IDE stop-events.
- [../core/discovery/DETECTION.md](../core/discovery/DETECTION.md) — input to the adapter.
- [../core/discovery/existing-infra.md](../core/discovery/existing-infra.md) — input to the adapter.
- [../core/director/_overview.md](../core/director/_overview.md) — Director system; rule + learnings the adapter renders into the project.
- [../core/director/RULE.md](../core/director/RULE.md) — Director rule template.
- [../core/director/learnings-template.md](../core/director/learnings-template.md) — learnings document seed.
- [../core/director/session-state-template.md](../core/director/session-state-template.md) — session state handoff template.
- [../core/scheduler/CONTRACT.md](../core/scheduler/CONTRACT.md) — scheduler contract; v2 runner.
- [../core/notifications/CONTRACT.md](../core/notifications/CONTRACT.md) — notifications contract; v2 router.
- [../core/registry/install.schema.md](../core/registry/install.schema.md) — registry marker schema produced by the adapter.
- [../core/_lint.md](../core/_lint.md) — schema linter contract used by the audit.

# Codex adapter — mappings.md

> The full mapping table for the Codex baseline adapter. The Codex baseline differs from Cursor and Claude Code in skill installation strategy — skills are **referenced** from `AGENTS.md`, not copied into a per-project commands directory.

This file is the authoritative reference for Phase 5 (build dry-run) and Phase 7 (apply) of [`INSTALL.md`](INSTALL.md). The adapter never installs anything outside this table.

---

## 1. Master mapping table

| # | Core artifact | Target path | Action | Conflict policy |
|---|---------------|-------------|--------|-----------------|
| 1 | [Director rule](../../core/director/RULE.md) + [project context](../../core/director/_overview.md) (consolidated) + skill catalog | `AGENTS.md` (project root) — orchestra-managed section | `create` or `extend-section` | See §3. |
| 2 | [Director learnings template](../../core/director/learnings-template.md) | `_documentation/AI_LEARNINGS.md` (or detected equivalent) | `create` | If target exists, `merge-missing-sections` (do not touch existing sections). |
| 3 | Each installed skill (from [core/skills/](../../core/skills/)) | (No file written by default.) Referenced by id + trigger phrases inside the AGENTS.md skill catalog; source path points into the orchestra core. When the user nominates a shared skill folder (see §8), files ARE written under that folder and the catalog references point there instead. | `register-only` (default) or `create` per skill (when `skillPlacementStrategy.type` is `shared`/`hybrid`) | Trigger phrases recorded in marker `skills[].triggers`. Filtered by `installScope.selectedSkills` — see §9. |
| 4 | Stop-hook | (No file written — declared gap, see [`INSTALL.md`](INSTALL.md) §6.) | `skip-with-gap` | Manual fallback documented in `AGENTS.md`. |
| 5 | MCP slots | `.codex/mcp.json` (entries under `mcpServers`) | `merge-json` | See [`mcp.md`](mcp.md). |
| 6 | Install marker | `.ai-orchestra/install.json` | `create` (always overwrite) | Always overwrite; orchestra-owned. |
| 7 | Global registry | `~/.ai-orchestra/projects.json` | `merge-json` | Append entry if absent; update if `path` matches; never duplicate. |

---

## 2. Path conventions

Project-relative paths from the target project root. User-home paths use `~`. The adapter resolves every path relative to the project root before writing.

The orchestra core (`ai-orchestra/` at the project root) is **also** referenced — Codex skills point INTO the core directory rather than copying its files. This requires the orchestra core to remain checked into the repo for the install to work. Removing `ai-orchestra/` after install breaks the skill-execution chain. The audit detects and warns when the core is missing.

---

## 3. AGENTS.md — managed section

The orchestra owns **a section** of `AGENTS.md`. Marker pair (HTML comments, Markdown-safe):

```markdown
<!-- ai-orchestra: managed-section start -->
... orchestra-managed content ...
<!-- ai-orchestra: managed-section end -->
```

### Rules

| Situation | Action |
|-----------|--------|
| File does not exist | `create` it; place the orchestra-managed section as the only content. |
| File exists; markers absent | `extend-section` — append the markers + content at end-of-file with one blank line of separation from prior content. |
| File exists; markers present | Replace content **between** the markers verbatim with the new rendered content. Leave content outside the markers untouched. |
| Markers present but malformed | Critical conflict — surface to user. Do not auto-repair. |

### Section content (specific to Codex)

The Codex managed-section content includes one section that other adapters do not have a "Skill catalog" section listing every installed skill with:

- Skill id.
- Category.
- Trigger phrases (verbatim from the source SKILL.md `## Trigger` section).
- Path to the source `SKILL.md` (e.g., `ai-orchestra/core/skills/audit/ai-infra-audit/SKILL.md`).

Codex matches user input against the trigger phrases and follows the path link to execute the skill. Full content shape is in [`target-schema.md`](target-schema.md) §2.

### Skill trigger-phrase disambiguation on name overlap

When the project's `AGENTS.md` (outside the orchestra-managed section) already contains a skill catalog entry — or any prose section — that uses the same trigger phrases as an orchestra skill, the adapter MUST disambiguate in the managed-section catalog entry:

1. Prefix the skill's catalog entry description with `[Orchestra] `.
2. Append the note: ` Note: the project also defines a same-named or same-triggered skill — see the non-managed sections of AGENTS.md. Read both entries and choose the one that fits.`
3. Surface the overlap in the post-install report's `## Overlapping skills` section, listing the orchestra skill's id and trigger phrases alongside the project's conflicting text.

The project's original content outside the managed section is never modified.

---

## 4. `register-only` action — skill installation

Unlike Cursor (`create` per `.cursor/skills/<skill-id>/SKILL.md`) or Claude Code (`create` per `.claude/commands/<skill-id>.md`), the Codex baseline does NOT copy skill content into the project. Instead:

- Each skill installed is **registered** in the AGENTS.md skill catalog (id + triggers + source path).
- Each skill is also recorded in `marker.skills[]` per [`../../core/registry/install.schema.md`](../../core/registry/install.schema.md).
- The skill's `source` path resolves to the orchestra core (`ai-orchestra/core/skills/<category>/<skill-id>/SKILL.md`).
- When the user types a trigger phrase, the agent reads AGENTS.md, finds the matching skill entry, and follows the source path to execute the skill.

Benefits:

- No content duplication. The skill exists in exactly one place: the orchestra core.
- Skill updates flow to the project automatically when the user updates the orchestra core (no re-install needed).

Costs:

- The orchestra core MUST remain in the repo. Deleting `ai-orchestra/` breaks skill execution. The audit warns when the core is missing.
- Some Codex sessions may not load AGENTS.md eagerly enough — the agent must be reminded to consult AGENTS.md at session start.

---

## 5. Stop-hook (declared gap)

Codex CLI has no documented session-end hook in v1. The adapter declares this as a gap (per [`INSTALL.md`](INSTALL.md) §6) and provides three manual fallbacks the user can invoke:

1. Saying "audit AI infra" → triggers `ai-infra-audit`, which includes a learnings review.
2. Saying "review this session for learnings" → instructs the agent to walk the conversation and propose entries for the learnings doc.
3. The user runs the audit skill on a schedule (their own cron / launchd / systemd timer).

The marker records `hooks.Stop.registered: false` and `hooks.Stop.gapReason: "codex-no-session-end-hook"`.

### Stop-hook overlap with a user-adopted fallback (introduced in v1.2.0)

Codex has no native session-end hook, so the orchestra has nothing to merge. However, if the user has adopted a manual fallback that updates the same learnings document the orchestra would target — for example, a project-level `AGENTS.md` "session protocol" section, a Codex command in the project's `.codex/` config, or a saved system-prompt that asks Codex to update learnings on session end — the inventory in [`../../core/discovery/existing-infra.md`](../../core/discovery/existing-infra.md) §3.11 still classifies the fallback as `overlap` when it triggers the verb / path co-references defined in [`../../core/conflict/stop-hook-overlap.md`](../../core/conflict/stop-hook-overlap.md) §2.

When detected, the adapter:

1. Surfaces the overlap in the install plan as a `propose` row with the same three-choice question form (`skip-orchestra` / `replace-with-orchestra` / `adopt-existing`).
2. For `skip-orchestra`: the orchestra continues to record its session-end gap and adds a `note` to the gap entry pointing at the user's fallback.
3. For `replace-with-orchestra`: the adapter cannot remove a saved system-prompt or rewrite an `AGENTS.md` "session protocol" section without explicit guidance, so the action degrades to `propose` — the install plan asks the user to remove the fallback themselves and includes a one-shot template for a session-end audit invocation. The marker still records the chosen value and an `evidence.degradedTo: "propose"` flag for audit traceability.
4. For `adopt-existing`: the marker records `stopHookOverlapResolution.value: "adopt-existing"` plus `adoptedEntryDigest` (SHA-256 of the fallback content). The audit re-evaluates the digest on every run and surfaces drift per [`../../core/conflict/stop-hook-overlap.md`](../../core/conflict/stop-hook-overlap.md) §6.

When no fallback is detected, the adapter records `installScope.stopHookOverlapResolution.value: null`, `decidedBy: "default-no-overlap"` and the gap behaviour above is unchanged.

---

## 6. Conflict-handling actions

Codex uses the same action set as Cursor and Claude Code:

| Action | When it triggers |
|--------|------------------|
| `create` | Target absent. |
| `skip` | Target present and identical to template (byte match). |
| `extend-section` | Marker block found in target. |
| `merge-json` | Target is a JSON file managed by the orchestra (`.codex/mcp.json`). |
| `merge-missing-sections` | Learnings doc, sections-only addition. |
| `register-only` | No file written; entry recorded in marker only. (Codex-specific.) |
| `skip-with-gap` | Adapter cannot satisfy a clause for this IDE/version; recorded in `gaps[]`. |
| `propose` | Critical decision required. |

Every action is logged in the install marker per [`../../core/registry/install.schema.md`](../../core/registry/install.schema.md) §1.4.

### 6.1 Always-on downgrade on suffix-rename

The Codex adapter renders the Director rule and project context into a managed section of `AGENTS.md`. If the managed-section `extend-section` action encounters a malformed marker pair (the only conflict scenario that can trigger a suffix-rename for the AGENTS.md target), the adapter writes the orchestra's version to `AGENTS.orchestra.md`. In this scenario:

1. The renamed copy (`AGENTS.orchestra.md`) MUST include a leading note: `> **Note:** This file is a suffix-renamed orchestra copy. Codex does not auto-load it. To use the orchestra's managed content, fix the malformed markers in `AGENTS.md` or replace it with this file.`
2. The install marker records `rules[].alwaysOn: false` for the renamed copy.

For **skill** suffix-renames (when `skillPlacementStrategy.type` is `shared` and the shared folder has a same-named entry), no always-on downgrade applies — skills are reference-based in Codex and never always-on.

**Post-install report.** When the downgrade fires, Part A names the renamed file and explains the user's options (same phrasing as the Cursor adapter per [`../cursor/mappings.md`](../cursor/mappings.md) §6.1, adapted for the Codex context).

---

## 7. Stack packs

When the project profile detects one or more first-class stacks, the Codex adapter applies stack-pack content from [`../../core/stack-packs/<stack-id>/`](../../core/stack-packs/) per the layering rules in [`../../core/stack-packs/_overview.md`](../../core/stack-packs/_overview.md) §3. Since Codex lacks per-rule files, stack-pack rule content lands as additional sections inside the `AGENTS.md` managed area, with skill addenda referenced via links in the skill catalog (Codex's reference-not-copy strategy applies to pack skills as well as universal skills). The applied pack is recorded in `stacks[].stackPack` and `stacks[].stackPackVersion`.

### Pack rule glob filtering (introduced in v1.3.0)

Before including any pack rule section in the `AGENTS.md` managed area, the adapter tests the rule's `## When this applies` globs against the project's tracked files. Rules whose globs match zero files are **omitted** from the managed-section content. Installed rules are recorded in `stacks[].installedPackRules[]`; skipped rules in `stacks[].skippedPackRules[]`. The audit re-evaluates and proposes adding newly-relevant ones on the next upgrade. Pack rules with no explicit glob are always included.

---

## 8. Skill placement strategy

The Codex adapter's row 3 (skills) defaults to `register-only` — the AGENTS.md skill catalog references skills by id + trigger phrases, and the `source` path resolves into the orchestra core (`ai-orchestra/core/skills/<category>/<skill-id>/SKILL.md`). No skill files are written into the project by default. When the discovery probe in [`../../core/discovery/existing-infra.md`](../../core/discovery/existing-infra.md) §3.7 detects one or more candidate **shared skill folders**, the install plan exposes a placement decision the user resolves in Phase 6 of [`../../RUN.md`](../../RUN.md). The chosen strategy is recorded in the install marker as `skillPlacementStrategy` per [`../../core/registry/install.schema.md`](../../core/registry/install.schema.md) §1.2.

### Strategies

| `type` | What the adapter does | When this applies |
|--------|------------------------|-------------------|
| `ide-specific` | Default `register-only`. AGENTS.md catalog references skills via paths into the orchestra core. No skill files written into the project. `decidedBy: "default"`. | No candidate shared folder detected, OR the user explicitly declined to use one. |
| `shared` | Each skill is `create`d at `<sharedPath>/<skill-id>/SKILL.md`. AGENTS.md catalog `source` paths point to the shared folder rather than the orchestra core. Orchestra core remains the canonical template — re-runs reconcile shared-folder copies against the core. `decidedBy: "user"`. | User explicitly nominates a candidate during Phase 6. |
| `hybrid` | **Treated as `shared` for Codex** (declared gap). Codex has no IDE-specific skill folder analogous to `.cursor/skills/` or `.claude/commands/`, so there is no IDE-folder copy to mirror. The marker records `type: "hybrid"` if the user picked it, and the `degradedTo` field is set to `"shared"` for clarity. The adapter writes the user a one-line note in the post-install report explaining the degradation. `decidedBy: "user"`. | User picked hybrid; Codex transparently degrades. |

### Why the default `register-only` is preserved

The Codex adapter's reference-not-copy strategy is intentional: it eliminates content drift between the project and the orchestra core. Switching to `shared`/`hybrid` reintroduces drift potential (the user might edit `<sharedPath>/<skill-id>/SKILL.md` directly), so the audit on subsequent runs compares the shared copies against the orchestra core source and surfaces differences as `propose` actions, not auto-fixes. The user retains control.

### Conflict policy under shared

When `type` is `shared` (or `hybrid` degraded to shared):

- If `<sharedPath>` already contains a folder named `<skill-id>`, the adapter applies `suffix-rename` and writes `<skill-id>.orchestra/SKILL.md`. The AGENTS.md catalog points to the suffix-renamed path.
- If `<sharedPath>` does not exist, the adapter creates it. The post-install report notes "created shared skill home: `<sharedPath>`".

### Idempotency under shared

Re-running with `type: "shared"`:

- The adapter compares each `<sharedPath>/<skill-id>/SKILL.md` to the orchestra core source. Identical → `skip`. Drift → `propose` (never auto-overwrite — drift may be deliberate user customisation).
- The AGENTS.md catalog entries for the affected skills are not regenerated unless the catalog format itself changed.

### Recording the decision

The adapter writes the chosen strategy to `.ai-orchestra/install.json`:

```json
"skillPlacementStrategy": {
  "type": "shared",
  "sharedPath": ".agents",
  "decidedAt": "<ISO 8601>",
  "decidedBy": "user",
  "degradedTo": null
}
```

When `type: "hybrid"` was requested but degraded, set `"degradedTo": "shared"`.

---

## 9. Install scope handling

The Codex adapter renders only the artifacts implied by `installScope.mode` plus the resolver's `selectedRoles` and `selectedSkills` per [`../../core/install-scope.md`](../../core/install-scope.md) §2 / §3. Because Codex's default skill placement is `register-only` (no per-skill files written into the project), most of the scope's effect is on the AGENTS.md managed-section content — specifically the role list and skill catalog.

### 9.1 Per-mode rendering matrix

| Artifact | `full-kit` | `selected-roles` | `primary-plus-collaborators` | `core-only` |
|----------|------------|------------------|------------------------------|-------------|
| `AGENTS.md` managed section role list (row 1) | every role | `selectedRoles` only | resolved set only | "no role library installed (core-only mode)" |
| `AGENTS.md` skill catalog (row 1, §3.4) | every skill from every role + universals | union of skills for `selectedRoles` ∪ universals | union of skills for the resolved set ∪ universals | universals only (`cleanup`, `pre-release`, `ai-infra-audit`) |
| Learnings doc (row 2) | rendered | rendered | rendered | rendered |
| Skill files under `<sharedPath>` (row 3, only when `skillPlacementStrategy.type` is `shared` or `hybrid`-degraded-to-`shared`) | every skill | filtered by `selectedSkills` | filtered by `selectedSkills` | universals only |
| Stop-hook (row 4) | declared gap (rendered the same way regardless of scope) | gap | gap | gap |
| `.codex/mcp.json` MCP slots (row 5) | rendered | filtered by which `selectedRoles` request slots | filtered by which `selectedRoles` request slots | none (no role-derived slots; only Director-related slots if the orchestra core defines any in v2+) |
| Install marker (row 6) | rendered | rendered | rendered | rendered |
| Stack-pack additions to `AGENTS.md` (§7) | rendered (unaffected by scope) | rendered (unaffected by scope) | rendered (unaffected by scope) | rendered (unaffected by scope) |

The Codex adapter retains its `register-only` default for skills regardless of scope mode — `core-only` does not switch to file-copying. When `skillPlacementStrategy.type` is `shared`, skill files DO get written, but only for `selectedSkills`.

### 9.2 The `improve` action

When Phase 6 §4.6 resolves a quality issue with `proposedAction: "improve"`, the adapter performs an in-place block rewrite of the target file. Preconditions:

- The target file MUST contain a managed marker pair (the same `<!-- ai-orchestra: managed-section start -->` / `... end -->` convention from §3), OR be one of the orchestra-wholly-owned files (the learnings doc sections that match the template, `.ai-orchestra/install.json`, the `.codex/mcp.json` orchestra slots).
- If neither precondition holds, the action degrades to `propose` and the user is asked one more time before any write.

For Codex, `improve` most commonly applies to the AGENTS.md managed section (e.g., the §3.10 quality issue `lint.broken-skill-catalog-link` is fixable by regenerating the catalog from the resolved skill set). When `improve` fires, the row's `targetIssue` column references the originating `issue.id` from [`../../core/discovery/existing-infra.md`](../../core/discovery/existing-infra.md) §3.10.

### 9.3 The `replace` proposal (rendered as `suffix-rename`)

When Phase 6 §4.6 resolves a quality issue with `proposedAction: "replace"`, the adapter writes the orchestra's version under `<basename>.orchestra.<ext>` next to the original, leaves the original untouched, and records the row with `action: suffix-rename` and `targetIssue: <issue.id>`. Codex projects rarely accumulate per-rule files, so `replace` mostly applies to learnings doc forks or hand-written `.codex/` configurations.

The next audit run after a `replace` proposal checks whether the original is still present and reports `replace.unresolved` after one full audit cycle.

### 9.4 Recording the scope decision

The adapter writes `installScope` to the install marker exactly once per install or upgrade per the schema in [`../../core/registry/install.schema.md`](../../core/registry/install.schema.md) §1.2.

### 9.5 Idempotency under scope changes

Re-running with a different `installScope.mode` is treated as an upgrade. The adapter recomputes the AGENTS.md managed-section content from the new resolved set and applies it via `extend-section`. Because Codex's default placement does not write per-skill files, scope-down transitions usually require no file deletion proposals — the orchestra simply removes affected entries from the AGENTS.md catalog. When `skillPlacementStrategy.type` is `shared`, however, the adapter surfaces `propose` rows for skill files that fall out of scope, with the same conservative "never delete user files automatically" policy as Cursor and Claude Code.

---

## 10. Idempotency contract

- Re-running on a project where `.ai-orchestra/install.json` exists with the current core version produces only `skip` actions (or `propose` for user-edited content).
- The marker's `history[]` array is **not** appended on idempotent re-runs that produce zero changes.
- The marker's `history[]` IS appended whenever the audit skill runs and detects either drift it auto-fixes or change proposals.

---

## 11. References

- [`INSTALL.md`](INSTALL.md) — top-level procedure that drives this file.
- [`target-schema.md`](target-schema.md) — exact file shapes referenced from this table.
- [`mcp.md`](mcp.md) — MCP-specific merge logic.
- [`post-install-checks.md`](post-install-checks.md) — checks that validate the actions in this table actually produced what was intended.
- [`../_contract.md`](../_contract.md) §6 — gap declaration framework that §5 above implements.
- [`../cursor/mappings.md`](../cursor/mappings.md) — full-adapter reference; Codex diverges on skill installation strategy.
- [`../claude-code/mappings.md`](../claude-code/mappings.md) — sibling baseline that copies skills.
- [`../../core/install-scope.md`](../../core/install-scope.md) — install-scope modes, resolver, and the recommendation engine that drive §9.
- [`../../core/discovery/existing-infra.md`](../../core/discovery/existing-infra.md) — §3.7 defines candidate shared-folder detection that drives §8; §3.9 / §3.10 produce the inventory inputs that drive §9 quality handling.
- [`../../core/install-plan-template.md`](../../core/install-plan-template.md) — Part B's `targetIssue` column conventions used by §9.2 / §9.3.
- [`../../core/registry/install.schema.md`](../../core/registry/install.schema.md) — schema of the marker entries this file produces (including `installScope` and `skillPlacementStrategy`).

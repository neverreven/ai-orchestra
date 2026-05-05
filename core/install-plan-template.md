# install-plan-template.md — User-facing + Diff Install Plan

> The canonical format for the **install plan** that an agent produces during Phase 5 of [`../RUN.md`](../RUN.md) and presents in Phase 6. Every install plan has two parts: a user-facing **summary** (Part A) the human reads first, and a structured **diff** (Part B) the agent uses to actually apply changes.
>
> The template is consultative by design. The user must finish reading Part A and feel they understand the install before they decide to apply, revise, skip, or abort. Part B is the receipt of every file touched, available for inspection but never the primary read.

---

## 1. Why two parts

A pure diff is precise but inhuman. A pure narrative is readable but un-auditable. The orchestra produces both:

- **Part A — Summary.** Plain language. Three buckets: NEW (additions), PRESERVED (untouched), RATIONALE (why these choices). Lead with this in Phase 6 so the user understands the install before they see the file list.
- **Part B — Diff.** Structured table of every file the orchestra would touch, with the action and its source. Provides traceability and is what the audit skill consumes on subsequent runs.

The two parts share no state. Part A is generated from the same inputs as Part B, but the renderer for each is independent — Part A may summarise multiple Part B rows into one bullet ("12 universal skills under `.cursor/skills/`"), and Part B never elides for human readability.

---

## 2. Part A — User-facing summary

Render three or four sections, in this order, as plain markdown. The fourth section (**AI INFRASTRUCTURE ASSESSMENT**, §2.3) is **conditional** — it appears only when the existing-infra inventory reports `quality.overall != "solid"` or any role has `ownership: "external"` per [`discovery/existing-infra.md`](discovery/existing-infra.md) §3.9 / §3.10. When the inventory looks clean, omit §2.3 entirely; do not render an empty heading.

### 2.1 NEW

What the orchestra will add to the project that does not exist today. Group by kind:

- **Rules** — count + target folder + the rule names. Include their `alwaysApply` posture (always-on vs manual-trigger). Example: *"6 rules under `.cursor/rules/` (2 always-on: `ai-director`, `orchestra-context`; 4 manual-trigger: stack-pack rules)."*
- **Skills** — count + target folder + the skill ids. Group by category. Example: *"12 universal skills under `.cursor/skills/` (3 audit, 4 code, 3 docs, 2 review)."*
- **Hooks** — what gets registered (event names + the merging strategy). Example: *"1 stop-hook entry merged into `.cursor/hooks.json` under `hooks.stop`. No start hooks added."*
- **MCP slots** — count + slot names + which roles requested each + whether the user must attach a real server.
- **Learnings doc** — path the orchestra resolved + whether it was created fresh or seeded into an existing file.
- **Project-context doc** (`AGENTS.md` / `CLAUDE.md` / `.github/copilot-instructions.md` per IDE) — whether a managed section was created from scratch or appended to an existing file.
- **Install marker** — `.ai-orchestra/install.json` (always created fresh by definition, but worth naming).
- **Global registry** — entry appended to `~/.ai-orchestra/projects.json` (or fresh file).

Skip any subsection that adds nothing. Do not pad with empty headings.

### 2.2 PRESERVED

What already exists in the project that the orchestra will **not** touch, with explicit paths. The user reads this section to confirm the orchestra is not about to wipe out their work.

Examples of what to call out (one bullet each):

- *"Your existing `AGENTS.md` (12 KB, hand-written, no orchestra section yet) — I will append a managed section at end-of-file but **leave your hand-written content above untouched**."*
- *"Your `.cursor/rules/<project>-context.mdc` (always-on) — untouched."*
- *"Your `.cursor/skills/cleanup/SKILL.md` — your version stays at this path; my universal `cleanup` skill will be installed as `cleanup.orchestra/SKILL.md` (suffix-rename per conflict policy) so both versions coexist."*
- *"Your `.agents/` folder containing 4 hand-written skill specs — untouched (and recognised as your shared skill home — see Skill placement in RATIONALE)."*
- *"Your existing `.cursor/hooks.json` `start` hook (environment check) — preserved verbatim; I am only adding to `hooks.stop`."*

Be specific with paths and sizes. Vague preservation language is a red flag for the user.

### 2.3 AI INFRASTRUCTURE ASSESSMENT (conditional)

Render this section **only** when the inventory reported `quality.overall != "solid"` (per [`discovery/existing-infra.md`](discovery/existing-infra.md) §3.10) **or** any role has `ownership: "external"` (per §3.9). When neither condition holds, omit the section entirely.

Three subsections in plain language:

- **Strengths.** What the existing AI structure does well. One bullet each. Example: *"Your `_documentation/AI_LEARNINGS.md` was updated within the last 30 days and follows a consistent section structure."*
- **Findings.** What the orchestra detected as weaknesses or external ownership. One bullet per issue, with the issue id from §3.10 and the proposed action in plain language. Example: *"`lint.no-frontmatter` (critical) — `.cursor/rules/legacy-style.mdc` is missing required frontmatter. Proposed: replace with the orchestra's role-scoped equivalent and keep your version as `.legacy.mdc` for one cycle."* Example for ownership: *"`backend-engineer` is owned externally — `backend/AGENTS.md` is 4.2 KB of hand-written guidance. Proposed: exclude `backend-engineer` from the install scope; the orchestra will not duplicate that guidance."*
- **Suggestions.** Optional improvements the orchestra recommends but will not apply without explicit consent. One bullet each. Example: *"Add a Director-equivalent always-on rule that orients each new session — your project currently has no session-protocol rule."*

Findings whose `proposedAction` is `improve` or `replace` produce corresponding rows in Part B with the `targetIssue` column populated (see §3.1). The user resolves each finding interactively in Phase 6 §4.5 — the orchestra never auto-applies.

### 2.4 RATIONALE

The non-default choices the orchestra made and why. Always include, when applicable:

- **Install scope mode** — which of the four modes from [`install-scope.md`](install-scope.md) §1 was selected and the recommendation that drove the default. Example: *"Selected `selected-roles` (frontend-engineer, qa-engineer, security-engineer, tech-writer). Recommended because the inventory detected external ownership of `backend-engineer` (`backend/AGENTS.md`, 4.2 KB hand-written) and `analytics-engineer` was not auto-installed in v1 unless analytics deps are detected. The user accepted the recommendation."* When `mode` is `full-kit` and `decidedBy` is `default`, state simply: *"Default `full-kit` install — no inventory signal recommended a narrower scope."*
- **Skill placement strategy** — which of `ide-specific` / `shared` / `hybrid` was picked and why. Example: *"Picked `shared` because I detected `.agents/` at the project root (named-convention match + 4 skill-shaped markdown files). Portable orchestra skills will be installed under `.agents/<skill-id>/SKILL.md`. The IDE folder (`.cursor/skills/`) will not receive duplicates."* When picking the default `ide-specific` because no candidate was detected, simply state: *"No shared agentic folder detected; using `ide-specific` placement."*
- **Conflict-handling actions invoked.** For each conflict resolved, name the resolution in plain language. Example: *"Your existing `cleanup` skill collides by name with my universal `cleanup`. To avoid overwriting your version, I am writing my version as `cleanup.orchestra/SKILL.md`. Both will be installed; trigger phrases overlap, so you may want to disambiguate descriptions later."*
- **Below-threshold detections** treated as open questions for Phase 6.
- **Stack packs applied vs. detected-but-not-applied.** Example: *"Detected `js-ts` (confidence 0.97) and `python-web` (confidence 0.71) — both packs will be applied. Detected `mobile` (confidence 0.65) — pack does not exist yet (planned v2); detection is recorded in the install marker as info-severity."*
- **Stop-hook overlap, if any** (per [v1.x backlog F4](../_v1.x-backlog.md)).

If the orchestra had no non-default choices to make (a clean greenfield project, no existing infra, no stack-pack overlap, no conflicts), still include this section with one line: *"No non-default decisions — clean greenfield install."*

---

## 3. Part B — Diff

A standard structured representation of every file the orchestra would touch. Two subsections: the file table and the side-channels (MCP slots, registry writes, open questions).

### 3.1 File table

Render exactly this table:

| Path | Action | Source | Rationale | Conflict | Target issue |
|------|--------|--------|-----------|----------|--------------|
| `<repo-relative path>` | `<action>` | `<source path inside ai-orchestra/>` | `<one-sentence why>` | `<conflict resolution if any, else empty>` | `<issue id from §3.10 if this row originated from a quality finding, else empty>` |

Allowed actions:

- `create` — new file, no target exists.
- `append` — text file, append at end with separator.
- `extend-section` — locate a managed marker pair and replace content between markers.
- `improve` — locate a managed marker pair and rewrite the block in place to address a quality issue from [`discovery/existing-infra.md`](discovery/existing-infra.md) §3.10. Only valid when (a) markers are present, OR (b) the target file is the orchestra-owned learnings doc / install marker / equivalent that the orchestra wholly owns. When markers are absent on a hand-written file, the action degrades to `propose` — the orchestra never auto-rewrites hand-written content.
- `merge-json` — parse, merge, re-serialise (used for `hooks.json`, `mcp.json`).
- `merge-missing-sections` — text file, add only sections that are missing.
- `register-only` — no file written; entry added to a catalog elsewhere (Codex skill catalog).
- `suffix-rename` — write under `<basename>.orchestra.<ext>` because target exists with non-orchestra content. Used both for ordinary conflicts and for `replace` proposals from §3.10 quality findings (in the latter case the row's `targetIssue` column is populated and the rationale references the finding).
- `skip` — target exists and matches template byte-for-byte; no write.
- `propose` — critical decision; surfaced as an open question, not applied automatically.

The `Target issue` column is left empty for ordinary install rows. It is populated only for rows whose origin is a quality finding from §3.10 — the value is the `issue.id` (e.g., `lint.no-frontmatter`) so the user can correlate Part B rows back to Part A's AI INFRASTRUCTURE ASSESSMENT bullets.

### 3.2 Side-channels

Each as its own subsection, each may be empty:

- **MCP slots.** One bullet per slot: `<slot-id>` (registered by `<role-id>`, attach a real server: yes / no — explanation).
- **Install marker.** The full content of `.ai-orchestra/install.json` that will be written. Reference [`registry/install.schema.md`](registry/install.schema.md) for field meaning.
- **Global registry.** The entry that will be appended to `~/.ai-orchestra/projects.json` (or `none` if global registry is disabled).
- **Open questions.** Numbered list of questions the user must answer in Phase 6 before `apply` is accepted. Each entry: question text + options.

---

## 4. Phase 6 question forms

The Phase 6 dialogue draws its questions from Part A's RATIONALE, Part A's AI INFRASTRUCTURE ASSESSMENT (when present), and Part B's open-questions side-channel. Question forms are scripted; the agent does not improvise.

The questions are asked in this order — scope first because every later question's answer set may shrink based on the chosen scope; ownership confirmation second because it can shrink the scope further; quality issues third because their resolution depends on which roles will actually be installed; placement and stack detection after that:

1. Install scope mode (§4.4).
2. External-ownership confirmation (§4.5) — only when any role has `ownership: "external"`.
3. Quality issues (§4.6) — only when AI INFRASTRUCTURE ASSESSMENT was rendered.
4. Skill placement strategy (§4.2) — only when candidate shared folders were detected.
5. Stop-hook overlap (§4.3) — only when overlap detected.
6. Below-threshold stack detection (§4.1) — only when below-threshold detections exist.
7. Final apply / skip / abort (§4.7).

Skip any question whose precondition does not hold. Do not ask placeholder questions.

### 4.1 Below-threshold stack detection

> "I detected `<stack-id>` with confidence `<n>`, below the 0.6 threshold. Should I (a) install the stack pack anyway, (b) skip the pack but record the detection, or (c) something else?"

Record the answer in `marker.stacks[].confidenceOverride` if (a) is chosen.

### 4.2 Skill placement strategy

> "I detected the following candidate shared agentic folder(s) at the project root: `<list>`. I can: (a) treat `<chosen path>` as your shared skill home and install portable skills there only; (b) install portable skills under both your shared folder and the IDE's native location (hybrid); (c) install only under the IDE's native location and leave your shared folder untouched. Which do you prefer?"

Record the answer in `marker.skillPlacementStrategy` per [`registry/install.schema.md`](registry/install.schema.md) §1.2.

### 4.3 Stop-hook overlap

> "I detected an existing stop-hook at `<path>` that updates `<learnings-path>`. The orchestra also installs a stop-hook for the same file. To avoid running twice, I can: (a) skip the orchestra hook (your hook keeps working), (b) replace your hook with the orchestra hook, (c) tag your existing hook as orchestra-managed and adopt it going forward. Which do you prefer?"

(See [`../_v1.x-backlog.md`](../_v1.x-backlog.md) F4 for the full design.)

### 4.4 Install scope mode

Always asked. The recommendation engine ([`install-scope.md`](install-scope.md) §4) supplies the proposed mode and rationale; the user picks any of the four modes or accepts the recommendation:

> "I recommend `<mode>` because `<one-sentence rationale>`. Choose:
> (a) accept the recommendation
> (b) `full-kit` — install every role
> (c) `selected-roles` — pick a subset (I will list every role for you to check)
> (d) `primary-plus-collaborators` — pick one role; I will list its declared collaborators as opt-in add-ons
> (e) `core-only` — Director + learnings + audit, no role library"

When the user picks (c) or (d), present the relevant role list and capture the selection. When the user picks (a), the recorded `decidedBy` is `user-accepted-recommendation`. When the user picks any of (b)–(e) and the choice differs from the recommendation, `decidedBy` is `user-override`. When the user picks (a) and the recommendation matches the engine default with no inventory signals, `decidedBy` is `default`.

Record the answer in `marker.installScope` per [`registry/install.schema.md`](registry/install.schema.md) §1.2.

### 4.5 External-ownership confirmation

Only asked when any role has `ownership: "external"` per [`discovery/existing-infra.md`](discovery/existing-infra.md) §3.9.

For each externally-owned role:

> "Your project appears to own `<role-id>` already. Evidence: `<paths and sizes>`. Default: exclude `<role-id>` from the orchestra install so the orchestra does not duplicate your existing guidance. Override: include `<role-id>` anyway (the orchestra will offer to extend, not overwrite, your existing files)."

When the user accepts the default, the role is removed from `installScope.selectedRoles[]` (and from the resolver's downstream skill set). When the user overrides, the role stays selected and any conflicts are handled in §4.2 placement and the standard `extend-section` / `suffix-rename` rules from the adapter.

### 4.6 Quality issues

Only asked when [`discovery/existing-infra.md`](discovery/existing-infra.md) §3.10 produced one or more issues (i.e., AI INFRASTRUCTURE ASSESSMENT was rendered in Part A §2.3).

Group issues by `proposedAction`:

> "I detected the following weaknesses in your existing AI structure:
>
> Critical (`<n>`): `<list of critical issue summaries with paths>`
> Warnings (`<n>`): `<list of warning issue summaries>`
>
> For each, I propose: `<per-issue proposed action>`. Choose one of:
> (a) accept all proposed actions as-is
> (b) accept proposed actions but skip these specific issues: `<list>`
> (c) preserve everything as-is (do not improve or replace anything; the orchestra installs alongside your current setup unchanged)
> (d) walk me through each issue individually"

When the user picks (d), present each issue in turn with its three options (`improve` / `replace` / `preserve`) and its proposed action highlighted. For each issue resolved as `improve` or `replace`, the corresponding Part B row is enabled (action becomes `improve` or `suffix-rename` with `targetIssue` populated). For each issue resolved as `preserve`, the corresponding Part B row is dropped.

The orchestra never auto-applies a fix to a hand-written file. If `improve` is selected for a target without managed markers, the action degrades to `propose` and the user gets one more prompt before any write.

### 4.7 Final apply / skip / abort question

After all open questions are resolved:

> "Does this plan match how you want the orchestra installed? Reply with one of: `apply`, `apply but skip [paths]`, `revise [reason]`, or `abort`."

Wait. Do not proceed without one of these four replies.

---

## 5. Examples

### 5.1 Greenfield project (no existing infra)

Part A — NEW: 6 rules, 12 skills, 1 stop-hook, 1 MCP slot (analytics), `_documentation/AI_LEARNINGS.md` created, `AGENTS.md` created with managed section as the only content, install marker created.

Part A — PRESERVED: *"No existing AI infrastructure detected — nothing to preserve."*

Part A — RATIONALE: *"No non-default decisions — clean greenfield install. Skill placement defaults to `ide-specific` (no shared folder detected)."*

Part B: 20 file rows, all `create`, no conflicts, one MCP slot, install marker content.

### 5.2 Mature project with existing infra and a `.agents/` shared folder

Part A — NEW: 6 rules, 12 skills installed under `.agents/<skill-id>/SKILL.md` (the user nominated `.agents/` as the shared skill home), 1 stop-hook merged into existing `hooks.json`, learnings doc seeded missing sections into existing `_documentation/AI_LEARNINGS.md`, AGENTS.md managed section appended.

Part A — PRESERVED: existing `AGENTS.md` content (above the managed section), 3 hand-written rules in `.cursor/rules/`, all 4 existing skills in `.agents/`, the existing `start` hook in `hooks.json`, the existing learnings doc sections.

Part A — RATIONALE: *"Picked `shared` skill placement because `.agents/` exists with skill-shaped markdown. Suffix-renamed orchestra `cleanup` skill to `cleanup.orchestra/` because the project already has `cleanup`. Skipped 1 stack-pack rule whose globs match no project files."*

Part B: 23 file rows mixing `create`, `extend-section`, `suffix-rename`, `merge-json`, `merge-missing-sections`. One open question if the user has multiple candidate shared folders.

---

## 6. Renderer notes

- The renderer is the agent itself in v1; there is no programmatic plan generator. The agent reads this template, the inventory, and the adapter mappings, and produces the plan in markdown.
- Keep Part A under ~40 lines for typical installs. Long Part A sections defeat the purpose of a summary. If the install is genuinely complex, split RATIONALE into sub-bullets but do not pad NEW or PRESERVED beyond what is true.
- Part B has no length budget — it must enumerate every file. The user is expected to skim Part B, not read it.

---

## 7. References

- [`../RUN.md`](../RUN.md) — Phases 5 and 6 reference this template.
- [`install-scope.md`](install-scope.md) — defines the four scope modes and the recommendation engine surfaced in §2.4 RATIONALE and §4.4 of this template.
- [`discovery/existing-infra.md`](discovery/existing-infra.md) — inventory shape that feeds Part A's PRESERVED section, plus §3.9 ownership and §3.10 quality findings that feed §2.3 AI INFRASTRUCTURE ASSESSMENT and §4.5–§4.6 questions.
- [`registry/install.schema.md`](registry/install.schema.md) — install marker schema, including `installScope` and `skillPlacementStrategy`.
- [`../_v1.x-backlog.md`](../_v1.x-backlog.md) — open friendliness items some of which surface as Phase 6 questions (e.g., F4 stop-hook overlap).
- Each adapter's `mappings.md` (e.g., [`../adapters/cursor/mappings.md`](../adapters/cursor/mappings.md) §8) — canonical skill-placement-strategy logic per IDE.

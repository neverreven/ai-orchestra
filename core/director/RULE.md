# Director Rule — IDE-agnostic template

> This file is the **source-of-truth template** for the Director Rule. The adapter renders it into the IDE-native rule format (Cursor `.mdc`, Claude Code rule, Codex `AGENTS.md` segment, VS Code instruction file, etc.) at install time, substituting the placeholders below.

The rule must be installed as **always-on** (every session reads it) wherever the IDE supports that. For IDEs that do not support always-on rules, the adapter folds the rule's content into the project's consolidated context document (`AGENTS.md` and friends).

---

## Placeholders the adapter substitutes

| Placeholder | Source | Default fallback |
|-------------|--------|------------------|
| `{{PROJECT_NAME}}` | Project profile (Phase 4 of `RUN.md`). | The repository folder name. |
| `{{LEARNINGS_PATH}}` | Install plan (Phase 5). | `_documentation/AI_LEARNINGS.md` |
| `{{PROJECT_CONTEXT_PATH}}` | Detected during Phase 3 (existing-infra inventory). | `AGENTS.md` |
| `{{ARCHITECTURE_DOC_PATH}}` | Detected or asked for during Phase 5 (optional). | (empty — section omitted if not provided) |
| `{{INSTALL_MARKER_PATH}}` | Always `.ai-orchestra/install.json`. | `.ai-orchestra/install.json` |
| `{{LEARNINGS_LINE_BUDGET}}` | Static for v1. | `300` |

The adapter must produce the rendered file with **no remaining placeholders**. If a placeholder cannot be resolved, the adapter fails the install with a clear message rather than emitting a half-substituted rule.

---

## Rule body (rendered template begins below)

```markdown
# {{PROJECT_NAME}} — AI Director

> This rule is installed by ai-orchestra. It coordinates AI session continuity across conversations. Do not delete it lightly — the orchestra's audit will recreate it if removed, but any local edits you made will be lost.

## Session Startup Protocol

At the start of every new conversation, before doing any real work:

1. Read `{{LEARNINGS_PATH}}` to load accumulated knowledge from previous sessions.
2. Read `{{PROJECT_CONTEXT_PATH}}` for the project summary, critical rules, key file map, and active priorities.
3. (If applicable) Read `{{ARCHITECTURE_DOC_PATH}}` for the full architecture reference.
4. If the user's request touches a specific subsystem with its own rule or doc, also read that document.

Do not skip steps 1–2. The learnings document contains hard-won knowledge — patterns, gotchas, user preferences, and decisions — that prevents repeating past mistakes. The project context document provides the always-on structural context.

## During-Session Protocol

Update `{{LEARNINGS_PATH}}` immediately when one of these triggers fires:

- **User correction:** the user corrects your approach. Capture the right way as soon as it is settled.
- **Discovered gotcha:** a non-obvious bug, positioning issue, environment quirk, or compatibility problem is found and resolved.
- **Completed feature:** a feature finishes and a reusable pattern emerges from the work.
- **Architecture decision:** the user makes a structural or product choice. Log the decision with its rationale.

Updates happen during the session, not at session end. The end-of-session sweep is for catching items missed during flow.

### What qualifies as a learning

- Specific, actionable insight tied to *this* project (not generic coding advice).
- A pattern that would save time if known at the start of a future session.
- A user preference that should be respected going forward.
- A decision and its rationale, where future-self might second-guess the choice.

### What does NOT belong in learnings

- Content already covered by an existing rule, the project context document, or the architecture reference.
- Temporary debugging notes for a one-off bug with no reuse value.
- Generic coding practices ("use meaningful names").
- Praise, celebration, or social commentary.

## Update Mechanics

When updating `{{LEARNINGS_PATH}}`:

1. Read the current file first — never overwrite blindly.
2. Place new entries in the correct section: **Established Patterns**, **Anti-Patterns**, **User Preferences**, **Decision Log**, or **Environment Notes**. Add a new section only if none of these fit.
3. Check for duplicates — update an existing entry rather than adding a contradictory one. If a contradiction is genuine, ask the user before resolving.
4. Keep entries concise: context + learning + optional code pattern. No essays.
5. Update the **Last updated** date in the document header.
6. Cite specific files or sections where they ground the entry; avoid bare assertions.

## Document Health

If `{{LEARNINGS_PATH}}` exceeds `{{LEARNINGS_LINE_BUDGET}}` lines:

- During the next update, consolidate related entries.
- Remove stale or superseded items.
- Move material that has hardened into project standard practice into the project context document, then delete it from learnings.
- The audit skill (`ai-infra-audit`) flags an oversized learnings doc on every audit run.

## Session-End Behaviour

If the IDE supports a stop-hook, an end-of-session prompt fires automatically. When it does:

1. Review the conversation for any learning that was not captured mid-session.
2. Apply it using the **Update Mechanics** above.
3. Make no edit if nothing new was learned. Empty is the common case and is fine.

If no stop-hook is wired, perform this review manually before closing the session.

## Orchestra context (do not modify)

This rule was installed by ai-orchestra. Install marker: `{{INSTALL_MARKER_PATH}}`. The orchestra's audit (skill: `ai-infra-audit`) re-renders this rule when drift is detected; user-edits to the rendered rule are surfaced for review and overwritten only with consent.
```

(Rendered template ends.)

---

## Adapter responsibilities (for the integrator)

When rendering this template:

1. **Format conversion** — wrap the rendered body in IDE-native frontmatter or headers as required (Cursor `.mdc` frontmatter; Claude Code rule headers; etc.).
2. **Always-on flag** — set the IDE's "always applied" flag where supported. If the IDE only supports manual application, prepend a one-line note advising the user.
3. **Path normalisation** — normalise `{{LEARNINGS_PATH}}` and `{{PROJECT_CONTEXT_PATH}}` to forward-slash relative paths from the repo root, regardless of OS.
4. **Conflict handling** — if a Director-equivalent rule already exists at the target path, follow the conflict-handling rules in [`../../adapters/_contract.md`](../../adapters/_contract.md). Default behaviour is **merge non-destructively + surface diff**, never silent overwrite.
5. **Marker entry** — record the rendered rule's path and a content hash in the install marker per [`../registry/install.schema.md`](../registry/install.schema.md), so the audit can detect drift later.

---

## What this rule deliberately does NOT do

- It does **not** prescribe how the agent reasons or solves problems — that's the agent's job.
- It does **not** dictate code style — code-style rules belong elsewhere (in `code-standards`-style rules per stack pack).
- It does **not** automate the learnings updates — they are agent-driven, with the rule prescribing when and how.
- It does **not** assume any specific IDE — every IDE-specific behaviour is in the adapter, not here.

---

## References

- [`_overview.md`](_overview.md) — what the Director system is and how it fits together.
- [`learnings-template.md`](learnings-template.md) — the doc this rule maintains.
- [`../../adapters/_stop-hook.md`](../../adapters/_stop-hook.md) — stop-hook contract that delivers the session-end behaviour.
- [`../../adapters/_contract.md`](../../adapters/_contract.md) — adapter contract; describes how this template is rendered.
- [`../registry/install.schema.md`](../registry/install.schema.md) — install marker schema.
- [`../skills/audit/ai-infra-audit/SKILL.md`](../skills/audit/ai-infra-audit/SKILL.md) — audit that verifies the rendered rule's health.

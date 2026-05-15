# Session State — template

> This file is the **machine-readable handoff** written by the Director Rule at session end and read at the next session's §0 anchor step. It supplements `AI_LEARNINGS.md` (which is human-curated knowledge) with session-operational state that would otherwise be buried in prose summaries.
>
> **Adapter behaviour at install time:**
> - Substitute `{{PROJECT_NAME}}` in the document title.
> - Write to `.ai-orchestra/SESSION_STATE.md` in the project root (configurable via `{{SESSION_STATE_PATH}}`).
> - If the file already exists, the agent overwrites it entirely at each session end — it is a snapshot, not an append log.

---

## Rendered template begins below

```markdown
# {{PROJECT_NAME}} — Session State

> Machine-readable session handoff. Overwritten by the Director Rule at each session end.
> Read at §0 of the next session's startup protocol.

| Field | Value |
|-------|-------|
| Last updated | <!-- ISO 8601 datetime --> |
| Session model | <!-- e.g. claude-sonnet-4-5, gpt-4o --> |
| Last commit | <!-- full SHA or "no commit this session" --> |
| Branch | <!-- current branch name --> |

---

## Current phase

<!-- One sentence describing what the project is currently in the middle of.
     Examples:
       "Implementing the Kinote editor toolbar — all core buttons done, undo/redo pending."
       "Post-launch stabilisation — fixing three reported bugs, no new features."
       "Pre-release audit for v1.2.0 — tests green, waiting on changelog." -->

[TBD]

---

## Active work items

<!-- Short list of the things in flight RIGHT NOW.
     Format: - [ ] item (owner hint: role) -->

- [ ] (no items recorded)

---

## Blocked items

<!-- Anything that cannot proceed without an external action, decision, or information.
     Format: - ⏸ Description — blocked on: [what/who] -->

(none)

---

## Decisions made this session

<!-- One-liner per decision. Full rationale goes in AI_LEARNINGS.md Decision Log. -->

(none)

---

## Model routing used this session

<!-- Which model tier handled which work. Helps the next session calibrate.
     Format: - Task type → model used -->

(not recorded)

---

## Next session starting point

<!-- Single paragraph or bullet list: the first thing the next session should do.
     Be specific: file name, function, test to write, person to ask. -->

[TBD]

---

## Orchestra context (do not modify)

Written by ai-orchestra Director Rule. Install marker: `{{INSTALL_MARKER_PATH}}`.
```

(Rendered template ends.)

---

## Why each field exists

| Field | Value it provides to the next session |
|-------|---------------------------------------|
| Session model | Lets the next session know what tier was in use — relevant if work was delegated to a specific model |
| Last commit | Establishes the exact diff baseline for any cleanup or review |
| Current phase | Prevents the agent from re-deriving project state from scratch |
| Active work items | Shows what is in-flight so the agent doesn't duplicate or conflict |
| Blocked items | Surfaces blockers immediately so the user can address them before asking for more work |
| Decisions made | Rapid-fire summary; links to AI_LEARNINGS.md where full rationale lives |
| Model routing used | Reference for cost estimation and quality trade-off decisions |
| Next session starting point | The single most valuable field — a direct handoff note from the last session to the next |

---

## Relationship to AI_LEARNINGS.md

`SESSION_STATE.md` and `AI_LEARNINGS.md` serve different purposes and must not be merged:

| | AI_LEARNINGS.md | SESSION_STATE.md |
|--|----------------|-----------------|
| **Content** | Curated patterns, anti-patterns, decisions | Current operational snapshot |
| **Updated** | When a learning emerges (any session) | Overwritten at every session end |
| **Lifetime** | Accumulates over the project's life | Only the latest snapshot matters |
| **Read at** | §1 of startup protocol | §0 of startup protocol (after anchor) |
| **Written by** | Agent selectively | Agent always, at session end |

---

## References

- [`RULE.md`](RULE.md) — the Director rule that writes and reads this file.
- [`learnings-template.md`](learnings-template.md) — the companion learnings document.
- [`_overview.md`](_overview.md) — Director system overview.
- [`../../adapters/_stop-hook.md`](../../adapters/_stop-hook.md) — stop-hook that triggers the session-end write.

# Director — Overview

> The Director is the orchestra's mechanism for **context continuity across sessions**. It is two coupled artifacts: an always-on rule that runs at the start and end of every conversation, and a living learnings document that accumulates patterns, gotchas, user preferences, and decisions over time.

The Director is the antidote to the most common AI-pair-programming failure mode: the agent re-discovers (often re-makes) the same mistake every fresh session. With the Director installed, each conversation begins by reading what previous sessions concluded, and ends by recording anything new the team learned.

---

## 1. Two pieces

### a. The Director Rule

A small, always-applied rule that every session reads. It tells the agent:

- **At session start**: read the learnings doc, then the project's always-on context (e.g., `AGENTS.md`), then the architecture reference (if one exists).
- **During the session**: capture new learnings the moment they happen — user corrections, discovered gotchas, completed-feature patterns, architectural decisions.
- **At session end** (via the [stop-hook](../../adapters/_stop-hook.md)): review the conversation and emit a learnings update if appropriate.

The IDE-agnostic source is [`RULE.md`](RULE.md) in this folder. The adapter renders it into the IDE's native rule format (Cursor `.mdc`, Claude Code rule, Codex `AGENTS.md` segment, VS Code instructions, etc.).

### b. The Learnings Document

A markdown file stored in the project's documentation folder, structured into a small fixed set of sections (Established Patterns, Anti-Patterns, User Preferences, Decision Log, Environment Notes). Each entry is short, actionable, and dated.

The seed template is [`learnings-template.md`](learnings-template.md). At install time the adapter writes a copy to the project's chosen documentation location. From then on, the agent maintains it under guidance from the Director Rule.

---

## 2. Lifecycle

### Install

The adapter, in [Phase 6 of `RUN.md`](../../RUN.md):

1. Renders [`RULE.md`](RULE.md) into the IDE-native rule path with placeholders substituted.
2. Writes [`learnings-template.md`](learnings-template.md) to the project's chosen learnings path (default `_documentation/AI_LEARNINGS.md`; the adapter respects existing conventions).
3. Wires the [stop-hook](../../adapters/_stop-hook.md) into the IDE's stop-event mechanism.
4. Records all three paths in the install marker per [`registry/install.schema.md`](../registry/install.schema.md).

If the target project already has an analogous rule and learnings doc (a frequent case for projects that bootstrapped manually), the adapter does **not** overwrite — it merges the orchestra's content non-destructively and surfaces any conflicts in the install report.

### Session start

The agent, on every fresh conversation:

1. Reads the learnings doc named by the rule.
2. Reads the project context document named by the rule (`AGENTS.md` or equivalent).
3. Reads the architecture reference if one is named.
4. Optionally reads sub-system docs based on the user's first message.

This sequence is mandatory — the rule explicitly forbids skipping the learnings read. It is the cheapest possible gain for the cost.

### During session

The rule instructs the agent to update the learnings doc when one of these triggers fires:

- The user corrects the agent's approach.
- A non-obvious bug or gotcha is discovered and resolved.
- A reusable pattern emerges from a completed feature.
- An architectural or product decision is recorded.

Updates happen **immediately** when a trigger fires, not at session end. End-of-session is for sweeping up remaining items.

### Session end

The [stop-hook](../../adapters/_stop-hook.md) fires. The agent reviews the conversation and emits a (possibly empty) update to the learnings doc. Empty is the common case and is fine.

---

## 3. What belongs in the learnings doc

A learnings doc earns its keep by being concise. The Director Rule encodes both inclusion and exclusion criteria:

**Belongs:**

- Specific, actionable insight tied to *this* project.
- A pattern that would save time if known at the start of a future session.
- A user preference that should be respected going forward.
- A decision and its rationale, where future-self might second-guess the choice.

**Does not belong:**

- Content already covered by the always-on project context, the architecture reference, or an active rule.
- Temporary debugging notes for a one-off bug with no reuse value.
- Generic coding advice ("use descriptive variable names").
- Praise, celebration, or social commentary.

---

## 4. Document health

A learnings doc that grows unbounded becomes wallpaper. The Director Rule encodes a soft size budget (target `~300 lines`; trigger consolidation pass beyond that). The pre-release skill ([`pre-release/SKILL.md`](../skills/audit/pre-release/SKILL.md)) and the audit skill ([`ai-infra-audit/SKILL.md`](../skills/audit/ai-infra-audit/SKILL.md)) both check for stale or contradictory entries and propose consolidation.

Consolidation rules:

- Older entries that are now part of the project's standard practice get folded into the project context document and removed from learnings.
- Contradictory entries are reconciled — the agent surfaces the contradiction, the team picks the right one, the wrong one is deleted.
- Entries with no project relevance after six months are removed during consolidation passes.

---

## 5. How the Director relates to other orchestra components

| Component | Relationship |
|-----------|--------------|
| Roles | The Director is role-agnostic. Every role's skills can read the learnings doc; the rule does not change per role. |
| Skills | Skills *consume* learnings (some explicitly recommend a learnings update on completion). They do not own the doc. |
| Stop-hook | The Director's session-end behaviour is delivered through the stop-hook contract; without the hook the rule still works (manual updates), but discipline drops. |
| Audit skill | [`ai-infra-audit/SKILL.md`](../skills/audit/ai-infra-audit/SKILL.md) verifies the rule and learnings doc are present, well-formed, and within size budget. |
| Scheduler | A v2 scheduler runner can periodically consolidate the learnings doc per the [scheduler contract](../scheduler/CONTRACT.md). |
| Notifications | Major Director events (e.g., consolidation triggered, learnings doc breached size budget) emit through the [notifications contract](../notifications/CONTRACT.md). |

---

## 6. Per-IDE notes

The Director rule is rendered into IDE-native rule formats by adapters (PR 4–5). Each adapter declares:

- Where the rule lives (`.cursor/rules/ai-director.mdc`, `.claude/rules/`, etc.).
- Whether the IDE supports always-on rules (Cursor: yes; others: simulated via `AGENTS.md`-style consolidated context).
- How the stop-hook is wired (Cursor `hooks.json`, Claude Code session-end command, etc.).

Where an IDE lacks a stop-hook mechanism in v1, the orchestra installs the rule and the doc anyway, and surfaces a recommendation in the post-install report that the team manually invoke "update learnings" at session end.

---

## 7. References

- [`RULE.md`](RULE.md) — IDE-agnostic Director rule template.
- [`learnings-template.md`](learnings-template.md) — seed learnings document template.
- [`../../adapters/_stop-hook.md`](../../adapters/_stop-hook.md) — stop-hook contract.
- [`../scheduler/CONTRACT.md`](../scheduler/CONTRACT.md) — scheduler contract for periodic Director-side jobs.
- [`../notifications/CONTRACT.md`](../notifications/CONTRACT.md) — notifications contract for Director events.
- [`../skills/audit/ai-infra-audit/SKILL.md`](../skills/audit/ai-infra-audit/SKILL.md) — audit that verifies the Director system stays healthy.
- [`../registry/install.schema.md`](../registry/install.schema.md) — install marker that records Director paths.

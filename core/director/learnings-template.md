# Learnings template — AI_LEARNINGS

> This file is the **seed template** that the adapter writes into the target project at install time. The default destination is `_documentation/AI_LEARNINGS.md` (override via the install plan in Phase 5 of [`RUN.md`](../../RUN.md)).
>
> Once installed, the file becomes a *living document*. The Director Rule ([`RULE.md`](RULE.md)) instructs the agent how to read and update it. The orchestra's audit ([`../skills/audit/ai-infra-audit/SKILL.md`](../skills/audit/ai-infra-audit/SKILL.md)) verifies the file remains well-formed and within the size budget.
>
> **Adapter behaviour at install time:**
> - Substitute `{{PROJECT_NAME}}` in the document title with the project's name.
> - Substitute `{{INSTALL_DATE}}` in the header table.
> - Leave the rest verbatim. The seed entries below are intentionally generic so the agent can populate the doc from real session activity rather than starting empty.
> - If the target file already exists, the adapter does **not** overwrite — it surfaces the existing file and asks before merging seed sections that are missing.

---

## Rendered template begins below

```markdown
# {{PROJECT_NAME}} — AI Learnings

> Living context inherited by every AI session in this project. Maintained by the agent under the Director Rule. Read at session start; updated when learnings emerge during a session.

| Property | Value |
|----------|-------|
| Created | {{INSTALL_DATE}} |
| Last updated | {{INSTALL_DATE}} |
| Maintained by | AI agent (Director Rule), with human oversight |
| Size budget | ~300 lines (consolidate beyond this) |

---

## How this document works

- **Read at session start** — every fresh conversation begins by reading this file (per the Director Rule).
- **Updated during sessions** — when a learning emerges (user correction, gotcha, decision), it is written here immediately.
- **Reviewed at session end** — if a stop-hook is wired, it sweeps for anything missed.
- **Audited periodically** — the `ai-infra-audit` skill verifies structure and budget.

What belongs here, and what does NOT belong here, is described in the Director Rule. Read it before adding entries.

---

## Established patterns

> Small, project-specific patterns that the team has settled on. Each entry: context (where it applies) → pattern (the thing to do) → optional code or path reference.

_No entries yet. The first one will land when a pattern is settled in practice._

<!-- Example shape (delete this comment block when first real entry lands):
### Pattern name (one line)

- **Context:** Where this applies in the project.
- **Pattern:** What to do (one sentence).
- **Why:** One sentence. Not "because best practice" — the actual reason for this project.
- **Reference:** `path/to/file.ext` or commit / PR if relevant.
-->

---

## Anti-patterns

> Things the team has tried, found broken, and explicitly does not do anymore. Documenting these saves the next session from re-running the experiment.

_No entries yet._

<!-- Example shape:
### Anti-pattern name (one line)

- **What looks tempting:** The thing the agent or contributor would naturally try.
- **Why it breaks:** What actually goes wrong.
- **Do this instead:** Pointer to the right pattern (often an entry in **Established patterns** above).
-->

---

## User preferences

> Conventions, opinions, or trade-offs the user has stated and wants respected. These often span multiple sessions and should not be re-litigated each time.

_No entries yet._

<!-- Example shape:
- **Preference:** "Prefer X over Y for Z."
- **Stated on:** YYYY-MM-DD.
- **Scope:** When this applies (always / specific subsystem / specific file types).
-->

---

## Decision log

> Architectural or product decisions made during sessions, with their rationale. Lightweight ADRs that did not warrant a full decision-log entry in the project's main ADR folder.

_No entries yet._

<!-- Example shape:
### YYYY-MM-DD — Decision title

- **Context:** What problem prompted the decision.
- **Decision:** One or two sentences. The actual choice.
- **Alternatives considered:** Bullet list, one line each.
- **Consequences:** What gets easier, what gets harder.
- **Status:** accepted / superseded by [later entry] / deprecated.
-->

---

## Environment notes

> Local-environment quirks the team keeps tripping over (OS, shell, tool versions, network constraints, IDE-specific behaviours). Distinct from generic setup docs — these are the things that bit *us*.

_No entries yet._

<!-- Example shape:
- **Quirk:** Short description.
- **Symptoms:** What it looks like when it happens.
- **Workaround / fix:** What we do.
-->

---

## Consolidation log

> Audit trail of consolidation passes. Helps reconstruct the doc's history after large reorganisations.

_No consolidations yet._

<!-- Example shape:
- **YYYY-MM-DD** — Consolidated N entries from **Established patterns** into the project context document; dropped M stale items.
-->

```

(Rendered template ends.)

---

## Why each section exists

| Section | What it captures | Frequency expected |
|---------|------------------|--------------------|
| Established patterns | Conventions emerging from real work. | Most-frequent additions. |
| Anti-patterns | Prevention learning from failed attempts. | Less frequent, high value. |
| User preferences | Recurring user opinions worth honouring. | Slow accumulation, long-lived. |
| Decision log | Lightweight ADRs from sessions. | Spiky — clusters when designing. |
| Environment notes | Local / tooling pain points. | Slow accumulation. |
| Consolidation log | Audit trail of cleanup passes. | Rare; one entry per consolidation. |

If a learning genuinely fits none of these, the Director Rule allows adding a new section. The audit skill will surface the new section as a soft warning so the team can decide whether it should harden into a permanent section or fold back into an existing one.

---

## What this template deliberately leaves empty

The seed has **no example entries** — the file ships with placeholder commented examples instead. The reasoning:

- A pre-populated learning that is not real for this project is misleading and tends to survive forever.
- Empty sections invite the agent to add the *first real* learning the moment it emerges, rather than mimicking a placeholder.
- Audit checks accept empty sections; they only flag malformed structure.

---

## References

- [`_overview.md`](_overview.md) — Director system overview.
- [`RULE.md`](RULE.md) — the rule that maintains this document.
- [`../../adapters/_stop-hook.md`](../../adapters/_stop-hook.md) — stop-hook that triggers session-end review.
- [`../skills/audit/ai-infra-audit/SKILL.md`](../skills/audit/ai-infra-audit/SKILL.md) — audit that verifies the doc.
- [`../skills/docs/decision-log/SKILL.md`](../skills/docs/decision-log/SKILL.md) — heavier ADR skill for decisions that outgrow the lightweight log here.

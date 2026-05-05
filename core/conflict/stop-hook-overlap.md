# stop-hook-overlap.md — Detecting and Resolving Stop-Hook Conceptual Overlap

> Universal contract for detecting when an existing project stop hook overlaps with the orchestra's stop hook (both target the same learnings document) and resolving the overlap interactively in Phase 6 of [RUN.md](../../RUN.md).

This file is the authoritative spec for finding **F4** from the v1.x backlog. It is consumed by [`core/discovery/existing-infra.md`](../discovery/existing-infra.md) §3.11 (detection), every [`adapters/<ide>/mappings.md`](../../adapters/) §5 (overlap branch in the merge logic), [`core/registry/install.schema.md`](../registry/install.schema.md) §1.2 (recording the decision), and every [`adapters/<ide>/post-install-checks.md`](../../adapters/) (verifying the choice).

Introduced in v1.2.0.

---

## 1. Why this matters

The orchestra ships a stop hook that asks the agent to scan the conversation for new learnings and update `_documentation/AI_LEARNINGS.md`. A surprisingly large share of host projects already have a stop hook that does the same thing — sometimes targeting the same file. The pre-v1.2.0 merge logic preserved both hooks (correct — no overwrite) but produced silent duplicate work: **two passes over the same conversation, two competing edits to the same file, on every session end**. This eroded user trust on the second run.

v1.2.0 detects the overlap before the merge happens and asks the user how to resolve it.

---

## 2. Overlap detection

The detector runs during Phase 3 (existing-infra inventory). It runs once per IDE per project — when an existing stop hook is found in the IDE's hook config (`.cursor/hooks.json`, `.claude/settings.json`, etc.), the detector inspects each entry under `hooks.stop` (or the IDE-equivalent event) and applies these checks:

| Check | What it inspects | Signals overlap when |
|---|---|---|
| **C1 — Tagged orchestra entry** | `metadata.orchestra === true` (or any IDE-equivalent dedup field set by a previous orchestra install). | False — a tagged entry is the orchestra's own previous install, not a third-party hook. |
| **C2 — Path co-reference** | The hook's prompt body (case-insensitive substring scan, capped at first 4 KB). | The body references the orchestra's resolved learnings path (per [`adapters/<ide>/mappings.md`](../../adapters/) §4), or any path matching `**/AI_LEARNINGS.md`, `**/learnings.md`, `**/AI_LEARNINGS.txt`, or the file name configured via `learnings.path` in an existing install marker. |
| **C3 — Verb co-reference** | The hook's prompt body. | The body contains any of the case-insensitive phrases `update learnings`, `learning(s) doc`, `update the learnings`, `append to learnings`, `record what you learned`, `capture learnings`. (Tunable via the linter — see [`core/_lint.md`](../_lint.md).) |
| **C4 — Type-prompt with no path** | The hook's `type === "prompt"` and no path co-reference. | Treated as **probable overlap** when both C3 fires AND the orchestra's resolved learnings path exists in the project (it's likely the project hook would target it on the next fire even if the path isn't currently embedded). |

An entry is classified `overlap` when C1 is false AND (C2 fires OR (C3 AND C4 fire together)). Otherwise it is classified `independent` and processed by the normal merge logic without any new prompt to the user.

Detection output is appended to the inventory as:

```json
"existingInfra": {
  "stopHookOverlap": {
    "detected": true,
    "ide": "cursor",
    "configPath": ".cursor/hooks.json",
    "overlappingEntries": [
      {
        "index": 0,
        "type": "prompt",
        "matchedSignals": ["C2", "C3"],
        "evidenceSnippet": "...update _documentation/AI_LEARNINGS.md with any new learnings..."
      }
    ]
  }
}
```

When `detected` is `false` the field may be omitted entirely. When `detected` is `true` the install plan MUST surface the overlap as described in §3.

---

## 3. Resolution flow (Phase 6 question form)

When `existingInfra.stopHookOverlap.detected` is `true`, the install plan adds an open question to Phase 6 of [RUN.md](../../RUN.md). The agent presents the user with **three explicit choices**, no default. Until the user replies, the merge logic does not run.

The question form (rendered into the install plan per [`core/install-plan-template.md`](../install-plan-template.md) §4 — new sub-question `§4.5 Stop-hook overlap` slotted between scope/ownership/quality and placement):

```
Your project already has a stop hook that updates a learnings file:

  Path:   <ide hook config path>
  Index:  <entry index>
  Snippet: <first 200 chars of hook prompt body>

The orchestra's stop hook would also update <orchestra learnings path> on every
session end. Running both means every session would scan the conversation
twice and produce two (possibly contradictory) edits.

How would you like to resolve this?

  (a) skip-orchestra      Skip the orchestra hook. Your existing project hook
                          continues to update the file.
  (b) replace-with-orchestra
                          Replace your project hook with the orchestra hook.
                          The project hook entry is removed.
  (c) adopt-existing      Tag your existing project hook with metadata.orchestra
                          = true and adopt it as the orchestra's entry going
                          forward. The orchestra never installs its own hook
                          for this project; future audits treat the existing
                          hook as the orchestra-managed entry.
```

Recommended default in the prompt copy: `(a) skip-orchestra` (most conservative — preserves user's existing automation untouched). The agent SHOULD note the recommendation in the rendered question but MUST require the user to type one of `a`, `b`, `c`, the corresponding key, or `abort`. No silent default.

If the user replies `abort`, Phase 6 surfaces it as an aborted install per [RUN.md](../../RUN.md) §6.

---

## 4. Adapter behaviour per choice

| User choice | What the adapter does |
|---|---|
| `(a) skip-orchestra` | Do **not** write the orchestra stop-hook entry to the IDE's hook config. Record `installScope.stopHookOverlapResolution = "skip-orchestra"` (see §5). The post-install report's stop-hook row reads `skipped (project hook owns this file)`. |
| `(b) replace-with-orchestra` | Remove the matched project hook entry from the IDE's hook config. Write the orchestra stop-hook entry as the sole `hooks.stop` entry. Record `installScope.stopHookOverlapResolution = "replace-with-orchestra"` plus `replacedEntryEvidence` (a one-line summary of what was removed) for audit traceability. |
| `(c) adopt-existing` | Add `metadata.orchestra: true` (or the IDE-equivalent tag — see [`adapters/_stop-hook.md`](../../adapters/_stop-hook.md) §5) to the matched project hook entry. Do **not** write the orchestra's own entry. Record `installScope.stopHookOverlapResolution = "adopt-existing"` plus `adoptedEntryDigest` (an SHA-256 hex of the matched entry's prompt body, used by audits to detect if the user later edits the entry). |

In all three cases, the adapter writes a `history[]` entry on the install marker with the `summary` reflecting the choice. The summary phrase is one of `skipped orchestra hook (project hook preserved)`, `replaced project hook with orchestra hook`, or `adopted existing project hook (tagged metadata.orchestra=true)`.

---

## 5. Install marker fields

The orchestra extends `installScope` (per [`core/install-scope.md`](../install-scope.md)) with the resolution. Even though stop-hook overlap is technically a conflict-handling decision rather than a scope decision, it lives under `installScope` for marker locality (the `installScope` object is the canonical home for all "decisions made during install").

```json
"installScope": {
  "...": "(existing fields preserved unchanged)",

  "stopHookOverlapResolution": {
    "value": "skip-orchestra" | "replace-with-orchestra" | "adopt-existing" | null,
    "detectedAt": "<ISO 8601>",
    "decidedAt": "<ISO 8601>",
    "decidedBy": "user" | "default-no-overlap",
    "evidence": {
      "configPath": ".cursor/hooks.json",
      "entryIndex": 0,
      "matchedSignals": ["C2", "C3"]
    },

    "replacedEntryEvidence": "Hook updated _documentation/AI_LEARNINGS.md (~180 chars prompt).",
    "adoptedEntryDigest": "sha256:abc123..."
  }
}
```

Field rules:

- When detection found no overlap, `stopHookOverlapResolution.value` is `null`, `decidedBy` is `"default-no-overlap"`, and the `evidence` / `replacedEntryEvidence` / `adoptedEntryDigest` fields are absent or null. The field MUST still be present on the marker so audits can distinguish "no overlap detected" from "field not yet implemented" (i.e., a v1.0/v1.1 marker).
- When detection found overlap and the user chose, `decidedBy` is `"user"` and exactly one of `replacedEntryEvidence` / `adoptedEntryDigest` is populated (matching the choice). When `value` is `"skip-orchestra"`, neither is populated.
- The field is **additive**. Markers without `installScope.stopHookOverlapResolution` (v1.0 / v1.1 markers) are valid and treated as `value: null`, `decidedBy: "default-no-overlap"`. The audit migrates them on first run by re-running detection and writing the field.

---

## 6. Audit behaviour

The audit (per [`core/skills/audit/ai-infra-audit/SKILL.md`](../skills/audit/ai-infra-audit/SKILL.md)) re-runs the overlap detection on every audit invocation and compares the result against the recorded resolution:

| Recorded | Currently detects | Audit action |
|---|---|---|
| `null` (no overlap recorded) | No overlap | No change. |
| `null` (no overlap recorded) | Overlap | `warning` — surface the new overlap; offer the same three-choice question form on next install / upgrade. |
| `skip-orchestra` | Overlap still present | No change (the user's choice is honoured). |
| `skip-orchestra` | Overlap gone (project hook removed by user) | `info` — propose offering to install the orchestra hook on next upgrade. |
| `replace-with-orchestra` | Project re-added a project hook with overlap signals | `warning` — the user (or another tool) re-introduced an overlapping hook. Surface and offer a re-decision. |
| `adopt-existing` | The adopted entry's prompt-body SHA-256 changed (`adoptedEntryDigest` mismatch) | `warning` — the adopted hook drifted; surface the change and ask whether to re-adopt the new content or revert to the orchestra default. |
| `adopt-existing` | The adopted entry was removed from the project's hook config | `error` — the orchestra is now relying on a hook that no longer exists. Offer to re-install the orchestra's hook and downgrade the resolution. |

All audit findings are written to the install marker's `history[]` and surfaced in the audit report.

---

## 7. References

- [`core/discovery/existing-infra.md`](../discovery/existing-infra.md) §3.11 — detection phase output schema.
- [`core/install-plan-template.md`](../install-plan-template.md) §4 — the Phase 6 question form set, into which the new `§4.5 Stop-hook overlap` slot is added.
- [`core/registry/install.schema.md`](../registry/install.schema.md) §1.2 — `installScope.stopHookOverlapResolution` field definition.
- [`adapters/cursor/mappings.md`](../../adapters/cursor/mappings.md) §5 — Cursor-specific overlap branch in the `.cursor/hooks.json` merge logic.
- [`adapters/claude-code/mappings.md`](../../adapters/claude-code/mappings.md) §5 — Claude Code overlap branch.
- [`adapters/codex/mappings.md`](../../adapters/codex/mappings.md) §5 — Codex overlap branch (Codex has no native session-end hook in v1; the resolution applies to whatever fallback the user adopted).
- [`adapters/vscode/mappings.md`](../../adapters/vscode/mappings.md) §5 — VS Code overlap branch (same gap caveat as Codex).
- [`adapters/_stop-hook.md`](../../adapters/_stop-hook.md) — universal stop-hook contract; the orchestra's hook entry shape; the dedup tag.
- [`adapters/<ide>/post-install-checks.md`](../../adapters/) — each adapter's post-install verification of the chosen resolution.
- [`_v1.x-backlog.md`](../../_v1.x-backlog.md) — F4 entry; moved to "Shipped" when v1.2.0 ships.

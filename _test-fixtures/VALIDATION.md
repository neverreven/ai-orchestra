# VALIDATION.md — Agent-driven validation procedure

> **You are an AI agent.** A user asked you to "validate the orchestra" or "run the validation harness". This file tells you what to do, step by step. Follow it from top to bottom, exactly. The procedure is identical regardless of IDE.

The validation harness has no runtime — it is a sequence of agent-executable steps that produce a structured report. Your output is the validation result.

---

## 0. Prerequisites

Before you start:

1. The `ai-orchestra/` folder must be present in the working directory.
2. You have the ability to read files in `ai-orchestra/` and the fixture directories.
3. You can produce a markdown report in chat (or write it to a temporary file if your IDE supports persistent artifacts).
4. You will NOT modify any file in any fixture during validation. The harness is read-only.
5. You will NOT modify the orchestra core during validation.

If any prerequisite fails, stop and report.

---

## 1. Phase 1 — Enumerate fixtures

List every immediate subdirectory of `_test-fixtures/` (excluding files starting with `_`). Each subdirectory is one fixture.

In v1, the expected list is:

- `empty-js/`
- `ongoing-python-web/`
- `salesforce-cartridge/`

If the list differs from the v1 expected set, note it but continue — additional fixtures may have been added in v1.x.

For each fixture, read its `README.md` and `EXPECTED.md`. The `EXPECTED.md` is the contract you will compare your produced plan against.

---

## 2. Phase 2 — Per-fixture dry-run

For each fixture in turn, perform the following sub-steps **as if the fixture directory were the working project root**. The orchestra core remains at `../../` relative to the fixture.

### 2.1 Detect the IDE

Per [`../RUN.md`](../RUN.md) Phase 1. Record the detected IDE.

For validation purposes, **all four adapters must produce a sensible plan** for each fixture, even though a single agent run only covers one IDE. If you only have access to one IDE, validate that one and note the others as deferred.

### 2.2 Run the discovery probe

Per [`../RUN.md`](../RUN.md) Phase 2 and [`../core/discovery/DETECTION.md`](../core/discovery/DETECTION.md). The probe operates on the **fixture directory**, not the surrounding host project.

Capture:

- Detected stacks and confidence scores.
- Detected frameworks per stack.
- Test framework signals.
- Existing-infra inventory (per [`../RUN.md`](../RUN.md) Phase 3).

### 2.3 Compare detection to `EXPECTED.md`

Open the fixture's `EXPECTED.md` and compare. Record the comparison as one of:

- `match` — every expected detection appeared with confidence at or above the expected threshold; no unexpected detections.
- `superset` — every expected detection appeared, plus extras. Acceptable if extras are reasonable (e.g., a weak signal also fires); record the extras for review.
- `subset` — at least one expected detection is missing. **Validation failure** — record details.
- `mismatch` — at least one expected detection has wrong confidence, framework list, or sub-flavour. **Validation failure**.

### 2.4 Build the install plan

Per [`../RUN.md`](../RUN.md) Phase 5. Use the detected IDE's adapter (`adapters/<ide>/`).

Produce the dry-run diff in the standard plan format described in [`../RUN.md`](../RUN.md) §5. Each plan entry has `path`, `action`, `source`, `rationale`, `conflict` (if any).

### 2.5 Compare plan to `EXPECTED.md`

The fixture's `EXPECTED.md` declares the expected plan summary — not necessarily byte-for-byte (the diff would be impractical to maintain by hand), but the **shape and key entries**:

- The expected list of `action: create` entries (file paths only — content is not compared, that's what the adapter render-rules cover).
- The expected list of `action: extend-section` / `append` / `suffix-rename` entries.
- The expected `stacks[]` entries in the registry marker (id, stackPack, frameworks).
- The expected MCP slot ids registered.
- The expected adapter gaps surfaced (e.g., Codex's stop-hook gap).

Record the plan comparison as `match` / `superset` / `subset` / `mismatch` per the same scheme as 2.3.

### 2.6 Idempotency check (synthetic)

Without applying the plan, **simulate** what a second `RUN.md` invocation would produce:

- The marker is presumed present (since this is a synthetic re-run, you imagine the first install completed).
- Most plan entries should switch from `create` to `skip` because the rendered content is byte-identical.
- The expected synthetic re-run plan is described in `EXPECTED.md` under "idempotency."

Compare the synthetic re-run plan to the expected and record `match` / `mismatch`.

### 2.7 Honesty audit

Verify:

- Every adapter gap declared in the adapter's `INSTALL.md` and applicable to this fixture appears in the plan with `action: skip-with-gap`.
- Below-threshold detections (if any) appear as open questions in the plan.
- No silent downgrades: if a feature can't be installed, the plan says so.

Record any honesty failures.

---

## 3. Phase 3 — Aggregate report

After processing every fixture, produce a single markdown report with the structure:

```
# Validation report — orchestra v<VERSION>

Date: <YYYY-MM-DD>
IDE used: <Cursor / Claude Code / Codex / VS Code>
Validator: <agent name / model>

## Summary

| Fixture | Detection | Plan | Idempotency | Honesty | Result |
|---------|-----------|------|-------------|---------|--------|
| empty-js | match | match | match | match | PASS |
| ongoing-python-web | match | match | match | match | PASS |
| salesforce-cartridge | superset | match | match | match | PASS-with-notes |

## Per-fixture details

### empty-js
... (detection results, plan summary, idempotency, honesty, any deviations)

### ongoing-python-web
...

### salesforce-cartridge
...

## Aggregate notes

- <Any cross-fixture observations>
- <Adapter-specific quirks observed>
- <Suggestions for v1.x fixture refinements>

## Verdict

<one of: PASS / PASS-WITH-NOTES / FAIL>
```

A fixture's `Result` is:

- `PASS` — all four columns are `match`.
- `PASS-with-notes` — at least one column is `superset` (acceptable extras).
- `FAIL` — any column is `subset` or `mismatch`.

The aggregate verdict is:

- `PASS` — every fixture is PASS.
- `PASS-WITH-NOTES` — at least one fixture is PASS-with-notes; none are FAIL.
- `FAIL` — at least one fixture is FAIL.

---

## 4. Phase 4 — Output

Present the report to the user. If the verdict is FAIL, also produce a focused triage section: which orchestra files (in `core/`, `adapters/`, `_test-fixtures/<fixture>/EXPECTED.md`) need attention to make the failing comparison match.

If the verdict is PASS, the orchestra is in healthy state for the IDE you validated.

---

## 5. What you must NOT do

- **Do not write any file in any fixture.** The harness is read-only against fixtures.
- **Do not write any file in `ai-orchestra/core/` or `ai-orchestra/adapters/`.** Those are read-only during validation.
- **Do not modify the host project's source code.** Validation produces a markdown report only.
- **Do not actually apply the install plan to any fixture.** The plan is dry-run only; you stop after producing it.
- **Do not skip the idempotency or honesty checks.** They are the most likely sources of subtle regressions and the cheapest signals.

If you cannot complete a phase, **stop and report**. Do not improvise.

---

## 6. Maintaining `EXPECTED.md` files

When the orchestra core changes (new role, new skill, new stack pack, new adapter behaviour), the fixture `EXPECTED.md` files may need updating to match. The audit skill ([`../core/skills/audit/ai-infra-audit/SKILL.md`](../core/skills/audit/ai-infra-audit/SKILL.md)) is the recommended owner of detecting drift between core and `EXPECTED.md`. v1 does not automate this — drift is caught the next time the harness runs.

When updating `EXPECTED.md`, prefer surgical changes:

- Add new expected entries when a new capability lands.
- Remove obsolete entries when a capability is retired.
- Never change the fixture source files solely to make `EXPECTED.md` simpler — that defeats the purpose of having a representative fixture.

---

## 7. References

- [`_overview.md`](_overview.md) — what fixtures are and the v1 fixture set.
- [`../RUN.md`](../RUN.md) — orchestra bootstrap procedure that the harness exercises.
- [`../core/discovery/DETECTION.md`](../core/discovery/DETECTION.md) — discovery probe specification.
- [`../core/skills/audit/ai-infra-audit/SKILL.md`](../core/skills/audit/ai-infra-audit/SKILL.md) — audit skill (recommended owner of drift detection between core and `EXPECTED.md`).
- [`../adapters/cursor/post-install-checks.md`](../adapters/cursor/post-install-checks.md) — example of post-install verification (the validation harness reuses similar check patterns).
- [`../CHANGELOG.md`](../CHANGELOG.md) — orchestra changelog; `EXPECTED.md` updates land here.

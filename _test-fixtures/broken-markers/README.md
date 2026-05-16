# Fixture `broken-markers` — adversarial metadata

> Tests the orchestra's conflict-handling and error-surfacing behaviour when it encounters malformed or corrupted managed-section markers in pre-existing project files.

---

## What this fixture tests

1. **Malformed start marker** (`CLAUDE.md`) — start marker present but unclosed (no corresponding end marker). The orchestra must detect this as a critical conflict and surface it to the user without auto-repairing.
2. **Nested markers** (`AGENTS.md`) — a start marker appears *inside* another start/end block. The orchestra must detect the nesting and surface a critical conflict.
3. **Transposed markers** (`.github/copilot-instructions.md`) — the end marker appears *before* the start marker. The orchestra must detect the transposition and surface a critical conflict.
4. **Correct fallthrough** — despite the three conflicting files, the orchestra must still produce a valid `create`-only plan for all artifacts that do NOT conflict (new rule files, skill files, etc.) and surface only the conflicting files as critical blocks.

---

## Source project shape

Minimal Python/FastAPI project to trigger `python-web` detection. Three pre-existing agentic files with deliberate marker corruption.

---

## Stack

`python-web` (FastAPI). Single stack, no polyglot overlay.

---

## What makes this adversarial

The three malformed-marker scenarios cover the most dangerous class of `extend-section` conflicts — cases where the adapter could silently corrupt user-owned content if it does not validate marker syntax before writing. This fixture proves the orchestra checks first, blocks, and surfaces a clear error rather than writing into an ambiguous or transposed range.

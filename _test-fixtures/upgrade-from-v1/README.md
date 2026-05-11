# Fixture `upgrade-from-v1` — upgrade from an older install

> Tests the orchestra's upgrade path when it detects a pre-existing install marker from an older version (v1.0.0) and must upgrade to the current version.

---

## What this fixture tests

1. **Version delta detection** — the existing `.ai-orchestra/install.json` has `orchestraVersion: "1.0.0"`. The current orchestra core version is higher. The adapter must detect the version mismatch and enter upgrade mode (Phase 7 re-run).

2. **Additive upgrade** — new skills added after v1.0.0 (e.g., `ai-infra-audit`) do not exist in the project. The adapter must add them with `create` actions.

3. **Stale skill update** — existing skill files that are present but whose content differs from the current source (simulated by a fixture skill file with outdated content) must be proposed for update with `action: propose` (not silently overwritten).

4. **Schema migration** — the v1.0.0 marker lacks the `subProjects`, `installedPackRules`, `skippedPackRules`, and `scheduler` fields. The upgrade must add these fields with appropriate defaults, preserving all existing fields.

5. **Global registry update** — after upgrade, the global registry entry for this project must reflect the new `orchestraVersion` and `lastSeenAt`.

6. **History append** — the `history[]` array in the marker must gain exactly one entry for this upgrade run (not replace the existing entries).

7. **Idempotency after upgrade** — a synthetic re-run after the upgrade completes must produce zero non-skip actions.

---

## Source project shape

Minimal React + TypeScript project (`js-ts` stack). Pre-existing v1.0.0 orchestra install with:
- `AGENTS.md` with valid managed-section markers from the older install.
- `.cursor/rules/orchestra-*.mdc` files from the older install (some stale).
- `.cursor/skills/cleanup/SKILL.md` from the older install (stale content — missing new §5 Output section added in v1.1.0).
- `.ai-orchestra/install.json` from the older install (v1.0.0 schema).
- `_documentation/AI_LEARNINGS.md` with user-added entries (must be preserved).

---

## What makes this adversarial

Upgrades are the most dangerous path — they touch existing files. This fixture proves the orchestra differentiates between stale-but-replaceable orchestra-owned files (safe to `create` / propose) and user-edited content (safe to `skip` or `propose` but never silent overwrite). It also validates schema migration of the install marker, which is a non-obvious correctness requirement.

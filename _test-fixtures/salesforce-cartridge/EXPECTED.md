# Fixture `salesforce-cartridge` — expected outcome

Contract for the [validation harness](../VALIDATION.md). The orchestra dry-run plan against this fixture must satisfy the criteria below.

The defining behaviour for this fixture: **multi-sub-flavour Salesforce detection.** The same project is simultaneously sfdx (Apex + LWC) and SFRA (Commerce Cloud B2C). The stack pack ships rules for both — Apex, LWC, SFRA, sfdx — and the install plan must include all four.

---

## 1. Expected detection

### Stack profile

| Stack id | Confidence | Notes |
|----------|------------|-------|
| `salesforce` | ≥ 0.85 | Multiple strong signals: `sfdx-project.json` + `force-app/` + `cartridges/`. Total weight ≥ 9 (very high). |

### Sub-projects

`profile.subProjects` must be an **empty array**. This fixture has no sub-directories with manifest files (`cartridges/` and `force-app/` contain source code, not package manifests at their root).

No other stacks should detect at first-class confidence:

- **`js-ts`:** the cartridges contain `.js` files, but they are inside `cartridges/<cartridge>/cartridge/...` paths. The discovery probe attributes these to SFRA, not generic JS/TS, because there is no project-root `package.json`. Validation MUST confirm `js-ts` confidence is below threshold (< 0.6) for this fixture.
- **No** Python, Go, Rust, .NET, mobile detections.

### Sub-flavours

`profile.frameworks` for the `salesforce` stack must include all of:

- `salesforce-sfdx` — from `sfdx-project.json` + `force-app/main/default/classes/` + `force-app/main/default/lwc/`.
- `salesforce-sfra` — from `cartridges/int_my_storefront/` + the `.isml` template.

Must NOT include:

- `salesforce-pwa-kit` — no `@salesforce/pwa-kit-*` package, no PWA Kit signals in this fixture.

### Test frameworks

`profile.testFrameworks` must be **empty** — no `*.cls` with `@isTest` annotation, no LWC Jest config, no jest dev-deps.

### Existing-infra inventory

Per [`../../core/discovery/existing-infra.md`](../../core/discovery/existing-infra.md), all of the following must be empty / absent:

- Existing `AGENTS.md` / `CLAUDE.md`.
- Existing `.cursor/rules/` directory.
- Existing `.claude/`, `.codex/` directories.
- Existing `.github/copilot-instructions.md`.
- Existing `.ai-orchestra/install.json`.
- Existing learnings document.
- Existing MCP configuration.

---

## 2. Expected install plan

### Universal core (action: `create`)

Same set as in [`../empty-js/EXPECTED.md`](../empty-js/EXPECTED.md) §2 — universal core for the detected adapter, e.g., for Cursor:

- `.cursor/rules/orchestra-context.mdc`
- `.cursor/rules/orchestra-director.mdc`
- `_documentation/AI_LEARNINGS.md`
- `AGENTS.md` (action: `create` since none pre-exists)
- `.cursor/skills/<category>/<skill-id>/SKILL.md` × 30
- `.cursor/hooks.json`
- `.cursor/mcp.json`
- `.ai-orchestra/install.json`

### Stack pack layer (salesforce)

For Cursor, expected pack-derived rule files. All four rules pass the v1.3.0 glob filter because the fixture contains files that match each rule's globs:

| Path | Source | Activation glob |
|------|--------|-----------------|
| `.cursor/rules/salesforce-apex.mdc` | rendered from [`../../core/stack-packs/salesforce/rules/apex.md`](../../core/stack-packs/salesforce/rules/apex.md) | `**/*.cls`, `**/*.trigger`, `**/*.cls-meta.xml`, `**/*.trigger-meta.xml` |
| `.cursor/rules/salesforce-lwc.mdc` | rendered from [`../../core/stack-packs/salesforce/rules/lwc.md`](../../core/stack-packs/salesforce/rules/lwc.md) | `**/lwc/**/*.{js,html,css,xml}` |
| `.cursor/rules/salesforce-sfra.mdc` | rendered from [`../../core/stack-packs/salesforce/rules/sfra.md`](../../core/stack-packs/salesforce/rules/sfra.md) | `cartridges/**/*.{js,isml,json}`, `cartridge.properties` |
| `.cursor/rules/salesforce-sfdx.mdc` | rendered from [`../../core/stack-packs/salesforce/rules/sfdx.md`](../../core/stack-packs/salesforce/rules/sfdx.md) | `sfdx-project.json`, `force-app/**/*`, `package.xml`, `.forceignore` |
| `.cursor/rules/salesforce-skills-addenda.mdc` | rendered from [`../../core/stack-packs/salesforce/skills.md`](../../core/stack-packs/salesforce/skills.md) | manual-trigger |

The pack's `roles.md` content is appended into the `AGENTS.md` managed section under a `### Stack roles addenda` subsection.

### Conflict actions

**None.** Same as the `empty-js` fixture — no existing infra, no conflicts. Every action is `create`.

### Adapter gaps

Same as `empty-js`: zero for Cursor; declared gaps surfaced for Claude Code / Codex / VS Code (notably Codex stop-hook).

### Registry marker

`stacks[]` must contain exactly one entry, with the multi-sub-flavour framework list:

```json
{
  "id": "salesforce",
  "stackPack": "core/stack-packs/salesforce",
  "stackPackVersion": "1.0.0-alpha",
  "frameworks": ["salesforce-sfdx", "salesforce-sfra"],
  "installedPackRules": ["rules/apex.md", "rules/lwc.md", "rules/sfra.md", "rules/sfdx.md"],
  "skippedPackRules": []
}
```

`subProjects` must be present as `"subProjects": []`.

`hooks.stop` must be populated with `contractVersion: "1.0"` and `lastRun: null`.

`history[]` must contain one entry — the install run.

### MCP slots

Standard v1 default slot registrations. The salesforce pack does not add stack-specific MCP slots in v1.

---

## 3. Idempotency expectation

A synthetic second run must produce a plan where every entry from §2 becomes `skip` except the registry's `history[]` extension. Same shape as the other fixtures.

The most subtle re-run check for this fixture: the multi-sub-flavour `frameworks` array in the marker must serialise stably (sorted: `["salesforce-sfdx", "salesforce-sfra"]` vs. `["salesforce-sfra", "salesforce-sfdx"]`). The validator confirms order is deterministic.

---

## 4. Honesty expectations

- No silent skips.
- The plan must explicitly acknowledge multi-sub-flavour detection, naming both `salesforce-sfdx` and `salesforce-sfra`.
- If the probe's confidence for `js-ts` is anywhere near the threshold (because of `.js` files in cartridges), the plan should mention the consideration and explain why `js-ts` is not classified as a separate stack here. Suppression of an obvious-looking signal without explanation is a soft-fail (`PASS-with-notes`).

---

## 5. Verification criteria summary

| Check | Pass condition |
|-------|---------------|
| Stack detection | `salesforce` only at first-class confidence; `js-ts` < 0.6. |
| Sub-flavour list | Both `salesforce-sfdx` and `salesforce-sfra`; not `salesforce-pwa-kit`. |
| Test framework list | Empty. |
| Existing-infra inventory | Empty. |
| Universal core install | All entries from §2 present as `create`. |
| Sub-project scan | `subProjects: []` (no manifest dirs at top level). |
| Stack pack install | All four rule files (apex, lwc, sfra, sfdx) pass glob filter + skills addenda rendered; `skippedPackRules: []`; roles addenda merged into AGENTS.md. |
| Pack rule marker | `installedPackRules` = 4 entries; `skippedPackRules` = `[]`. |
| Always-on ceiling | Count of always-on `.mdc` files ≤ 4 → no warning. |
| Conflicts | None. |
| Adapter gaps | None for Cursor; declared gaps surfaced for the others. |
| Registry marker | One stack entry with both sub-flavours; hook contractVersion populated. |
| Idempotency | Synthetic re-run produces zero non-trivial changes; sub-flavour list serialises stably. |
| Honesty | Multi-sub-flavour detection acknowledged; `.js`-in-cartridges considered. |

If every criterion passes, the fixture's validation result is `PASS`.

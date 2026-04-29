# Fixture `empty-js` — expected outcome

Contract for the [validation harness](../VALIDATION.md). The orchestra dry-run plan against this fixture must satisfy the criteria below.

---

## 1. Expected detection

### Stack profile

| Stack id | Confidence | Notes |
|----------|------------|-------|
| `js-ts` | ≥ 0.8 | Strong signals: `package.json` + `tsconfig.json` (weight 6 combined). Medium signal: `vite.config.ts` (weight 2). Total weight ≥ 8. |

No other stacks should detect (no Python files, no Salesforce metadata, no Go/Rust/.NET signals).

### Frameworks

The `js-ts` stack's framework list (recorded in `profile.frameworks`) must include:

- `react` — from `package.json#dependencies.react`.
- `vite` — from `package.json#devDependencies.vite` and `vite.config.ts`.

The list must NOT include:

- `next`, `nuxt`, `remix`, `astro`, `vue`, `svelte`, `solid`, `nestjs`, `express`, `fastify` — none have signals in this fixture.

### Test frameworks

`profile.testFrameworks` must be **empty** for this fixture.

### Existing-infra inventory

Per [`../../core/discovery/existing-infra.md`](../../core/discovery/existing-infra.md), all of the following must be empty / absent:

- Existing `AGENTS.md` / `CLAUDE.md`.
- Existing `.cursor/rules/` directory.
- Existing `.claude/` directory.
- Existing `.github/copilot-instructions.md` / `.github/prompts/`.
- Existing `.codex/` directory.
- Existing `.ai-orchestra/install.json`.
- Existing learnings document.
- Existing MCP configuration files.

---

## 2. Expected install plan

### Universal core (action: `create`)

The plan must include `create` actions for the universal core under the detected adapter's locations. For Cursor (the v1 reference adapter), the expected paths are:

| Path | Source |
|------|--------|
| `.cursor/rules/orchestra-context.mdc` | rendered from [`../../adapters/cursor/render-rules.md`](../../adapters/cursor/render-rules.md) |
| `.cursor/rules/orchestra-director.mdc` | rendered from [`../../core/director/RULE.md`](../../core/director/RULE.md) |
| `_documentation/AI_LEARNINGS.md` | rendered from [`../../core/director/learnings-template.md`](../../core/director/learnings-template.md) |
| `AGENTS.md` (managed section) | per [`../../adapters/cursor/mappings.md`](../../adapters/cursor/mappings.md) §3 |
| `.cursor/skills/<category>/<skill-id>/SKILL.md` × 30 | one per skill in [`../../core/skills/`](../../core/skills/) |
| `.cursor/hooks.json` (entry registered) | stop-hook per [`../../adapters/_stop-hook.md`](../../adapters/_stop-hook.md) |
| `.cursor/mcp.json` (slot registrations) | per [`../../adapters/cursor/mcp.md`](../../adapters/cursor/mcp.md) |
| `.ai-orchestra/install.json` | per [`../../core/registry/install.schema.md`](../../core/registry/install.schema.md) |

For the other adapters (Claude Code, Codex, VS Code), the equivalent paths from the respective adapter `target-schema.md` apply. The validator uses whichever adapter the IDE detection produced.

### Stack pack layer (action: `create` for new files)

The plan must include the `js-ts` stack pack content per [`../../core/stack-packs/js-ts/`](../../core/stack-packs/js-ts/_overview.md) and [`../../adapters/cursor/mappings.md`](../../adapters/cursor/mappings.md) §7.

For Cursor, expected pack-derived rule files:

| Path | Source |
|------|--------|
| `.cursor/rules/js-ts-react.mdc` | rendered from [`../../core/stack-packs/js-ts/rules/react.md`](../../core/stack-packs/js-ts/rules/react.md) |
| `.cursor/rules/js-ts-typescript.mdc` | rendered from [`../../core/stack-packs/js-ts/rules/typescript.md`](../../core/stack-packs/js-ts/rules/typescript.md) |
| `.cursor/rules/js-ts-vite.mdc` | rendered from [`../../core/stack-packs/js-ts/rules/vite.md`](../../core/stack-packs/js-ts/rules/vite.md) |
| `.cursor/rules/js-ts-skills-addenda.mdc` | rendered from [`../../core/stack-packs/js-ts/skills.md`](../../core/stack-packs/js-ts/skills.md) |

The pack's `rules/node-server.md` is **also** rendered into a `.cursor/rules/js-ts-node-server.mdc` file (pack-level decision: include all rule files; the rule's own `globs:` scopes activation).

The pack's `roles.md` content is appended into the `AGENTS.md` managed section under a `### Stack roles addenda` subsection.

### Conflict actions

**None.** Every action is `create`. No `extend-section`, no `append`, no `suffix-rename`, no `skip`. This is the no-conflict baseline.

### Adapter gaps

For Cursor: **none**. The Cursor adapter is full-coverage in v1.

For Claude Code: declared gaps from [`../../adapters/claude-code/INSTALL.md`](../../adapters/claude-code/INSTALL.md) §6 should appear with `action: skip-with-gap` (e.g., older-Claude-Code stop-hook fallback).

For Codex: declared gaps from [`../../adapters/codex/INSTALL.md`](../../adapters/codex/INSTALL.md) §6 (notably the stop-hook gap).

For VS Code: declared gaps from [`../../adapters/vscode/INSTALL.md`](../../adapters/vscode/INSTALL.md) §6.

### Registry marker

`stacks[]` must contain exactly one entry:

```json
{
  "id": "js-ts",
  "stackPack": "core/stack-packs/js-ts",
  "stackPackVersion": "1.0.0-alpha",
  "frameworks": ["react", "vite"]
}
```

`hooks.stop` must be populated with `contractVersion: "1.0"` and `lastRun: null`.

`history[]` must contain one entry — the install run.

### MCP slots

Slot registrations per [`../../adapters/cursor/mcp.md`](../../adapters/cursor/mcp.md) §3 (or the equivalent adapter's `mcp.md`). v1 default slots include placeholders for all roles; the JS/TS pack does not add stack-specific slots.

---

## 3. Idempotency expectation

A synthetic second run (per [`../VALIDATION.md`](../VALIDATION.md) §2.6) must produce a plan where:

- Every `.cursor/rules/*.mdc` entry: `action: skip` (rendered content byte-identical to existing).
- Every `.cursor/skills/<category>/<skill-id>/SKILL.md`: `action: skip`.
- `_documentation/AI_LEARNINGS.md`: `action: skip` (template seed unchanged; user-added entries are preserved by managed-section logic).
- `AGENTS.md`: `action: skip` (managed section content unchanged).
- `.cursor/hooks.json`: `action: skip` (orchestra-owned entry unchanged; deduplicated by `metadata.orchestra: true`).
- `.cursor/mcp.json`: `action: skip` (orchestra-owned slots unchanged).
- `.ai-orchestra/install.json`: `action: extend-section` (history[] gets a new entry; everything else unchanged).

Zero `create`, zero `extend-section` (except the registry's history), zero conflict actions on the synthetic re-run = idempotency PASS.

---

## 4. Honesty expectations

- For the Cursor adapter: zero gaps surfaced (no `skip-with-gap` entries).
- For Claude Code / Codex / VS Code adapters: the gaps declared in their respective `INSTALL.md` §6 must appear; specifically, Codex's stop-hook gap is the most prominent.
- The plan must NOT silently skip a feature; if it can't be installed, an entry with `action: skip-with-gap` and a `rationale` explaining why must appear.

---

## 5. Verification criteria summary

| Check | Pass condition |
|-------|---------------|
| Stack detection | `js-ts` only, confidence ≥ 0.8. |
| Framework list | `react` + `vite`, no extras. |
| Existing-infra inventory | Empty. |
| Universal core install | All entries from §2 present as `create`. |
| Stack pack install | js-ts pack rules + skills addenda rendered; roles addenda merged into AGENTS.md. |
| Conflicts | None. |
| Adapter gaps | None for Cursor; declared gaps surfaced for the other three. |
| Registry marker | Exactly one stack entry; hook contractVersion populated. |
| Idempotency | Synthetic re-run produces zero non-trivial changes. |
| Honesty | No silent skips. |

If every criterion passes, the fixture's validation result is `PASS`.

# Stack packs — overview

> Stack packs are stack-specific content layered on top of the orchestra's universal core (roles + skills + Director + adapter contracts). They turn generic guidance like "review code for performance" into stack-aware guidance like "review React code for unnecessary re-renders, missing memoization, and accidental Redux state shape changes."

The core remains stack-agnostic. Stack packs are additive overlays selected at install time based on what the discovery probe detects.

---

## 1. What a stack pack contains

Every v1 stack pack is a folder under `core/stack-packs/<stack-id>/` with a fixed shape:

```
core/stack-packs/<stack-id>/
├── _overview.md       # pack identity, signals, framework list, install summary
├── rules/             # stack-specific rule content the adapter renders
│   ├── <topic>.md     # one or more topic-scoped files
│   └── ...
├── skills.md          # stack-specific addenda for universal skills (one file)
└── roles.md           # stack-specific addenda for universal roles (one file)
```

The shape is enforced by [`_schema.md`](_schema.md) and validated by [`../_lint.md`](../_lint.md).

A pack ships **content**, not runtime code. Adapters consume the content during their install (per their respective `mappings.md`) and render it into the IDE-native locations.

---

## 2. Three first-class packs in v1

| Pack id | Frameworks covered | Detection signal | Folder |
|---------|--------------------|------------------|--------|
| `js-ts` | React, Vue, Svelte, Next, Vite, Node, plain JavaScript and TypeScript | [`../discovery/signals/js-ts.md`](../discovery/signals/js-ts.md) | [`js-ts/`](js-ts/_overview.md) |
| `python-web` | Django, Flask, FastAPI, plus generic Python web | [`../discovery/signals/python.md`](../discovery/signals/python.md) | [`python-web/`](python-web/_overview.md) |
| `salesforce` | Apex, LWC, SFRA (Commerce Cloud), sfdx | [`../discovery/signals/salesforce.md`](../discovery/signals/salesforce.md) | [`salesforce/`](salesforce/_overview.md) |

Generic detection still happens for Go, Rust, .NET, and mobile (per the corresponding signal files), but those detections do not have first-class packs in v1 — the audit reports them as `info`-severity drift and the v1.x or v2 backlog tracks pack creation.

---

## 3. Install layering

When the discovery probe (Phase 2 of [`../../RUN.md`](../../RUN.md)) detects one or more stacks, the install plan (Phase 5) selects the corresponding packs and layers their content on top of the universal core. The layering rules:

1. **Roles** — universal role files (e.g., [`../roles/frontend-engineer.md`](../roles/frontend-engineer.md)) are unchanged. The pack's [`roles.md`](js-ts/roles.md) (or equivalent) supplies stack-specific non-negotiables that adapters render alongside the universal role content. The user sees both.
2. **Skills** — universal skill files (e.g., [`../skills/code/code-review/SKILL.md`](../skills/code/code-review/SKILL.md)) are unchanged. The pack's [`skills.md`](js-ts/skills.md) lists additional checklist items, gotchas, or stack-specific procedures the agent applies when running the universal skill in this stack.
3. **Rules** — the pack's [`rules/*.md`](js-ts/rules/) files are stack-specific rules the adapter renders into IDE-native rule locations (Cursor: `.cursor/rules/<topic>.mdc`; Claude Code / Codex / VS Code: appended to the managed section of the project context file).

**Order of application during install:**

1. Apply universal core (roles, skills, Director, project context).
2. For each detected stack, apply its pack's `roles.md`, `skills.md`, and `rules/*.md`.
3. Record every applied pack in the install marker under `stacks[].stackPack`.

If two packs would layer onto the same role/skill (e.g., a polyglot project with both `js-ts` and `python-web`), both contributions are kept — the agent sees both stack-specific addenda and reasons about which applies based on the file context.

---

## 4. What stack packs do NOT do

Stack packs do NOT:

- Replace the universal core. They are additive only.
- Touch project source code. Like the rest of the orchestra, they ship documentation and contract content.
- Include framework binaries, scaffolding generators, or template projects.
- Embed third-party logos, brand assets, or proprietary code.
- Encode opinions about specific company or codebase decisions — packs are universal stack guidance, not project-specific.

The line is: **if it would be wrong for some real React project, it doesn't belong in the React rules.** Pack content captures patterns most React projects benefit from.

---

## 5. Pack versioning

Each pack carries its own version in its `_overview.md` (`pack.version` field). Pack versions evolve independently of the orchestra core version. The install marker records both:

```json
{
  "stacks": [
    { "id": "js-ts", "stackPack": "core/stack-packs/js-ts", "stackPackVersion": "1.0.0-alpha" }
  ],
  "orchestra": { "version": "1.0.0-alpha" }
}
```

Compatibility:

- A pack version's `compatibleOrchestraVersions` field declares which orchestra core versions it works against. The audit refuses to apply a pack whose declared compatibility excludes the running orchestra version.
- Patch / minor pack updates can ship between orchestra core releases. Major pack version bumps require a corresponding orchestra release note.

---

## 6. Adding a new pack (out of scope for v1)

The schema and conventions in this folder are designed to make new packs easy to add in v1.x or v2:

1. Create `core/stack-packs/<new-stack-id>/` with the fixed shape from §1.
2. Add a corresponding signal file in `core/discovery/signals/<new-stack-id>.md` per the signal-file conventions.
3. Reference the pack in `_overview.md` (this file).
4. Update `CHANGELOG.md`.

Adapter changes are **not** required — adapters consume the pack content via the universal layering rules in §3.

v1 ships with the three packs in §2. Future packs (Go web, Rust services, .NET / ASP.NET, mobile native) are tracked in the v2 backlog.

---

## 7. References

- [`_schema.md`](_schema.md) — required structure of a stack pack folder (the file shapes this overview points to).
- [`../discovery/DETECTION.md`](../discovery/DETECTION.md) — Phase 2 detection that triggers pack selection.
- [`../discovery/signals/`](../discovery/signals/) — per-stack detection signals.
- [`../../RUN.md`](../../RUN.md) — bootstrap procedure; Phase 5 layers packs into the install plan.
- [`../registry/install.schema.md`](../registry/install.schema.md) — install marker; `stacks[].stackPack` records which packs were applied.
- [`../_lint.md`](../_lint.md) — schema linter contract; validates pack folders.
- [`../../adapters/_contract.md`](../../adapters/_contract.md) — adapter contract; adapters apply pack content per their `mappings.md`.
- [`../../adapters/cursor/mappings.md`](../../adapters/cursor/mappings.md) §7 — Cursor-specific stack-pack handling.
- [`../../adapters/claude-code/mappings.md`](../../adapters/claude-code/mappings.md) §7 — Claude Code-specific.
- [`../../adapters/codex/mappings.md`](../../adapters/codex/mappings.md) §7 — Codex-specific.
- [`../../adapters/vscode/mappings.md`](../../adapters/vscode/mappings.md) §7 — VS Code-specific.

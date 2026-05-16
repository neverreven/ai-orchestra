# Fixture `name-collision` — expected outcome

Contract for the [validation harness](../VALIDATION.md). The orchestra dry-run plan against this fixture must satisfy the criteria below.

---

## 1. Expected detection

### Stack profile

| Stack id | Confidence | Notes |
|----------|------------|-------|
| `js-ts` | ≥ 0.8 | Strong signals: `package.json` + `tsconfig.json` (weight 6). Medium: `src/App.tsx` (TypeScript + React). |

No other stacks should detect.

### Frameworks

`react` + `vite` (from `package.json`).

### Existing-infra inventory

The existing-infra probe must detect the three colliding skill files:

| File | Type | Collision |
|------|------|-----------|
| `.cursor/skills/cleanup/SKILL.md` | Cursor skill | Collides with orchestra's `cleanup` skill (id: `cleanup`). |
| `.claude/commands/cleanup.md` | Claude Code slash command | Collides with orchestra's `cleanup` skill. |
| `.github/prompts/cleanup.prompt.md` | VS Code custom prompt | Collides with orchestra's `cleanup` skill. |

---

## 2. Expected install plan

### Cursor adapter — suffix-rename of colliding skill

| Path | Action | Rationale |
|------|--------|-----------|
| `.cursor/skills/cleanup/SKILL.md` | `skip` (project-owned file unchanged) | The existing file is project-owned, not orchestra-owned. |
| `.cursor/skills/cleanup/SKILL.orchestra.md` | `create` (suffix-renamed copy) | Orchestra's cleanup skill written next to the project's version. |

The `SKILL.orchestra.md` file's frontmatter `description` field must follow the disambiguation format from [`../../adapters/cursor/render-rules.md`](../../adapters/cursor/render-rules.md) §5.5:

```yaml
---
description: >-
  [Orchestra] Audit recently changed files for unused imports, dead SCSS rules,
  duplicate logic, console.log leftovers, and inconsistencies. Use when the user
  says 'clean up the mess', 'cleanup', 'tidy up'. The project also defines a skill
  named 'cleanup' at '.cursor/skills/cleanup/SKILL.md' — read both and choose the
  one that fits.
---
```

Key requirements:
- Starts with `[Orchestra] `.
- Contains the disambiguation sentence pointing to the project's original file.
- Does NOT exceed 500 characters total.

### Claude Code adapter — suffix-rename of colliding command

| Path | Action | Rationale |
|------|--------|-----------|
| `.claude/commands/cleanup.md` | `skip` (project-owned) | Existing file untouched. |
| `.claude/commands/cleanup.orchestra.md` | `create` (suffix-renamed copy) | Orchestra's cleanup command written alongside. |

The `.orchestra.md` copy's `description` frontmatter must match the same disambiguation pattern per [`../../adapters/claude-code/render-rules.md`](../../adapters/claude-code/render-rules.md) §5.5:
- Starts with `[Orchestra] `.
- Disambiguation sentence pointing to `.claude/commands/cleanup.md`.

### VS Code adapter — suffix-rename of colliding prompt

| Path | Action | Rationale |
|------|--------|-----------|
| `.github/prompts/cleanup.prompt.md` | `skip` (project-owned) | Existing file untouched. |
| `.github/prompts/cleanup.orchestra.prompt.md` | `create` (suffix-renamed copy) | Orchestra's prompt written alongside. |

The `.orchestra.prompt.md` copy's `description` frontmatter must match the disambiguation pattern per [`../../adapters/vscode/render-rules.md`](../../adapters/vscode/render-rules.md) §5.5.

### Non-colliding skills — no changes

All other orchestra skills (`pre-release`, `ai-infra-audit`, `code-review`, etc.) must be installed as normal `create` actions — no suffix-rename, no modification to their descriptions.

### Overlap report

The plan must include an `## Overlapping skills` section in the post-install report:

```markdown
## Overlapping skills

The following orchestra skills were suffix-renamed because the project already
defines skills at the same paths:

| Skill id | Project file | Orchestra copy |
|----------|-------------|----------------|
| `cleanup` | `.cursor/skills/cleanup/SKILL.md` | `.cursor/skills/cleanup/SKILL.orchestra.md` |
| `cleanup` | `.claude/commands/cleanup.md` | `.claude/commands/cleanup.orchestra.md` |
| `cleanup` | `.github/prompts/cleanup.prompt.md` | `.github/prompts/cleanup.orchestra.prompt.md` |

Both files are kept. The project file is unchanged. The orchestra copy's
description includes a disambiguation note pointing to the project file.
To resolve: keep whichever you prefer and delete the other, or merge them
into a single file (the orchestra's copy will be proposed for update on
the next upgrade).
```

### Registry marker

`skills[].status` for the `cleanup` skill must be `"suffix-renamed"`:

```json
{
  "id": "cleanup",
  "category": "cleanup",
  "sourcePath": "core/skills/cleanup/SKILL.md",
  "targetPath": ".cursor/skills/cleanup/SKILL.orchestra.md",
  "status": "suffix-renamed",
  "collisionWith": ".cursor/skills/cleanup/SKILL.md"
}
```

---

## 3. Idempotency expectation

A synthetic second run must produce:

- `.cursor/skills/cleanup/SKILL.md`: `action: skip` (project-owned, unchanged).
- `.cursor/skills/cleanup/SKILL.orchestra.md`: `action: skip` (orchestra copy byte-identical).
- All other skill files: `action: skip`.

No new suffix-renamed copies must be created on the second run.

---

## 4. Honesty expectations

- The overlap report must be surfaced in the post-install summary (not silently omitted).
- The plan must NOT overwrite the project's original skill files.
- The disambiguation prefix `[Orchestra] ` must appear in the renamed copies' descriptions — a validator can check this by reading the `description:` frontmatter field.

---

## 5. Verification criteria summary

| Check | Pass condition |
|-------|---------------|
| Stack detection | `js-ts` only, confidence ≥ 0.8. |
| Collision detection | All 3 colliding files detected and flagged. |
| Project files untouched | `.cursor/skills/cleanup/SKILL.md`, `.claude/commands/cleanup.md`, `.github/prompts/cleanup.prompt.md` are identical to fixture source. |
| Suffix-renamed copies created | 3 `.orchestra.*` copies present, one per adapter. |
| Description disambiguation | Each copy's `description` starts with `[Orchestra] ` and ends with the disambiguation sentence. |
| Non-colliding skills | All other orchestra skills installed as `create`, no modification. |
| Overlap report | `## Overlapping skills` section present in post-install report. |
| Registry marker | `cleanup` skill entry has `status: "suffix-renamed"` and `collisionWith` populated. |
| Idempotency | Re-run produces all `skip` for skill files, no new copies. |

If every criterion passes, the fixture's validation result is `PASS`.

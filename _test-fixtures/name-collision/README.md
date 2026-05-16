# Fixture `name-collision` — skill name overlap

> Tests the orchestra's skill-name disambiguation behaviour when the project already has skills/prompts whose IDs collide with orchestra skills.

---

## What this fixture tests

1. **Cursor adapter name collision** — `.cursor/skills/cleanup/SKILL.md` exists with project-specific cleanup instructions. The orchestra's `cleanup` skill would write to the same location. The adapter must detect the collision, apply `suffix-rename` (write `.cursor/skills/cleanup/SKILL.orchestra.md`), and update the renamed copy's frontmatter description with the `[Orchestra]` disambiguation prefix.

2. **Claude Code adapter name collision** — `.claude/commands/cleanup.md` exists with project-specific instructions. Same outcome: suffix-rename to `.claude/commands/cleanup.orchestra.md` with disambiguated description.

3. **VS Code adapter name collision** — `.github/prompts/cleanup.prompt.md` exists with project-specific prompt content. Suffix-rename to `.github/prompts/cleanup.orchestra.prompt.md` with disambiguated description.

4. **Non-colliding skills** — all other orchestra skills (`pre-release`, `ai-infra-audit`, `code-review`, etc.) have no pre-existing files and must be installed without modification as `create` actions.

5. **Post-install overlap report** — the plan's closing report must include an `## Overlapping skills` section listing the collision with file paths for both the original and the renamed copy.

---

## Source project shape

Minimal React + Vite + TypeScript project (`js-ts` stack). Three pre-existing skill files that collide with the orchestra's `cleanup` skill (one per target adapter).

---

## Stack

`js-ts` (React + Vite + TypeScript). Single stack.

---

## What makes this adversarial

Name collisions are silent in any system that does not check for them. This fixture proves the orchestra detects the overlap before writing, applies suffix-rename consistently across all three adapters, and surfaces the disambiguation to the user rather than silently overwriting project-owned skill definitions.

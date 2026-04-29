# Stack packs — schema

> Required structure for any stack pack under `core/stack-packs/<stack-id>/`. The schema linter ([`../_lint.md`](../_lint.md)) validates conformance on every audit. The audit skill ([`../skills/audit/ai-infra-audit/SKILL.md`](../skills/audit/ai-infra-audit/SKILL.md)) reports violations with the severities listed in §6 below.

---

## 1. Folder layout

```
core/stack-packs/<stack-id>/
├── _overview.md      # required — pack identity, signals, framework list
├── rules/            # required — stack-specific rule files (≥1 file)
│   └── <topic>.md
├── skills.md         # required — addenda for universal skills
└── roles.md          # required — addenda for universal roles
```

A pack folder MUST contain exactly these four files (or sets of files in `rules/`). Any additional files cause a `lint.warning` from the audit. A missing file is `lint.error`.

The pack id (folder name) MUST be a lowercase kebab-case string of letters, digits, and hyphens. Examples: `js-ts`, `python-web`, `salesforce`. Disallowed: `JsTs`, `python_web`, `salesforce/cloud`.

---

## 2. `_overview.md` shape

Required sections, in order:

| Section | Purpose |
|---------|---------|
| `# <Pack name>` (top-level h1) | Human-readable pack name. |
| `## Identity` | Bulleted: pack id, pack version, orchestra-compatibility range, primary detection signal file, list of frameworks covered. |
| `## What this pack adds` | Short prose summary (≤ 200 words) of the value the pack provides over the universal core. |
| `## File index` | Bulleted list of every file in this pack with a one-line description. The audit cross-checks this against the actual folder contents. |
| `## Detection` | Pointer to the corresponding `core/discovery/signals/<stack>.md`. Must be a real link. |
| `## Layering rules` | How this pack's content composes with universal roles / skills / project context. May reference [`_overview.md`](_overview.md) §3 to avoid restating universal layering. |
| `## What this pack does NOT include` | Explicit out-of-scope statements (project-specific code, third-party assets, scaffolding generators, etc.). |
| `## References` | Cross-links to dependent core files (signals, roles, skills, adapters that handle pack content). |

Each `_overview.md` SHOULD be ≤ 250 lines. Beyond that the pack is doing too much; consider splitting (e.g., `salesforce` could later split into `salesforce-apex` and `salesforce-commerce-cloud`).

---

## 3. `rules/<topic>.md` shape

Each rule file under `rules/` is a topic-scoped piece of stack guidance. Required sections, in order:

| Section | Purpose |
|---------|---------|
| `# <Topic name>` | Concise, e.g., "React patterns", "Apex governor limits". |
| `## When this applies` | One paragraph: when the agent should consult this file. Should reference file globs the IDE adapter can use to scope the rule (e.g., `**/*.tsx`, `force-app/**/*.cls`). |
| `## Patterns to follow` | Bulleted, prescriptive. Each bullet is a single rule with a short rationale. Code examples allowed but kept short (≤ 10 lines each). |
| `## Anti-patterns to avoid` | Bulleted. Each bullet names the anti-pattern, why it's wrong, and the recommended alternative. |
| `## When to deviate` | A short list of situations where the patterns do NOT apply. Crucial for honesty — patterns are guidance, not laws. |
| `## References` | Cross-links to authoritative external docs (framework official docs, language specs) and to related rules in the same pack. External links MUST be permanent (avoid blog posts; prefer official docs). |

Length budget: 80–200 lines per rule file. Sweet spot is around 120. Above 200 the rule should split.

Frontmatter is OPTIONAL at this layer. Adapters add the IDE-native frontmatter at render time (per [`../../adapters/cursor/render-rules.md`](../../adapters/cursor/render-rules.md) for Cursor; equivalent rendering steps for the other adapters).

The `When this applies` section's file-glob is the source of truth the Cursor adapter uses to fill the `globs:` frontmatter field. Other adapters that lack glob-based scoping (Claude Code, Codex, VS Code v1 baseline) embed the same prose in the consolidated context file's stack section.

---

## 4. `skills.md` shape

Single file containing stack-specific addenda for universal skills. Required sections, in order:

| Section | Purpose |
|---------|---------|
| `# <Pack name> — skills addenda` | Top-level. |
| `## Layering principle` | One paragraph: addenda are added on top of universal skill content; they do not replace it. |
| `## Per-skill addenda` | Sub-sections, one per universal skill the pack extends. Each sub-section names the skill (e.g., `### code-review`) and lists stack-specific checklist items, gotchas, or procedure refinements. |

Only skills the pack meaningfully extends should appear. Empty addenda are not added "for completeness" — they would be noise.

Length budget: 80–250 lines. Larger packs (Salesforce) reasonably reach the upper end; minimal packs land near the lower.

The audit verifies that every `### <skill-id>` heading matches a real skill folder under [`../skills/`](../skills/). A heading naming a non-existent skill is `lint.error`.

---

## 5. `roles.md` shape

Single file containing stack-specific addenda for universal roles. Required sections, in order:

| Section | Purpose |
|---------|---------|
| `# <Pack name> — roles addenda` | Top-level. |
| `## Layering principle` | One paragraph: addenda are added on top of universal role content; they do not replace it. |
| `## Per-role addenda` | Sub-sections, one per universal role the pack extends. Each sub-section names the role (e.g., `### frontend-engineer`) and lists stack-specific non-negotiables, primary outputs, or skill-set additions. |

Only roles the pack meaningfully extends should appear. Length budget: 60–200 lines.

The audit verifies that every `### <role-id>` heading matches a real role file under [`../roles/`](../roles/). A heading naming a non-existent role is `lint.error`.

---

## 6. Lint rules and severities

| Rule id | What it checks | Severity |
|---------|----------------|----------|
| `pack.shape.complete` | All four required entries (`_overview.md`, `rules/`, `skills.md`, `roles.md`) are present. | `error` |
| `pack.shape.no-extras` | No unexpected top-level entries inside the pack folder. | `warning` |
| `pack.id.format` | Folder name matches the lowercase-kebab-case rule from §1. | `error` |
| `pack.overview.sections` | All eight required sections from §2 are present in the right order. | `error` (missing) / `warning` (out of order) |
| `pack.overview.file-index.coherent` | Every entry in `## File index` resolves to an actual file; every actual file is listed. | `error` |
| `pack.rule.sections` | Each `rules/<topic>.md` has all six sections from §3. | `error` |
| `pack.rule.length` | Each rule file is between 80 and 250 lines (inclusive). | `warning` if outside range |
| `pack.skills.sections` | `skills.md` has all three required sections from §4. | `error` |
| `pack.skills.heading-references` | Every `### <skill-id>` in `skills.md` matches a real skill. | `error` |
| `pack.roles.sections` | `roles.md` has all three required sections from §5. | `error` |
| `pack.roles.heading-references` | Every `### <role-id>` in `roles.md` matches a real role. | `error` |
| `pack.signal.coherent` | The signal file referenced in `## Detection` exists. | `error` |
| `pack.crosslinks.resolve` | Every relative Markdown link in any pack file resolves to an existing file. | `error` |

The audit aggregates all results per the structured-result schema in [`../_lint.md`](../_lint.md). Errors block install of the pack; warnings are reported but do not block.

---

## 7. References

- [`_overview.md`](_overview.md) — what stack packs are and how they layer in.
- [`../_lint.md`](../_lint.md) — schema linter contract; runs the rules in §6.
- [`../skills/_schema.md`](../skills/_schema.md) — schema for the universal skills `skills.md` extends.
- [`../roles/_schema.md`](../roles/_schema.md) — schema for the universal roles `roles.md` extends.
- [`../discovery/signals/`](../discovery/signals/) — signal files that `## Detection` points to.
- [`../skills/audit/ai-infra-audit/SKILL.md`](../skills/audit/ai-infra-audit/SKILL.md) — audit skill that runs the lint and reports drift.

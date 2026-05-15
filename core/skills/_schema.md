# Skill file — required structure

> Every skill file (`SKILL.md`) in `core/skills/<category>/<skill>/` must conform to this shape. The audit skill (PR 3) validates compliance during installation and on every audit run.

---

## 1. Required sections

A skill file must contain these sections, in this order, identified by the exact heading text:

| Heading | Required content |
|---------|------------------|
| `# <Skill Name>` | The skill's display name. |
| `## Trigger` | Bullet list of natural-language phrases or situations that should activate this skill. The IDE matches user input against these. |
| `## When to use` | Bullet list of concrete situations where this skill is the right answer. |
| `## When NOT to use` | Bullet list of situations where another skill or no skill is the better answer. Required to keep boundaries crisp. |
| `## Process` | Numbered list of steps. Each step ≤ 2 sentences. |
| `## Output` | Description of what the skill produces (a doc, a diff proposal, a checklist result, etc.). |
| `## References` | Bullet list of cross-links to related orchestra files (other skills, role files, schemas). |

Optional sections may follow `## References`. The audit ignores anything after the last required section.

---

## 2. Front-matter (optional in v1)

Skills do not need YAML front-matter in v1. Some IDEs (e.g., Cursor) may require minimal front-matter (`name`, `description`, `triggers`) at install time; the adapter generates it from the heading-based structure rather than requiring it in core.

---

## 2a. Model hint (optional section)

A skill may declare a recommended model tier by including a `## Model hint` section after `## References`. This is advisory — the user or runtime may override it — but it prevents the most common mismatch (running a heavyweight skill on a budget model or vice versa).

```markdown
## Model hint

- **Preferred:** `sonnet`  <!-- or: haiku | sonnet | opus -->
- **Reason:** This skill performs a structured, multi-file sweep with clear pass/fail criteria. Sonnet balances thoroughness and cost. Use `opus` only when the project is large (>100 changed files) or when the infra sync step involves complex architectural drift. Use `haiku` for trivial runs on single-file changes.
```

**Tier guidance:**

| Tier | When to use |
|------|-------------|
| `haiku` | Mechanical, low-judgment work: formatting, simple grep, single-file check |
| `sonnet` | Standard skill execution: multi-file review, structural checks, doc sync |
| `opus` | Complex reasoning required: architecture decisions, large-scope audits, multi-repo analysis |

The adapter may surface the `## Model hint` value in the IDE's skill picker UI (e.g., as a subtitle or tooltip). It must not block installation if the section is absent.

---

## 3. Naming conventions

- **Folder name**: kebab-case (e.g., `code-review/`). The slug is the skill's id.
- **File name**: always `SKILL.md` inside the skill's folder.
- **Display name**: title case in the `# <Skill Name>` heading.

A skill folder may also contain auxiliary files:

| File | Purpose | Required |
|------|---------|----------|
| `SKILL.md` | The skill spec itself | Yes |
| `template.md` | An output template the skill produces (e.g., a PRD template) | Optional |
| `checklist.md` | A checklist the skill walks through | Optional |
| `examples/` | Example outputs for guidance | Optional |

---

## 4. Stack-agnostic at v1

In PR 2, every `SKILL.md` is **stack-agnostic** — its `## Process` describes universal steps without committing to a specific framework's idioms. Stack-specific content arrives in PR 6 via `core/stack-packs/<stack>/<skill>.md` files that layer on top.

The adapter, at install time, may concatenate stack-specific content into the rendered skill file with a clear separator (`<!-- ai-orchestra: stack-pack <stack> -->`). The base skill remains the authoritative spec.

---

## 5. Cross-link rules

A skill file must:

- Link to at least one role in `## References` that pulls this skill.
- Link to `_schema.md` (this file) in `## References`.

A skill file must not:

- Link to project-specific files (every link inside `ai-orchestra/`).
- Reference role names without linking to their file.
- Reference future PRs by content unless explicitly tagged as forward reference.

---

## 6. Length budget

| Section | Target lines |
|---------|--------------|
| Trigger | 3–6 bullets |
| When to use | 3–6 bullets |
| When NOT to use | 2–5 bullets |
| Process | 4–10 steps |
| Output | 1 paragraph or 2–6 bullets |
| References | 3–6 bullets |

Total per skill file: roughly 50–100 lines. Skills that grow past this often need to be split into two skills.

---

## 7. Validation rules (executed by the audit skill)

| Rule | Severity |
|------|----------|
| All required sections present in order | Critical |
| Heading text exact match | Critical |
| `## Trigger` has at least one bullet | Critical |
| `## Process` has at least 3 numbered steps | Critical |
| Every link in `## References` resolves | Critical |
| Skill folder contains `SKILL.md` (file name exact) | Critical |
| `## When NOT to use` has at least one bullet | Warning |
| Length within budget | Warning |

Critical violations block install for that skill. The orchestra installs all other skills and surfaces the failed skill in the post-install report.

---

## 8. References

- [../roles/_schema.md](../roles/_schema.md) — equivalent schema for role files.
- [../roles/_overview.md](../roles/_overview.md) — role registry; each role pulls a defined set of skills.

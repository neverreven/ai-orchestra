# Role file — required structure

> Every role file in `core/roles/` must conform to this shape. The audit skill (PR 3) validates compliance during installation and on every audit run.

---

## 1. Required sections

A role file must contain these sections, in this order, identified by the exact heading text:

| Heading | Required content |
|---------|------------------|
| `# <Role Name>` | The role's display name as the document title. |
| `## Mission` | Exactly one paragraph (no bullets). The role's reason to exist. |
| `## Triggers` | Bullet list of discovery signals that auto-install this role. Must include at least one bullet, even if the trigger is `Always auto-installed`. |
| `## Primary outputs` | Bullet list of artifacts the role produces. Each bullet ≤ 1 line. |
| `## Skills` | Markdown table with two columns: `Skill` (linking to the skill file) and `Why` (one sentence rationale). |
| `## Collaboration` | Bullet list of typical cross-role interactions. |
| `## Out of scope` | Bullet list of explicit non-responsibilities. |
| `## References` | Bullet list of cross-links to related orchestra files. |

Optional sections may follow `## References`. The audit ignores anything after the last required section.

---

## 2. Front-matter (optional in v1)

Future versions may require YAML front-matter. v1 role files do not need front-matter; the heading-based structure is sufficient.

---

## 3. Naming conventions

- **File name**: kebab-case ending in `.md`. The slug becomes the role's id (e.g., `frontend-engineer.md` → role id `frontend-engineer`).
- **Display name**: title case (e.g., "Frontend Engineer"). Used in the install plan and registry marker for human-friendly display.

---

## 4. Cross-link rules

A role file must:

- Link every skill in the `## Skills` table to the corresponding skill file under `../skills/<category>/<skill>/SKILL.md`.
- Link to at least one other role in `## Collaboration` (it's almost never the case that a role lives in isolation).
- Link to `_overview.md` in `## References`.

A role file must not:

- Link to project-specific files (every link must be inside the orchestra spec folder (`score/` or legacy `ai-orchestra/`)).
- Reference any role by display name without also linking to its file.

---

## 5. Length budget

| Section | Target lines |
|---------|--------------|
| Mission | 1 paragraph (3–6 lines) |
| Triggers | 3–8 bullets |
| Primary outputs | 4–8 bullets |
| Skills | 5–12 rows |
| Collaboration | 3–6 bullets |
| Out of scope | 2–5 bullets |
| References | 3–6 bullets |

Total per role file: roughly 80–150 lines. Larger files signal scope creep — the audit flags them as a soft warning.

---

## 6. Validation rules (executed by the audit skill)

| Rule | Severity |
|------|----------|
| All required sections present in order | Critical |
| Heading text exact match (no typos) | Critical |
| `## Skills` table has at least one row | Critical |
| Every skill link resolves to an existing file | Critical |
| At least one trigger bullet | Critical |
| `## Collaboration` links to at least one other role | Warning |
| Total length within budget | Warning |
| `## Mission` is exactly one paragraph | Warning |

Critical violations block install. Warnings are surfaced in the dry-run plan but do not block.

---

## 7. References

- [_overview.md](_overview.md) — registry of all roles.
- [../skills/_schema.md](../skills/_schema.md) — equivalent schema for skill files.

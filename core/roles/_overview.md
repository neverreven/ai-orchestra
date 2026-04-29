# Roles — Overview

> Roles are the orchestra's lens on a project. Each role bundles a mission, a set of skills, and a discovery trigger. When the orchestra installs into a project, it selects roles based on the project profile (or the user's override), and each selected role pulls in its skill set.

This document is the **registry of roles in v1**. Per-role detail lives in the individual role files in this folder.

---

## 1. What a role is

A role in ai-orchestra is **not** a job title. It is a coherent slice of project concern (frontend code quality, backend API integrity, deployment safety, accessibility, etc.) that a sufficiently capable agent can act on, given the right skills. One human may carry multiple roles; one role may be carried by multiple humans.

A role file declares:

- **Mission** — one paragraph.
- **Triggers** — discovery signals that auto-install this role.
- **Primary outputs** — what artifacts the role's skills produce.
- **Skills** — which skills from `core/skills/` this role pulls in.
- **Collaboration** — typical handoffs with other roles.
- **Out of scope** — explicit non-responsibilities, to keep boundaries clean.

The shape is enforced by [_schema.md](_schema.md). The audit skill (PR 3) verifies compliance.

---

## 2. The ten v1 roles

| Role | File | Default behaviour |
|------|------|-------------------|
| Frontend Engineer | [frontend-engineer.md](frontend-engineer.md) | Auto-installed when `js-ts` or `salesforce-pwa-kit` is detected. |
| Backend Engineer | [backend-engineer.md](backend-engineer.md) | Auto-installed when `python-web` or `salesforce-sfdx` or a JS backend framework is detected. |
| QA Engineer | [qa-engineer.md](qa-engineer.md) | Always auto-installed. |
| Analytics Engineer | [analytics-engineer.md](analytics-engineer.md) | Auto-installed when analytics dependencies are detected. |
| DevOps / SRE | [devops-sre.md](devops-sre.md) | Auto-installed when CI configuration or IaC is detected. |
| Security Engineer | [security-engineer.md](security-engineer.md) | Always auto-installed (security baseline applies to every project). |
| Mobile Engineer | [mobile-engineer.md](mobile-engineer.md) | Auto-installed when `mobile` stack is detected. |
| AI / ML Engineer | [ai-ml-engineer.md](ai-ml-engineer.md) | Auto-installed when AI/ML dependencies are detected. |
| Tech Writer | [tech-writer.md](tech-writer.md) | Always auto-installed. |
| Product Manager | [product-manager.md](product-manager.md) | Auto-installed for product projects; opt-out for libraries / hobby code. |

The user can override every default in the install plan (Phase 5 of [RUN.md](../../RUN.md)).

---

## 3. Responsibility matrix

A given concern may have a primary owner and one or more contributors. The matrix below shows the orchestra's default ownership.

| Concern | Primary | Contributing |
|---------|---------|--------------|
| Component / UI quality | Frontend | Tech Writer (a11y), QA |
| API design + integrity | Backend | Security, Tech Writer |
| Database + migrations | Backend | DevOps, Security |
| Test strategy + coverage | QA | Frontend, Backend, Mobile |
| Analytics events + dashboards | Analytics | PM, Frontend |
| CI / CD pipelines | DevOps | Security, Backend |
| Observability + alerting | DevOps | Backend, Security |
| Auth flows + secrets | Security | Backend, DevOps |
| Dependency hygiene | Security | DevOps |
| Mobile platform parity | Mobile | Frontend, QA |
| Model evaluation + prompts | AI/ML | Tech Writer, QA |
| Documentation quality | Tech Writer | All roles |
| PRDs, decisions, scope | PM | All roles |

When a concern has overlapping responsibility (e.g., API design touched by both Backend and Security), the relevant skills are installed under both roles. Duplication is a feature here — different roles may emphasise different aspects of the same skill content.

---

## 4. Trigger details

Each role's trigger conditions are described authoritatively in its own file under "Triggers". The summary:

| Trigger source | Roles activated |
|----------------|-----------------|
| `js-ts` stack | Frontend, plus Backend if a JS backend framework is detected |
| `python-web` stack | Backend |
| `salesforce-sfdx` | Backend (Apex / Lightning / metadata) |
| `salesforce-sfra` | Frontend (ISML / cartridges) + Backend (controllers / models) |
| `salesforce-pwa-kit` | Frontend |
| `mobile` stack | Mobile, plus Frontend if RN/Capacitor and Backend if API present |
| Analytics deps (segment, mixpanel, posthog, amplitude, GA, etc.) | Analytics |
| CI config (`.github/workflows/`, `.gitlab-ci.yml`, etc.) | DevOps |
| IaC (`*.tf`, `Dockerfile`, `k8s/`, `helm/`) | DevOps |
| AI/ML deps (`torch`, `transformers`, `langchain`, vendor SDKs) | AI/ML |
| Test framework or test directory present | QA (also auto-installed regardless) |
| Always | QA, Security, Tech Writer |
| Default (overridable) | Product Manager |

---

## 5. Skill mapping per role

The default skill set for each role is declared in the role's own file. As a quick orientation:

| Role | Skill categories pulled |
|------|-------------------------|
| Frontend | code, quality (a11y, perf), audit (cleanup, pre-release) |
| Backend | code, quality (security-baseline, auth-flow-review, secrets-scan), audit |
| QA | docs (write-test-plan), audit, code (code-review for tests) |
| Analytics | analytics (all three), docs (write-prd for taxonomy proposals) |
| DevOps / SRE | platform (all four), quality (security-baseline) |
| Security | quality (all five), platform (mcp-server-audit), code (dependency-audit) |
| Mobile | mobile (both), code, quality (a11y, perf) |
| AI / ML | ai-ml (all three), audit (ai-infra-audit) |
| Tech Writer | docs (all six), audit (cleanup applied to docs) |
| Product Manager | docs (write-prd, decision-log), analytics (dashboard-spec) |

Skills are de-duplicated at install time — if two roles both pull `code-review`, the orchestra installs one copy of the skill in the IDE-native location.

---

## 6. Cross-role collaboration

The orchestra encodes typical collaboration patterns so the agent knows when a question crosses role boundaries:

- **Frontend + Analytics** — instrumenting a new feature: code-review for the FE patch + analytics-implementation-audit for event coverage.
- **Backend + Security** — new endpoint: api-design-review + auth-flow-review + secrets-scan.
- **DevOps + Security** — new deployment: deployment-checklist + security-baseline.
- **QA + Mobile** — release readiness: regression checklist + platform-parity-check.
- **AI/ML + Tech Writer** — prompt change: prompt-quality-audit + readme-quality (for prompt docs).
- **PM + Analytics** — new metric: write-prd (for the metric itself) + event-taxonomy-design.

These pairs are illustrative, not exclusive. Any role's skill can be invoked at any time.

---

## 7. How roles are installed

The adapter (PR 4 / 5) reads:

1. The list of roles selected for this project (post-confirmation in Phase 6 of RUN.md).
2. Each role's file — to know which skills to pull and which rules to render.
3. The matching skill specs from `core/skills/<cat>/<skill>/SKILL.md`.

The adapter writes:

- One IDE-native skill artifact per unique skill (de-duplicated across roles).
- An entry per role in the install marker `.ai-orchestra/install.json` under `roles[]`.
- A reference to the role in the project-context document (`AGENTS.md` or equivalent).

Rules associated with roles are rendered separately from `core/rules/` (PR 3 lays out the rule templates).

---

## 8. Stack-agnostic at v1; stack-aware at v6

In v1 (PR 2 — this PR), every role's skill set is **stack-agnostic** — the skill specs describe universal processes without committing to a specific framework. Stack-specific content arrives in PR 6 via `core/stack-packs/<stack>/`. At install time, when a stack pack is selected, its content is layered on top of the universal skill specs to produce stack-aware guidance in the installed IDE.

This separation is what lets the orchestra be both universal and useful: every role works on every project; each project gets the depth its stack deserves.

---

## 9. Adding new roles (v2+)

Adding a role requires:

1. A new role file in this directory matching [_schema.md](_schema.md).
2. New skills (or selecting from existing) in `core/skills/<cat>/<skill>/`.
3. Optional: a new category under `core/skills/` if no existing category fits.
4. An entry in this overview's section 2 and 4.
5. CHANGELOG entry against the next core version.

Roles slated for v2: Data Engineer (separate from Analytics), Game Developer (Unity/Unreal/Godot/Bevy), Hardware/Embedded (firmware patterns), Designer (design tokens, Figma sync, design system audits).

---

## 10. References

- [_schema.md](_schema.md) — required structure of a role file.
- Per-role files in this folder.
- [../skills/_schema.md](../skills/_schema.md) — required structure of a skill file.
- [../../RUN.md](../../RUN.md) — overall bootstrap procedure that consumes this registry.
- [../../adapters/_contract.md](../../adapters/_contract.md) — adapter contract that installs roles.

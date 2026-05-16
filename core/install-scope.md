# install-scope.md — Install Scope Modes and Resolution

> Defines the four scope modes the orchestra offers during install, the resolver that turns a user choice into a concrete set of roles and skills, and the recommendation engine that proposes a default mode based on the existing-infra inventory.

Read by an agent during Phase 5 of [RUN.md](../RUN.md) (build the install plan) and Phase 6 (resolve the scope question with the user). The chosen scope is recorded in the install marker per [registry/install.schema.md](registry/install.schema.md) §1.2 under `installScope`.

This file is **IDE-agnostic** — adapters consume the resolved `selectedRoleIds[]` and `selectedSkillIds[]` sets without caring how they were chosen.

---

## 1. The four modes

| Mode id | Display name | Intent |
|---------|--------------|--------|
| `full-kit` | Full kit | Install every role in [roles/](roles/) and the full skill library. The current default behaviour from v1.0. |
| `selected-roles` | Selected roles | Install a user-chosen subset of roles. Useful when one or more roles are owned externally (e.g., the BE team has its own agentic flow). |
| `primary-plus-collaborators` | Primary role + collaborators | Install one user-chosen primary role plus any subset of its declared collaborators. Useful for a focused install (e.g., "FE-party with QA support"). |
| `core-only` | Core only | Install no role library. Only Director, learnings doc, install marker, and the universal audit/cleanup/pre-release skills. Useful when a team wants the orchestra's session protocol without the role concept. |

Modes are mutually exclusive. Exactly one mode is recorded per install. A reinstall (or upgrade) may change the mode; the audit reports the transition.

---

## 2. Resolver — mode → `selectedRoleIds[]`

Given the chosen `mode` and the role files under [roles/](roles/), the resolver produces a deterministic `selectedRoleIds[]` set. Implementations must follow this algorithm exactly so all adapters agree.

### 2.1 `full-kit`

```
selectedRoleIds = sorted(every role id derived from roles/<role>.md filenames)
```

This matches the v1.0 default. The `_schema.md` and `_overview.md` files are not roles and are excluded. Future roles added to `roles/` automatically expand the set on the next install.

### 2.2 `selected-roles`

```
selectedRoleIds = sorted(user-confirmed checkbox selection)
```

Constraints:

- The selection must contain at least one role id; an empty selection is rejected (use `core-only` instead).
- Every id must resolve to an existing `roles/<id>.md` file.
- The resolver always **adds** the universals — roles whose `## Triggers` bullet contains the literal phrase `Always auto-installed` (per [roles/_overview.md](roles/_overview.md) §2 these are QA, Security, and Tech Writer in v1) — unless the user explicitly opted them out during the Phase 6 confirmation. The override flag is recorded in `installScope.optedOutUniversals[]`.

The universals rule keeps the orchestra's safety net (test strategy, security baseline, doc quality) on by default even when a project is scoped narrowly.

### 2.3 `primary-plus-collaborators`

```
primary       = user-chosen role id
collaborators = parseCollaboration(roles/<primary>.md)
selectedRoleIds = sorted({ primary } ∪ user-confirmed subset of collaborators ∪ universals)
```

`parseCollaboration` reads the role file's `## Collaboration` bullet list and extracts every collaborator role id from markdown links of the form `[<Display Name>](<role-id>.md)`. Bullets that link outside the `roles/` folder are ignored. The `_schema.md` already requires every role file to declare at least one collaboration link (§4 cross-link rules).

The user is shown the collaborator candidates as opt-in checkboxes. Defaults: all checked. The user may uncheck any.

Universals are added the same way as in `selected-roles`.

### 2.4 `core-only`

```
selectedRoleIds = []
```

No role library is materialised. The Director rule, learnings doc, install marker, and the universal skill set (see §3.4) are still installed. This mode is the smallest functional install — it teaches an agent the orchestra's session protocol without committing the project to the role concept.

---

## 3. Resolver — `selectedRoleIds[]` → `selectedSkillIds[]`

Skills follow roles. The resolver de-duplicates across overlapping role skill tables.

### 3.1 Parsing skill links

For each role in `selectedRoleIds`, parse the `## Skills` table in `roles/<role>.md`. Every row's first column links to a skill file under `../skills/<category>/<skill-id>/SKILL.md`. The `<skill-id>` is the leaf folder name.

### 3.2 De-duplication

```
selectedSkillIds = sorted(unique({ skill ids from every selected role's table }))
```

A skill referenced by two or more roles is installed once. The install marker's `skills[]` array records each skill once, with its `category` field set to the directory it lives under in `core/skills/`.

### 3.3 Universal skills

The following skills are always installed regardless of mode, because they belong to the orchestra's session protocol rather than to any single role:

| Skill | Source | Reason |
|-------|--------|--------|
| `cleanup` | [skills/audit/cleanup/SKILL.md](skills/audit/cleanup/SKILL.md) | Standard hygiene pass; useful in every project. |
| `pre-release` | [skills/audit/pre-release/SKILL.md](skills/audit/pre-release/SKILL.md) | Final-checklist pass before a release; useful in every project. |
| `ai-infra-audit` | [skills/audit/ai-infra-audit/SKILL.md](skills/audit/ai-infra-audit/SKILL.md) | Validates the orchestra's own install; required for upgrade-and-audit mode. |

Universal skills appear in `selectedSkillIds` even when `selectedRoleIds` is empty (`core-only` mode).

### 3.4 `core-only` skill set

`core-only` installs **only** the three universal skills. No role-derived skills are added.

---

## 4. Recommendation engine — inventory → recommended mode

Phase 5 of [RUN.md](../RUN.md) computes a recommended mode from the existing-infra inventory ([discovery/existing-infra.md](discovery/existing-infra.md)). The recommendation is surfaced in Phase 6 along with a one-sentence rationale; the user is free to override.

### 4.1 Inputs

From the inventory:

- `existingInfra.roles[]` — per-role ownership findings from [discovery/existing-infra.md](discovery/existing-infra.md) §3.9.
- `existingInfra.quality.overall` — quality classification from §3.10 (`solid` | `partial` | `weak` | `corrupted` | `none`).
- `existingInfra.orchestraInstall.present` — whether a prior orchestra install exists.

### 4.2 Decision table

Apply rules in order; first match wins.

| Condition | Recommended mode | Rationale template |
|-----------|------------------|--------------------|
| `orchestraInstall.present == true` | (no recommendation — switch to upgrade-and-audit per RUN.md Phase 3) | n/a |
| `quality.overall == "corrupted"` | `core-only` | "Existing AI structure shows critical schema/coherence issues; recommending a clean core install while you decide what to do with the prior setup." |
| Any role with `ownership == "external"` | `selected-roles` excluding externally-owned roles | "Detected external ownership of `<roles>` (`<evidence summary>`). Recommending a selected install that excludes those roles to avoid duplication." |
| `quality.overall == "weak"` and no external ownership | `full-kit` with quality issues flagged | "Existing AI structure has some weaknesses; full-kit will lay down a complete baseline alongside your existing pieces. You can review the AI INFRASTRUCTURE ASSESSMENT before applying." |
| Greenfield (`existingInfra` is essentially empty) | `full-kit` | "No existing AI infrastructure detected; full-kit gives you the complete orchestra baseline." |
| Any other case | `full-kit` | "No strong signals to narrow the scope; full-kit is the safe default." |

A recommendation never auto-applies. Phase 6 always presents it with the alternatives.

### 4.3 Recording the decision

The marker captures both the user's choice and the engine's recommendation:

```json
"installScope": {
  "mode": "selected-roles",
  "selectedRoles": ["frontend-engineer", "qa-engineer", "security-engineer", "tech-writer"],
  "optedOutUniversals": [],
  "decidedAt": "<ISO 8601>",
  "decidedBy": "user",
  "recommendation": {
    "mode": "selected-roles",
    "rationale": "Detected external ownership of backend-engineer (backend/AGENTS.md, 4.2 KB hand-written)."
  }
}
```

When the user accepts the recommendation verbatim, `decidedBy` is `"user-accepted-recommendation"`. When the user picks a different mode, `decidedBy` is `"user-override"`. When no human input was provided (e.g., a non-interactive batch install on a greenfield repo), `decidedBy` is `"default"`.

---

## 5. Validation rules

The audit skill ([skills/audit/ai-infra-audit/SKILL.md](skills/audit/ai-infra-audit/SKILL.md)) validates the recorded scope on every run.

| Rule | Severity |
|------|----------|
| `installScope.mode` is one of the four mode ids | Critical |
| `installScope.selectedRoles[]` matches `mode` per the resolver | Critical |
| Every id in `selectedRoles[]` resolves to a `roles/<id>.md` file at the current orchestra version | Critical |
| For `primary-plus-collaborators`: `primaryRole` is set and present in `selectedRoles[]` | Critical |
| For `core-only`: `selectedRoles[]` is empty | Critical |
| `optedOutUniversals[]` (if non-empty) lists ids that are universals per [roles/_overview.md](roles/_overview.md) §4 | Warning |
| `installScope.recommendation.mode` is one of the four mode ids | Warning |
| `decidedBy` is one of `default | user | user-accepted-recommendation | user-override` | Warning |

A critical violation indicates the marker drifted from a state the orchestra can reason about. The audit proposes a re-confirm step rather than auto-rewriting the field.

---

## 6. Backward compatibility

Markers written by orchestra v1.0.x do not include `installScope`. The audit treats their absence as an implicit `mode: "full-kit"` with `decidedBy: "default"` and proposes a one-time migration that records the inferred field on the next audit. The migration does not change which roles or skills are installed; it only records the scope so future audits can validate it.

---

## 7. References

- [RUN.md](../RUN.md) — Phase 5 (build plan, compute recommendation), Phase 6 (resolve scope with user), Phase 7 (write marker).
- [registry/install.schema.md](registry/install.schema.md) §1.2 — `installScope` field schema.
- [discovery/existing-infra.md](discovery/existing-infra.md) §3.9–§3.10 — inventory inputs that drive the recommendation.
- [roles/_schema.md](roles/_schema.md) — required role file shape (`## Skills`, `## Collaboration`).
- [roles/_overview.md](roles/_overview.md) — universals (always-auto-installed roles) and the v1 role registry.
- [skills/audit/ai-infra-audit/SKILL.md](skills/audit/ai-infra-audit/SKILL.md) — validates the recorded scope on every audit run.

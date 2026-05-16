# Salesforce / Commerce Cloud — stack pack

## Identity

- **Pack id:** `salesforce`
- **Pack version:** `1.1.0`
- **Compatible orchestra versions:** `1.0.x`
- **Primary detection signal:** [`../../discovery/signals/salesforce.md`](../../discovery/signals/salesforce.md)
- **Frameworks covered:** Apex, Lightning Web Components (LWC), SFRA / Storefront Reference Architecture (Commerce Cloud B2C), sfdx project layout

## What this pack adds

Salesforce is the third first-class pack in v1. It captures patterns for the Salesforce platform's most common engineering surfaces: Apex (server-side classes, triggers, batch jobs), Lightning Web Components (modern UI framework on the platform), SFRA (the Commerce Cloud B2C Storefront Reference Architecture, used for B2C e-commerce sites), and the sfdx project model (`force-app/main/default/...` with metadata as source of truth).

Salesforce engineering has its own vocabulary (governor limits, bulk-safe code, managed packages, scratch orgs, deployment) that doesn't map onto generic web stacks. The pack treats this directly rather than forcing generic web idioms to fit.

The B2B Commerce track (CC for B2B) shares Apex / LWC patterns with B2C-Commerce-Cloud (SFRA) but has its own data model. v1 focuses on the patterns that apply to both; B2B-specific guidance is tracked for v1.x.

## File index

- [`_overview.md`](_overview.md) — this file (pack identity and layering).
- [`rules/apex.md`](rules/apex.md) — Apex patterns (governor limits, bulk-safe code, SOQL, test classes).
- [`rules/lwc.md`](rules/lwc.md) — Lightning Web Component patterns (wire service, events, lifecycle).
- [`rules/sfra.md`](rules/sfra.md) — SFRA / Commerce Cloud cartridge patterns (controllers, models, hooks).
- [`rules/sfdx.md`](rules/sfdx.md) — sfdx project layout, scratch orgs, deployment patterns.
- [`rules/omnistudio.md`](rules/omnistudio.md) — OmniStudio patterns (OmniScripts, FlexCards, DataRaptors, Integration Procedures).
- [`rules/flow.md`](rules/flow.md) — Flow patterns (Record-Triggered, Screen, Scheduled, Platform Event Flows).
- [`rules/security.md`](rules/security.md) — Security patterns (sharing, FLS, SOQL injection, Named Credentials, encryption).
- [`skills.md`](skills.md) — Salesforce-specific addenda for universal skills.
- [`roles.md`](roles.md) — Salesforce-specific addenda for universal roles.

## Detection

The pack is selected when [`../../discovery/signals/salesforce.md`](../../discovery/signals/salesforce.md) reports a positive match. The signal is positive when any of the following are present at the project root: `sfdx-project.json`, `force-app/` directory, `package.xml` (metadata API), `cartridges/` directory (SFRA / Commerce Cloud), `.forceignore`. Sub-stacks (Apex, LWC, SFRA) are detected separately and recorded in the install marker so the right rule files apply.

## Layering rules

This pack follows the universal layering rules in [`../_overview.md`](../_overview.md) §3:

- Roles in [`../../roles/`](../../roles/) are unchanged. [`roles.md`](roles.md) supplies stack-specific non-negotiables that adapters render alongside the universal role content. Note that Salesforce has its own role expectations that don't map perfectly onto generic web roles — see [`roles.md`](roles.md) for how the universal roles bend to fit.
- Skills in [`../../skills/`](../../skills/) are unchanged. [`skills.md`](skills.md) lists per-skill addenda the agent applies when running a universal skill against Salesforce code.
- Each [`rules/<topic>.md`](rules/) is rendered into the IDE's rule location with the file-glob declared in the rule's `## When this applies` section as the rule's activation condition.

`apex.md` applies to Apex classes / triggers / tests. `lwc.md` applies to LWC bundles. `sfra.md` applies to cartridge files (Commerce Cloud B2C). `sfdx.md` applies project-wide. A polyglot Salesforce repo with all three flavours runs all four rule files against their respective globs.

## What this pack does NOT include

- B2B Commerce-specific guidance (separate data model, different cartridge layout). Tracked for v1.x.
- Salesforce administration (declarative configuration, validation rules, page layouts). Flows are covered in [`rules/flow.md`](rules/flow.md) because they are code-equivalent automation.
- Marketing Cloud (entirely different product, not under sfdx).
- Specific managed-package opinions (FFLib Apex Common, NPSP, Industry Cloud). The pack mentions them as reference but does not require them.
- Tableau / CRM Analytics dashboards.
- Specific consulting-firm methodologies. Patterns reflect platform conventions, not vendor-specific styles.
- Project-specific code or org-specific scripts.

## References

- [`../_overview.md`](../_overview.md) — stack-packs framework overview.
- [`../_schema.md`](../_schema.md) — stack-pack file shape this pack conforms to.
- [`../../discovery/signals/salesforce.md`](../../discovery/signals/salesforce.md) — detection signals that select this pack.
- [`../../roles/backend-engineer.md`](../../roles/backend-engineer.md) — universal role that [`roles.md`](roles.md) extends (Apex roughly maps to backend).
- [`../../roles/frontend-engineer.md`](../../roles/frontend-engineer.md) — universal role that [`roles.md`](roles.md) extends (LWC maps to frontend).
- [`../../roles/devops-sre.md`](../../roles/devops-sre.md) — universal role that [`roles.md`](roles.md) extends (sfdx CI/CD).
- [`../../roles/qa-engineer.md`](../../roles/qa-engineer.md) — universal role that [`roles.md`](roles.md) extends (Apex test classes).
- [`../../skills/code/code-review/SKILL.md`](../../skills/code/code-review/SKILL.md) — universal skill that [`skills.md`](skills.md) extends.
- [`../../skills/platform/deployment-checklist/SKILL.md`](../../skills/platform/deployment-checklist/SKILL.md) — universal skill that [`skills.md`](skills.md) extends.

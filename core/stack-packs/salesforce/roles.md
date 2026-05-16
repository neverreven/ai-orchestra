# salesforce — roles addenda

## Layering principle

These addenda are added on top of the universal roles under [`../../roles/`](../../roles/). They do not replace the universal role description; they add stack-specific non-negotiables, primary outputs, and skill-set extensions that apply when the project is a Salesforce / Commerce Cloud codebase.

Salesforce engineering does not map cleanly onto generic web roles. An "Apex developer" works server-side but on a managed platform; a "LWC developer" is frontend but constrained by Salesforce's component model; a "Commerce Cloud developer" works in JS but on a wholly different runtime than typical Node servers. This file maps Salesforce engineering surfaces onto the universal roles where the fit is reasonable, and notes where the fit is loose.

If a universal role is not listed here, use it as-is.

## Per-role addenda

### backend-engineer

Extends [`../../roles/backend-engineer.md`](../../roles/backend-engineer.md). On Salesforce projects, Apex engineers are the backend role.

Stack-specific non-negotiables:
- **Bulk-safe by default.** See [`rules/apex.md`](rules/apex.md). Every method assumes a list, even with one record.
- **Governor limits respected.** SOQL / DML / CPU / heap budgeted per transaction. Async (Batchable / Queueable / Schedulable) for work over the limits.
- **Sharing keyword declared.** `with sharing` / `without sharing` / `inherited sharing` is explicit.
- **CRUD/FLS enforced on `@AuraEnabled` methods.** Server-side checks, not client-side.
- **Apex tests ≥ 75% line coverage.** Platform-enforced; the deploy gate.
- **Custom Metadata Types and Named Credentials for configuration.** Hard-coded URLs / IDs are bugs.

Primary outputs (additional, beyond universal):
- Apex classes (services, selectors, controllers, triggers) under `force-app/main/default/classes/`.
- Trigger handlers using a single trigger per object pattern.
- Apex test classes with `@TestSetup`, `@IsTest`, and explicit `runAs(user)` for permission tests.
- Custom Metadata Types for configuration.
- Named Credentials for outbound integrations.

Skill set additions:
- Comfort with the platform's [governor limits documentation](https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/apex_gov_limits.htm).
- Familiarity with Apex test best practices and the `@IsTest`, `@TestSetup`, `Test.startTest()/stopTest()` boundary semantics.
- Comfort reading the SFDC platform's audit logs (Setup audit trail, Apex debug logs).

### frontend-engineer

Extends [`../../roles/frontend-engineer.md`](../../roles/frontend-engineer.md). On Salesforce projects, LWC engineers are the frontend role.

Stack-specific non-negotiables:
- **LWC base components first.** Use `lightning-*` components instead of building custom equivalents. See [`rules/lwc.md`](rules/lwc.md).
- **Reactivity through `@api` and class-field assignment.** No imperative DOM mutations on `@api` properties.
- **Wire service for declarative data.** `@wire(getRecord, ...)` over imperative Apex calls when reading.
- **Strings localised via custom labels.** No hard-coded user-facing English.
- **Accessibility: SLDS components are accessible by default; preserve that.** Custom CSS overrides reviewed for keyboard / screen-reader impact.
- **Component encapsulation honored.** No `querySelector` reaching outside the shadow root.

Primary outputs (additional):
- LWC bundles under `force-app/main/default/lwc/<componentName>/`.
- LWC tests via `@salesforce/sfdx-lwc-jest`.
- Custom labels (`force-app/main/default/labels/CustomLabels.labels-meta.xml`).
- SLDS-aligned styling (CSS custom properties from the design system).

Skill set additions:
- Strong familiarity with [Lightning Design System (SLDS)](https://www.lightningdesignsystem.com/).
- Comfort with Lightning App Builder for declarative composition.
- Familiarity with Lightning Message Service (LMS) for cross-framework events (Aura ↔ LWC).

### qa-engineer

Extends [`../../roles/qa-engineer.md`](../../roles/qa-engineer.md). Salesforce QA spans Apex test classes, LWC Jest tests, and end-to-end UI testing.

Stack-specific non-negotiables:
- **Apex tests are deterministic.** No `SeeAllData=true` (default false). Test data created in `@TestSetup`.
- **Test coverage ≥ 75% on the org.** Platform-enforced. Aim higher for new code; legacy can drag the average.
- **`Test.startTest()` / `Test.stopTest()` around the code under test.** Resets governor limits and forces async to complete.
- **`runAs(user)` tests sharing rules.** A test that doesn't exercise the user-permission boundary fails to validate sharing.
- **LWC components have Jest tests.** `@salesforce/sfdx-lwc-jest` for unit testing components in isolation.
- **End-to-end via UTAM, Selenium, or Provar.** UI tests that exercise the platform UI; deterministic via explicit waits.

Primary outputs (additional):
- Apex test classes under `force-app/main/default/classes/` named `<ClassUnderTest>Test.cls`.
- LWC Jest tests under `<componentName>/__tests__/<componentName>.test.js`.
- Test plan covering Apex, LWC, integration, and E2E layers (per [`../../skills/docs/write-test-plan/SKILL.md`](../../skills/docs/write-test-plan/SKILL.md)).
- Test data factory class (e.g., `TestDataFactory.cls`) for shared fabrication.

### devops-sre

Extends [`../../roles/devops-sre.md`](../../roles/devops-sre.md). On Salesforce, DevOps centers on org management, sfdx CLI, and CI/CD against scratch orgs / sandboxes / production.

Stack-specific non-negotiables:
- **Source-of-truth model: source format under `force-app/`.** Metadata format only for legacy operations.
- **JWT auth in CI.** No password-based auth; OAuth JWT with a server key + connected app.
- **Validation deploys before production deploys.** `sf project deploy start --check-only`.
- **Test-level explicit on production deploys.** `RunSpecifiedTests` or `RunLocalTests`. Never `NoTestRun` to prod.
- **Permission sets, not profiles, for new permissions.** Profiles diff badly and slow deploys.
- **Scratch-org definition versioned.** `config/project-scratch-def.json` checked in.
- **`.forceignore` covers generated and environment-specific metadata.**

Primary outputs (additional):
- CI pipeline (GitHub Actions / GitLab) defined in code.
- Scratch-org definition file for reproducible dev environments.
- Deployment runbook with validation, deploy, and rollback procedures.
- Static analysis configuration (PMD ruleset for Apex, ESLint config for LWC).

Skill set additions:
- Comfort with `sf` / `sfdx` CLI workflows.
- Familiarity with Salesforce DevOps Center or third-party tools (Copado, Gearset, Flosum) when the project uses them.
- Comfort with package.xml-style legacy operations when migrating older orgs.

### security-engineer

Extends [`../../roles/security-engineer.md`](../../roles/security-engineer.md).

Stack-specific non-negotiables:
- **CRUD/FLS reviewed on every `@AuraEnabled` method.** The platform doesn't enforce; the developer does.
- **`with sharing` declared explicitly on every Apex class.** No reliance on inheritance default.
- **Named Credentials for outbound HTTP.** Auth tokens not hard-coded.
- **No bypassed `WITH USER_MODE`.** Prefer to `WITH SYSTEM_MODE` unless justified.
- **OAuth scopes minimal on connected apps.** "API" alone is broad; document why each scope is needed.
- **Audit log review cadence.** Setup audit trail reviewed periodically; production-only changes investigated.

Primary outputs (additional):
- Threat model addressing Apex injection, sharing-rule bypass, CRUD/FLS gaps, OCAPI/SCAPI auth flaws.
- Connected-app inventory with scope documentation.
- Named Credential inventory with secret rotation policy.

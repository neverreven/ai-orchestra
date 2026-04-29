# salesforce — skills addenda

## Layering principle

These addenda are added on top of the universal skills under [`../../skills/`](../../skills/). They do not replace the universal procedure; they extend it with stack-specific checklist items, gotchas, and refinements that apply when the project is a Salesforce / Commerce Cloud codebase. The agent runs the universal skill's process and consults this file to expand any step that has a Salesforce-specific consideration.

If a universal skill is not listed here, run it as-is.

## Per-skill addenda

### code-review

Extends [`../../skills/code/code-review/SKILL.md`](../../skills/code/code-review/SKILL.md).

Stack-specific checks (Apex):
- **Bulk-safe.** No SOQL or DML inside loops; no per-record callouts.
- **Selective queries.** WHERE clauses include indexed fields; non-selective queries flagged for review.
- **Sharing keyword present.** `with sharing` / `without sharing` / `inherited sharing` declared explicitly.
- **Custom-exception-only catches.** No bare `catch (Exception e)` swallowing real errors.
- **Test coverage adequate.** New Apex has tests; the change does not drop org coverage below 75% (the platform deploy gate).
- **`@AuraEnabled` security.** Methods enforce CRUD/FLS or document why not.
- **Hardcoded record IDs absent.** Look up by developer name or custom metadata.

Stack-specific checks (LWC):
- **`@api` properties read-only inside the component.** No mutations.
- **Wired methods correctly invalidated.** `refreshApex` after writes that affect wired data.
- **Events bubble + composed appropriately.** Or scoped to the immediate parent if not.
- **No `setTimeout` for DOM readiness.** `renderedCallback` instead.
- **Strings localised.** No hard-coded user-facing English.

Stack-specific checks (SFRA):
- **No business logic in ISML.** `<isscript>` blocks fail review.
- **Cartridge layering used.** Modifications to `app_storefront_base` rejected.
- **`Transaction.wrap` around DML.** Missing transactions flagged.
- **Hooks signature matches.** Hook implementations match the documented hook contract.

Stack-specific checks (sfdx):
- **`.forceignore` honored.** No metadata sneaking in that should be excluded.
- **Profile diffs minimised.** Changes to `force-app/main/default/profiles/` reviewed for unintended drift.

### dependency-audit

Extends [`../../skills/code/dependency-audit/SKILL.md`](../../skills/code/dependency-audit/SKILL.md).

Stack-specific checks:
- **Managed packages versioned.** `sfdx-project.json` declares package versions; new versions reviewed before bumping.
- **Static resources reviewed.** Bundled JS / CSS in static resources is a dependency, even if not in `package.json`. Audit for known CVEs.
- **LWC base components used over custom.** `lightning-button` over a hand-rolled `c-button`. Reduces maintenance and gets free platform updates.
- **NPM deps for build tooling only.** Production code on the platform doesn't run Node. Any `node_modules` content is build-time.
- **SFRA: cartridge dependencies declared in `cartridges.path`.** All overlay cartridges listed; missing entries cause silent override failures.

### deployment-checklist

Extends [`../../skills/platform/deployment-checklist/SKILL.md`](../../skills/platform/deployment-checklist/SKILL.md).

Stack-specific checks:
- **Validation deploy run before production deploy.** `sf project deploy start --check-only` against production with `RunSpecifiedTests` (or `RunLocalTests`).
- **Apex test coverage ≥ 75% on the org.** Platform-enforced; deploys reject below this.
- **Permission sets deployed before code that depends on them.** Otherwise users get permission errors.
- **Profile changes deployed in a separate change-set or pre-step.** Profile deploys are slow and lock the org; isolate.
- **Custom labels deployed.** Hard-coded English in code is a bug, but missing custom labels at deploy time crash the UI.
- **SFRA: cartridge path updated in BM (Business Manager) after deploy.** Including the new cartridge in the site's cartridge path; otherwise overrides don't take effect.
- **Rollback procedure documented.** Salesforce deploys are forward-only; "rollback" is "deploy the previous version." That version must be known and ready.

### ci-pipeline-audit

Extends [`../../skills/platform/ci-pipeline-audit/SKILL.md`](../../skills/platform/ci-pipeline-audit/SKILL.md).

Stack-specific checks:
- **JWT auth, not username/password.** CI authenticates to orgs via `sf org login jwt` with a server.key + connected app.
- **Scratch-org create + deploy + test in PR builds.** A fresh scratch org per PR is expensive but provides full validation. Trade-off documented.
- **Static analysis runs.** PMD for Apex, ESLint for LWC, SLDS validator for design-system compliance.
- **Validation deploy as a CI step before merge.** `sf project deploy start --check-only` against an integration sandbox.
- **Test results uploaded as artifacts.** Apex test results in JUnit format for CI dashboards.
- **No production deploys from CI without manual approval.** A protected workflow / environment with required reviewers.

### secrets-scan

Extends [`../../skills/quality/secrets-scan/SKILL.md`](../../skills/quality/secrets-scan/SKILL.md).

Stack-specific checks:
- **No hard-coded API keys / endpoints.** Use Custom Metadata Types or Named Credentials.
- **`server.key` for JWT auth ignored from git.** Stored in CI secret store.
- **Connected app client secret in CI secrets.** Never in repo.
- **No customer / cart data in test classes.** Test data is fabricated; production data does not appear in `force-app/`.
- **OCAPI / SCAPI client credentials vaulted.** Commerce Cloud has its own auth; secrets follow the same hygiene as Salesforce-platform secrets.

### security-baseline

Extends [`../../skills/quality/security-baseline/SKILL.md`](../../skills/quality/security-baseline/SKILL.md).

Stack-specific checks:
- **CRUD/FLS enforced in Apex.** Apex runs in system context; CRUD/FLS is the developer's responsibility on `@AuraEnabled` methods. Use `Security.stripInaccessible` or manual `Schema.sObjectType.X.isAccessible()`.
- **`with sharing` default.** Unless explicitly justified.
- **No `WITH SECURITY_ENFORCED` legacy.** `WITH USER_MODE` (modern) preferred.
- **CSRF on Visualforce / SFRA forms.** SFRA: `csrf.protectionEnabled = true`. Visualforce: tokens emitted by `<apex:form>` automatically; AJAX must include them.
- **No `dangerously-set-inner-html` LWC equivalents.** LWC sanitises HTML by default; bypassing requires `lwc:dom="manual"` and explicit sanitisation.
- **Named Credentials for outbound HTTP.** Avoid hard-coded URLs and credentials in callout classes.
- **Apex sharing rules tested.** A test class that exercises a non-admin user via `runAs(...)` and confirms the row is / is not visible as expected.

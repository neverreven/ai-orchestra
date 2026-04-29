# sfdx project patterns

## When this applies

Apply project-wide when the project is sfdx-based. Adapter glob: `sfdx-project.json`, `force-app/**/*`, `package.xml`, `.forceignore`, CI/CD workflow files that interact with `sf` / `sfdx` CLI.

These rules govern the project's structural conventions — how metadata is organised, how scratch orgs and CI deployment work, and how the source-of-truth model is enforced.

## Patterns to follow

- **`sfdx-project.json` declares package directories.** Each `force-app/`-style directory is a package. Production projects often have multiple package directories (one per managed package, one for unpackaged metadata).
- **Source format, not metadata format.** sfdx uses source format (one file per metadata component, decomposed). `manifest/package.xml` exists for legacy / metadata-API operations only.
- **`.forceignore` excludes generated and environment-specific metadata.** Profile / permission-set diffs from non-source orgs, log files, IDE files. Treat `.forceignore` like `.gitignore`.
- **Scratch orgs for dev, sandbox for staging, production for prod.** Scratch orgs are ephemeral; their lifecycle is per-feature. Sandbox is shared and partially-prod-like.
- **Scratch-org definition file (`config/project-scratch-def.json`) versioned.** Features, edition, settings declared there. Dev environments are reproducible.
- **`sf project deploy start --check-only` before merging to main.** Validates the deployment against a target org without executing.
- **Specified Apex tests on production deploys.** `--test-level RunSpecifiedTests --tests Test1 Test2 ...` for fast feedback. `RunLocalTests` for full validation. Never `NoTestRun` to prod.
- **Permission sets, not profiles, for new permissions.** Profiles are tightly coupled to user types and difficult to source-control cleanly. Permission sets are additive and version-friendly.
- **`unlocked package` model for code deployment.** Either second-generation packaging (2GP) for code shared across orgs, or org-dependent unlocked packages for code tied to one org's data.
- **CI runs validation deploy + Apex tests.** Every PR validates against an integration sandbox or scratch org. The deploy is rejected if Apex tests fail or coverage drops below 75%.
- **Manifest (`package.xml`) generated, not hand-edited.** `sf project generate manifest` from source, not `package.xml` written by hand.

## Anti-patterns to avoid

- **`force:source:retrieve` direct from production.** Pulls metadata down without context, bypasses source control. Always go through a controlled pull and a PR.
- **Modifying metadata via the org UI in production.** "Click-tracked" changes that don't go through source control diverge the org from the repo.
- **`profiles/` checked in unfiltered.** Profiles diff noisily — every page-layout assignment, every field-level security flag. Either decompose with sfdx, exclude via `.forceignore`, or accept the noise (last-resort).
- **`Username/Password Login Flow` in CI.** Use OAuth JWT (`sf org login jwt`) or auth-url (`sf org login sfdx-url`). Plain credentials in CI are a leak risk.
- **`manifest/package.xml` with `*` for every type.** "Deploy everything" deploys obsolete metadata. Be explicit about what changed.
- **Apex tests without `@IsTest(seeAllData=false)`.** Default depends on API version; explicit declaration is safer.
- **Deploys that include profile changes alongside code.** Profile changes deploy slowly and lock the org. Separate deploys; reduce risk.
- **`sf data import tree` for production seed data.** Production data is owned by users; only deploy seed data to fresh scratch orgs / sandboxes for testing.
- **Skipping `--check-only` validation on production deploys.** Always validate first, especially with new metadata types.

## When to deviate

- **Salesforce DX legacy projects.** Some projects predate source format and are stuck on metadata format. Migrate when feasible; until then, document.
- **Org-dependent unlocked packages with no scratch-org config.** Sandbox-only flows are valid for some teams; document the trade-off.
- **Salesforce Industries (Vlocity).** Vlocity DataPacks have their own retrieval / deployment tooling. Sfdx still applies to surrounding Apex / LWC.
- **Mass deployments via Metadata API.** When the surface is huge (e.g., a re-platforming), scratch orgs and source format may not be feasible. Document the workaround.

## References

- [Salesforce CLI documentation](https://developer.salesforce.com/docs/atlas.en-us.sfdx_cli_reference.meta/sfdx_cli_reference/).
- [Salesforce DX Developer Guide](https://developer.salesforce.com/docs/atlas.en-us.sfdx_dev.meta/sfdx_dev/).
- [Unlocked Packages overview](https://developer.salesforce.com/docs/atlas.en-us.sfdx_dev.meta/sfdx_dev/sfdx_dev_dev2gp.htm).
- [`apex.md`](apex.md) — Apex code lives under `force-app/main/default/classes/`.
- [`lwc.md`](lwc.md) — LWC bundles live under `force-app/main/default/lwc/`.
- [`sfra.md`](sfra.md) — SFRA cartridges (Commerce Cloud) coexist with sfdx in some repos.
- [`../skills.md`](../skills.md) — Salesforce skill addenda, including deployment-checklist notes.
- [`../../../skills/platform/deployment-checklist/SKILL.md`](../../../skills/platform/deployment-checklist/SKILL.md) — universal deployment-checklist.

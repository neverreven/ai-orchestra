# Fixture: salesforce-cartridge

A polyglot Salesforce project: a sfdx-managed Salesforce org (Apex + LWC) coexisting with a Commerce Cloud B2C SFRA storefront cartridge. The orchestra must detect both sub-flavours and layer the salesforce stack pack — including all four rule files — for the right scopes.

## What this fixture exercises

- **Detection:**
  - `salesforce` stack at high confidence.
  - Sub-flavours: `salesforce-sfdx` (from `sfdx-project.json` + `force-app/`) and `salesforce-sfra` (from `cartridges/int_my_storefront/`). Both are recorded in `profile.frameworks`.
  - Apex signal (`*.cls` file) confirms Apex coverage.
  - LWC signal (component bundle) confirms LWC coverage.
  - SFRA signal (cartridge folder + `.isml` template) confirms storefront coverage.
- **Existing infra:** none. The fixture is fresh-install scenario.
- **Install path:** every salesforce stack-pack rule (`apex.md`, `lwc.md`, `sfra.md`, `sfdx.md`) is rendered. Each rule's `globs:` activates only against matching files in the project.
- **Stack pack layering:** `core/stack-packs/salesforce/` rules + skills + roles addenda are applied per [`../../core/stack-packs/_overview.md`](../../core/stack-packs/_overview.md) §3.
- **Polyglot detection:** the SFRA cartridge's `cartridge.json` and the Salesforce overall identity should NOT cause a false positive `js-ts` detection (no project-root `package.json` declaring web-framework dependencies; the `.js` files are inside cartridges, which the discovery probe attributes to SFRA, not generic JS/TS).

## Source files

| File | Purpose |
|------|---------|
| [`sfdx-project.json`](sfdx-project.json) | Strong sfdx signal. |
| [`package.xml`](package.xml) | Medium signal: legacy metadata manifest. |
| [`force-app/main/default/classes/AccountController.cls`](force-app/main/default/classes/AccountController.cls) | Apex class — triggers `apex.md` rule scope. |
| [`force-app/main/default/classes/AccountController.cls-meta.xml`](force-app/main/default/classes/AccountController.cls-meta.xml) | Apex metadata sidecar. |
| [`force-app/main/default/lwc/accountList/accountList.js`](force-app/main/default/lwc/accountList/accountList.js) | LWC component JS — triggers `lwc.md` rule scope. |
| [`force-app/main/default/lwc/accountList/accountList.html`](force-app/main/default/lwc/accountList/accountList.html) | LWC template. |
| [`force-app/main/default/lwc/accountList/accountList.js-meta.xml`](force-app/main/default/lwc/accountList/accountList.js-meta.xml) | LWC metadata. |
| [`cartridges/int_my_storefront/cartridge.json`](cartridges/int_my_storefront/cartridge.json) | SFRA cartridge declaration. |
| [`cartridges/int_my_storefront/cartridge/controllers/Account.js`](cartridges/int_my_storefront/cartridge/controllers/Account.js) | SFRA controller — triggers `sfra.md` rule scope. |
| [`cartridges/int_my_storefront/cartridge/templates/default/account/show.isml`](cartridges/int_my_storefront/cartridge/templates/default/account/show.isml) | SFRA ISML template. |

## What is NOT in this fixture (deliberately)

- No prior `AGENTS.md`, no `.cursor/rules/`, no other agentic infra. (The `ongoing-python-web` fixture covers existing-infra preservation.)
- No `app_storefront_base/` cartridge — this fixture has only the integration cartridge. SFRA detection still fires from the presence of any `cartridges/<int_*>/` plus `.isml` content.
- No Apex test class (`*.cls` with `@isTest`) — the test framework signal (`apex-tests`) should be empty.
- No PWA Kit dependencies in the (absent) `package.json` — this fixture does not exercise the `salesforce-pwa-kit` sub-flavour.
- No managed package metadata.

## Expected outcome

See [`EXPECTED.md`](EXPECTED.md) for the contract.

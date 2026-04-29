# Signal: salesforce (Salesforce Platform / Commerce Cloud)

> First-class stack in v1. Detects Salesforce platform projects across SFDX (general Salesforce), SFRA (Commerce Cloud B2C Storefront Reference Architecture), and PWA Kit (Commerce Cloud headless).

**Stack id:** `salesforce`
**Stack pack:** `core/stack-packs/salesforce/` (PR 6)
**Sub-flavours:** `salesforce-sfdx`, `salesforce-sfra`, `salesforce-pwa-kit` (recorded in `profile.frameworks`)

## Strong signals (weight 3 each)

| Signal | Match | Notes |
|--------|-------|-------|
| `sfdx-project.json` exists at root | File presence | Definitive SFDX marker. |
| `force-app/` directory exists with subdirectories | Directory + content | SFDX project layout. |
| `cartridges/` directory exists with cartridge subdirectories | Directory + content | SFRA / Commerce Cloud B2C Storefront. |
| `package.json#dependencies` or `devDependencies` contains a package matching `@salesforce/*` | JSON inspection | Strong PWA Kit / Commerce Cloud indicator. |

## Medium signals (weight 2 each)

| Signal | Match |
|--------|-------|
| `manifest/package.xml` present | Salesforce metadata project. |
| `config/project-scratch-def.json` present | Scratch org definition (SFDX). |
| Any `*.cls` (Apex class) file in tracked code | Apex classes. |
| Any `*.trigger` (Apex trigger) file in tracked code | Apex triggers. |
| Any `*.lwc.js` or directory matching `lwc/<componentName>/<componentName>.js` | Lightning Web Components. |
| Any `*.aura/<componentName>.cmp` | Aura components (legacy but valid). |
| Any `*.flow-meta.xml` or `*.flexipage-meta.xml` | Flow Builder / FlexiPage metadata. |
| Any `*.isml` template file | SFRA ISML templates. |

## Weak signals (weight 1 each)

| Signal | Match |
|--------|-------|
| `.forceignore` present | SFDX ignore file. |
| `app_storefront_base/` cartridge present | Stock SFRA base cartridge. |
| `int_*` cartridge folders | SFRA convention for integration cartridges. |
| `package.json#dependencies` contains `@salesforce/pwa-kit-*` | PWA Kit. |
| `mobify-config.json` or `commerce-api.config.js` present | PWA Kit configuration. |
| `*.cls-meta.xml` files matching `*.cls` files | Apex metadata sidecars. |

## Sub-flavour resolution

If multiple Salesforce indicators match, classify into sub-flavours:

| Sub-flavour | Indicators |
|-------------|------------|
| `salesforce-sfdx` | `sfdx-project.json` + `force-app/` present. The general SFDX project. |
| `salesforce-sfra` | `cartridges/` present with `app_storefront_base/` or `int_*`. |
| `salesforce-pwa-kit` | `@salesforce/pwa-kit-*` packages in `package.json#dependencies`. Often coexists with a JS/TS detection. |

A project may be **multiple sub-flavours simultaneously** (e.g., SFRA storefront with a sister SFDX metadata project). Record each detected sub-flavour in `profile.frameworks`.

## Test framework detection

| Test framework | Match |
|----------------|-------|
| `apex-tests` | Any `*.cls` file containing `@isTest` annotation. |
| `lwc-jest` | `@salesforce/sfdx-lwc-jest` in `devDependencies`, or `jest.config.js` with LWC preset. |
| `jest` | Generic jest (often present alongside LWC Jest). |

## Known false positives / refinements

- A repo that only contains a `cartridges/` directory unrelated to Salesforce (very rare) can clear the threshold falsely. The probe should look for at least one ISML file or an `app_storefront_base/` reference before locking in `salesforce-sfra`.
- Projects with only a few `.cls` files but no SFDX manifest are likely external libraries that happen to use the `.cls` extension; they should not be treated as Salesforce projects.

## References

- [DETECTION.md](../DETECTION.md) — overall probe procedure.
- `core/stack-packs/salesforce/` — stack-specific content (PR 6).

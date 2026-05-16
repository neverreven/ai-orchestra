# SFRA / Commerce Cloud cartridge patterns

## When this applies

Apply when working with a Commerce Cloud B2C SFRA project — code inside `cartridges/<cartridgeName>/cartridge/...`. Adapter glob: `cartridges/**/*.js`, `cartridges/**/*.isml`, `cartridges/**/*.json` (cartridge-internal config), `cartridge.properties`.

SFRA (Storefront Reference Architecture) is the modern reference architecture for Commerce Cloud B2C, replacing SiteGenesis. It introduces an MVC-like model layer, server-side hooks, and a controller pattern explicit to the platform.

## Patterns to follow

- **Cartridge layering, not modification.** Never modify SFRA's `app_storefront_base` cartridge directly. Override by creating a higher-priority cartridge (`int_my_storefront`, `app_my_storefront`) and only patching what's actually different.
- **Controllers are thin.** A controller (`cartridge/controllers/Cart.js`) routes a request, calls a model, renders an ISML template. Business logic belongs in the model, not the controller.
- **Models are stateless.** A model takes raw data (a Demandware `Cart`, `Product`, etc.), produces a plain JS object the template can consume, and returns it. No side effects.
- **`server.append`, `server.prepend`, `server.replace` for controller extension.** Document why each is used. `server.replace` is the most disruptive; require justification.
- **`serverSide` data via `res.viewData` or `res.json`.** Templates read from `pdict` (the page dictionary). Don't sneak data through globals.
- **OCAPI / SCAPI for headless integrations, not direct DB access.** SFRA controllers are for server-rendered pages; headless storefronts use the Commerce APIs.
- **`Transaction.wrap` around DML.** Commerce Cloud's data model needs explicit transactions. `Transaction.wrap(function () { /* changes */ })`.
- **`DataAccess` / queries through the SDK.** `ProductMgr`, `CustomerMgr`, `OrderMgr` — never raw queries against the database.
- **Custom hooks via `package.json` `hooks` block.** SFRA's hook system is the integration point for partner integrations (payment gateways, tax calculators). Hooks have explicit signatures; respect them.
- **ISML templates do not contain business logic.** `<isscript>` blocks are forbidden in templates. Compute everything in the model; template only renders.
- **`csrf.protectionEnabled = true` in `cartridge.properties`.** Forms emit CSRF tokens; controllers validate.
- **`localizeService` for currency / locale-sensitive output.** Hard-coded `$` is a bug.

## Anti-patterns to avoid

- **Modifying `app_storefront_base`.** Updates from Salesforce overwrite changes. The whole reason SFRA was designed this way: composition over modification.
- **Business logic in ISML.** `<isscript>require('dw/order/OrderMgr').getOrder(...)</isscript>` in a template is a maintenance horror. Refactor to model.
- **Controllers calling other controllers.** Use a service or a helper module. Cross-controller calls reintroduce SiteGenesis-style coupling.
- **`require` paths with absolute filesystem paths.** Use the cartridge resolver (`cartridge/scripts/...`) so layering works.
- **Hard-coded site IDs / customer group names.** Pull from `Site.getCurrent()` / preferences / configuration.
- **`Logger.error` without correlation.** Every error log includes the order id / customer id where applicable.
- **`Pipeline.execute()` calls.** SFRA replaces SiteGenesis pipelines. New code does not call pipelines.
- **`http.HTTPClient` without timeout.** Default is no timeout; an unresponsive integration hangs the storefront thread.
- **JSON serialization of platform objects directly.** `JSON.stringify(order)` includes circular refs and exposes internal data. Use the model layer.

## When to deviate

- **SiteGenesis → SFRA migration.** Some SiteGenesis pipelines coexist with SFRA controllers during migration. The SFRA-only patterns above don't apply to remaining SiteGenesis code; document the migration plan.
- **Headless / SCAPI-based storefronts.** SFRA patterns mostly do not apply (no controllers, no ISML). Defer to the headless framework's docs.
- **Performance-critical pages.** Sometimes denormalising data into pdict at controller-time is faster than accessing the model lazily in the template. Profile, don't guess.
- **Custom-built integration cartridges.** A pure-integration cartridge with no UI is acceptable to deviate from the controller/model split — it might be services and hooks only.

## References

- [SFRA Developer Documentation (Salesforce help)](https://developer.salesforce.com/docs/commerce/b2c-commerce/guide/b2c-overview-storefront-reference-architecture.html).
- [SFRA Codebase on GitHub](https://github.com/SalesforceCommerceCloud/storefront-reference-architecture).
- [Commerce Cloud Documentation Index](https://help.salesforce.com/s/articleView?id=cc.b2c_commerce_cloud.htm).
- [`apex.md`](apex.md) — Apex is unrelated to SFRA, but a Salesforce engineer often crosses both surfaces.
- [`sfdx.md`](sfdx.md) — sfdx is the canonical project layout; SFRA cartridges live alongside `force-app/` in many orgs.
- [`../skills.md`](../skills.md) — Salesforce skill addenda, including SFRA-specific code-review checklist.

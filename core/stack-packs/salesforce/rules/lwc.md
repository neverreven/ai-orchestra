# Lightning Web Components patterns

## When this applies

Apply when working with Lightning Web Components — files inside an LWC bundle directory. Adapter glob: `**/lwc/**/*.js`, `**/lwc/**/*.html`, `**/lwc/**/*.css`, `**/lwc/**/*.xml`. Each LWC bundle has the shape `myComponent/{myComponent.js, myComponent.html, myComponent.css, myComponent.js-meta.xml}`.

LWC is Salesforce's modern UI framework — modelled on standard Web Components but with platform-specific decorators and conventions. Many web-component patterns apply; the deltas are governed here.

## Patterns to follow

- **Component name in camelCase, file/folder match.** A component named `myComponent` lives at `lwc/myComponent/myComponent.js`. The component class is `MyComponent`. The HTML element is `<c-my-component>`.
- **Single responsibility per component.** A component renders UI; logic lives in service modules (`lwc/utils/something.js`) or `@AuraEnabled` Apex methods.
- **`@track` is rarely needed (LWC v1.4+).** Reactivity is automatic for class-field assignments. `@track` is only for deeply nested object mutation.
- **`@api` for public properties and methods only.** Private state has no decorator. Treat the public API surface as a contract.
- **`@wire` for declarative data fetching.** Wired Apex methods (`@AuraEnabled(cacheable=true)`) get caching, refresh, and reactivity for free. Imperative Apex calls only when needed (writes, dynamic params).
- **`refreshApex` to invalidate wired data.** After a write, call `refreshApex(this.wiredResult)` so dependent UI refreshes.
- **`getRecord` / `getRecords` from `lightning/uiRecordApi` for record reads where possible.** No Apex needed; the platform handles caching, FLS, and sharing.
- **Custom events bubble + composed when escaping shadow DOM.** `this.dispatchEvent(new CustomEvent('change', { detail, bubbles: true, composed: true }))` for events that parents in a different shadow root need to hear.
- **No mutation of `@api` properties from inside the component.** Inputs are read-only; emit events for parent reaction.
- **CSS scoped per component by default.** Cross-component styles go in `--c-*` CSS custom properties or use `@salesforce/css-component` patterns. Don't break the encapsulation reflexively.
- **Internationalisation via `@salesforce/label/c.MyLabel`.** Hard-coded user-facing strings are reviewed as bugs.
- **Loading / error states explicit.** `if (this.isLoading)`, `if (this.error)`, plus the success branch. No "the data should be there by now" assumptions.

## Anti-patterns to avoid

- **`querySelector` reaching outside the component's shadow root.** Encapsulation violation; brittle. If you need to coordinate with a sibling, use events.
- **`setTimeout` for "wait for the DOM."** Use `renderedCallback` and ensure the work is idempotent (it can run multiple times).
- **Mutating arrays / objects in place that are passed as `@api`.** Triggers no reactivity in the parent; eventually causes confusing bugs.
- **`@track` on every property "to be safe."** Adds overhead and signals you don't trust the framework. Read the docs; trust the reactivity model.
- **Skipping the `@AuraEnabled` security check.** A wired method must enforce CRUD/FLS the user actually has. `Schema.sObjectType.X.isAccessible()` checks at the boundary.
- **Inline event handlers with `bind`.** `onclick={handleClick.bind(this)}` is unnecessary; `onclick={handleClick}` works because LWC binds the method to the component automatically.
- **Importing static resources via fetch.** Use `loadScript` / `loadStyle` from `lightning/platformResourceLoader` so the platform handles caching and security.
- **`window.location.href = ...` for navigation.** Use `NavigationMixin.Navigate(...)` so the platform handles deep linking, state, and Lightning App context.
- **Massive `connectedCallback`.** Lifecycle hooks should set up subscriptions / wired references; heavy work belongs elsewhere.

## When to deviate

- **Aura → LWC migration.** During migration, some components stay in Aura while their children become LWC. Cross-framework events use Lightning Message Service (LMS).
- **Public Lightning Out / Salesforce Mobile App context.** Some APIs unavailable; fallback strategy required.
- **Performance-critical lists.** Virtualisation / `lightning-datatable` (with the `enableInfiniteLoading` pattern) instead of rendering thousands of rows.
- **Programmatic component creation.** `lwc.createElement` for very dynamic UIs; constraint: the imported component must be statically `import`ed first.

## References

- [LWC Developer Guide](https://developer.salesforce.com/docs/component-library/documentation/en/lwc).
- [LWC Recipes (sample components)](https://github.com/trailheadapps/lwc-recipes).
- [Lightning UI API](https://developer.salesforce.com/docs/atlas.en-us.uiapi.meta/uiapi/).
- [`apex.md`](apex.md) — Apex patterns; `@AuraEnabled` Apex is the server bridge for LWC.
- [`sfra.md`](sfra.md) — SFRA does not use LWC, but Commerce Cloud B2C admin tools sometimes do.
- [`../skills.md`](../skills.md) — Salesforce skill addenda, including LWC-specific code-review checklist.

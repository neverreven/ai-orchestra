# Flow patterns

## When this applies

Apply when working with Salesforce Flows (Screen Flows, Record-Triggered Flows, Autolaunched Flows, Scheduled Flows, Platform Event-Triggered Flows). Adapter glob: `**/flows/**/*.flow-meta.xml`, `**/flowDefinitions/**`. Consult alongside `apex.md` when Apex invocable actions or custom controllers interact with Flows.

Flows are the platform's primary automation tool, replacing Process Builder and most Workflow Rules since Winter '23. The patterns here cover declarative design discipline that prevents the performance, maintenance, and governor-limit issues that scaled Flow usage introduces.

## Patterns to follow

### Structure

- **One Flow per automation concern.** A record-triggered Flow should handle one logical concern (e.g., "set default field values on Case creation" or "send notification when Opportunity stage changes"). Don't merge unrelated automations into a single Flow — it makes debugging impossible when the Flow is 80 elements wide.
- **Naming convention: `<Object>_<Trigger>_<Purpose>`** for record-triggered Flows. `Case_AfterCreate_SetDefaults`, `Opportunity_AfterUpdate_StageNotification`. Screen Flows: `SF_<Domain>_<Purpose>` — `SF_Onboarding_NewHire`.
- **Description is mandatory.** Every Flow's description explains what it does and when it fires. Descriptions appear in Setup > Flows and in deployment reports — they are the first thing a debugger reads.
- **Label subflows, not just elements.** When a Flow calls a Subflow, the label on the Subflow element should match the Subflow's API name. Discrepant labels create confusion in Flow debug logs.

### Record-Triggered Flows

- **Before-save where possible.** Before-save Flows avoid DML (the record saves automatically at the end of the before context). This eliminates a governor-limit DML operation and a potential recursion cycle. Use after-save only when you need to create/update *other* objects or call async processes.
- **Entry criteria as tight as possible.** The `Entry Conditions` on a record-triggered Flow control how many records enter the automation. Broad conditions (e.g., `IsChanged(Status)`) that then branch inside the Flow waste execution context for records that don't match. Push the filters to the entry conditions.
- **Bulkification awareness.** Record-triggered Flows run per-record in the v56+ model. For loops within a Flow that perform DML or SOQL, the same governor limits apply as Apex. Use Collection variables and batch the DML/SOQL outside the loop.
- **No SOQL/DML inside loops.** Same as Apex: a `Get Records` inside a `Loop` element is an N+1 query. Fetch the collection before the loop; use an `Assignment` to build a collection for `Update Records` after the loop.
- **Run-mode: System Context with Sharing vs. User Context.** Understand the security implications. Default to "Run in User Context" unless you have a documented reason for system context (e.g., updating records the running user can't edit). Document the reason in the Flow description.

### Screen Flows

- **Screens are thin.** A screen collects user input. Validation, data transformation, and DML happen in subsequent elements, not in formula fields on the screen. This separation makes the Flow debuggable (you can see exactly which element failed).
- **Navigation guard.** For multi-screen Flows, disable the `Previous` button on screens where going back would cause duplicate DML (e.g., record already created in a prior element). Alternatively, use `Pause` elements for Flows that span sessions.
- **Input validation before DML.** Use a `Decision` element after a screen to validate inputs before a `Create/Update Records` element. Don't rely on Salesforce's native validation rules to catch everything — Flows that hit validation-rule errors mid-execution leave the user in a confusing state.

### Subflows

- **Reuse via Subflows, not copy-paste.** When the same automation logic applies to multiple objects or triggers, extract it into an Autolaunched Subflow and call it from multiple parent Flows. This is the Flow equivalent of extracting a shared function.
- **Subflow contract: explicit input/output variables.** Every Subflow declares input variables (marked `Available for Input`) and output variables (marked `Available for Output`). Don't rely on global variables or cross-Flow formulas — they're brittle and invisible.

### Scheduled and Platform-Event Flows

- **Scheduled Flows: idempotent.** A scheduled Flow that runs nightly must handle records that were already processed. Check a flag field or a timestamp before re-processing.
- **Platform-Event Flows: decouple consumption from production.** The event producer and the event consumer should not share mutable state. The Flow that fires on a Platform Event should only read the event payload and route to a Subflow or Apex.

## Anti-patterns to avoid

- **Multiple record-triggered Flows on the same object/event with order-of-execution dependencies.** Flow execution order on the same trigger is non-deterministic (unless trigger order is explicitly set, which introduces its own maintenance burden). Design each Flow to be independent.
- **Recursive Flows without guards.** A before-save Flow that updates a field on the same record may re-trigger itself (depending on version). Use `$Flow.CurrentRecord` checks or set a "Flow Already Processed" flag to short-circuit.
- **`Get Records` returning all fields.** Select only the fields the Flow needs. Full-record fetches increase heap size and risk governor limits on wide objects.
- **Hardcoded IDs in Flow formulas.** Same rule as Apex. Use Custom Metadata Types or Custom Labels instead.
- **Inactive Flows deployed to production.** Dead metadata. Remove inactive versions from source control; deploy only active Flows. An inactive Flow that was once active may still appear in debug logs, confusing investigations.
- **`Fault` connector pointing to nothing.** Every element that can fail (DML, SOQL, callout) should have a Fault path that either logs the error, notifies an admin, or surfaces a user-friendly message. An unconnected Fault silently swallows the error.

## When to deviate

- **Apex triggers co-existing with Flows on the same object.** In legacy orgs, some automations are in Apex triggers and some in Flows. The order-of-execution (Apex before-trigger → before-save Flow → DML → after-save Flow → Apex after-trigger) is documented by Salesforce. Accept the coexistence temporarily; plan migration to consolidate.
- **Process Builder not yet migrated.** Salesforce is retiring Process Builder. Existing processes still run but should be migrated to Flows on each object as the team touches that area. Don't migrate the entire org at once — do it file-by-file.

## References

- `apex.md` — Apex patterns (for invocable actions called from Flows)
- `lwc.md` — LWC patterns (for screen components embedded in Screen Flows)
- `sfdx.md` — deployment patterns (Flows deploy as metadata)

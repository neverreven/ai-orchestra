# OmniStudio patterns

## When this applies

Apply when working with Salesforce OmniStudio components: OmniScripts (guided interactions), FlexCards (declarative UI), DataRaptors (data mapping), and Integration Procedures. Adapter glob: `**/omniScripts/**`, `**/flexCards/**`, `**/dataRaptors/**`, `**/integrationProcedures/**`, `**/*OmniScript*`, `**/*FlexCard*`, `**/*DataRaptor*`, `**/*IntegrationProcedure*`.

OmniStudio straddles declarative and code. The patterns here cover both the metadata configuration and the custom Apex / LWC that extends it.

## Patterns to follow

### OmniScripts

- **One OmniScript per user journey.** A script is a guided flow. Don't pile unrelated journeys into a single script with branching. Use `Navigate` or `Launch` actions to chain separate scripts for distinct stages.
- **Step naming convention.** `Step_<n>_<purpose>` — `Step_1_CustomerInfo`, `Step_2_PlanSelection`. Discoverable in Tooling API queries and in the Design Canvas.
- **Reusable elements.** Extract shared question blocks into reusable `Type: Remote Action` or `Type: Custom LWC` elements rather than copy-pasting across scripts. Reference them by name; don't duplicate.
- **Data layer via Integration Procedures.** OmniScripts should not contain inline SOQL or Apex Callouts. Route all data access through Integration Procedures (below) or DataRaptors so the data layer is testable independently.
- **Version management.** Activate exactly one version per OmniScript. Deactivate the previous version before activating the new one — two active versions of the same Type/SubType cause non-deterministic loading. Track active version numbers in metadata or a decision log.
- **Error handling at every Remote Action.** Configure the `Error Message` field. A blank error field means the user sees a cryptic JSON error when the remote call fails.
- **Conditional visibility, not conditional steps.** Use `Show If` conditions to reveal/hide elements within a step. Separate steps for every variant creates a flow chart that's impossible to maintain.

### FlexCards

- **Keep cards thin.** A FlexCard is a read-only presentation surface. If it needs interactive logic, embed a custom LWC inside it rather than chaining dozens of conditional renders.
- **Datasource: Integration Procedure > Direct SOQL.** Direct SOQL in a FlexCard is convenient but non-cacheable and bypasses governor-limit planning. Use an Integration Procedure as the datasource for anything beyond trivial lookups.
- **State management via parent OmniScript.** When a FlexCard is embedded inside an OmniScript, pass context from the script — don't re-fetch the same data inside the card.
- **Naming: `FC_<Object>_<Context>`** — `FC_Account_Summary`, `FC_Case_Timeline`. Prefix makes it easy to filter in Setup.

### DataRaptors

- **Extract (read) vs. Transform (map) vs. Load (write).** Each DataRaptor has exactly one mode. Don't abuse Transform mode to perform DML — that's Load mode's job.
- **Field mappings explicit, not wildcards.** Map only the fields the consumer needs. `SELECT *` equivalents in DataRaptors transfer unnecessary data and hit describe-call limits.
- **Avoid circular references between DataRaptors.** A → B → A creates infinite loops the platform does not guard against. Keep the dependency graph acyclic.
- **Name: `DR_<Mode>_<Object>_<Purpose>`** — `DR_Extract_Account_Summary`, `DR_Load_Case_Create`.

### Integration Procedures

- **Single-responsibility.** One Integration Procedure fetches / mutates one conceptual resource. Compose complex orchestrations by chaining procedures via OmniScript or Apex, not by stuffing 15 actions into one IP.
- **Error actions at every external callout.** The `Catch` mechanism in IPs silently swallows errors unless a Catch action is placed explicitly. Always add one.
- **Remote action callout timeouts.** Set the `Timeout` field (default is 120s). For external APIs, 30s is a reasonable ceiling. A 120s timeout holding an Apex execution thread causes transaction-limit pressure.
- **Test via anonymous Apex or the IP Debug Console.** Don't rely on OmniScript E2E tests as the only coverage for Integration Procedures — test them in isolation.
- **Version in the Name or SubType.** `IP_Account_GetSummary_v2`. The platform's versioning UI is rudimentary; an in-name version is easy to search.

## Anti-patterns to avoid

- **Business logic in OmniScript JSON expressions.** The `VLOOKUP`, `IF`, and `CONCATENATE` formula engine is fragile and untestable. Anything beyond simple field display logic should move to an Integration Procedure or custom LWC.
- **Manual metadata edits outside the Design Canvas.** Editing OmniScript JSON directly (in source control or Tooling API) without deploying through the Canvas can produce metadata that loads in the Canvas but fails at runtime. Always round-trip through the Canvas for verification.
- **Hardcoded IDs in DataRaptors.** Same rule as Apex: no record IDs, profile IDs, or org-specific identifiers. Use external IDs or developer names.
- **Deploying inactive OmniScript versions to production.** Inactive versions in production are dead weight that confuse the design canvas and inflate metadata. Delete them before deployment or immediately after.
- **Using FlexCards for write operations.** FlexCards are read-only by design. For data entry, use OmniScripts or custom LWC.

## When to deviate

- **Vlocity-era namespaces.** Projects still on the `vlocity_cmt` or `vlocity_ins` namespace (pre-migration to `omnistudio`) must use the legacy namespace. Don't mix namespaces in the same org.
- **Managed package constraints.** Some OmniStudio features are restricted in managed packages. Document the constraint; don't work around it with unsupported hacks.

## References

- `apex.md` — Apex patterns (apply alongside for custom Apex extensions)
- `lwc.md` — LWC patterns (apply alongside for custom LWC in OmniScripts/FlexCards)
- `sfdx.md` — sfdx deployment patterns (OmniStudio metadata deploys via the same pipeline)

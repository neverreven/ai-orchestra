# Salesforce security patterns

## When this applies

Apply when working with any Salesforce code that handles data access, user permissions, external integrations, or authentication. This is a cross-cutting rule — consult alongside `apex.md`, `lwc.md`, `flow.md`, and `omnistudio.md`. Adapter glob: `**/*.cls`, `**/*.trigger`, `**/*.js` (under LWC directories), `**/flows/**`, `**/permissionsets/**`, `**/profiles/**`.

Salesforce security is multi-layered (org-level, object-level, field-level, record-level) and enforced by the platform itself — but only when the code cooperates. The patterns here prevent the security gaps that code reviews and Salesforce Security Review (AppExchange) consistently flag.

## Patterns to follow

### Apex sharing and access control

- **`with sharing` as the default.** Every Apex class declares `with sharing` unless there is a documented reason to bypass sharing rules. An undeclared class inherits sharing from the caller — which is context-dependent and impossible to reason about statically.
- **`without sharing` only in service classes with a documented justification.** Common valid cases: batch jobs that process records across all users, integration classes that sync external data to records the integration user can't see through sharing. Document the justification in a class-level comment.
- **`inherited sharing` for utility classes.** Helper classes that don't know their caller's context should declare `inherited sharing` so they inherit the caller's sharing mode rather than silently defaulting.
- **CRUD and FLS checks before DML and SOQL.** Use `Schema.sObjectType.<Object>.fields.<Field>.isAccessible()` (read) and `.isCreateable()` / `.isUpdateable()` (write) before operating on fields. Or use `Security.stripInaccessible(AccessType, records)` (Spring '20+) to automatically remove fields the running user can't access.
- **`WITH SECURITY_ENFORCED` in SOQL.** Adding `WITH SECURITY_ENFORCED` to SOQL queries enforces FLS at query time (throws if the user can't see a queried field). Prefer this over manual FLS checks for read paths where a hard failure is acceptable.
- **Bypass `stripInaccessible` in tests, not in production.** Test classes often run as System Administrator, so FLS checks pass trivially. Create a test user with a restricted profile and run FLS-sensitive tests as that user via `System.runAs(restrictedUser)`.

### SOQL injection

- **No dynamic SOQL with string concatenation on user input.** This is the Salesforce equivalent of SQL injection. Use bind variables: `Database.query('SELECT Id FROM Account WHERE Name = :userInput')`. When dynamic field names are needed, validate against `Schema.getGlobalDescribe()` rather than trusting the input.
- **`String.escapeSingleQuotes` is not enough.** It prevents the simplest injection vector but not all. Bind variables are the only safe approach for values. Escape is acceptable only for field/object names that have been validated against the describe cache.

### LWC security

- **`@wire` and `@AuraEnabled(cacheable=true)` respect server-side sharing.** The LWC security model delegates data-access control to the server. The server method must enforce sharing (`with sharing`), CRUD, and FLS. The LWC itself does not have permission enforcement — it displays whatever the server returns.
- **No secrets in client-side code.** LWC JavaScript bundles are visible in the browser. API keys, tokens, and credentials belong in Named Credentials or Custom Metadata — never in JS constants.
- **CSP compliance.** LWC enforces Content Security Policy (CSP) by default. No `eval()`, no inline event handlers, no `<script>` tags. Third-party libraries that require CSP relaxation must be loaded via `platformResourceLoader` from a Static Resource and vetted for CSP compliance.
- **Lightning Locker / Lightning Web Security.** Understand which security sandbox the org uses (Locker for Aura, LWS for LWC in newer orgs). LWS is more permissive but still blocks direct DOM access to components outside your namespace.

### Authentication and external integrations

- **Named Credentials for all external callouts.** Named Credentials centralise endpoint, auth scheme, and credentials in Setup. `HttpRequest.setEndpoint('callout:MyNamedCredential/path')` in Apex. Never hardcode URLs or tokens in code.
- **OAuth 2.0 via Auth Provider + Named Credential.** For OAuth-protected APIs, configure an Auth Provider in Setup and link it to a Named Credential. Apex code never sees the token.
- **Certificate-based auth for B2B integrations.** Mutual TLS certificates are managed in Setup > Certificate and Key Management. Reference them by developer name in Named Credentials; never embed PEM strings in code.
- **Connected App scopes minimised.** A Connected App should request the minimum OAuth scopes needed. `full` scope is almost never justified for a third-party integration.

### Permission sets and profiles

- **Permission sets over profiles.** Profiles are legacy (one per user). Permission Sets and Permission Set Groups are composable and auditable. New permissions go in a Permission Set; profile changes only for base-level defaults.
- **No direct profile edits in source control.** Profile XML files are enormous and merge-conflict-prone. Use Permission Sets (which have clean, small XML files) and assign them via Permission Set Groups.
- **Custom permissions for feature gates.** Use `CustomPermission` objects to gate features in Apex (`FeatureManagement.checkPermission('MyFeature')`). This separates "who can access" from "what the feature does" and avoids profile/permission-set bloat.
- **Platform events and Change Data Capture: permission-gated.** Publishing and subscribing to Platform Events requires explicit object permissions. Don't assume all users can subscribe to an event channel.

### Data protection

- **Encryption: Shield Platform Encryption for PII fields.** Classify fields by sensitivity. PII fields (SSN, financial data, health info) should use Shield Encryption. Encrypted fields have query limitations (no `LIKE`, no `ORDER BY`) — design around them.
- **Data Masking in sandboxes.** Sandboxes should not contain production PII. Use Salesforce Data Mask or equivalent before granting sandbox access to developers.
- **Audit Trail monitoring.** `SetupAuditTrail` tracks admin changes; `FieldHistory` tracks data changes. Configure both for security-sensitive objects. In code, never bypass `FieldHistory` by using `without sharing` + direct DML on tracked fields.

## Anti-patterns to avoid

- **`without sharing` on a controller called by LWC.** The LWC runs in the user's context, but the controller bypasses sharing — the user sees data they shouldn't through the UI. This is the #1 Salesforce Security Review finding.
- **`@AuraEnabled` methods without CRUD/FLS checks.** The `@AuraEnabled` annotation exposes a method to the client. If the method doesn't enforce FLS, any user with access to the component can read/write any field the method touches.
- **Storing tokens in Custom Settings (non-protected).** Custom Settings of type "List" are readable by all users via `$Setup` formulas. Use Custom Metadata (or better, Named Credentials) for anything sensitive.
- **`HttpRequest.setEndpoint('https://api.example.com/...')` in Apex.** Hardcoded endpoints bypass Named Credential rotation, auditing, and environment-specific configuration. The endpoint also leaks into debug logs.
- **Dynamic SOQL with unvalidated field names from Lightning component input.** Even without value injection, an attacker can exfiltrate data from any accessible field by controlling which fields the query returns.
- **`global` access modifier on classes without a justified need.** `global` makes a class callable from any namespace (managed packages, external code). Default to `public`. Use `global` only when the class is part of a managed package's public API.

## When to deviate

- **Scratch org development.** During active development in a scratch org, FLS checks may be relaxed for speed. But code must pass FLS checks before it enters the CI pipeline — add FLS test coverage early, not as a late gate.
- **ISV managed packages (AppExchange).** ISV code must pass the Salesforce Security Review, which is stricter than internal org rules. The patterns above are a floor; the Security Review adds additional requirements (no dynamic Visualforce, no `RemoteAction` without CSRF tokens, etc.).

## References

- `apex.md` — Apex patterns (sharing, SOQL, DML — foundational to security)
- `lwc.md` — LWC patterns (CSP, client-side security model)
- `flow.md` — Flow patterns (run-mode security: System Context vs User Context)
- `omnistudio.md` — OmniStudio patterns (Integration Procedure security)
- `sfdx.md` — deployment patterns (permission set deployment, connected app config)

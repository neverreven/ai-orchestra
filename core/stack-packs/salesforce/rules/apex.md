# Apex patterns

## When this applies

Apply when working with Apex classes, triggers, anonymous Apex, or test classes. Adapter glob: `**/*.cls`, `**/*.trigger`, `**/*.cls-meta.xml`, `**/*.trigger-meta.xml` (typically under `force-app/main/default/classes/` and `force-app/main/default/triggers/`).

These rules cover Apex's distinctive concerns: governor limits, bulk-safe code, SOQL discipline, and the rigid testing requirements imposed by the platform.

## Patterns to follow

- **Bulk-safe by default.** Every method assumes it's called with a list, even if called with a single record. No `for (Account a : trigger.new) { /* DML inside */ }`. The DML and SOQL go outside the loop, operating on the collection.
- **One trigger per object.** Multiple triggers on the same object run in non-deterministic order. Use a single trigger that delegates to a handler class (FFLib trigger framework or hand-rolled).
- **Trigger handlers separate logic by event.** `beforeInsert`, `afterUpdate`, etc. — each in its own method. The trigger itself routes; logic lives in the handler.
- **SOQL query in a loop is a critical bug.** Move the query out, build a `Map<Id, X>` from the result, and look up inside the loop.
- **DML in a loop is a critical bug.** Same pattern: collect changes into a `List<X>`, then perform one DML at the end.
- **Selective queries.** Always include indexed fields in `WHERE`. Confirm with the Query Plan Tool. `WHERE Field__c LIKE '%foo'` is non-selective and will fail at scale.
- **Limit results.** `LIMIT 50000` is the platform max; for queries that might exceed, use Database.query iterators or QueryLocator (batch).
- **`with sharing`, `without sharing`, `inherited sharing` declared explicitly.** Default behaviour depends on the entry point; explicit declaration removes ambiguity. Default to `with sharing` unless there's a documented reason otherwise.
- **Custom exceptions extend `Exception`.** `public class MyDomainException extends Exception {}`. Catch by specific type, not bare `Exception`.
- **`@AuraEnabled` methods reviewed.** Every `@AuraEnabled(cacheable=true)` method's input is sanitised; the method does not return data the calling user shouldn't see.
- **`Database.executeBatch(...)` for jobs over governor limits.** Synchronous Apex has hard CPU and SOQL limits. Batchable / Queueable / Schedulable for long-running work.
- **`@TestSetup` for shared test data.** Creates data once per test class, not once per test method.
- **`Test.startTest()` / `Test.stopTest()` around the code under test.** Resets governor limits and forces async work to complete inline.
- **Assertions present.** Every test asserts something. `System.assertEquals(expected, actual, message)` with a message that explains the failure.

## Anti-patterns to avoid

- **Hardcoded record IDs.** `Id rt = '012xxxxxx';` breaks across orgs. Look up by developer name (`RecordType.DeveloperName`).
- **Hardcoded usernames or profile names.** Same problem. Use `User` lookups by alias / a custom metadata mapping.
- **`Schema.getGlobalDescribe()` in trigger paths.** Heavy; cache results.
- **Recursive triggers without guards.** A trigger updating its own object re-fires the trigger. Use a static recursion-guard or refactor to before-insert / before-update where possible.
- **`SeeAllData=true` in test classes.** Couples tests to org data; brittle. Default is `SeeAllData=false`; add it back only for tests of `Pricebook2` or other features that genuinely need org data.
- **Bypassing `with sharing` via `without sharing` to "make it work".** Usually a sign that the design is wrong. Document why if you must.
- **Catching `Exception` and continuing.** Apex doesn't have unchecked exceptions in the Java sense; bare `catch (Exception e)` swallowing a real error makes debugging impossible.
- **`Limits.getQueries()` as a substitute for design.** Counting queries to stay under 100 doesn't fix the underlying N+1.
- **Test classes without `@isTest`.** The annotation is required; without it the test won't run on deployment-validate.

## When to deviate

- **Pre-`API v50` legacy code.** Some constructs (`String.escapeSingleQuotes`, older trigger handler frameworks) are around for backwards-compat. Plan migration; don't rewrite reflexively.
- **Performance-sensitive trigger paths.** Sometimes the cleanest design (factory + dispatcher) costs CPU. If profiling shows the bottleneck, denormalise; document the trade-off.
- **Managed-package code.** Code inside a managed package has different visibility rules. Patterns above mostly hold; some namespace gymnastics is unavoidable.
- **Apex platform events / async pipelines.** Different concurrency model than synchronous; some patterns (DML in loops) become unavoidable in the publish path.

## References

- [Apex Developer Guide](https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/).
- [Apex Best Practices](https://developer.salesforce.com/wiki/apex_code_best_practices).
- [Salesforce — Governor Limits](https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/apex_gov_limits.htm).
- [`lwc.md`](lwc.md) — LWC patterns; `@AuraEnabled` Apex is the bridge.
- [`sfdx.md`](sfdx.md) — sfdx project layout; class files live under `force-app/main/default/classes/`.
- [`../skills.md`](../skills.md) — Salesforce skill addenda, including Apex-specific code-review checklist.

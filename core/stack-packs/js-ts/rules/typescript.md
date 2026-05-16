# TypeScript patterns

## When this applies

Apply when working with `.ts`, `.tsx`, `.cts`, `.mts`, or `.d.ts` files. Adapter glob: `**/*.{ts,tsx,cts,mts,d.ts}`.

These rules are orthogonal to the framework rules (React, Vue, Svelte) — they govern TypeScript usage itself: how to express types, when to escape them, and how to keep the inference engine doing the work.

## Patterns to follow

- **`strict: true` (or stricter) in `tsconfig.json`.** All seven strict flags on, plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, and `noFallthroughCasesInSwitch`. New projects: enable all of these from day one. Existing projects: enable progressively, fixing per file.
- **Prefer inference over annotation.** TypeScript infers most local variable types. Annotate function parameters, public API return types, and exported types — leave the rest to inference. Over-annotation is noise.
- **Branded types for primitives that are not interchangeable.** A `UserId` and a `string` look the same to JavaScript but are not interchangeable in domain logic. Use a brand: `type UserId = string & { readonly __brand: 'UserId' }`.
- **Discriminated unions for state machines.** A request that is `loading | success | error` is a single union type with a `kind` discriminant, not three booleans. The compiler enforces exhaustiveness on `switch (state.kind)`.
- **`as const` for literal-narrowness.** When you need TypeScript to infer `'foo'` (the literal) instead of `string` (the widened type), append `as const`. Especially common for object literals used as enums.
- **Type-only imports.** Use `import type { X } from '...'` for symbols used only as types. The bundler can drop them. Configure `verbatimModuleSyntax: true` to enforce.
- **Public API returns Promises, not callbacks.** Async work returns a `Promise<T>`. Callbacks are an internal-only detail. Modern Node + browser APIs all support promises.
- **Errors are typed when they cross module boundaries.** Inside a module, `throw new Error()` is fine. Across module boundaries, return a `Result<T, E>` (or use a domain-specific union) so callers cannot ignore failures.
- **`unknown`, not `any`.** When the type is genuinely unknown (parsing JSON, third-party SDK), accept `unknown` and narrow with type guards before use. `any` disables type checking; `unknown` makes the narrowing explicit.

## Anti-patterns to avoid

- **`any` as a quick fix.** Almost always a symptom that the type model is wrong. Pause; fix the type. If genuinely needed, use `// @ts-expect-error: <reason>` with an explanation, scoped narrowly.
- **`!` non-null assertion as a comma operator.** `obj!.foo!.bar!` is a code smell — three lies in a row. If you need them, the type is wrong; if it's only one occurrence, use a guard or `??`.
- **`as` casts to satisfy the compiler.** `value as Foo` bypasses the checker. Use type guards (`function isFoo(x): x is Foo`) so the narrowing has runtime backing.
- **Re-exporting types as values.** `export { Foo }` re-exports as both type and value, breaking tree-shaking. Use `export type { Foo }` for types-only re-exports.
- **`Function`, `Object`, `String` as types.** These are JavaScript constructors, not TypeScript types. Use `() => void` (or the actual signature), `Record<string, unknown>`, or `string`.
- **Optional + default parameters together (`(x?: number = 0)`).** Pick one. If the parameter has a default, it's not optional from the caller's perspective.
- **Wildcard types in generics (`<T = any>`).** Defaulting to `any` cancels the benefit of the generic. Either default to a meaningful type or require the caller to provide one.

## When to deviate

- **Library code with unstable upstream types.** When a third-party type definition is wrong, adding a local override or `@ts-expect-error` is acceptable, with a TODO referencing the upstream issue.
- **Migrating large JS codebases.** The first pass to TypeScript reasonably uses `any` in many places. Make a tracking issue; rip it out incrementally. The audit's `code-review` skill flags `any` density and reports drift.
- **Performance-sensitive hot paths.** Some TS features (`infer`, deep recursive conditional types) compile slowly. If a type lights up the compiler-time profiler, simplify it — even at the cost of a wider type.
- **Output type generators (e.g., GraphQL codegen, Prisma).** Code-generated types are owned by the tool. Do not manually edit; regenerate.

## References

- [TypeScript docs — Do's and Don'ts](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html).
- [TypeScript docs — Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html).
- [`react.md`](react.md) — React patterns that apply to `.tsx` files.
- [`node-server.md`](node-server.md) — Node-server patterns; especially the typed-error sections.
- [`../skills.md`](../skills.md) — JS/TS skill addenda, including TypeScript-specific code-review checklist.
- [`../../../skills/code/code-review/SKILL.md`](../../../skills/code/code-review/SKILL.md) — universal code-review skill.

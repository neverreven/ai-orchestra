# React patterns

## When this applies

Apply when working with files containing React components, hooks, or React-specific JSX/TSX. Adapter glob: `**/*.{jsx,tsx}` and JS/TS files that import from `react` or `react-dom`.

The agent should consult this file when reading, writing, reviewing, or refactoring React component code, regardless of which state library or styling system the project uses. Patterns here are framework-level, not library-specific.

## Patterns to follow

- **Functional components only.** Class components are legacy. Convert when touching them; do not introduce new ones.
- **One concern per component.** A component renders UI; logic belongs in custom hooks. If a component file has a non-trivial `useEffect`, extract it to a `useX` hook.
- **Hooks honor the rules.** Top-level only, never inside loops/conditions/nested functions; only inside React functions or other hooks. Lint with `eslint-plugin-react-hooks` and respect its `react-hooks/exhaustive-deps` warnings unless deviation is explained inline.
- **Stable identity for callbacks passed to memoized children.** Use `useCallback` and `useMemo` only when there is a measurable reason (memoized child, expensive computation, or a `useEffect` dependency). Adding them by default is noise.
- **State as data, not duplicated truth.** If a value can be derived from props or other state, derive it in render — do not put it in `useState`.
- **`key` is identity, not index.** Use stable, unique ids for list keys. Index keys are acceptable only for static, never-reordered lists.
- **Co-locate styles and tests.** A component named `Foo.tsx` lives alongside `Foo.test.tsx` and `Foo.module.css` (or whatever styling convention the project uses). Long-distance file-tree navigation between them is friction.
- **Props down, events up.** Children receive data as props and emit events for parent reaction. Children do not reach upward (no global mutable refs to siblings).
- **Suspense boundaries for async UI.** Use `<Suspense>` and error boundaries explicitly for any data-fetching component that might be slow or fail. Don't rely on undefined-during-loading rendering.
- **Avoid prop drilling beyond two levels.** Extract a context, hoist state, or use a state library — but make the choice explicit.

## Anti-patterns to avoid

- **Inline object/array literals as memo dependencies.** `useMemo(() => fn(), [{ x: 1 }])` recomputes every render because the object identity changes. Hoist the literal or destructure stable values.
- **Side effects in render.** Mutations to module state, network calls, or DOM reads at render time break React's rendering contract. Move to `useEffect` or event handlers.
- **`useEffect` for derivations.** If you can compute it during render, do not stash it in state via `useEffect`. This causes one wasted render every time the input changes.
- **Forgetting cleanup in effects with subscriptions.** Every `useEffect` that adds listeners, intervals, or subscriptions must return a cleanup function. The audit's accessibility / performance skills both flag this.
- **Conditional hook calls.** `if (condition) useState(0)` is a runtime error after the first conditional change. Lint catches this; never bypass.
- **`dangerouslySetInnerHTML` on user input.** Always sanitise. Use a vetted sanitiser like DOMPurify; do not roll one yourself.
- **Setting state in render.** `if (x) setX(false)` outside `useEffect` causes infinite loops.
- **Direct DOM manipulation around React-managed elements.** Use `ref` for measurement, not for content mutation. Let React own the rendered DOM.

## When to deviate

- **Performance hot paths.** Component-level memoization with `React.memo` is appropriate only when a profile shows real wasted re-renders. Don't add `memo` speculatively.
- **Reducer over multiple `useState`.** When state updates are interrelated (multi-step form, mode switching), `useReducer` is clearer than three `useState` calls. Trust the readability check.
- **Class components for error boundaries.** React's error-boundary mechanism still requires a class component. Use one purposefully labelled `*ErrorBoundary` and keep it small.
- **Server Components or framework-level rendering.** Next.js / Remix / RSC have their own conventions that override these patterns where they apply (e.g., async components in RSC). Defer to the framework's docs first.

## References

- [React docs — Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks).
- [React docs — Reusing Logic with Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks).
- [`typescript.md`](typescript.md) — strict-mode rules that apply to React with TS.
- [`../skills.md`](../skills.md) — JS/TS skill addenda, including code-review checklist for React.
- [`../../../skills/quality/performance-audit/SKILL.md`](../../../skills/quality/performance-audit/SKILL.md) — universal performance audit.
- [`../../../skills/quality/accessibility-audit/SKILL.md`](../../../skills/quality/accessibility-audit/SKILL.md) — universal accessibility audit; React-specific addenda live in [`../skills.md`](../skills.md).

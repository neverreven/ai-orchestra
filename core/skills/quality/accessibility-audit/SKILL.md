# Accessibility audit

> Audit shipped UI against WCAG 2.1 AA — keyboard support, semantics, contrast, focus, errors, motion. Stack-agnostic in process; stack packs (PR 6) provide framework-specific patterns.

## Trigger

- "a11y audit"
- "accessibility check"
- "is this keyboard-accessible?"
- "screen-reader review"
- "WCAG check"

## When to use

- New UI is being added.
- Existing UI has been changed in ways that touch interaction patterns (modals, menus, tables, forms, custom controls).
- A pre-release pass is underway.
- Compliance is required (procurement, enterprise, regulated industries).

## When NOT to use

- Pure server-side or build-tool changes that never reach a user.
- Static-content-only changes covered by the project's existing copy-review process.

## Process

1. **Identify the surface under review** — a feature, a flow, a route, a component. The skill never expands beyond it without consent.
2. **Keyboard pass** — every interactive element is reachable, focus order is logical, no traps, escape closes overlays.
3. **Semantics pass** — landmarks, headings hierarchy, list semantics, form labels associated with inputs, button vs link semantics correct.
4. **ARIA pass** — ARIA only where native semantics are not possible; no orphan `aria-*` attributes; live regions used for transient updates.
5. **Contrast pass** — text contrast ratios meet AA; non-text contrast for icons, focus indicators, and state changes meets the 3:1 minimum.
6. **State + error pass** — disabled states have explanations, error messages are tied to the field, success states are announced.
7. **Motion + reduced-motion pass** — animations respect `prefers-reduced-motion`; nothing flashes faster than 3 Hz.
8. **Mobile / touch pass** — target sizes, gesture alternatives, scaling/zoom respected; cross-reference [platform-parity-check](../../mobile/platform-parity-check/SKILL.md) where mobile is in scope.
9. **Findings** — categorised `must-fix` (keyboard inaccessible, semantic violation, AA contrast failure), `should-fix` (ergonomics), `nit`.

## Output

An a11y audit report with:
- Verdict (pass / pass-with-fixes / fail).
- Per-finding entry: surface, severity, what to change, why, with WCAG criterion reference where applicable.
- Recommended automated tooling for ongoing coverage (axe-core, pa11y, lighthouse), without prescribing a specific one for v1.

## References

- [_schema.md](../../_schema.md)
- [../../code/code-review/SKILL.md](../../code/code-review/SKILL.md)
- [../../audit/pre-release/SKILL.md](../../audit/pre-release/SKILL.md)
- [../../mobile/platform-parity-check/SKILL.md](../../mobile/platform-parity-check/SKILL.md)
- [../../../roles/frontend-engineer.md](../../../roles/frontend-engineer.md)
- [../../../roles/mobile-engineer.md](../../../roles/mobile-engineer.md)

# Platform parity check

> Audit a feature, screen, or app for behavioural parity across iOS and Android (or whichever platforms the project targets). Identify intentional divergence versus accidental drift.

## Trigger

- "platform parity"
- "iOS vs Android difference"
- "is this consistent on both platforms?"
- "platform-specific bugs"
- "cross-platform check"

## When to use

- A new feature is being added to a cross-platform mobile codebase.
- A bug is reported on one platform and the team wants to know if the same bug exists silently on the other.
- A periodic release readiness check.
- A migration (RN upgrade, Capacitor upgrade, MAUI move) where platform behaviour may have shifted.

## When NOT to use

- Single-platform projects (no parity to check).
- Backend-only changes that have no client behaviour difference.

## Process

1. **Identify the surface** — feature / flow / screen / interaction under audit.
2. **List intentional divergence** — places where the platforms should differ on purpose (native share sheets, gesture conventions, system fonts, status bar, back-button on Android, swipe-back on iOS).
3. **Walk the surface on each platform** — visually, behaviourally, and via screen reader. Note every difference.
4. **Categorise differences** — intentional / accidental / unclear.
5. **Native API parity** — every platform-specific API has its counterpart implemented (push, share, biometrics, deep links, file access).
6. **Permissions parity** — permission text, denial-handling, soft-prompts present on both platforms.
7. **Layout + density parity** — Dynamic Type / font scaling on iOS, font scale on Android, landscape behaviour, tablet vs phone.
8. **A11y parity** — VoiceOver and TalkBack experiences are equivalent in completeness; cross-reference [accessibility-audit](../../quality/accessibility-audit/SKILL.md).
9. **Findings** — categorised `must-fix` (broken or missing functionality on one platform), `should-fix` (UX inconsistency), `nit`.

## Output

A parity report with:
- Per-platform inventory of behaviour for each surface element.
- Differences categorised intentional / accidental / unclear.
- Findings ordered by user-visible impact.
- Suggested parity tests for the test plan.

## References

- [_schema.md](../../_schema.md)
- [build-config-review/SKILL.md](../build-config-review/SKILL.md)
- [../../quality/accessibility-audit/SKILL.md](../../quality/accessibility-audit/SKILL.md)
- [../../code/code-review/SKILL.md](../../code/code-review/SKILL.md)
- [../../../roles/mobile-engineer.md](../../../roles/mobile-engineer.md)
- [../../../roles/qa-engineer.md](../../../roles/qa-engineer.md)

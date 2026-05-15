# Upgrade

> Upgrade the AI Orchestra infrastructure inside a project to match the latest version of the `ai-orchestra` package. Applies changes **non-destructively**: orchestra-managed artifacts are updated; project-owned content (learnings, session state, project customisations) is never touched.

## Trigger

- "upgrade orchestra"
- "update orchestra"
- "patch orchestra"
- "update ai-orchestra"
- "ai-orchestra is updated, apply it"
- After `npm update @neverreven/ai-orchestra` or equivalent package manager update.

## When to use

- A newer version of the `ai-orchestra` npm package has been installed in the project.
- A known spec bug was fixed upstream and needs to be pulled into an existing install.
- The Director rule, a core skill, or a stack-pack rule has drifted from the upstream template and needs to be refreshed.
- The user explicitly asks to bring their orchestra install up to date.

## When NOT to use

- The package version has not changed (run [ai-infra-audit](../ai-infra-audit/SKILL.md) instead to detect drift without upgrading).
- The project has no `.ai-orchestra/install.json` marker — run the full install from [RUN.md](../../../../../RUN.md) instead.
- A hotfix is in progress — finish it first; upgrades should not happen mid-feature.

## Managed vs. Project-Owned (the safety boundary)

Before touching any file, the agent must classify it:

| Artifact | Owner | Upgrade behaviour |
|----------|-------|-------------------|
| Director rule (rendered `.mdc` / rule file) | Orchestra — managed section only | Re-render managed section from updated `core/director/RULE.md` template; leave any user additions outside the managed section intact |
| Core skills (rendered `SKILL.md` copies) | Orchestra if unmodified; Project if adapted | See §step 4 below — diff-first, consent-gated for modified skills |
| Stack-pack rules (rendered rule files) | Orchestra if unmodified; Project if adapted | Same as core skills |
| `AGENTS.md` / project context doc | Project, except managed section | Re-render only the `<!-- ai-orchestra: managed-section -->` block; never touch the rest |
| `AI_LEARNINGS.md` | Project — always | **Never touch. Not even to read for upgrade purposes.** |
| `SESSION_STATE.md` (`.ai-orchestra/SESSION_STATE.md`) | Project — always | **Never touch.** |
| `.ai-orchestra/install.json` | Orchestra | Update `orchestra.version`, append `history[]` entry at the very end of the upgrade |
| `~/.ai-orchestra/projects.json` | Orchestra | Update `lastSeenVersion` and `lastSeenAt` for this project |

The words **never touch** mean: do not read, do not diff, do not propose changes. The contents of these files belong entirely to the project.

## Process

1. **Verify preconditions** — locate `.ai-orchestra/install.json`. If absent, abort and tell the user to run the full installer from `ai-orchestra/RUN.md`. Read the marker and note the current `orchestra.version` (call it `INSTALLED_VERSION`). Read `ai-orchestra/VERSION` (call it `LATEST_VERSION`). If `INSTALLED_VERSION == LATEST_VERSION`, report "already up to date" and stop — unless the user explicitly requested a forced re-render, in which case continue.

2. **Build the upgrade plan** — for each entry in `rules[]`, `skills[]`, and the director rule in `install.json`, determine the upgrade action:
   - Locate the source template for each installed artifact (field: `source` in `rules[]` / `skills[]`).
   - Compare the currently installed rendered file against a fresh render of the updated template (substituting the same placeholder values recorded at install time).
   - Classify each artifact as `no-change`, `auto-update` (rendered file is unmodified from original), or `needs-consent` (rendered file has project-specific edits beyond the managed sections).
   - Present the full plan to the user before touching any file.

3. **Update Director rule** — re-render the Director rule from the updated `core/director/RULE.md` template using the placeholder values in `install.json` (learnings path, context path, architecture doc path, etc.). Apply the update using `extend-section`: replace only the managed block; preserve any user additions outside it.

4. **Update core skills** — for each skill in `skills[]`:
   - If `no-change`: skip.
   - If `auto-update` (installed copy is identical to original render, meaning no project adaptation): silently update the rendered copy.
   - If `needs-consent` (installed copy differs from original render — the project has adapted it): surface a unified diff of the upstream changes only. Ask the user: "Accept upstream changes to `<skill-name>`? (yes / no / show full diff)". Apply only on explicit `yes`. Never silently overwrite an adapted skill.

5. **Update stack-pack rules** — same consent logic as step 4 for any rules in `rules[]` that originated from a stack pack.

6. **Update project-context managed section** — re-render the `<!-- ai-orchestra: managed-section -->` block in `AGENTS.md` (or equivalent) from any changed templates. Leave all content outside the markers intact.

7. **Offer SESSION_STATE template** — if `core/director/session-state-template.md` exists in the updated package but `.ai-orchestra/SESSION_STATE.md` does not yet exist in the project, offer to create it from the template. This is opt-in: ask the user. Do not create it silently.

8. **Update install marker** — write back `.ai-orchestra/install.json`:
   - Update `orchestra.version` to `LATEST_VERSION`.
   - Update `ide.adapterVersion` if the adapter version changed.
   - Update any `source` paths in `skills[]` and `rules[]` that moved.
   - Append a history entry: `{ "at": "<now ISO 8601>", "action": "upgrade", "orchestraVersion": "<LATEST_VERSION>", "summary": "<N artifacts updated, M skipped, K deferred to user consent>" }`.
   - Never mutate `orchestra.installedAt`.

9. **Run post-upgrade audit** — run [ai-infra-audit](../ai-infra-audit/SKILL.md) to verify the upgraded install is self-consistent. Surface any remaining drift for the user to resolve manually.

## Output

A structured upgrade report:
- Version transition: `INSTALLED_VERSION → LATEST_VERSION`.
- Per-artifact status: `updated` / `skipped (no change)` / `deferred (user consent pending)` / `protected (project-owned)`.
- List of artifacts where the user deferred consent — they remain at the old version until the user decides.
- Any new templates available that the project hasn't opted into yet (e.g., `SESSION_STATE.md`).
- Audit result from step 9.

## References

- [_schema.md](../../_schema.md)
- [ai-infra-audit/SKILL.md](../ai-infra-audit/SKILL.md) — post-upgrade health check.
- [../../../../../core/director/RULE.md](../../../../../core/director/RULE.md) — Director rule template re-rendered in step 3.
- [../../../../../core/director/session-state-template.md](../../../../../core/director/session-state-template.md) — new template offered in step 7.
- [../../../../../core/registry/install.schema.md](../../../../../core/registry/install.schema.md) — install marker schema updated in step 8.
- [../../../../../adapters/_contract.md](../../../../../adapters/_contract.md) — conflict-handling actions used in this skill.
- [../../../../../RUN.md](../../../../../RUN.md) — full install procedure (fallback when no marker exists).

## Model hint

- **Preferred:** `sonnet`
- **Reason:** The upgrade requires reading multiple file pairs, diffing them, classifying changes, and presenting a plan. That's structured multi-file reasoning — Sonnet's sweet spot. `haiku` will miss subtle diffs in managed sections. `opus` is unnecessary unless the project has heavily customised many skills and the diffs are architecturally complex.

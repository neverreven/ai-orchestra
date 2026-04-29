# AI infra audit

> Health-check the AI infrastructure that ai-orchestra installed into the project — rules, skills, hooks, MCP servers, learnings doc, schedulers, and the install marker — and report drift between what was installed and what currently exists. Optionally auto-fix non-critical drift; surface critical drift for human decision.

## Trigger

- "audit AI infra"
- "audit orchestra"
- "verify orchestra install"
- "check rules and skills are in sync"
- "MCP wired correctly?"
- Periodic (declared via the scheduler contract; runner ships in v2).

## When to use

- After a project upgrade of ai-orchestra (`ai-orchestra upgrade` flow, or manual core bump).
- After a team member edits installed rules / skills directly without going through the orchestra.
- After the project's stack profile changes (new framework added, mobile target added, AI deps introduced).
- As part of [pre-release](../pre-release/SKILL.md).

## When NOT to use

- Fresh project install — the installer already runs equivalent checks; this skill is for ongoing drift detection.
- Daily development on application code (no orchestra-touching changes).

## Process

1. **Read the install marker** — `.ai-orchestra/install.json` is the source of truth for what should exist. Treat absence as "not installed; bail with friendly message."
2. **Inventory rules + skills** — for the IDE recorded in the marker, walk the install map and verify each declared file exists, has the expected hash or fingerprint, and conforms to its schema (per [`../../_schema.md`](../../_schema.md) for skills and [`../../../roles/_schema.md`](../../../roles/_schema.md) for roles, with rules from [`../../../_lint.md`](../../../_lint.md)).
3. **Verify the Director system** — the Director rule (rendered from [`../../../director/RULE.md`](../../../director/RULE.md)) is installed and well-formed; the learnings doc (seeded from [`../../../director/learnings-template.md`](../../../director/learnings-template.md)) exists, has the prescribed sections, and is within the size budget.
4. **Verify the stop-hook** — the hook is registered per [`../../../../adapters/_stop-hook.md`](../../../../adapters/_stop-hook.md), the marker's `hooks.stop.contract_version` is recognised, and `hooks.stop.last_run` is within a reasonable window. If the IDE declared a hook gap at install, treat absence as expected.
5. **Inventory MCP servers** — verify the MCP config recorded by the marker matches what the IDE's MCP config actually contains. Flag servers added outside the orchestra (do not touch them). Cross-reference [`../../platform/mcp-server-audit/SKILL.md`](../../platform/mcp-server-audit/SKILL.md) for permission-widening checks.
6. **Verify scheduler + notifications declarations** — declared job descriptors and notification payloads validate against [`../../../scheduler/CONTRACT.md`](../../../scheduler/CONTRACT.md) and [`../../../notifications/CONTRACT.md`](../../../notifications/CONTRACT.md). Runners ship in v2; v1 verifies declarations only.
7. **Drift classification** — every drift item is `critical` or `non-critical`. Critical = missing files, schema violations, MCP server permissions widened, contract violations. Non-critical = whitespace drift, harmless wording changes, soft size-budget breaches.
8. **Auto-fix non-critical drift** — re-render from core templates. Skip files explicitly marked as user-edited (the marker tracks this).
9. **Surface critical drift** — propose a diff plan for human review. Do not auto-apply.
10. **Report** — what was checked, what was clean, what was auto-fixed, what awaits review. Emit lifecycle events through the [notifications contract](../../../notifications/CONTRACT.md).

## Output

An audit report with:
- Counts: clean / auto-fixed / pending-review / unknown.
- Per-item detail with file paths and drift kind.
- A proposed diff (dry-run format per [adapters/_contract.md](../../../../adapters/_contract.md)) for any pending-review items.
- Suggested next action (run again after review, escalate, or close).

## References

- [../../_schema.md](../../_schema.md)
- [../../../_lint.md](../../../_lint.md)
- [../../../director/_overview.md](../../../director/_overview.md)
- [../../../director/RULE.md](../../../director/RULE.md)
- [../../../director/learnings-template.md](../../../director/learnings-template.md)
- [../../../scheduler/CONTRACT.md](../../../scheduler/CONTRACT.md)
- [../../../notifications/CONTRACT.md](../../../notifications/CONTRACT.md)
- [../../../registry/install.schema.md](../../../registry/install.schema.md)
- [../../../discovery/signals/mcp.md](../../../discovery/signals/mcp.md)
- [../../../../adapters/_contract.md](../../../../adapters/_contract.md)
- [../../../../adapters/_stop-hook.md](../../../../adapters/_stop-hook.md)
- [../../platform/mcp-server-audit/SKILL.md](../../platform/mcp-server-audit/SKILL.md)
- [../../../roles/security-engineer.md](../../../roles/security-engineer.md)
- [../../../roles/devops-sre.md](../../../roles/devops-sre.md)
- [../../../roles/ai-ml-engineer.md](../../../roles/ai-ml-engineer.md)

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
2. **Inventory rules + skills + hooks** — for the IDE recorded in the marker, walk the install map and verify each declared file exists, has the expected hash or fingerprint, and conforms to its schema.
3. **Inventory MCP servers** — verify the MCP config recorded by the marker matches what the IDE's MCP config actually contains. Flag servers added outside the orchestra (do not touch them).
4. **Verify learnings doc** — the learnings file referenced in the marker exists and has at least the Director-prescribed sections.
5. **Verify scheduler + notifications references** — declared cron descriptors and notification routes exist and parse (per the contracts in `core/scheduler/CONTRACT.md` and `core/notifications/CONTRACT.md`; runners ship in v2).
6. **Drift classification** — every drift item is `critical` or `non-critical`. Critical = missing files, schema violations, MCP server permissions widened. Non-critical = whitespace drift, harmless wording changes.
7. **Auto-fix non-critical drift** — re-render from core templates. Skip files explicitly marked as user-edited (the marker tracks this).
8. **Surface critical drift** — propose a diff plan for human review. Do not auto-apply.
9. **Report** — what was checked, what was clean, what was auto-fixed, what awaits review.

## Output

An audit report with:
- Counts: clean / auto-fixed / pending-review / unknown.
- Per-item detail with file paths and drift kind.
- A proposed diff (dry-run format per [adapters/_contract.md](../../../../adapters/_contract.md)) for any pending-review items.
- Suggested next action (run again after review, escalate, or close).

## References

- [_schema.md](../../_schema.md)
- [../../../registry/install.schema.md](../../../registry/install.schema.md)
- [../../../discovery/signals/mcp.md](../../../discovery/signals/mcp.md)
- [../../../../adapters/_contract.md](../../../../adapters/_contract.md)
- [../../../roles/security-engineer.md](../../../roles/security-engineer.md)
- [../../../roles/devops-sre.md](../../../roles/devops-sre.md)
- [../../../roles/ai-ml-engineer.md](../../../roles/ai-ml-engineer.md)

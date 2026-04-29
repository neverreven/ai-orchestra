# MCP server audit

> Inventory the project's Model Context Protocol server configuration across IDEs, classify each server's permissions and exposure, and surface drift between what the orchestra installed and what the IDE currently has.

## Trigger

- "audit MCP servers"
- "what MCP can do in this project?"
- "MCP exposure check"
- "are MCP perms safe?"
- "MCP drift?"

## When to use

- Onboarding a new contributor — confirm the MCP set they pick up is the team's intended one.
- After changing an MCP server's configuration manually.
- After upgrading or installing the orchestra (drift detection).
- Periodically — MCP scope tends to expand silently.

## When NOT to use

- Application-code debugging unrelated to AI tooling.
- Pure documentation tasks that do not interact with MCP.

## Process

1. **Inventory configurations** — read every IDE-specific MCP config the project may have. The discovery signal [mcp.md](../../../discovery/signals/mcp.md) lists the canonical paths.
2. **Classify each server** — name, type (stdio / sse / http), origin (well-known vendor, internal team, custom community), trust level (high / medium / low / unknown).
3. **Permissions surface** — for each server, what file system, network, or service access it can perform. Treat unknown as the worst case until the team confirms.
4. **Cross-reference orchestra install** — the install marker lists the MCP servers the orchestra registered. Anything outside that list is the team's choice; flag without modifying.
5. **Drift detection** — for orchestra-managed entries, compare the recorded config with the live IDE config. Critical drift = permission widening; non-critical = description changes.
6. **Risk assessment** — order findings by potential impact, not by alphabetical order or insertion order.
7. **Recommendations** — propose minimal-permission alternatives where available (read-only flags, scoped paths, allow-lists).
8. **Report** — what is installed, what is healthy, what drifted, what the team should review.

## Output

An MCP audit report with:
- Per-IDE inventory of servers with origin, permissions, trust.
- Drift table for orchestra-managed servers.
- Risk-sorted findings with proposed mitigations.
- Servers the orchestra did NOT install but found, listed for awareness without action.

## References

- [_schema.md](../../_schema.md)
- [../../../discovery/signals/mcp.md](../../../discovery/signals/mcp.md)
- [../../audit/ai-infra-audit/SKILL.md](../../audit/ai-infra-audit/SKILL.md)
- [../../quality/security-baseline/SKILL.md](../../quality/security-baseline/SKILL.md)
- [../../../roles/security-engineer.md](../../../roles/security-engineer.md)
- [../../../roles/devops-sre.md](../../../roles/devops-sre.md)

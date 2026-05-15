# Agent Manifest — Human-Readable Reference

> This document explains the agent manifest contract in plain language. For the machine-readable version, see `agent-manifest.schema.json`.

## What is a manifest?

Every agent in the orchestra declares its capabilities through a manifest. The manifest answers four questions:

1. **Who am I?** — role, display name, mission statement
2. **What can I do?** — task types I handle, skills I can invoke
3. **What can I access?** — filesystem scope (readWrite / readOnly / forbidden)
4. **How should I run?** — model preferences, health check intervals

The Lead agent reads all manifests at startup to build its routing table. When a user request arrives, the Lead matches the task type against each agent's `taskTypes` list, checks the scope constraints, and delegates accordingly.

## Example manifest (Frontend Engineer)

```json
{
  "id": "frontend",
  "role": "frontend",
  "displayName": "Frontend Engineer",
  "mission": "Owns UI components, pages, styles, and client-side logic. Ensures visual consistency, accessibility, responsive behaviour, and component test coverage.",
  "scope": {
    "readWrite": ["src/components/**", "src/pages/**", "src/styles/**", "src/hooks/**"],
    "readOnly": ["src/api/**", "src/utils/**", "package.json", "tsconfig.json", "vite.config.*"],
    "forbidden": ["server/**", ".env", "**/*.key"]
  },
  "taskTypes": [
    "implement-feature",
    "fix-bug",
    "code-review",
    "refactor",
    "write-tests",
    "accessibility-audit",
    "performance-audit"
  ],
  "collaborators": ["qa", "backend", "security"],
  "modelPreferences": {
    "reasoning": "sonnet",
    "execution": "sonnet",
    "stateWrites": "haiku"
  },
  "skills": [
    { "id": "code-review", "trigger": "run a code review" },
    { "id": "cleanup", "trigger": "clean up the mess" },
    { "id": "accessibility-audit", "trigger": "check accessibility" },
    { "id": "performance-audit", "trigger": "check performance" }
  ],
  "healthCheck": {
    "heartbeatIntervalMs": 30000,
    "timeoutMs": 120000
  }
}
```

## Routing rules the Lead follows

1. **Task type match.** A task is only delegated to an agent whose `taskTypes` includes the task's `type`. If no agent matches, the Lead handles it directly or asks the user to clarify.
2. **Scope check.** If the task involves files, the Lead verifies the target agent's scope covers those paths. If not, the Lead splits the task and delegates path-specific sub-tasks to the appropriate agents.
3. **Collaborator hints.** When splitting a task, the Lead prefers agents listed in the originating agent's `collaborators` for the sub-tasks.
4. **Model cost awareness.** Routine tasks use the agent's `execution` tier. Complex architecture decisions are escalated to the `reasoning` tier. State bookkeeping uses the `stateWrites` tier.

## Adding a new agent

1. Create a project folder under `runtime/projects/<name>/`.
2. Define the manifest in `config.ts` conforming to `agent-manifest.schema.json`.
3. Register a Telegram bot via @BotFather, add the token to `.env`.
4. Run `bun run scripts/new.ts <name>` to scaffold the project (or copy an existing role project).
5. The Lead auto-discovers new agents on the next `/restart`.

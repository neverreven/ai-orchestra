# Orchestrate Project

> Have the Lead agent autonomously install the AI Orchestra Tier 1 (`score/`) configuration into any target project — detecting the stack, generating adapter files (rules, AGENTS.md, AI_LEARNINGS.md), and asking for your confirmation before writing anything.

## Trigger

- "orchestrate [project path]"
- "set up the orchestra for [project path]"
- "install the orchestra in /path/to/project"
- "bootstrap a new project at [path]"
- `/orchestrate <path>` (Telegram / Slack command)

## When to use

- The ensemble (Tier 2) is already installed and running.
- You want to install the Tier 1 `score/` infrastructure into a new project **without** manually running the IDE setup.
- Suitable for projects the Lead agent has been given access to (they must be readable by the agent process, or bind-mounted into Docker).

## When NOT to use

- The target project has not been registered. Use `setup-project/SKILL.md` first to register it.
- You prefer the full manual IDE-guided setup (it produces higher-quality fine-tuned rules).

---

## What happens

### Detection phase (automated)

The Lead agent runs the programmatic detection probe (`detector.ts`) on the target project:
- Scans for stack signals: JavaScript/TypeScript, Python, Rust, Go, .NET, mobile, Salesforce
- Detects frameworks (React, Vue, Django, Express, etc.)
- Identifies test frameworks, CI systems, package managers, documentation files
- Lists sub-projects (mono-repos, sidecar services)

### Generation phase (Anthropic-powered)

Using the detected profile, the Lead agent calls Claude (sonnet) to generate:
1. **Director rule** — IDE-specific rule file (`.cursor/rules/ai-orchestra.mdc` for Cursor, `CLAUDE.md` for Claude Code, etc.)
   - Session startup protocol: read AI_LEARNINGS.md, AGENTS.md, and project docs
   - Stack-specific coding standards and anti-patterns
2. **AGENTS.md additions** — Project summary, critical rules, key file map, AI infrastructure section
3. **AI_LEARNINGS.md stub** — Pre-seeded with stack-specific patterns from Claude's knowledge

### Confirmation (required)

Before writing any file, the Lead agent shows you:
- A list of files to create or update with a one-line reason for each
- Estimated completion time

Reply "confirm" to proceed. Reply "cancel" to abort without changes.

### Write phase

On confirmation:
- Files are written to the target project
- `.ai-orchestra/install.json` is updated with `tier: 1, ide: <selected>`
- `~/.ai-orchestra/projects.json` global registry is updated
- The project appears in the web dashboard's **Projects** tab

---

## IDE choices

| IDE | What gets created |
|-----|------------------|
| **Cursor** | `.cursor/rules/ai-orchestra.mdc` + `AGENTS.md` + `AI_LEARNINGS.md` |
| **Claude Code** | `CLAUDE.md` (director) + `AGENTS.md` + `AI_LEARNINGS.md` |
| **Codex** | `.codex/ai-orchestra.md` + `AGENTS.md` + `AI_LEARNINGS.md` |
| **VS Code** | `.vscode/ai-orchestra.md` + `AGENTS.md` + `AI_LEARNINGS.md` |

## Scope choices

| Scope | Roles installed |
|-------|----------------|
| `recommended` | Lead + roles based on detected stack (default) |
| `all` | Lead + all 5 role agents |
| `lead-only` | Lead Orchestrator only |

---

## Triggering from Telegram / Slack

Send the Lead agent:
```
/orchestrate /absolute/path/to/project
```

Or as a natural language message:
```
Set up the orchestra for /Users/me/projects/my-webapp — use Cursor, recommended scope
```

The Lead agent will respond with the detection results, ask for IDE/scope confirmation, show the plan, and execute on your "confirm".

---

## After orchestration

Open the project in your IDE and run the verification prompt:
```
"Please verify the AI Orchestra installation and run the orchestra."
```

This is a recommended (not required) step — the generated files are immediately functional, but an IDE agent pass catches project-specific nuances that automated detection may miss.

---

## Limitations

- Generated rules are a good-quality approximation based on stack detection + Claude's knowledge. They are not a perfect replacement for a hand-crafted setup.
- The agent must have read/write access to the target project path.
- For best results on unusual or private tech stacks, follow up with a manual review of the generated files.

## Model hint

- **Preferred:** `opus` (for generation quality)
- **Reason:** Generating production-quality adapter files requires deep reasoning about stack-specific patterns.

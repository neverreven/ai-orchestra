# Setup Project

> Bootstrap the AI Orchestra Tier 1 spec layer (`score/`) into any project on this machine from the running ensemble. Use this when the ensemble is already running at system level and you want to add a new project to the orchestra without leaving the Lead agent chat.

## Trigger

- "add project at [path]"
- "bootstrap orchestra in [path]"
- "install orchestra in my other project"
- "add [project name] to the orchestra"
- "set up score in [path]"
- `/addproject <path>` (Telegram or web chat command)

## When to use

- The ensemble is installed at system-global level (`~/.ai-orchestra/ensemble/`) and is running.
- The developer wants to add the Tier 1 spec to a new or existing project without running `npx @neverreven/ai-orchestra init` manually.
- The developer wants to manage multiple projects from a single Lead agent interface.

## When NOT to use

- The ensemble is installed project-locally — it can only bootstrap projects safely when it is at system level. Use the `migrate-ensemble` skill first.
- The target path does not exist or is not a project directory (no `package.json`, `pyproject.toml`, `Cargo.toml`, or similar manifest).
- The target project already has `score/` or `ai-orchestra/` — it is already orchestrated. Use the `upgrade orchestra` flow instead.

## Prerequisites

| Requirement | Why | How to check |
|-------------|-----|--------------|
| System-global ensemble | Project-local ensemble cannot safely write to arbitrary paths | `ensemble.location: "system-global"` in `~/.ai-orchestra/install.json` |
| Target path is a project directory | Avoids bootstrapping random folders | A manifest file exists at the path |
| `npx` or `node` available | Used to copy the latest spec | `npx --version` succeeds |

## Process

1. **Confirm system-global ensemble** — read `~/.ai-orchestra/install.json`. If `ensemble.location` is `"project-local"`, tell the user to run the `migrate-ensemble` skill first and stop.

2. **Resolve and validate the target path** — the user provides a path (absolute or relative). Resolve it to an absolute path. Check:
   - Directory exists.
   - Contains at least one project manifest (`package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `pom.xml`, or similar).
   - Does NOT already contain `score/` or `ai-orchestra/`.

   If validation fails, report the specific reason and stop.

3. **Confirm with the user** — show a summary before any file operation:
   > **Bootstrap plan:**
   > - Target: `<absolute-target-path>`
   > - Action: copy `score/` spec folder into the project root
   > - Nothing else is modified — no rules, no AGENTS.md, no IDE config
   > - The tailored IDE agent setup happens when you open the project and ask your agent to "run the orchestra"
   >
   > Proceed? [Y/n]

4. **Run the bootstrap** — execute the init command targeting the project path:
   ```bash
   npx @neverreven/ai-orchestra@latest init --target=<absolute-target-path>
   ```
   Stream the command output back to the user (Telegram or web chat).

5. **Register in global registry** — add the new project to `~/.ai-orchestra/projects.json`:
   ```json
   {
     "path": "<absolute-target-path>",
     "name": "<detected-project-name>",
     "ide": null,
     "lastSeenVersion": "<current-orchestra-version>",
     "lastSeenAt": "<ISO-timestamp>",
     "tier": 1
   }
   ```
   `ide` is `null` until the user runs "run the orchestra" in their IDE and the adapter writes the install marker.

6. **Report success** — tell the user:
   > score/ has been installed in `<target-path>`.
   >
   > **Next step:** open the project in your IDE (Cursor, Claude Code, Codex, or VS Code) and ask your agent:
   > _"run the orchestra"_
   >
   > The agent will detect your stack, inventory any existing AI infrastructure, and guide you through the tailored setup. Nothing is written until you review the plan and say `apply`.

## What this skill does NOT do

- It does not run the full IDE agent setup pass (detection, stack probing, rule installation). That still requires a human to open the project in their IDE — the Lead agent cannot impersonate an IDE agent.
- It does not modify the target project's existing files (no AGENTS.md changes, no rules, no hooks). It only copies the `score/` folder.
- It does not set the target project's `tier` above 1 — the ensemble becomes aware of the project, but the project itself is at Tier 1 until its own install marker is written by the IDE agent pass.

## Output

- `<target-path>/score/` — spec folder installed
- `~/.ai-orchestra/projects.json` — new project registered with `tier: 1`
- Instruction to the user to open the project in their IDE and run the orchestra

## References

- [_schema.md](../../_schema.md)
- [setup-ensemble/SKILL.md](../setup-ensemble/SKILL.md) — Tier 2 activation.
- [migrate-ensemble/SKILL.md](../migrate-ensemble/SKILL.md) — move ensemble to system level (prerequisite for this skill).
- [../../../registry/install.schema.md](../../../registry/install.schema.md) — global registry schema.
- [../../../../RUN.md](../../../../RUN.md) — the entry point the IDE agent reads after score/ is bootstrapped into the project.

## Model hint

- **Preferred:** `sonnet`
- **Reason:** Structured validation + bootstrap flow. The only complexity is path resolution and registry update — both deterministic.

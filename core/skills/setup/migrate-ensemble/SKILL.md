# Migrate Ensemble

> Move the ensemble runtime from project-local (`.ai-orchestra/ensemble/` inside a project) to system-global (`~/.ai-orchestra/ensemble/` on the machine). Use this when you started with a single project and now want the agents to operate independently of any one project, serving multiple projects from a single always-on installation.

## Trigger

- "migrate ensemble to system level"
- "move agents to system level"
- "make ensemble system-global"
- "detach ensemble from project"
- "I want the agents independent from this project"

## When to use

- The ensemble is currently installed project-locally (`.ai-orchestra/ensemble/` exists in a project root).
- The developer now manages more than one project and wants one ensemble to serve all of them.
- The developer wants to use the `setup-project` skill to bootstrap score/ into other projects from the Lead agent.
- The developer wants the ensemble to persist even if the host project is moved or deleted.

## When NOT to use

- The ensemble is already at `~/.ai-orchestra/ensemble/` (system-global). Check `ensemble.location` in `.ai-orchestra/install.json`.
- The ensemble has never been set up. Run `setup-ensemble` first.
- The developer is mid-task — the ensemble is actively processing something. Wait for tasks to complete before migrating.

## Prerequisites

| Requirement | Why | How to check |
|-------------|-----|--------------|
| Ensemble installed (project-local) | Migration source must exist | `.ai-orchestra/ensemble/` exists and has `.env` |
| Bun runtime | Post-migration dependency install | `bun --version` succeeds |
| `~/.ai-orchestra/` writable | Migration target | Write a test file and delete it |
| No active ensemble processes | Safe file copy | `bun run list` shows all agents stopped |

## Process

1. **Verify source** — confirm `.ai-orchestra/ensemble/` exists and `ensemble.location` in `.ai-orchestra/install.json` is `"project-local"`. If the ensemble is already system-global, tell the user and stop.

2. **Check for active processes** — if any agent process is running (check for PID files in `.state/`), ask the user to stop them first:
   ```bash
   # Stop all agents gracefully
   cd .ai-orchestra/ensemble && bun run dev --stop-all
   ```
   Do not proceed until confirmed stopped.

3. **Confirm with the user** — present a summary before any file operation:
   > **Migration plan:**
   > - Source: `<project-root>/.ai-orchestra/ensemble/`
   > - Destination: `~/.ai-orchestra/ensemble/`
   > - Your `.env` files (API key, owner ID, bot tokens) will be copied as-is.
   > - The source directory will be removed after successful copy.
   > - `.ai-orchestra/install.json` will be updated to `ensemble.location: "system-global"`.
   > - The `score/` layer in this project is **not affected**.
   >
   > Type `yes` to proceed, or `no` to cancel.

4. **Create the destination** — if `~/.ai-orchestra/` does not exist, create it.

5. **Copy the ensemble** — copy the full `.ai-orchestra/ensemble/` tree to `~/.ai-orchestra/ensemble/`. Preserve all files including `.env`, `node_modules` / Bun lock files, `.state/`, and log files.
   - On Windows: use `xcopy /E /I /H /Y`
   - On macOS/Linux: use `cp -a`

6. **Re-run `bun install` at destination** — even if `node_modules/` was copied, run `bun install` at `~/.ai-orchestra/ensemble/` to ensure all symlinks and platform-specific binaries are correct for the current machine.
   ```bash
   cd ~/.ai-orchestra/ensemble && bun install
   ```

7. **Verify the ensemble starts at the new location** — start the Lead agent from the new path:
   ```bash
   cd ~/.ai-orchestra/ensemble && bun run dev:lead
   ```
   Confirm it starts without errors, then stop it.

8. **Remove the project-local copy** — only after the new installation is verified:
   - Remove `.ai-orchestra/ensemble/`
   - Keep `.ai-orchestra/` (it still holds `install.json`, `SESSION_STATE.md`, etc.)

9. **Update the install marker** — update `.ai-orchestra/install.json`:
   - `ensemble.location` → `"system-global"`
   - `ensemble.path` → the absolute path to `~/.ai-orchestra/ensemble/`
   - Append history entry: `{ "action": "ensemble-migrate", "from": "project-local", "to": "system-global" }`

10. **Register in global registry** — add or update this project's entry in `~/.ai-orchestra/projects.json`:
    ```json
    {
      "path": "<absolute-project-root>",
      "name": "<project-name>",
      "ide": "<ide-from-install-marker>",
      "lastSeenVersion": "<orchestra-version>",
      "lastSeenAt": "<ISO-timestamp>",
      "tier": 2
    }
    ```

11. **Inform the user**:
    > Migration complete. The ensemble now lives at `~/.ai-orchestra/ensemble/` and is independent of this project.
    >
    > Start the ensemble from anywhere:
    > ```bash
    > cd ~/.ai-orchestra/ensemble && bun run dev:all
    > ```
    >
    > To bootstrap score/ into another project from the Lead agent, ask:
    > _"add project at /path/to/my-other-project"_
    >
    > The Lead agent will copy score/ into that project and register it. You then open the project in your IDE and ask the agent to _"run the orchestra"_ to complete the tailored setup.

## Output

- `~/.ai-orchestra/ensemble/` — running ensemble at system level
- `.ai-orchestra/install.json` — `ensemble.location: "system-global"` recorded
- `~/.ai-orchestra/projects.json` — this project registered as a known project
- Source `.ai-orchestra/ensemble/` removed

## References

- [_schema.md](../../_schema.md)
- [setup-ensemble/SKILL.md](../setup-ensemble/SKILL.md) — initial ensemble activation.
- [setup-project/SKILL.md](../setup-project/SKILL.md) — bootstrap score/ into any project from the system-global ensemble.
- [../../../registry/install.schema.md](../../../registry/install.schema.md) — install marker schema.

## Model hint

- **Preferred:** `sonnet`
- **Reason:** Structured migration walkthrough with clear prerequisites and rollback awareness. Sonnet handles it reliably.

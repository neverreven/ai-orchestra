# Setup Telegram

> Activate Tier 3 of the AI Orchestra — expose the ensemble as a team of private Telegram bots. Each agent gets its own bot that you can message from your phone. Delegate tasks remotely, check progress while AFK, receive completion notifications, and stop any agent mid-response — all from Telegram.

## Trigger

- "set up Telegram"
- "set up Telegram orchestration"
- "activate Telegram bots"
- "set up remote orchestration"
- "orchestrate from phone"
- "I want to message the agents from Telegram"
- After `npx @neverreven/ai-orchestra setup-telegram`.

## When to use

- Tier 2 (ensemble) is already running and the developer wants to interact with agents remotely — from a phone, a different machine, or while away from the keyboard.
- The developer wants persistent, asynchronous orchestration: send a task from Telegram, close the app, come back later to see the result.
- The developer wants to let a trusted collaborator interact with specific agents (the owner can `/allow` other Telegram user IDs).

## When NOT to use

- The ensemble (Tier 2) is not yet set up. Run [setup-ensemble](../setup-ensemble/SKILL.md) first.
- The developer only works from their IDE and does not need remote access — Tier 2 is sufficient.
- The team has security policies that prohibit sending code-related context to Telegram's servers. Telegram transports the messages; the bot processes them on the developer's machine, but message text traverses Telegram infrastructure.

## Prerequisites

| Requirement | Why | How to check |
|-------------|-----|--------------|
| Tier 2 (ensemble) active | Telegram bots are the UI layer on top of running agents | `.ai-orchestra/ensemble/` exists and has `.env` |
| Telegram account | You need it to create bots and message them | You can send messages on Telegram |
| BotFather access | Creates bot tokens | Search `@BotFather` on Telegram |

## Process

1. **Verify Tier 2 is present** — check that `.ai-orchestra/ensemble/` exists and has a configured `.env` with `ANTHROPIC_API_KEY`. If absent, tell the user to run `setup-ensemble` first and stop.

2. **Create bots via BotFather** — guide the user through creating one Telegram bot per agent they want to activate. Provide these instructions inline (do not link to external guides):

   > **Creating a bot on Telegram:**
   > 1. Open Telegram on your phone or desktop.
   > 2. Search for `@BotFather` and start a conversation.
   > 3. Send `/newbot`.
   > 4. BotFather asks for a **display name** — pick something you'll recognise (e.g. "Kinote Lead", "My Project QA").
   > 5. BotFather asks for a **username** — must end in `bot` (e.g. `myproject_lead_bot`).
   > 6. BotFather replies with a **token** like `123456789:ABCdefGHIjklMNOpqrSTUvwxYZ`. Copy it.
   > 7. Repeat for each agent you want on Telegram.
   >
   > **Minimum:** create the Lead bot. Other role bots are optional — the Lead can orchestrate without them having Telegram presence.
   >
   > **Privacy:** after creating each bot, send `/setjoingroups` → select the bot → `Disable`. This prevents anyone from adding your bot to groups. Then send `/setprivacy` → select the bot → `Enable`. This ensures the bot only sees messages sent directly to it.

3. **Run the CLI command** — execute:
   ```bash
   npx @neverreven/ai-orchestra setup-telegram
   ```
   This launches the bot configuration wizard (`bun run setup:bots`), which prompts for each bot token and writes them to `projects/<role>/.env`.

4. **Verify bots respond** — after the wizard completes, start the ensemble:
   ```bash
   cd .ai-orchestra/ensemble && bun run dev:all
   ```
   Then open Telegram and send `/start` to your Lead bot. You should see a welcome message. If it does not respond within 10 seconds, check:
   - The token is correct (compare with BotFather's output)
   - The ensemble process is running (terminal shows no errors)
   - Your Telegram user ID matches `OWNER_TELEGRAM_ID` in `.env` (unauthorized users are silently ignored)

5. **Update the install marker** — if `.ai-orchestra/install.json` exists, update:
   - `tier` → `3`
   - `ensemble.telegramEnabled` → `true`
   - Append a history entry: `{ "action": "tier-upgrade", "from": 2, "to": 3 }`

6. **Inform the user of the Telegram UX** — print a summary of what they can now do:
   - Message the Lead bot with any task — it streams the response with a live typing indicator
   - Press `[■ Stop]` under any in-progress response to cancel it
   - Send `/status` to the Lead bot to see all agents and their current tasks
   - The Lead bot delegates to role agents automatically; role agents report back to the Lead
   - If you created role bots too, you can message them directly for role-specific tasks (e.g. message the QA bot to ask it to review a PR)
   - The Lead silently receives reports from direct role interactions so it stays informed

## Security posture (what to tell the user)

| Protection | How it works |
|-----------|-------------|
| Private bots | Only messages from the owner's Telegram ID are processed; all others are silently dropped |
| Allowlist | Owner can `/allow <telegram_id>` to grant access to a collaborator, `/revoke <id>` to remove |
| Rate limiting | 20 messages per 60 seconds per user — prevents accidental or malicious flooding |
| No group chats | Bots are configured to refuse group invitations (BotFather setting in step 2) |
| Agent scope | Each role agent can only read/write files in its declared scope — a compromised bot token cannot access the full project |
| OS-level | The ensemble runs on the developer's machine; no code or project files leave the machine except as Telegram message text |

## Output

A fully remote-accessible orchestra:
- Telegram bots configured and responding to the owner's messages
- Bot tokens stored in per-agent `.env` files
- `.ai-orchestra/install.json` — `tier: 3`, `ensemble.telegramEnabled: true`
- Summary of Telegram commands and UX patterns

## References

- [_schema.md](../../_schema.md)
- [setup-ensemble/SKILL.md](../setup-ensemble/SKILL.md) — Tier 2 activation (must be done before this skill).
- [../../../../ensemble/README.md](../../../../ensemble/README.md) — ensemble architecture and security model.
- [../../../../ensemble/RUN.md](../../../../ensemble/RUN.md) — ensemble operational guide (start/stop/resume).
- [../../../../ensemble/agents-framework/src/auth.ts](../../../../ensemble/agents-framework/src/auth.ts) — authorization implementation (owner + allowlist + rate limiting).
- [../../../../ensemble/agents-framework/src/bot.ts](../../../../ensemble/agents-framework/src/bot.ts) — Telegram bot factory (streaming, Stop button, typing indicator).
- [../../../registry/install.schema.md](../../../registry/install.schema.md) — install marker schema (tier + ensemble fields).

## Model hint

- **Preferred:** `sonnet`
- **Reason:** The process is a guided walkthrough — create bots on BotFather, paste tokens, verify connectivity. Sonnet handles it reliably. The only area where `opus` might help is troubleshooting unusual Telegram API issues (rate limits, regional blocks, corporate network restrictions), but that's an edge case better addressed reactively.

# Setup Slack

> Add Slack as a communication channel for the AI Orchestra ensemble (Tier 2/3). After this setup, you can message the Lead agent from any Slack workspace channel or DM — no Telegram required.

## Trigger

- "set up Slack"
- "add Slack channel"
- "I want to use Slack instead of Telegram"
- "connect the agents to Slack"
- "set up Slack bot"

## When to use

- The ensemble is already installed and running (Tier 2).
- The developer's team uses Slack and prefers it over Telegram for agent communication.
- Telegram is already configured — Slack can be active simultaneously (both channels forward messages to the same Lead agent).

## When NOT to use

- The ensemble has not been set up. Run `setup-ensemble` first.
- The developer is satisfied with Telegram and does not need Slack.

## Prerequisites

| Requirement | Why | How to check |
|-------------|-----|--------------|
| Ensemble running | Slack connects to the same Lead agent | `bun run list` shows Lead as configured |
| Slack workspace | You need admin or App Manager access | Log in to your Slack workspace |
| Bun runtime | Dependencies needed for `@slack/bolt` | `bun --version` |

## Process

### Step 1 — Create a Slack App

1. Go to [https://api.slack.com/apps](https://api.slack.com/apps) and click **Create New App**.
2. Choose **From scratch**, give it a name (e.g. "AI Orchestra"), and select your workspace.
3. In the left sidebar, go to **Socket Mode** and enable it. This creates an App-Level Token.
4. When prompted, name the token (e.g. "socket-token") and ensure the `connections:write` scope is selected. Copy the `xapp-...` token — this is your `SLACK_APP_TOKEN`.

### Step 2 — Configure Bot Token Scopes

1. In the left sidebar, go to **OAuth & Permissions**.
2. Under **Bot Token Scopes**, add:
   - `chat:write`
   - `app_mentions:read`
   - `im:read`, `im:history`, `im:write`
   - `channels:history` (if you want the bot to respond in channels, not just DMs)
   - `files:read` (optional, for file attachments)
3. Click **Install to Workspace** and authorize. Copy the `xoxb-...` Bot User OAuth Token — this is your `SLACK_BOT_TOKEN`.

### Step 3 — Enable Event Subscriptions

1. In the left sidebar, go to **Event Subscriptions** and enable it.
2. Under **Subscribe to bot events**, add:
   - `message.im` (direct messages)
   - `app_mention` (mentions in channels)
3. Save changes.

### Step 4 — Find your Slack User ID

1. In Slack, click your name or avatar.
2. Select **Profile**, then click the **⋮** menu → **Copy member ID**.
3. This is your `OWNER_SLACK_USER_ID` (format: `U0123456789`).

### Step 5 — Configure the ensemble

Add to `<ensemble-path>/.env`:

```
SLACK_BOT_TOKEN=xoxb-...
SLACK_APP_TOKEN=xapp-...
OWNER_SLACK_USER_ID=U0123456789
ENABLE_SLACK=true
```

Install the new dependency:
```bash
cd <ensemble-path> && bun add @slack/bolt
```

### Step 6 — Restart the Lead agent

```bash
cd <ensemble-path> && bun run dev:lead
```

The console should print: `[slack] 🟢 Slack bot connected via Socket Mode`

### Step 7 — Test

Send the Lead agent a DM in Slack: `"What's the status?"`

The bot replies with streaming text. Press the **■ Stop** button to cancel a response in progress.

### Managing users

- **Allow a user:** send `/allow U0987654321` to the bot (owner only)
- **Revoke a user:** send `/revoke U0987654321` to the bot (owner only)

## Output

- Slack bot connected via Socket Mode
- Lead agent responds to DMs and mentions in the workspace
- `ENABLE_SLACK=true` in ensemble `.env`

## References

- [setup-ensemble/SKILL.md](../setup-ensemble/SKILL.md)
- [setup-telegram/SKILL.md](../setup-telegram/SKILL.md)
- Slack Bolt documentation: https://slack.dev/bolt-js/

## Model hint

- **Preferred:** `sonnet`
- **Reason:** Guided walkthrough with a fixed sequence of steps and external UI navigation.

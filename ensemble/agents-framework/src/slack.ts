/**
 * AI Orchestra — Slack Channel Adapter
 *
 * Implements ChannelAdapter for Slack using Socket Mode (Bolt SDK).
 * Socket Mode requires no public URL — the bot opens a WebSocket connection
 * to Slack's infrastructure. Suitable for running on a developer's laptop
 * or inside a private network.
 *
 * Requirements:
 *   SLACK_BOT_TOKEN   — xoxb-... token from your Slack App
 *   SLACK_APP_TOKEN   — xapp-... token (App-Level Token, "connections:write" scope)
 *   OWNER_SLACK_USER_ID — Slack User ID of the owner (e.g. "U0123456789")
 *
 * Bot scopes needed in your Slack App:
 *   chat:write, app_mentions:read, im:read, im:history, im:write,
 *   files:read, reactions:write
 *
 * Streaming strategy:
 *   Slack allows ~1 chat.update call per second per channel. The adapter
 *   throttles updates via STREAM_INTERVAL_MS (same as Telegram adapter).
 *   Streaming cursor: appended "▌" to in-progress messages.
 *   Stop button: Block Kit button with action_id "stop_generation".
 */

import type { ChannelAdapter, ChannelMessage, StreamSession } from "./channel.js";
import { STREAM_INTERVAL_MS } from "./runner.js";

// ── Dynamic import helper ─────────────────────────────────────────────────────
// @slack/bolt is an optional dependency — import at runtime to avoid
// hard failures when Slack is not configured.

type BoltApp = import("@slack/bolt").App;

async function loadBolt(): Promise<typeof import("@slack/bolt")> {
  try {
    return await import("@slack/bolt");
  } catch {
    throw new Error(
      "@slack/bolt is not installed. Run: bun add @slack/bolt\n" +
      "Then restart the ensemble."
    );
  }
}

// ── Slack message length limit ────────────────────────────────────────────────

const SLACK_MAX_LENGTH = 3000; // conservative; Slack supports up to ~40k but truncate for readability

function truncateSlack(text: string): string {
  if (text.length <= SLACK_MAX_LENGTH) return text;
  return text.slice(0, SLACK_MAX_LENGTH - 20) + "\n\n_(truncated — too long)_";
}

// ── Active streams registry ───────────────────────────────────────────────────

const activeStreams = new Map<string, AbortController>();

// ── SlackAdapter ──────────────────────────────────────────────────────────────

export class SlackAdapter implements ChannelAdapter {
  readonly name = "slack";

  private readonly botToken: string;
  private readonly appToken: string;
  private readonly ownerUserId: string;
  private allowedUserIds = new Set<string>();

  private app: BoltApp | null = null;
  private messageHandler: ((msg: ChannelMessage) => Promise<void>) | null = null;

  constructor(opts: {
    botToken: string;
    appToken: string;
    ownerUserId: string;
    allowedUserIds?: string[];
  }) {
    this.botToken = opts.botToken;
    this.appToken = opts.appToken;
    this.ownerUserId = opts.ownerUserId;
    this.allowedUserIds = new Set([
      opts.ownerUserId,
      ...(opts.allowedUserIds ?? []),
    ]);
  }

  // ── ChannelAdapter implementation ─────────────────────────────────────────

  async start(): Promise<void> {
    const { App } = await loadBolt();

    this.app = new App({
      token: this.botToken,
      appToken: this.appToken,
      socketMode: true,
    }) as BoltApp;

    this._wire();

    await this.app.start();
    console.info("[slack] 🟢 Slack bot connected via Socket Mode");
  }

  async stop(): Promise<void> {
    if (this.app) {
      await this.app.stop();
      console.info("[slack] Disconnected");
    }
  }

  onMessage(handler: (msg: ChannelMessage) => Promise<void>): void {
    this.messageHandler = handler;
  }

  hasActiveStream(channelId: string): boolean {
    return activeStreams.has(channelId);
  }

  cancelStream(channelId: string): void {
    activeStreams.get(channelId)?.abort();
  }

  async sendText(channelId: string, text: string): Promise<void> {
    if (!this.app) return;
    try {
      await (this.app as any).client.chat.postMessage({
        channel: channelId,
        text: truncateSlack(text),
      });
    } catch (err) {
      console.error("[slack] sendText failed:", err);
    }
  }

  isOwner(userId: string): boolean {
    return userId === this.ownerUserId;
  }

  async beginStream(channelId: string): Promise<StreamSession> {
    if (!this.app) throw new Error("SlackAdapter not started");
    const client = (this.app as any).client;

    // Send the "Generating…" control message with a Stop button
    const controlRes = await client.chat.postMessage({
      channel: channelId,
      text: "⏳ Generating response…",
      blocks: [
        {
          type: "section",
          text: { type: "mrkdwn", text: "⏳ Generating response…" },
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: { type: "plain_text", text: "■ Stop", emoji: false },
              action_id: "stop_generation",
              value: channelId,
              style: "danger",
            },
          ],
        },
      ],
    });
    const controlTs = controlRes.ts as string;

    // Send the initial stream message
    const streamRes = await client.chat.postMessage({
      channel: channelId,
      text: "…",
    });
    const streamTs = streamRes.ts as string;

    const abort = new AbortController();
    activeStreams.set(channelId, abort);

    let lastEditedText = "";
    let lastEditAt = Date.now();

    return {
      abort,
      channelId,

      onChunk: async (partial: string) => {
        const now = Date.now();
        if (partial === lastEditedText || now - lastEditAt < STREAM_INTERVAL_MS) return;
        lastEditedText = partial;
        lastEditAt = now;
        try {
          await client.chat.update({
            channel: channelId,
            ts: streamTs,
            text: truncateSlack(partial) + " ▌",
          });
        } catch { /* rate limit */ }
      },

      onDone: async (finalText: string, stopped: boolean) => {
        activeStreams.delete(channelId);

        // Remove Stop button from control message
        try {
          await client.chat.update({
            channel: channelId,
            ts: controlTs,
            text: stopped ? "🛑 Stopped by user." : "✅ Done.",
            blocks: [],
          });
        } catch { /* best-effort */ }

        // Update stream message with final content
        const display = finalText.length > 0 ? finalText : (stopped ? "[stopped]" : "(empty response)");
        const suffix = stopped && finalText.length > 0 ? "\n\n_[stopped]_" : "";
        try {
          await client.chat.update({
            channel: channelId,
            ts: streamTs,
            text: truncateSlack(display + suffix),
          });
        } catch { /* best-effort */ }
      },
    };
  }

  // ── Internal wiring ────────────────────────────────────────────────────────

  private _wire(): void {
    if (!this.app) return;

    // Direct messages and app mentions
    (this.app as any).message(async ({ message, say }: { message: any; say: any }) => {
      const userId = message.user as string | undefined;
      if (!userId) return;

      // Auth check
      if (!this.allowedUserIds.has(userId)) {
        await say({ text: "⛔ You are not authorised to use this bot." });
        return;
      }

      const channelId = message.channel as string;
      const text = (message.text ?? "") as string;

      if (!text.trim()) return;

      if (this.hasActiveStream(channelId)) {
        await say({ text: "⏳ Still processing your previous request. Use ■ Stop to cancel it first." });
        return;
      }

      // Owner-only slash-style commands via text prefix
      if (text.startsWith("/allow ") && this.isOwner(userId)) {
        const targetId = text.slice("/allow ".length).trim();
        if (targetId) {
          this.allowedUserIds.add(targetId);
          await say({ text: `✅ User <@${targetId}> added to allowlist.` });
        }
        return;
      }

      if (text.startsWith("/revoke ") && this.isOwner(userId)) {
        const targetId = text.slice("/revoke ".length).trim();
        if (targetId && targetId !== this.ownerUserId) {
          this.allowedUserIds.delete(targetId);
          await say({ text: `✅ User <@${targetId}> removed from allowlist.` });
        }
        return;
      }

      const handler = this.messageHandler;
      if (!handler) return;

      await handler({ userId, text, channelId, source: "slack" });
    });

    // Stop button action
    (this.app as any).action("stop_generation", async ({ body, ack }: { body: any; ack: () => Promise<void> }) => {
      await ack();
      const channelId = body.actions?.[0]?.value as string | undefined;
      if (channelId) this.cancelStream(channelId);
    });
  }
}

// ── Factory ───────────────────────────────────────────────────────────────────

/**
 * Create a SlackAdapter from environment variables.
 * Returns null if Slack is not configured (tokens absent).
 */
export function createSlackAdapter(env: Record<string, string>): SlackAdapter | null {
  const botToken = env["SLACK_BOT_TOKEN"];
  const appToken = env["SLACK_APP_TOKEN"];
  const ownerUserId = env["OWNER_SLACK_USER_ID"];

  if (!botToken || !appToken || !ownerUserId) return null;

  return new SlackAdapter({ botToken, appToken, ownerUserId });
}

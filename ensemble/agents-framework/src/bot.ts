import { join } from "path";
import { Bot, InlineKeyboard, type Context } from "grammy";
import Anthropic from "@anthropic-ai/sdk";
import { execSync } from "child_process";
import type { AgentConfig } from "./types.js";
import { AuthManager, createAuthMiddleware, registerUserManagementCommands } from "./auth.js";
import { buildSystemPrompt } from "./agent.js";
import { openBus } from "./bus.js";
import { STREAM_INTERVAL_MS, runAgentStream, resolveModel } from "./runner.js";
import { transcribeVoice, downloadTelegramFile } from "./voice.js";
import type { ChannelAdapter, ChannelMessage, StreamSession } from "./channel.js";

// Maximum message length before splitting into a new message
const TELEGRAM_MAX_LENGTH = 4096;

// ── Active stream registry ────────────────────────────────────────────────────

const activeStreams = new Map<string, AbortController>();

// ── Orphaned process cleanup ──────────────────────────────────────────────────

function killOrphanedBotProcesses(botToken: string): void {
  try {
    const tokenFragment = botToken.split(":")[0];
    if (!tokenFragment || !/^\d+$/.test(tokenFragment)) return;

    const platform = process.platform;
    if (platform === "win32") {
      try {
        const output = execSync(
          `wmic process where "commandline like '%${tokenFragment}%'" get processid /format:value`,
          { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }
        );
        const pids = output
          .split("\n")
          .filter((l) => l.startsWith("ProcessId="))
          .map((l) => parseInt(l.split("=")[1] ?? "0", 10))
          .filter((pid) => pid > 0 && pid !== process.pid);
        for (const pid of pids) {
          try { execSync(`taskkill /PID ${pid} /F`, { stdio: "pipe" }); } catch { /* best-effort */ }
        }
      } catch { /* best-effort */ }
    } else {
      try {
        execSync(`pkill -f "${tokenFragment}" 2>/dev/null || true`, { stdio: "pipe" });
        execSync("sleep 0.5", { stdio: "pipe" });
      } catch { /* best-effort */ }
    }
  } catch { /* best-effort — startup must not fail due to cleanup */ }
}

// ── Telegram message helpers ──────────────────────────────────────────────────

function truncate(text: string, maxLen = TELEGRAM_MAX_LENGTH): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 3) + "...";
}

function splitMessage(text: string): string[] {
  if (text.length <= TELEGRAM_MAX_LENGTH) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > TELEGRAM_MAX_LENGTH) {
    let splitAt = remaining.lastIndexOf("\n\n", TELEGRAM_MAX_LENGTH);
    if (splitAt < TELEGRAM_MAX_LENGTH / 2) {
      splitAt = remaining.lastIndexOf("\n", TELEGRAM_MAX_LENGTH);
    }
    if (splitAt < TELEGRAM_MAX_LENGTH / 2) {
      splitAt = TELEGRAM_MAX_LENGTH;
    }
    chunks.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trim();
  }

  if (remaining.length > 0) chunks.push(remaining);
  return chunks;
}

// ── Progress milestone helper (used by lead agent commands) ──────────────────

export async function sendProgressUpdate(
  bot: Bot<Context>,
  chatId: number,
  stage: string
): Promise<number | undefined> {
  try {
    const msg = await bot.api.sendMessage(chatId, `🔄 ${stage}`);
    return msg.message_id;
  } catch {
    return undefined;
  }
}

export async function editProgressUpdate(
  bot: Bot<Context>,
  chatId: number,
  messageId: number,
  newText: string
): Promise<void> {
  try {
    await bot.api.editMessageText(chatId, messageId, newText);
  } catch { /* best-effort */ }
}

// ── TelegramAdapter ───────────────────────────────────────────────────────────

/**
 * Telegram implementation of ChannelAdapter.
 *
 * Wraps a Grammy bot. The adapter handles all Telegram-specific UI:
 * - Two-message streaming pattern (control + stream message)
 * - [■ Stop] inline keyboard button
 * - Auth via AuthManager (owner + allowlist)
 *
 * Usage:
 *   const adapter = new TelegramAdapter(config);
 *   adapter.onMessage(async (msg) => { ... });
 *   await adapter.start();
 */
export class TelegramAdapter implements ChannelAdapter {
  readonly name = "telegram";

  private readonly bot: Bot<Context>;
  private readonly auth: AuthManager;
  private readonly config: AgentConfig;
  private messageHandler: ((msg: ChannelMessage) => Promise<void>) | null = null;

  constructor(config: AgentConfig) {
    this.config = config;
    killOrphanedBotProcesses(config.telegramBotToken);
    this.bot = new Bot<Context>(config.telegramBotToken);
    this.auth = new AuthManager(config);
    this._wire();
  }

  // ── ChannelAdapter implementation ─────────────────────────────────────────

  async start(): Promise<void> {
    await this.bot.start({
      drop_pending_updates: true,
      onStart: (info) => {
        console.info(`[telegram] 🟢 Bot @${info.username} started (cwd: ${this.config.cwd})`);
      },
    });
  }

  stop(): Promise<void> {
    this.bot.stop();
    return Promise.resolve();
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
    try {
      await this.bot.api.sendMessage(parseInt(channelId, 10), text);
    } catch { /* best-effort */ }
  }

  isOwner(userId: string): boolean {
    return parseInt(userId, 10) === this.config.ownerId;
  }

  async beginStream(channelId: string): Promise<StreamSession> {
    const chatId = parseInt(channelId, 10);
    const stopKeyboard = new InlineKeyboard().text("■ Stop", `stop:${channelId}`);

    const controlMsg = await this.bot.api.sendMessage(chatId, "⏳ Generating response...", {
      reply_markup: stopKeyboard,
    });
    const streamMsg = await this.bot.api.sendMessage(chatId, "...");

    const abort = new AbortController();
    activeStreams.set(channelId, abort);

    const controlMsgId = controlMsg.message_id;
    const streamMsgId = streamMsg.message_id;
    const bot = this.bot;
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
          await bot.api.editMessageText(chatId, streamMsgId, truncate(partial) + " ▌");
        } catch { /* rate limit or unchanged */ }
      },

      onDone: async (finalText: string, stopped: boolean) => {
        activeStreams.delete(channelId);

        try {
          await bot.api.editMessageText(
            chatId, controlMsgId,
            stopped ? "🛑 Stopped by user." : "✅ Done."
          );
        } catch { /* message may have been deleted */ }

        if (finalText.length === 0) {
          try {
            await bot.api.editMessageText(chatId, streamMsgId, stopped ? "[stopped]" : "(empty response)");
          } catch { /* best-effort */ }
          return;
        }

        const chunks = splitMessage(finalText + (stopped ? "\n\n[stopped]" : ""));
        try {
          await bot.api.editMessageText(chatId, streamMsgId, truncate(chunks[0] ?? ""));
        } catch { /* best-effort */ }
        for (const chunk of chunks.slice(1)) {
          try { await bot.api.sendMessage(chatId, chunk); } catch { /* best-effort */ }
        }
      },
    };
  }

  /** Expose the underlying Grammy bot for lead-agent-specific commands. */
  get grammy(): Bot<Context> {
    return this.bot;
  }

  // ── Internal wiring ────────────────────────────────────────────────────────

  private _wire(): void {
    this.bot.use(createAuthMiddleware(this.auth));
    registerUserManagementCommands(
      { command: (cmd, handler) => this.bot.command(cmd, handler) },
      this.auth
    );

    // Stop button callback
    this.bot.callbackQuery(/^stop:(.+)$/, async (ctx) => {
      const channelId = ctx.match[1] ?? "";
      if (channelId !== String(ctx.chat?.id)) return;
      this.cancelStream(channelId);
      try { await ctx.answerCallbackQuery("Stopping..."); } catch { /* best-effort */ }
    });

    // Main text message handler
    this.bot.on("message:text", async (ctx) => {
      const channelId = String(ctx.chat.id);
      const userId = String(ctx.from?.id ?? "");

      if (this.hasActiveStream(channelId)) {
        await ctx.reply("⏳ Still processing your previous request. Use ■ Stop to cancel it first.");
        return;
      }

      const handler = this.messageHandler;
      if (!handler) return;

      await handler({ userId, text: ctx.message.text, channelId, source: "telegram" });
    });

    // Voice message handler — transcribes via Whisper then routes as text
    this.bot.on("message:voice", async (ctx) => {
      const channelId = String(ctx.chat.id);
      const userId = String(ctx.from?.id ?? "");
      const openAiKey = process.env["OPENAI_API_KEY"];

      if (!openAiKey) {
        await ctx.reply("🎤 Voice messages require OPENAI_API_KEY to be configured.");
        return;
      }

      if (this.hasActiveStream(channelId)) {
        await ctx.reply("⏳ Still processing. Use ■ Stop to cancel first.");
        return;
      }

      const statusMsg = await ctx.reply("🎤 Transcribing…");

      try {
        const fileId = ctx.message.voice.file_id;
        const buffer = await downloadTelegramFile(fileId, this.config.telegramBotToken);
        const { text, durationMs } = await transcribeVoice(
          { buffer, mimeType: "audio/ogg" },
          openAiKey
        );

        if (!text) {
          await ctx.api.editMessageText(
            parseInt(channelId, 10), statusMsg.message_id,
            "🎤 Transcription returned empty text. Please try again."
          );
          return;
        }

        // Show the transcript to the user
        await ctx.api.editMessageText(
          parseInt(channelId, 10), statusMsg.message_id,
          `🎤 _"${text}"_\n\n_(transcribed in ${durationMs ?? 0}ms)_`
        );

        // Route transcript as if it were a text message
        const handler = this.messageHandler;
        if (handler) {
          await handler({ userId, text, channelId, source: "telegram" });
        }
      } catch (err) {
        await ctx.api.editMessageText(
          parseInt(channelId, 10), statusMsg.message_id,
          `🎤 Transcription failed: ${err instanceof Error ? err.message : String(err)}`
        ).catch(() => {});
      }
    });
  }
}

// ── Legacy createBotApp (backward compat for role agents) ────────────────────

export interface BotApp {
  bot: Bot<Context>;
  start: () => Promise<void>;
  stop: () => void;
}

export interface CreateBotAppOptions {
  project: string;
  dropPendingUpdates?: boolean;
}

/**
 * Legacy factory for role agents (frontend, backend, qa, devops, security).
 * Role agents continue using this function; only the Lead uses TelegramAdapter.
 */
export function createBotApp(
  config: AgentConfig,
  opts: CreateBotAppOptions
): BotApp {
  const { telegramBotToken, manifest, cwd, stateDir, modelRouting } = config;

  killOrphanedBotProcesses(telegramBotToken);

  const bot = new Bot<Context>(telegramBotToken);
  const auth = new AuthManager(config);
  const anthropic = new Anthropic({ apiKey: process.env["ANTHROPIC_API_KEY"] });
  const bus = openBus({ stateRoot: join(stateDir, ".."), actor: manifest.role });

  bot.use(createAuthMiddleware(auth));
  registerUserManagementCommands(
    { command: (cmd, handler) => bot.command(cmd, handler) },
    auth
  );

  bot.callbackQuery(/^stop:(\d+)$/, async (ctx) => {
    const chatId = parseInt(ctx.match[1] ?? "0", 10);
    if (chatId !== ctx.chat?.id) return;
    const controller = activeStreams.get(String(chatId));
    if (controller) controller.abort();
    try { await ctx.answerCallbackQuery("Stopping..."); } catch { /* best-effort */ }
  });

  bot.on("message:text", async (ctx) => {
    const chatId = ctx.chat.id;
    const channelId = String(chatId);
    const userMessage = ctx.message.text;

    if (activeStreams.has(channelId)) {
      await ctx.reply("⏳ Still processing. Use ■ Stop to cancel first.");
      return;
    }

    const adapter = new TelegramAdapter(config);
    const session = await adapter.beginStream(channelId);
    const typingInterval = setInterval(async () => {
      if (session.abort.signal.aborted) { clearInterval(typingInterval); return; }
      try { await bot.api.sendChatAction(chatId, "typing"); } catch { /* best-effort */ }
    }, 4000);
    bot.api.sendChatAction(chatId, "typing").catch(() => {});

    let finalText = "";
    let stopped = false;
    const currentTasksMd = bus.renderCurrentTasksMd();
    const systemPrompt = buildSystemPrompt(config, currentTasksMd);
    const model = resolveModel(modelRouting);

    let lastChunked = "";
    try {
      finalText = await runAgentStream(
        anthropic,
        systemPrompt.append,
        userMessage,
        model,
        session.abort,
        (partial) => {
          if (partial === lastChunked) return;
          lastChunked = partial;
          session.onChunk(partial).catch(() => {});
        }
      );
    } catch (err) {
      if (session.abort.signal.aborted) { stopped = true; }
      else { finalText = `⚠️ Error: ${err instanceof Error ? err.message : String(err)}`; }
    } finally {
      clearInterval(typingInterval);
    }

    await session.onDone(finalText, stopped);

    const pending = bus.drainInbox();
    for (const msg of pending) {
      console.info(`[bus] inbox: ${msg.type} from ${msg.from}`);
    }
  });

  function stop(): void {
    const interrupted = bus.markInProgressAsInterrupted();
    if (interrupted > 0) console.info(`[shutdown] Marked ${interrupted} task(s) as INTERRUPTED`);
    bot.stop();
  }

  process.once("SIGTERM", stop);
  process.once("SIGINT", stop);

  return {
    bot,
    start: async () => {
      await bot.start({
        drop_pending_updates: opts.dropPendingUpdates ?? true,
        onStart: (info) => {
          console.info(`[${manifest.id}] 🟢 @${info.username} (project: ${opts.project}, cwd: ${cwd})`);
        },
      });
    },
    stop,
  };
}

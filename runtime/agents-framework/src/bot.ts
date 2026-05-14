import { join } from "path";
import { Bot, InlineKeyboard, type Context } from "grammy";
import Anthropic from "@anthropic-ai/sdk";
import { execSync } from "child_process";
import type { AgentConfig } from "./types.js";
import { AuthManager, createAuthMiddleware, registerUserManagementCommands } from "./auth.js";
import { buildSystemPrompt } from "./agent.js";
import { openBus } from "./bus.js";

// ── Streaming constants ───────────────────────────────────────────────────────

// Edit the streaming message every N tokens or every STREAM_INTERVAL_MS,
// whichever comes first. Telegram allows max ~1 edit/second per chat.
const STREAM_CHUNK_SIZE = 25;
const STREAM_INTERVAL_MS = 1200;

// Maximum message length before splitting into a new message
const TELEGRAM_MAX_LENGTH = 4096;

// ── Active stream registry ────────────────────────────────────────────────────

// Tracks active AbortControllers by chat ID. Only one stream per chat at a time.
const activeStreams = new Map<number, AbortController>();

// ── Orphaned process cleanup ──────────────────────────────────────────────────

/**
 * Kill any stale bot polling processes that might be running from a previous
 * session. This prevents the "two pollers fight and messages get silently
 * dropped" issue seen in the webinar. Called once at startup.
 */
function killOrphanedBotProcesses(botToken: string): void {
  try {
    // Find processes containing the bot token fragment in their command line
    const tokenFragment = botToken.split(":")[0]; // use the numeric ID part only
    if (!tokenFragment || !/^\d+$/.test(tokenFragment)) return;

    const platform = process.platform;
    if (platform === "win32") {
      // Windows: use tasklist + taskkill
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
      // Unix: use pkill with process name + token fragment
      try {
        execSync(
          `pkill -f "${tokenFragment}" 2>/dev/null || true`,
          { stdio: "pipe" }
        );
        // Brief pause to allow graceful shutdown
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

/** Split text into Telegram-safe chunks at paragraph or sentence boundaries. */
function splitMessage(text: string): string[] {
  if (text.length <= TELEGRAM_MAX_LENGTH) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > TELEGRAM_MAX_LENGTH) {
    // Try to split at a paragraph boundary
    let splitAt = remaining.lastIndexOf("\n\n", TELEGRAM_MAX_LENGTH);
    if (splitAt < TELEGRAM_MAX_LENGTH / 2) {
      // Fall back to newline
      splitAt = remaining.lastIndexOf("\n", TELEGRAM_MAX_LENGTH);
    }
    if (splitAt < TELEGRAM_MAX_LENGTH / 2) {
      // Fall back to hard split
      splitAt = TELEGRAM_MAX_LENGTH;
    }
    chunks.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trim();
  }

  if (remaining.length > 0) chunks.push(remaining);
  return chunks;
}

// ── Streaming response pattern ────────────────────────────────────────────────

interface StreamSession {
  controlMsgId: number;
  streamMsgId: number;
  chatId: number;
  abort: AbortController;
}

/**
 * Send the two-message streaming UI:
 *   Message 1: "⏳ Generating response..." + [■ Stop] button
 *   Message 2: "..." (updated in-place as tokens stream)
 *
 * Returns the session object for cleanup.
 */
async function startStreamingUI(ctx: Context): Promise<StreamSession> {
  const chatId = ctx.chat!.id;

  const stopKeyboard = new InlineKeyboard().text("■ Stop", `stop:${chatId}`);

  const controlMsg = await ctx.reply("⏳ Generating response...", {
    reply_markup: stopKeyboard,
  });

  const streamMsg = await ctx.reply("...");

  const abort = new AbortController();
  activeStreams.set(chatId, abort);

  return {
    controlMsgId: controlMsg.message_id,
    streamMsgId: streamMsg.message_id,
    chatId,
    abort,
  };
}

async function finishStreamingUI(
  ctx: Context,
  session: StreamSession,
  finalText: string,
  stopped = false
): Promise<void> {
  const { chatId, controlMsgId, streamMsgId } = session;
  activeStreams.delete(chatId);

  // Remove the Stop button from the control message
  try {
    await ctx.api.editMessageText(
      chatId,
      controlMsgId,
      stopped ? "🛑 Stopped by user." : "✅ Done."
    );
  } catch { /* message may have been deleted */ }

  // Fill the streaming message with the final content
  if (finalText.length === 0) {
    try {
      await ctx.api.editMessageText(chatId, streamMsgId, stopped ? "[stopped]" : "(empty response)");
    } catch { /* best-effort */ }
    return;
  }

  const chunks = splitMessage(finalText + (stopped ? "\n\n[stopped]" : ""));

  // Edit the first chunk into the streaming message
  try {
    await ctx.api.editMessageText(chatId, streamMsgId, truncate(chunks[0] ?? ""));
  } catch { /* best-effort */ }

  // Send any overflow chunks as new messages
  for (const chunk of chunks.slice(1)) {
    try {
      await ctx.reply(chunk);
    } catch { /* best-effort */ }
  }
}

// ── Anthropic streaming call ──────────────────────────────────────────────────

async function runAgentStream(
  client: Anthropic,
  systemPrompt: string,
  userMessage: string,
  model: string,
  abort: AbortController,
  onChunk: (partial: string) => void
): Promise<string> {
  let accumulated = "";
  let chunkCount = 0;
  let lastEditAt = Date.now();

  const stream = await client.messages.stream(
    {
      model,
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    },
    { signal: abort.signal }
  );

  for await (const event of stream) {
    if (abort.signal.aborted) break;

    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      accumulated += event.delta.text;
      chunkCount++;

      const now = Date.now();
      if (
        chunkCount % STREAM_CHUNK_SIZE === 0 ||
        now - lastEditAt >= STREAM_INTERVAL_MS
      ) {
        onChunk(accumulated);
        lastEditAt = now;
      }
    }
  }

  return accumulated;
}

// ── Typing indicator loop ─────────────────────────────────────────────────────

function startTypingIndicator(
  bot: Bot<Context>,
  chatId: number,
  abort: AbortController
): NodeJS.Timeout {
  const interval = setInterval(async () => {
    if (abort.signal.aborted) {
      clearInterval(interval);
      return;
    }
    try {
      await bot.api.sendChatAction(chatId, "typing");
    } catch { /* best-effort */ }
  }, 4000);

  // Send the first one immediately
  bot.api.sendChatAction(chatId, "typing").catch(() => {});

  return interval;
}

// ── Progress milestone helper ─────────────────────────────────────────────────

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

// ── Bot factory ───────────────────────────────────────────────────────────────

export interface BotApp {
  bot: Bot<Context>;
  start: () => Promise<void>;
  stop: () => void;
}

export interface CreateBotAppOptions {
  /** Project ID — matches the folder name under runtime/projects/. */
  project: string;
  /**
   * If true, discard any messages queued while the bot was offline.
   * Prevents processing stale messages from unauthorized users.
   */
  dropPendingUpdates?: boolean;
}

/**
 * Create a fully configured bot application for a given project.
 * Wires together auth, scope, bus, system prompt, and streaming.
 */
export function createBotApp(
  config: AgentConfig,
  opts: CreateBotAppOptions
): BotApp {
  const { telegramBotToken, manifest, cwd, stateDir, modelRouting } = config;

  // Kill stale pollers before starting a new one
  killOrphanedBotProcesses(telegramBotToken);

  const bot = new Bot<Context>(telegramBotToken);
  const auth = new AuthManager(config);
  const anthropic = new Anthropic({ apiKey: process.env["ANTHROPIC_API_KEY"] });
  const bus = openBus({ stateRoot: join(stateDir, ".."), actor: manifest.role });

  // ── Auth middleware (must be first) ──────────────────────────────────────
  bot.use(createAuthMiddleware(auth));

  // ── Register user management commands ────────────────────────────────────
  registerUserManagementCommands(
    { command: (cmd, handler) => bot.command(cmd, handler) },
    auth
  );

  // ── Stop button callback ──────────────────────────────────────────────────
  bot.callbackQuery(/^stop:(\d+)$/, async (ctx) => {
    const chatId = parseInt(ctx.match[1] ?? "0", 10);
    if (chatId !== ctx.chat?.id) return; // safety: only the right chat

    const controller = activeStreams.get(chatId);
    if (controller) {
      controller.abort();
    }

    try {
      await ctx.answerCallbackQuery("Stopping...");
    } catch { /* best-effort */ }
  });

  // ── Main message handler ──────────────────────────────────────────────────
  bot.on("message:text", async (ctx) => {
    const chatId = ctx.chat.id;
    const userMessage = ctx.message.text;

    // Check if another stream is already running for this chat
    if (activeStreams.has(chatId)) {
      await ctx.reply(
        "⏳ Still processing your previous request. Use ■ Stop to cancel it first."
      );
      return;
    }

    // Start streaming UI immediately
    const session = await startStreamingUI(ctx);
    const typingInterval = startTypingIndicator(bot, chatId, session.abort);

    let finalText = "";
    let stopped = false;

    try {
      // Build system prompt with current task state
      const currentTasksMd = bus.renderCurrentTasksMd();
      const systemPrompt = buildSystemPrompt(config, currentTasksMd);

      // Select model based on routing config
      const modelMap: Record<string, string> = {
        opus: "claude-opus-4-5",
        sonnet: "claude-sonnet-4-5",
        haiku: "claude-haiku-3-5",
      };
      const model = modelMap[modelRouting.execution] ?? "claude-sonnet-4-5";

      // Stream the response, editing the streaming message on each chunk
      let lastEditedText = "";
      finalText = await runAgentStream(
        anthropic,
        systemPrompt.append,
        userMessage,
        model,
        session.abort,
        async (partial) => {
          if (partial === lastEditedText) return;
          lastEditedText = partial;
          try {
            await ctx.api.editMessageText(
              chatId,
              session.streamMsgId,
              truncate(partial) + " ▌" // cursor indicator
            );
          } catch { /* rate limit or message unchanged */ }
        }
      );
    } catch (err) {
      if (session.abort.signal.aborted) {
        stopped = true;
      } else {
        finalText = `⚠️ Error: ${err instanceof Error ? err.message : String(err)}`;
      }
    } finally {
      clearInterval(typingInterval);
    }

    await finishStreamingUI(ctx, session, finalText, stopped);

    // Check bus inbox for any messages that arrived during processing
    const pending = bus.drainInbox();
    for (const msg of pending) {
      // Log bus messages for the agent — they'll be injected into the next prompt
      console.info(`[bus] inbox message: ${msg.type} from ${msg.from} (task: ${msg.taskId})`);
    }
  });

  // ── Graceful shutdown ─────────────────────────────────────────────────────
  function stop(): void {
    // Mark any in-progress tasks as INTERRUPTED before exit
    const interrupted = bus.markInProgressAsInterrupted();
    if (interrupted > 0) {
      console.info(`[shutdown] Marked ${interrupted} task(s) as INTERRUPTED`);
    }
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
          console.info(
            `[${manifest.id}] 🟢 Bot @${info.username} started (project: ${opts.project}, cwd: ${cwd})`
          );
        },
      });
    },
    stop,
  };
}


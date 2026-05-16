import { join } from "path";
import Anthropic from "@anthropic-ai/sdk";
import { loadProjectEnv, runPreflight, buildAgentConfig, DEFAULT_MANIFESTS, DEFAULT_SCOPES } from "agents-framework/config.js";
import { TelegramAdapter } from "agents-framework/bot.js";
import { createSlackAdapter } from "agents-framework/slack.js";
import { openBus } from "agents-framework/bus.js";
import { initLogger } from "agents-framework/logger.js";
import { startKeepAwake, stopKeepAwake } from "agents-framework/keepawake.js";
import { writeShutdownMarker } from "agents-framework/state.js";
import { startWebServer } from "agents-framework/web-server.js";
import { runChannelAgentFlow } from "agents-framework/runner.js";
import type { ChannelAdapter } from "agents-framework/channel.js";
import type { AgentManifest, AgentRole } from "agents-framework/types.js";

const PROJECT_ID = "lead";
const RUNTIME_ROOT = new URL("../../../..", import.meta.url).pathname;
const STATE_ROOT = join(RUNTIME_ROOT, ".state");

// ── Load and validate environment ─────────────────────────────────────────────

const env = loadProjectEnv(PROJECT_ID);
const preflight = runPreflight(PROJECT_ID, env);
console.log(preflight.report);

if (!preflight.ok) {
  console.error(
    "\n❌ Preflight failed. Run `bun run setup` to configure missing values.\n"
  );
  process.exit(1);
}

// ── Build manifest ────────────────────────────────────────────────────────────

const baseManifest = DEFAULT_MANIFESTS[PROJECT_ID]!;
const manifest: AgentManifest = {
  ...baseManifest,
  scope: DEFAULT_SCOPES[PROJECT_ID]!,
};

const config = buildAgentConfig(manifest, env);
const stateDir = join(STATE_ROOT, PROJECT_ID);

// ── Init logger ───────────────────────────────────────────────────────────────

const logger = initLogger({
  agentId: PROJECT_ID,
  stateDir,
  level: (env["LOG_LEVEL"] as "debug" | "info" | "warn" | "error") ?? "info",
});

// ── Check for interrupted tasks from previous session ─────────────────────────

const bus = openBus({ stateRoot: STATE_ROOT, actor: "lead" });
const interrupted = bus.getInterruptedTasks();

if (interrupted.length > 0) {
  logger.warn(
    `Found ${interrupted.length} interrupted task(s) from previous session. ` +
      "Will notify owner on first message."
  );
}

// ── Anthropic client ──────────────────────────────────────────────────────────

const anthropic = new Anthropic({ apiKey: env["ANTHROPIC_API_KEY"] });

// ── Start keep-awake ──────────────────────────────────────────────────────────

startKeepAwake(process.pid);

// ── Build channel adapters ────────────────────────────────────────────────────

const adapters: ChannelAdapter[] = [];

// Telegram — enabled when TELEGRAM_BOT_TOKEN is present (default on)
const enableTelegram = env["ENABLE_TELEGRAM"] !== "false" && !!env["TELEGRAM_BOT_TOKEN"];
let telegramAdapter: TelegramAdapter | null = null;

if (enableTelegram) {
  telegramAdapter = new TelegramAdapter(config);
  adapters.push(telegramAdapter);
  logger.info("Telegram channel enabled");
} else {
  logger.info("Telegram channel disabled (ENABLE_TELEGRAM=false or no token)");
}

// Slack — enabled when SLACK_BOT_TOKEN + SLACK_APP_TOKEN + OWNER_SLACK_USER_ID present
const enableSlack = env["ENABLE_SLACK"] !== "false";
const slackAdapter = enableSlack ? createSlackAdapter(env) : null;

if (slackAdapter) {
  adapters.push(slackAdapter);
  logger.info("Slack channel enabled");
} else if (env["SLACK_BOT_TOKEN"]) {
  logger.warn("Slack tokens present but ENABLE_SLACK=false — Slack channel disabled");
}

if (adapters.length === 0) {
  logger.warn("No communication channels configured. Running in web-chat-only mode.");
}

// ── Shared message handler (registered on all channels) ───────────────────────

let interruptedNotified = false;

async function handleChannelMessage(
  adapter: ChannelAdapter,
  userId: string,
  text: string,
  channelId: string
): Promise<void> {
  // Notify owner of interrupted tasks on first interaction
  if (!interruptedNotified && interrupted.length > 0 && adapter.isOwner(userId)) {
    interruptedNotified = true;
    const taskList = interrupted
      .slice(0, 5)
      .map((t) => `• ${t.id}: ${t.title ?? t.type}`)
      .join("\n");
    const more = interrupted.length > 5 ? `\n…and ${interrupted.length - 5} more` : "";
    await adapter.sendText(
      channelId,
      `⚠️ Found ${interrupted.length} interrupted task(s) from last session:\n${taskList}${more}\n\nReply "resume" to continue or "discard" to clear them.`
    );
  }

  if (adapter.hasActiveStream(channelId)) return;

  const session = await adapter.beginStream(channelId);

  try {
    await runChannelAgentFlow(config, text, anthropic, bus, session);
  } catch (err: unknown) {
    await adapter.sendText(channelId, `❌ Agent error: ${err instanceof Error ? err.message : String(err)}`);
    logger.error("Agent flow failed", { error: String(err) });
  }
}

// Register the handler on each adapter
for (const adapter of adapters) {
  adapter.onMessage(async (msg) => {
    await handleChannelMessage(adapter, msg.userId, msg.text, msg.channelId);
  });
}

// ── Lead-specific Telegram commands ───────────────────────────────────────────

if (telegramAdapter) {
  const grammy = telegramAdapter.grammy;

  grammy.command("status", async (ctx) => {
    if (!ctx.from || ctx.from.id !== config.ownerId) return;

    const roles: AgentRole[] = ["frontend", "backend", "qa", "devops", "security"];
    const lines = ["🎼 *AI Orchestra Status*\n"];

    for (const role of roles) {
      const roleBus = openBus({ stateRoot: STATE_ROOT, actor: role });
      const tasks = roleBus.getTasks();
      const inProgress = tasks.filter((t) => t.status === "IN_PROGRESS").length;
      const blocked = tasks.filter((t) => t.status === "BLOCKED").length;
      const inbox = roleBus.peekInbox(role).length;
      const statusIcon = inProgress > 0 ? "🟢" : blocked > 0 ? "🟡" : "⚪";
      lines.push(`${statusIcon} *${role}* — ${inProgress} active, ${blocked} blocked, ${inbox} inbox`);
    }

    const leadTasks = bus.getTasks();
    lines.push(`\n📋 *Lead* — ${leadTasks.filter((t) => t.status === "IN_PROGRESS").length} active tasks`);

    await ctx.reply(lines.join("\n"), { parse_mode: "Markdown" });
  });

  grammy.command("restart", async (ctx) => {
    if (!ctx.from || ctx.from.id !== config.ownerId) return;

    await ctx.reply("🔴 Orchestrator shutting down. Stopping all agents…\nBack in ~10s.");

    bus.markInProgressAsInterrupted();
    writeShutdownMarker(stateDir, "sigterm");
    stopKeepAwake();

    setTimeout(() => process.exit(0), 500);
  });

  // /orchestrate <path> — trigger autonomous project orchestration (W5)
  grammy.command("orchestrate", async (ctx) => {
    if (!ctx.from || ctx.from.id !== config.ownerId) return;
    const targetPath = ctx.match?.trim();
    if (!targetPath) {
      await ctx.reply("Usage: /orchestrate <absolute-project-path>");
      return;
    }
    await ctx.reply(
      `🎼 Starting autonomous orchestration for:\n\`${targetPath}\`\n\n` +
      "I will detect your project stack, generate the orchestra config, and ask for your confirmation before writing any files."
    );
    // Orchestration is handled by orchestrate-project.ts; the command feeds into the agent flow
    await handleChannelMessage(
      telegramAdapter!,
      String(ctx.from.id),
      `orchestrate project at ${targetPath}`,
      String(ctx.chat.id)
    );
  });
}

// ── Optional web chat UI ──────────────────────────────────────────────────────

if (env["ENABLE_WEB_UI"] === "true") {
  const port = parseInt(env["WEB_UI_PORT"] ?? "3847", 10);
  const authToken = env["WEB_UI_TOKEN"] || undefined;

  startWebServer({
    port,
    anthropicApiKey: env["ANTHROPIC_API_KEY"] ?? "",
    cwd: config.cwd,
    authToken,
    logLevel: (env["LOG_LEVEL"] as "debug" | "info" | "warn" | "error") ?? "info",
  })
    .then(({ port: p }) => {
      logger.info(`Web chat available at http://localhost:${p}`);
    })
    .catch((err: unknown) => {
      logger.error("Failed to start web chat server", { error: String(err) });
    });
}

// ── Heartbeat monitor ─────────────────────────────────────────────────────────

setInterval(() => {
  logger.debug("heartbeat", { role: "lead", pid: process.pid });
}, 30_000);

// ── Start all adapters ────────────────────────────────────────────────────────

logger.info(`Starting Lead Orchestrator (cwd: ${config.cwd})`);

const startPromises = adapters.map((adapter) =>
  adapter.start().catch((err: unknown) => {
    logger.error(`Failed to start ${adapter.name} channel`, { error: String(err) });
    writeShutdownMarker(stateDir, "crash");
    stopKeepAwake();
    process.exit(1);
  })
);

await Promise.all(startPromises);

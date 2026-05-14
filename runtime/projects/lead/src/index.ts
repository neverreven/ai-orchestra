import { join } from "path";
import { loadProjectEnv, runPreflight, buildAgentConfig, DEFAULT_MANIFESTS, DEFAULT_SCOPES } from "agents-framework/config.js";
import { createBotApp } from "agents-framework/bot.js";
import { openBus } from "agents-framework/bus.js";
import { initLogger } from "agents-framework/logger.js";
import { startKeepAwake, stopKeepAwake } from "agents-framework/keepawake.js";
import { writeShutdownMarker } from "agents-framework/state.js";
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

// ── Check for interrupted tasks from previous session ────────────────────────

const bus = openBus({ stateRoot: STATE_ROOT, actor: "lead" });
const interrupted = bus.getInterruptedTasks();

if (interrupted.length > 0) {
  logger.warn(
    `Found ${interrupted.length} interrupted task(s) from previous session. ` +
      "Will notify owner on first message."
  );
}

// ── Start keep-awake ──────────────────────────────────────────────────────────

startKeepAwake(process.pid);

// ── Create and start bot ──────────────────────────────────────────────────────

const app = createBotApp(config, {
  project: PROJECT_ID,
  dropPendingUpdates: true,
});

// ── Lead-specific: /status and /restart commands ──────────────────────────────

app.bot.command("status", async (ctx) => {
  if (!ctx.from || ctx.from.id !== config.ownerId) return;

  // Report on each registered role agent by checking their state dirs
  const roles: AgentRole[] = ["frontend", "backend", "qa", "devops", "security"];
  const lines = ["🎼 *AI Orchestra Status*\n"];

  for (const role of roles) {
    const roleBus = openBus({ stateRoot: STATE_ROOT, actor: role });
    const tasks = roleBus.getTasks();
    const inProgress = tasks.filter((t) => t.status === "IN_PROGRESS").length;
    const blocked = tasks.filter((t) => t.status === "BLOCKED").length;
    const inbox = roleBus.peekInbox(role).length;

    const statusIcon = inProgress > 0 ? "🟢" : blocked > 0 ? "🟡" : "⚪";
    lines.push(
      `${statusIcon} *${role}* — ${inProgress} active, ${blocked} blocked, ${inbox} inbox`
    );
  }

  const leadTasks = bus.getTasks();
  lines.push(
    `\n📋 *Lead* — ${leadTasks.filter((t) => t.status === "IN_PROGRESS").length} active tasks`
  );

  await ctx.reply(lines.join("\n"), { parse_mode: "Markdown" });
});

app.bot.command("restart", async (ctx) => {
  if (!ctx.from || ctx.from.id !== config.ownerId) return;

  await ctx.reply(
    "🔴 Orchestrator shutting down. Stopping all agents...\nBack in ~10s."
  );

  // Mark tasks as interrupted before exit
  bus.markInProgressAsInterrupted();
  writeShutdownMarker(stateDir, "sigterm");
  stopKeepAwake();

  // Exit — the process manager (if any) will restart it
  setTimeout(() => process.exit(0), 500);
});

// ── Notify owner of interrupted tasks on first interaction ───────────────────

let interruptedNotified = false;
app.bot.use(async (ctx, next) => {
  if (!interruptedNotified && interrupted.length > 0 && ctx.from?.id === config.ownerId) {
    interruptedNotified = true;
    const taskList = interrupted
      .slice(0, 5)
      .map((t) => `• ${t.id}: ${t.title ?? t.type}`)
      .join("\n");
    const more = interrupted.length > 5 ? `\n…and ${interrupted.length - 5} more` : "";
    await ctx.reply(
      `⚠️ Found ${interrupted.length} interrupted task(s) from last session:\n${taskList}${more}\n\nReply "resume" to continue or "discard" to clear them.`,
      { parse_mode: "Markdown" }
    );
  }
  await next();
});

// ── Heartbeat monitor ─────────────────────────────────────────────────────────

// Simple heartbeat: log that the lead is alive every 30s
setInterval(() => {
  logger.debug("heartbeat", { role: "lead", pid: process.pid });
}, 30_000);

// ── Start ─────────────────────────────────────────────────────────────────────

logger.info(`Starting Lead Orchestrator (cwd: ${config.cwd})`);
app.start().catch((err) => {
  logger.error("Bot crashed", { error: String(err) });
  writeShutdownMarker(stateDir, "crash");
  stopKeepAwake();
  process.exit(1);
});

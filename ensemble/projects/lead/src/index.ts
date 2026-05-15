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

// â”€â”€ Load and validate environment â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const env = loadProjectEnv(PROJECT_ID);
const preflight = runPreflight(PROJECT_ID, env);
console.log(preflight.report);

if (!preflight.ok) {
  console.error(
    "\nâŒ Preflight failed. Run `bun run setup` to configure missing values.\n"
  );
  process.exit(1);
}

// â”€â”€ Build manifest â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const baseManifest = DEFAULT_MANIFESTS[PROJECT_ID]!;
const manifest: AgentManifest = {
  ...baseManifest,
  scope: DEFAULT_SCOPES[PROJECT_ID]!,
};

const config = buildAgentConfig(manifest, env);
const stateDir = join(STATE_ROOT, PROJECT_ID);

// â”€â”€ Init logger â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const logger = initLogger({
  agentId: PROJECT_ID,
  stateDir,
  level: (env["LOG_LEVEL"] as "debug" | "info" | "warn" | "error") ?? "info",
});

// â”€â”€ Check for interrupted tasks from previous session â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const bus = openBus({ stateRoot: STATE_ROOT, actor: "lead" });
const interrupted = bus.getInterruptedTasks();

if (interrupted.length > 0) {
  logger.warn(
    `Found ${interrupted.length} interrupted task(s) from previous session. ` +
      "Will notify owner on first message."
  );
}

// â”€â”€ Start keep-awake â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

startKeepAwake(process.pid);

// â”€â”€ Create and start bot â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const app = createBotApp(config, {
  project: PROJECT_ID,
  dropPendingUpdates: true,
});

// â”€â”€ Lead-specific: /status and /restart commands â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

app.bot.command("status", async (ctx) => {
  if (!ctx.from || ctx.from.id !== config.ownerId) return;

  // Report on each registered role agent by checking their state dirs
  const roles: AgentRole[] = ["frontend", "backend", "qa", "devops", "security"];
  const lines = ["ðŸŽ¼ *AI Orchestra Status*\n"];

  for (const role of roles) {
    const roleBus = openBus({ stateRoot: STATE_ROOT, actor: role });
    const tasks = roleBus.getTasks();
    const inProgress = tasks.filter((t) => t.status === "IN_PROGRESS").length;
    const blocked = tasks.filter((t) => t.status === "BLOCKED").length;
    const inbox = roleBus.peekInbox(role).length;

    const statusIcon = inProgress > 0 ? "ðŸŸ¢" : blocked > 0 ? "ðŸŸ¡" : "âšª";
    lines.push(
      `${statusIcon} *${role}* â€” ${inProgress} active, ${blocked} blocked, ${inbox} inbox`
    );
  }

  const leadTasks = bus.getTasks();
  lines.push(
    `\nðŸ“‹ *Lead* â€” ${leadTasks.filter((t) => t.status === "IN_PROGRESS").length} active tasks`
  );

  await ctx.reply(lines.join("\n"), { parse_mode: "Markdown" });
});

app.bot.command("restart", async (ctx) => {
  if (!ctx.from || ctx.from.id !== config.ownerId) return;

  await ctx.reply(
    "ðŸ”´ Orchestrator shutting down. Stopping all agents...\nBack in ~10s."
  );

  // Mark tasks as interrupted before exit
  bus.markInProgressAsInterrupted();
  writeShutdownMarker(stateDir, "sigterm");
  stopKeepAwake();

  // Exit â€” the process manager (if any) will restart it
  setTimeout(() => process.exit(0), 500);
});

// â”€â”€ Notify owner of interrupted tasks on first interaction â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

let interruptedNotified = false;
app.bot.use(async (ctx, next) => {
  if (!interruptedNotified && interrupted.length > 0 && ctx.from?.id === config.ownerId) {
    interruptedNotified = true;
    const taskList = interrupted
      .slice(0, 5)
      .map((t) => `â€¢ ${t.id}: ${t.title ?? t.type}`)
      .join("\n");
    const more = interrupted.length > 5 ? `\nâ€¦and ${interrupted.length - 5} more` : "";
    await ctx.reply(
      `âš ï¸ Found ${interrupted.length} interrupted task(s) from last session:\n${taskList}${more}\n\nReply "resume" to continue or "discard" to clear them.`,
      { parse_mode: "Markdown" }
    );
  }
  await next();
});

// â”€â”€ Heartbeat monitor â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// Simple heartbeat: log that the lead is alive every 30s
setInterval(() => {
  logger.debug("heartbeat", { role: "lead", pid: process.pid });
}, 30_000);

// â”€â”€ Start â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

logger.info(`Starting Lead Orchestrator (cwd: ${config.cwd})`);
app.start().catch((err: unknown) => {
  logger.error("Bot crashed", { error: String(err) });
  writeShutdownMarker(stateDir, "crash");
  stopKeepAwake();
  process.exit(1);
});


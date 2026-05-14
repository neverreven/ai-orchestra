import { join } from "path";
import { loadProjectEnv, runPreflight, buildAgentConfig, DEFAULT_MANIFESTS, DEFAULT_SCOPES } from "agents-framework/config.js";
import { createBotApp } from "agents-framework/bot.js";
import { openBus } from "agents-framework/bus.js";
import { initLogger } from "agents-framework/logger.js";
import { startKeepAwake, stopKeepAwake } from "agents-framework/keepawake.js";
import { writeShutdownMarker } from "agents-framework/state.js";
import type { AgentManifest } from "agents-framework/types.js";

const PROJECT_ID = "security";
const RUNTIME_ROOT = new URL("../../../..", import.meta.url).pathname;
const STATE_ROOT = join(RUNTIME_ROOT, ".state");

const env = loadProjectEnv(PROJECT_ID);
const preflight = runPreflight(PROJECT_ID, env);
console.log(preflight.report);

if (!preflight.ok) {
  console.error("\nâŒ Preflight failed. Run `bun run setup` to configure missing values.\n");
  process.exit(1);
}

const baseManifest = DEFAULT_MANIFESTS[PROJECT_ID]!;
const manifest: AgentManifest = {
  ...baseManifest,
  scope: DEFAULT_SCOPES[PROJECT_ID]!,
};

const config = buildAgentConfig(manifest, env);
const stateDir = join(STATE_ROOT, PROJECT_ID);

const logger = initLogger({
  agentId: PROJECT_ID,
  stateDir,
  level: (env["LOG_LEVEL"] as "debug" | "info" | "warn" | "error") ?? "info",
});

const bus = openBus({ stateRoot: STATE_ROOT, actor: "security" });

startKeepAwake(process.pid);

const app = createBotApp(config, { project: PROJECT_ID, dropPendingUpdates: true });

// Poll bus inbox for delegated tasks every 5 seconds
setInterval(() => {
  const messages = bus.drainInbox();
  for (const msg of messages) {
    logger.busEvent(msg.id, msg.type, "received", msg.from, msg.to);
  }
  logger.debug("heartbeat", { role: "security", pid: process.pid });
}, 5_000);

logger.info(`Starting security agent (cwd: ${config.cwd})`);
app.start().catch((err) => {
  logger.error("Bot crashed", { error: String(err) });
  writeShutdownMarker(stateDir, "crash");
  stopKeepAwake();
  process.exit(1);
});


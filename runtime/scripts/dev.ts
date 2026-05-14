#!/usr/bin/env bun
/**
 * Start one or all agent projects in development mode.
 *
 * Usage:
 *   bun run dev           — start all configured agents
 *   bun run dev lead      — start only the lead agent
 *   bun run dev all       — start all agents
 */

import { spawn } from "child_process";
import { join } from "path";
import { listProjects, isProjectConfigured, PROJECTS_DIR } from "./_shared.ts";

const target = process.argv[2] ?? "all";
const projects = target === "all" ? listProjects() : [target];

if (projects.length === 0) {
  console.error("No projects found in runtime/projects/");
  process.exit(1);
}

const processes: ReturnType<typeof spawn>[] = [];

for (const projectId of projects) {
  if (!listProjects().includes(projectId)) {
    console.error(`Unknown project: ${projectId}. Available: ${listProjects().join(", ")}`);
    process.exit(1);
  }

  if (!isProjectConfigured(projectId)) {
    console.warn(
      `[dev] ⚠️  ${projectId} is not fully configured (missing ANTHROPIC_API_KEY / TELEGRAM_BOT_TOKEN / CWD). Skipping.\n` +
        `       Run: bun run setup`
    );
    continue;
  }

  console.log(`[dev] Starting ${projectId}...`);
  const child = spawn(
    "bun",
    ["run", join(PROJECTS_DIR, projectId, "src", "index.ts")],
    {
      stdio: "inherit",
      env: { ...process.env },
    }
  );

  child.on("exit", (code) => {
    console.log(`[dev] ${projectId} exited with code ${code}`);
  });

  processes.push(child);
}

if (processes.length === 0) {
  console.log("[dev] No agents started. Run `bun run setup` first.");
  process.exit(0);
}

// Forward SIGINT/SIGTERM to all child processes
function shutdown() {
  for (const child of processes) {
    child.kill("SIGTERM");
  }
  setTimeout(() => process.exit(0), 2000);
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

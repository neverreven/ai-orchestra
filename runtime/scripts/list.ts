#!/usr/bin/env bun
/**
 * List all agent projects and their configuration status.
 *
 * Usage:
 *   bun run list
 */

import { listProjects, isProjectConfigured, loadEnv } from "./_shared.ts";

const projects = listProjects();

if (projects.length === 0) {
  console.log("No projects found in runtime/projects/");
  process.exit(0);
}

console.log("\n🎼 AI Orchestra — Agent Projects\n");
console.log(
  "  " +
    ["Project", "Status", "CWD"].map((h) => h.padEnd(16)).join("")
);
console.log("  " + "─".repeat(60));

for (const id of projects) {
  const configured = isProjectConfigured(id);
  const env = loadEnv(id);
  const cwd = env["CWD"] ?? "(not set)";
  const status = configured ? "✅ ready" : "⚠️  needs setup";
  console.log(
    "  " +
      [id, status, cwd.length > 30 ? "…" + cwd.slice(-28) : cwd]
        .map((v, i) => v.padEnd(i === 1 ? 20 : 16))
        .join("")
  );
}

console.log("\nRun `bun run setup` to configure any missing agents.\n");

#!/usr/bin/env bun
import { spawnSync } from "child_process";
import { join } from "path";

const RUNTIME_ROOT = new URL("..", import.meta.url).pathname;

console.log("🔍 Running TypeScript type-check...\n");

const result = spawnSync(
  "npx",
  ["tsc", "--noEmit", "--project", join(RUNTIME_ROOT, "tsconfig.json")],
  { stdio: "inherit", cwd: RUNTIME_ROOT, shell: true }
);

if (result.status !== 0) {
  console.error("\n❌ Type-check failed.");
  process.exit(result.status ?? 1);
} else {
  console.log("\n✅ Type-check passed — no errors.");
}

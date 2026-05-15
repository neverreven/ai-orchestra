#!/usr/bin/env bun
// Scaffold a new agent project under runtime/projects/<name>/
// Usage: bun run new <role-name>
// TODO: full implementation in Phase 5

const role = process.argv[2];
if (!role) {
  console.error("Usage: bun run new <role-name>");
  process.exit(1);
}
console.log(`[new] Scaffolding project for role: ${role}`);
console.log("[new] Full implementation pending Phase 5");

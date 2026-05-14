#!/usr/bin/env bun
// Start all agent projects in development mode
// TODO: full implementation in Phase 6 (setup.ts) and Phase 4 (lead agent)
// For now: lists what would be started

import { listProjects } from "./_shared.ts";

const projects = listProjects();
console.log(`[dev] Would start ${projects.length} project(s): ${projects.join(", ") || "(none)"}`);
console.log("[dev] Full implementation pending Phase 4 (lead) + Phase 5 (role agents)");

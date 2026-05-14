#!/usr/bin/env bun
// List all registered agent projects
import { listProjects } from "./_shared.ts";

const projects = listProjects();
if (projects.length === 0) {
  console.log("No agent projects found in runtime/projects/");
} else {
  console.log(`Registered agent projects (${projects.length}):`);
  for (const p of projects) console.log(`  • ${p}`);
}

import { join } from "path";

export const RUNTIME_ROOT = new URL("..", import.meta.url).pathname;
export const PROJECTS_DIR = join(RUNTIME_ROOT, "projects");
export const STATE_DIR = join(RUNTIME_ROOT, ".state");

export function loadEnv(projectId: string): Record<string, string> {
  // Merge root .env + projects/<id>/.env, project values take precedence
  // TODO: implement full merge in Phase 3b
  return { projectId };
}

export function listProjects(): string[] {
  const fs = require("fs");
  return fs
    .readdirSync(PROJECTS_DIR, { withFileTypes: true })
    .filter((d: { isDirectory: () => boolean; name: string }) => d.isDirectory() && d.name !== "node_modules")
    .map((d: { name: string }) => d.name);
}

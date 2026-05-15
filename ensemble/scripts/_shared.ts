import { join } from "path";
import { readdirSync, existsSync, readFileSync } from "fs";

export const RUNTIME_ROOT = new URL("..", import.meta.url).pathname;
export const PROJECTS_DIR = join(RUNTIME_ROOT, "projects");
export const STATE_DIR = join(RUNTIME_ROOT, ".state");

export function readEnvFile(filePath: string): Record<string, string> {
  if (!existsSync(filePath)) return {};
  const lines = readFileSync(filePath, "utf8").split("\n");
  const result: Record<string, string> = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx < 0) continue;
    result[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
  }
  return result;
}

export function loadEnv(projectId: string): Record<string, string> {
  const rootEnv = readEnvFile(join(RUNTIME_ROOT, ".env"));
  const projectEnv = readEnvFile(join(PROJECTS_DIR, projectId, ".env"));
  return { ...rootEnv, ...projectEnv };
}

export function listProjects(): string[] {
  return readdirSync(PROJECTS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== "node_modules")
    .map((d) => d.name);
}

export function isProjectConfigured(projectId: string): boolean {
  const env = loadEnv(projectId);
  return !!(env["ANTHROPIC_API_KEY"] && env["TELEGRAM_BOT_TOKEN"] && env["CWD"]);
}

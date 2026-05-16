#!/usr/bin/env bun
/**
 * AI Orchestra — Bootstrap a new project
 *
 * Usage:
 *   bun run new <target-path>
 *
 * Copies score/ specification into a target project directory and registers
 * it in the global ~/.ai-orchestra/projects.json registry. The full IDE
 * agent setup pass still happens when the user opens the project in their
 * IDE and asks the agent to "run the orchestra".
 *
 * Called by the Lead agent's /addproject <path> command.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { execFile } from "child_process";
import { promisify } from "util";
import { resolve, join, basename } from "path";
import { homedir } from "os";

const execAsync = promisify(execFile);

// ── Helpers ───────────────────────────────────────────────────────────────────

const GLOBAL_AI_ORCH_DIR = join(homedir(), ".ai-orchestra");
const GLOBAL_REGISTRY_PATH = join(GLOBAL_AI_ORCH_DIR, "projects.json");

const PROJECT_MANIFESTS = [
  "package.json",
  "pyproject.toml",
  "Cargo.toml",
  "go.mod",
  "pom.xml",
  "build.gradle",
  "composer.json",
  ".sfdx",
];

interface ProjectEntry {
  path: string;
  name: string;
  ide: string | null;
  lastSeenVersion: string;
  lastSeenAt: string;
  tier: number;
}

interface GlobalRegistry {
  schemaVersion: number;
  projects: ProjectEntry[];
}

function readRegistry(): GlobalRegistry {
  if (!existsSync(GLOBAL_REGISTRY_PATH)) {
    return { schemaVersion: 1, projects: [] };
  }
  try {
    return JSON.parse(readFileSync(GLOBAL_REGISTRY_PATH, "utf8"));
  } catch {
    return { schemaVersion: 1, projects: [] };
  }
}

function writeRegistry(registry: GlobalRegistry): void {
  if (!existsSync(GLOBAL_AI_ORCH_DIR)) {
    mkdirSync(GLOBAL_AI_ORCH_DIR, { recursive: true });
  }
  writeFileSync(GLOBAL_REGISTRY_PATH, JSON.stringify(registry, null, 2) + "\n", "utf8");
}

function readOrchestraVersion(): string {
  try {
    const runtimeRoot = new URL("../../", import.meta.url).pathname;
    const versionFile = join(runtimeRoot, "VERSION");
    return readFileSync(versionFile, "utf8").trim();
  } catch {
    return "unknown";
  }
}

function detectProjectName(targetPath: string): string {
  const pkgPath = join(targetPath, "package.json");
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
      if (pkg.name) return pkg.name;
    } catch {}
  }
  return basename(targetPath);
}

function isProjectDirectory(targetPath: string): boolean {
  return PROJECT_MANIFESTS.some((manifest) => existsSync(join(targetPath, manifest)));
}

function alreadyOrchestrated(targetPath: string): boolean {
  return (
    existsSync(join(targetPath, "score")) ||
    existsSync(join(targetPath, "ai-orchestra"))
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const rawTarget = process.argv[2];

  if (!rawTarget || rawTarget === "--help" || rawTarget === "-h") {
    console.log("Usage: bun run new <target-path>");
    console.log("");
    console.log("Bootstraps score/ into a project and registers it in the global registry.");
    console.log("Requires the ensemble to be at system-global level.");
    process.exit(0);
  }

  const targetPath = resolve(rawTarget);

  // ── Validate target path ───────────────────────────────────────────────────

  if (!existsSync(targetPath)) {
    console.error(`ERROR: target path does not exist: ${targetPath}`);
    process.exit(1);
  }

  if (!isProjectDirectory(targetPath)) {
    console.error(`ERROR: ${targetPath} does not appear to be a project directory.`);
    console.error("       Expected at least one manifest file (package.json, pyproject.toml, Cargo.toml, etc.).");
    process.exit(1);
  }

  if (alreadyOrchestrated(targetPath)) {
    console.error(`ERROR: ${targetPath} already has score/ (or legacy ai-orchestra/) installed.`);
    console.error("       Use 'upgrade orchestra' in the project's IDE agent to upgrade instead.");
    process.exit(1);
  }

  // ── Run npx init ──────────────────────────────────────────────────────────

  console.log(`\nBootstrapping AI Orchestra into: ${targetPath}\n`);

  try {
    const { stdout, stderr } = await execAsync(
      "npx",
      ["@neverreven/ai-orchestra@latest", "init", "--target", targetPath],
      { timeout: 60_000 }
    );
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
  } catch (err: unknown) {
    const error = err as { stdout?: string; stderr?: string; message?: string };
    if (error.stdout) console.log(error.stdout);
    if (error.stderr) console.error(error.stderr);
    console.error(`\nERROR: npx init failed: ${error.message ?? String(err)}`);
    process.exit(1);
  }

  // ── Register in global registry ───────────────────────────────────────────

  const registry = readRegistry();
  const version = readOrchestraVersion();
  const now = new Date().toISOString();
  const projectName = detectProjectName(targetPath);

  const existingIndex = registry.projects.findIndex((p) => p.path === targetPath);
  const entry: ProjectEntry = {
    path: targetPath,
    name: projectName,
    ide: null,
    lastSeenVersion: version,
    lastSeenAt: now,
    tier: 1,
  };

  if (existingIndex >= 0) {
    registry.projects[existingIndex] = entry;
  } else {
    registry.projects.push(entry);
  }

  writeRegistry(registry);

  // ── Done ──────────────────────────────────────────────────────────────────

  console.log("");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  score/ bootstrapped successfully");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("");
  console.log(`  Project: ${projectName}`);
  console.log(`  Path:    ${targetPath}`);
  console.log(`  Registered in: ${GLOBAL_REGISTRY_PATH}`);
  console.log("");
  console.log("  Next step: open the project in your IDE and ask your agent:");
  console.log('    "run the orchestra"');
  console.log("");
  console.log("  The agent will detect your stack, build a dry-run install plan,");
  console.log("  and guide you through setup. Nothing is written without your consent.");
  console.log("");
}

main().catch((err) => {
  console.error("FATAL:", err?.message ?? err);
  process.exit(1);
});

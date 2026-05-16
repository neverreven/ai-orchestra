#!/usr/bin/env bun
/**
 * AI Orchestra — Autonomous Project Orchestration Script
 *
 * Implements the W5 workflow:
 *   1. Detect project stack (detectProject)
 *   2. Ask user: which IDE + install scope
 *   3. Generate adapter files (generateAdapterFiles)
 *   4. Present diff to user for confirmation
 *   5. On confirm: write files + update install.json + update projects.json
 *   6. Notify completion
 *
 * Can be triggered:
 *   - CLI: bun run ensemble/scripts/orchestrate-project.ts <target-path>
 *   - Lead agent: /orchestrate <path> command
 *   - Web dashboard: "Orchestrate" button on a project card
 *
 * Usage:
 *   bun run orchestrate-project.ts /absolute/path/to/project [--ide=cursor] [--scope=recommended] [--yes]
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { homedir } from "os";
import { detectProject } from "agents-framework/detector.js";
import {
  generateAdapterFiles,
  formatPlanSummary,
  type IDE,
  type InstallScope,
} from "agents-framework/adapter-generator.js";

// ── Args ──────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const targetPath = args.find((a) => !a.startsWith("--"));
const ideArg = args.find((a) => a.startsWith("--ide="))?.split("=")[1] as IDE | undefined;
const scopeArg = args.find((a) => a.startsWith("--scope="))?.split("=")[1] as InstallScope | undefined;
const autoConfirm = args.includes("--yes") || args.includes("-y");

if (!targetPath) {
  console.error("Usage: bun run orchestrate-project.ts <target-path> [--ide=cursor|claude-code|codex|vscode] [--scope=all|recommended|lead-only] [--yes]");
  process.exit(1);
}

if (!existsSync(targetPath)) {
  console.error(`❌ Path does not exist: ${targetPath}`);
  process.exit(1);
}

// ── Env / config ──────────────────────────────────────────────────────────────

const anthropicApiKey = process.env["ANTHROPIC_API_KEY"] ?? "";
if (!anthropicApiKey) {
  console.error("❌ ANTHROPIC_API_KEY is not set.");
  process.exit(1);
}

// The orchestra source root is two levels up from this script
const orchestraSrcRoot = join(import.meta.dirname ?? __dirname, "..", "..");

// ── Prompt helpers ────────────────────────────────────────────────────────────

async function prompt(question: string, defaultValue?: string): Promise<string> {
  process.stdout.write(question + (defaultValue ? ` [${defaultValue}]` : "") + " ");
  const line = await new Promise<string>((resolve) => {
    process.stdin.resume();
    process.stdin.setEncoding("utf8");
    process.stdin.once("data", (data) => {
      process.stdin.pause();
      resolve(String(data).trim());
    });
  });
  return line || defaultValue || "";
}

async function promptChoice<T extends string>(
  question: string,
  choices: T[],
  defaultValue: T
): Promise<T> {
  const choiceStr = choices.map((c, i) => `  ${i + 1}. ${c}`).join("\n");
  console.log(`\n${question}`);
  console.log(choiceStr);
  const answer = await prompt(`Choice (1-${choices.length})`, String(choices.indexOf(defaultValue) + 1));
  const idx = parseInt(answer, 10) - 1;
  return choices[idx] ?? defaultValue;
}

// ── Global registry helpers ───────────────────────────────────────────────────

function updateProjectsRegistry(
  projectPath: string,
  ide: IDE,
  tier: number
): void {
  const registryPath = join(homedir(), ".ai-orchestra", "projects.json");
  mkdirSync(dirname(registryPath), { recursive: true });

  let registry: { projects: Array<Record<string, unknown>> } = { projects: [] };
  if (existsSync(registryPath)) {
    try { registry = JSON.parse(readFileSync(registryPath, "utf8")); } catch { /* ignore */ }
  }

  const existing = registry.projects.findIndex((p) => p["path"] === projectPath);
  const entry: Record<string, unknown> = {
    path: projectPath,
    name: projectPath.split("/").pop() ?? projectPath,
    ide,
    tier,
    lastSeenVersion: "latest",
    lastSeenAt: new Date().toISOString(),
  };

  if (existing >= 0) {
    registry.projects[existing] = { ...registry.projects[existing], ...entry };
  } else {
    registry.projects.push(entry);
  }

  writeFileSync(registryPath, JSON.stringify(registry, null, 2));
}

function writeInstallMarker(
  projectPath: string,
  ide: IDE,
  scope: InstallScope
): void {
  const markerDir = join(projectPath, ".ai-orchestra");
  mkdirSync(markerDir, { recursive: true });

  const markerPath = join(markerDir, "install.json");
  const existing = existsSync(markerPath)
    ? JSON.parse(readFileSync(markerPath, "utf8"))
    : {};

  const updated = {
    ...existing,
    tier: 1,
    ide,
    installScope: scope,
    installedAt: existing.installedAt ?? new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
    orchestraVersion: "latest",
  };

  writeFileSync(markerPath, JSON.stringify(updated, null, 2));
}

// ── Main ──────────────────────────────────────────────────────────────────────

console.log(`\n🎼 AI Orchestra — Autonomous Project Setup`);
console.log(`   Target: ${targetPath}\n`);

// Step 1: Detect project
console.log("🔍 Detecting project stack…");
const { profile, log: detectionLog } = await detectProject(targetPath);
console.log(detectionLog.join("\n"));

const detectedStacks = profile.stacks.filter((s) => s.confidence >= 0.6);
if (detectedStacks.length === 0) {
  console.log("\n⚠️  No stacks detected with high confidence.");
  console.log("The orchestra will still be installed with generic configuration.");
} else {
  console.log(`\n✅ Detected: ${detectedStacks.map((s) => s.id).join(", ")}`);
  if (profile.frameworks.length > 0) {
    console.log(`   Frameworks: ${profile.frameworks.join(", ")}`);
  }
}

// Step 2: Choose IDE and scope (or use args)
const ide: IDE = ideArg ?? (autoConfirm
  ? "cursor"
  : await promptChoice<IDE>("Which IDE?", ["cursor", "claude-code", "codex", "vscode"], "cursor")
);

const scope: InstallScope = scopeArg ?? (autoConfirm
  ? "recommended"
  : await promptChoice<InstallScope>("Install scope?", ["all", "recommended", "lead-only"], "recommended")
);

console.log(`\nIDE: ${ide} | Scope: ${scope}`);

// Step 3: Generate adapter files
console.log("\n🤖 Generating adapter files (this takes ~30s)…");
const plan = await generateAdapterFiles(profile, ide, scope, anthropicApiKey, orchestraSrcRoot);

// Step 4: Present diff for confirmation
console.log("\n" + formatPlanSummary(plan));

if (!autoConfirm) {
  const confirm = await prompt("\nType 'confirm' to proceed or 'cancel' to abort:");
  if (confirm.toLowerCase() !== "confirm") {
    console.log("❌ Aborted.");
    process.exit(0);
  }
}

// Step 5: Write files
console.log("\n✍️  Writing files…");
let written = 0;
let skipped = 0;

for (const file of plan.files) {
  if (file.action === "skip") { skipped++; continue; }

  const fullPath = join(targetPath, file.filePath);
  mkdirSync(dirname(fullPath), { recursive: true });

  if (file.action === "update" && existsSync(fullPath)) {
    // Append to existing file
    const existing = readFileSync(fullPath, "utf8");
    if (!existing.includes("## AI Orchestra")) {
      writeFileSync(fullPath, existing.trimEnd() + "\n\n" + file.content);
    } else {
      console.log(`  ⏭️  Skipped (already contains AI Orchestra content): ${file.filePath}`);
      skipped++;
      continue;
    }
  } else {
    writeFileSync(fullPath, file.content);
  }

  console.log(`  ✅ ${file.action === "update" ? "Updated" : "Created"}: ${file.filePath}`);
  written++;
}

// Step 6: Update install marker and projects registry
writeInstallMarker(targetPath, ide, scope);
updateProjectsRegistry(targetPath, ide, 1);

console.log(`\n🎉 Done! ${written} file(s) written, ${skipped} skipped.`);
console.log(`\nNext step: Open the project in ${ide} and ask your agent to verify the orchestra setup.`);
console.log(`  Suggested first prompt: "Please verify the AI Orchestra installation and run the orchestra."`);

/**
 * AI Orchestra — Adapter File Generator
 *
 * Takes a detected ProjectProfile and an IDE selection, then uses the Lead
 * agent (Anthropic) to generate the Tier 1 adapter files (rules, AGENTS.md
 * sections, hooks). Returns a plan of file changes for user confirmation
 * before anything is written.
 *
 * Separation of concerns:
 *   - detectProject() → ProjectProfile (detector.ts)
 *   - generateAdapterFiles() → AdapterPlan (this file)
 *   - write files → orchestrate-project.ts (after user confirms)
 */

import Anthropic from "@anthropic-ai/sdk";
import { existsSync, readFileSync, readdirSync } from "fs";
import { join } from "path";
import type { ProjectProfile } from "./detector.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export type IDE = "cursor" | "claude-code" | "codex" | "vscode";

export type InstallScope =
  | "all"          // All 5 role agents
  | "recommended"  // Lead + relevant roles based on detected stacks
  | "lead-only";   // Lead Orchestrator only

export interface AdapterFile {
  filePath: string;
  action: "create" | "update" | "skip";
  content: string;
  reason: string;
}

export interface AdapterPlan {
  ide: IDE;
  scope: InstallScope;
  projectRoot: string;
  files: AdapterFile[];
  summary: string;
  estimatedMinutes: number;
}

// ── IDE adapter templates ─────────────────────────────────────────────────────

const IDE_CONFIGS: Record<IDE, {
  rulesDir: string;
  agentsMd: string;
  hooksFile: string | null;
  mainRuleFile: string;
}> = {
  "cursor": {
    rulesDir: ".cursor/rules",
    agentsMd: "AGENTS.md",
    hooksFile: ".cursor/hooks.json",
    mainRuleFile: "ai-orchestra.mdc",
  },
  "claude-code": {
    rulesDir: "CLAUDE.md",   // single file, not a directory
    agentsMd: "AGENTS.md",
    hooksFile: null,
    mainRuleFile: "CLAUDE.md",
  },
  "codex": {
    rulesDir: ".codex",
    agentsMd: "AGENTS.md",
    hooksFile: null,
    mainRuleFile: "codex.md",
  },
  "vscode": {
    rulesDir: ".vscode",
    agentsMd: "AGENTS.md",
    hooksFile: null,
    mainRuleFile: "ai-orchestra.md",
  },
};

// ── Role recommendation based on detected stack ───────────────────────────────

function recommendedRoles(profile: ProjectProfile): string[] {
  const roles: Set<string> = new Set(["lead"]);
  const detectedStacks = profile.stacks.filter((s) => s.confidence >= 0.6).map((s) => s.id);

  if (detectedStacks.includes("js-ts") || detectedStacks.includes("mobile")) {
    roles.add("frontend");
  }
  if (profile.frameworks.some((f) => ["express","fastify","nestjs","django","flask","fastapi"].includes(f))) {
    roles.add("backend");
  }
  if (profile.testFrameworks.length > 0) roles.add("qa");
  if (profile.ciSystems.length > 0) roles.add("devops");
  if (detectedStacks.includes("rust") || detectedStacks.includes("go") || detectedStacks.includes("dotnet")) {
    roles.add("backend");
  }

  // Always include at least these for non-trivial projects
  roles.add("backend");
  roles.add("qa");

  return [...roles];
}

// ── Prompt builders ───────────────────────────────────────────────────────────

function buildGenerationPrompt(
  profile: ProjectProfile,
  ide: IDE,
  scope: InstallScope,
  scoreTemplates: string
): string {
  const detectedStacks = profile.stacks.filter((s) => s.confidence >= 0.6);
  const roles = scope === "all"
    ? ["lead", "frontend", "backend", "qa", "devops", "security"]
    : scope === "recommended"
    ? recommendedRoles(profile)
    : ["lead"];

  return `You are generating AI Orchestra Tier 1 adapter files for a software project.

## Project Profile

Root: ${profile.root}
Detected stacks: ${detectedStacks.map((s) => `${s.id} (${(s.confidence * 100).toFixed(0)}%)`).join(", ") || "none detected"}
Frameworks: ${profile.frameworks.join(", ") || "none"}
Package managers: ${profile.packageManagers.join(", ") || "none"}
Test frameworks: ${profile.testFrameworks.join(", ") || "none"}
CI systems: ${profile.ciSystems.join(", ") || "none"}
Documentation files: ${profile.documentationFiles.join(", ") || "none"}
Sub-projects: ${profile.subProjects.map((s) => s.path).join(", ") || "none"}
Polyglot: ${profile.isPolyglot}

## Target IDE: ${ide}
## Install scope: roles = [${roles.join(", ")}]

## Available Score Templates (from installed orchestra)

${scoreTemplates}

## Your Task

Generate the following adapter files for this project and IDE:

1. **Director rule** (${IDE_CONFIGS[ide].mainRuleFile} or equivalent):
   - Session startup protocol: read AI_LEARNINGS.md, AGENTS.md, and relevant project docs
   - During-session protocol: update AI_LEARNINGS.md on correction, discovered gotcha, completed feature, architecture decision
   - Tailored specifically to the detected stacks and frameworks
   - Include stack-specific coding standards (${detectedStacks.map((s) => s.id).join(", ")} patterns)

2. **AGENTS.md additions** (append to existing or create):
   - Project summary with correct stack/framework details
   - Critical rules for this codebase (e.g., for React: "Never use class components", for Django: "Migrations must be included in PRs")
   - Key file map with the most important source files/directories
   - AI infrastructure section listing the installed orchestra

3. **AI_LEARNINGS.md stub** (create at _documentation/AI_LEARNINGS.md):
   - Correct header table with Last updated date
   - Empty sections: Established Patterns, Anti-Patterns, User Preferences, Decision Log, Environment Notes
   - Pre-seed with 1-2 entries per detected framework/stack from your knowledge

${profile.documentationFiles.includes("AGENTS.md") ? "NOTE: AGENTS.md already exists — generate additions to append, not a replacement." : "NOTE: AGENTS.md does not exist — generate a full new file."}

## Output format

Return a JSON object with this exact structure:
\`\`\`json
{
  "files": [
    {
      "filePath": "relative/path/from/project/root",
      "action": "create" | "update",
      "content": "full file content",
      "reason": "one sentence why this file is needed"
    }
  ],
  "summary": "2-3 sentence summary of what was generated and why"
}
\`\`\`

Generate production-quality, immediately useful content. Do not use placeholder text like "Add your rules here".`;
}

// ── Score template loader ─────────────────────────────────────────────────────

function loadScoreTemplates(orchestraSrcRoot: string): string {
  const templatesDir = join(orchestraSrcRoot, "core", "adapters");
  if (!existsSync(templatesDir)) {
    return "(No score templates found — using built-in defaults)";
  }

  const lines: string[] = [];
  try {
    const files = readdirSync(templatesDir).filter((f) => f.endsWith(".md")).slice(0, 5);
    for (const file of files) {
      const content = readFileSync(join(templatesDir, file), "utf8");
      lines.push(`### ${file}\n${content.slice(0, 1000)}\n`);
    }
  } catch { /* ignore */ }
  return lines.join("\n") || "(Templates directory empty)";
}

// ── Main generator ────────────────────────────────────────────────────────────

/**
 * Generate adapter files for a project without writing them.
 * Returns a plan that the user can inspect and confirm before any writes.
 */
export async function generateAdapterFiles(
  profile: ProjectProfile,
  ide: IDE,
  scope: InstallScope,
  anthropicApiKey: string,
  orchestraSrcRoot: string
): Promise<AdapterPlan> {
  const client = new Anthropic({ apiKey: anthropicApiKey });
  const scoreTemplates = loadScoreTemplates(orchestraSrcRoot);

  const prompt = buildGenerationPrompt(profile, ide, scope, scoreTemplates);

  const response = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 8192,
    messages: [{ role: "user", content: prompt }],
  });

  const rawText = response.content
    .filter((c) => c.type === "text")
    .map((c) => (c as { type: "text"; text: string }).text)
    .join("");

  // Extract JSON from the response
  const jsonMatch = rawText.match(/```json\s*([\s\S]*?)```/) ??
    rawText.match(/\{[\s\S]*"files"[\s\S]*\}/);

  let parsed: { files: AdapterFile[]; summary: string } = { files: [], summary: "" };

  if (jsonMatch) {
    try {
      parsed = JSON.parse(jsonMatch[1] ?? jsonMatch[0]);
    } catch (err) {
      // If JSON parse fails, return a minimal plan with the raw response as a note file
      parsed = {
        files: [{
          filePath: "_documentation/AI_ORCHESTRA_SETUP.md",
          action: "create",
          content: `# AI Orchestra Setup Notes\n\nGenerated output (JSON parse failed):\n\n${rawText}`,
          reason: "Fallback: raw generation output",
        }],
        summary: "JSON extraction failed — raw output saved as setup notes.",
      };
    }
  }

  // Determine which files already exist (action "update" vs "create")
  const files: AdapterFile[] = parsed.files.map((file) => ({
    ...file,
    action: existsSync(join(profile.root, file.filePath)) ? "update" : "create",
  }));

  const roles = scope === "all" ? 5 : recommendedRoles(profile).length;
  const estimatedMinutes = Math.max(2, Math.ceil(files.length * 0.5) + roles);

  return {
    ide,
    scope,
    projectRoot: profile.root,
    files,
    summary: parsed.summary || "Adapter files generated successfully.",
    estimatedMinutes,
  };
}

// ── Plan formatter ────────────────────────────────────────────────────────────

/**
 * Format an AdapterPlan as a human-readable diff summary for user confirmation.
 */
export function formatPlanSummary(plan: AdapterPlan): string {
  const lines = [
    `📋 Adapter Plan — ${plan.ide.toUpperCase()} — ${plan.scope} scope`,
    `📁 Project: ${plan.projectRoot}`,
    `⏱  Estimated: ${plan.estimatedMinutes} min`,
    "",
    plan.summary,
    "",
    "Files to write:",
  ];

  for (const file of plan.files) {
    const icon = file.action === "create" ? "✨" : file.action === "update" ? "✏️" : "⏭️";
    lines.push(`  ${icon} [${file.action.toUpperCase()}] ${file.filePath} — ${file.reason}`);
  }

  lines.push("");
  lines.push("Reply \"confirm\" to write these files, or \"cancel\" to abort.");

  return lines.join("\n");
}

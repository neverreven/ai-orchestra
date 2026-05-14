import { existsSync, readFileSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import type {
  AgentConfig,
  AgentManifest,
  ModelRouting,
  RuntimeConfig,
} from "./types.js";
import { DEFAULT_MODEL_ROUTING } from "./types.js";

// ── Constants ─────────────────────────────────────────────────────────────────

const RUNTIME_ROOT = new URL("../../..", import.meta.url).pathname;
const STATE_ROOT = join(RUNTIME_ROOT, ".state");
const RUNTIME_CONFIG_PATH = join(
  RUNTIME_ROOT,
  "..",
  ".ai-orchestra",
  "runtime-config.json"
);

// Required env vars that every agent needs (checked in preflight).
const REQUIRED_GLOBAL_VARS = [
  "ANTHROPIC_API_KEY",
  "OWNER_TELEGRAM_ID",
] as const;

const REQUIRED_PROJECT_VARS = ["TELEGRAM_BOT_TOKEN", "CWD"] as const;

// ── Env loading ───────────────────────────────────────────────────────────────

/**
 * Load and merge root .env + projects/<projectId>/.env.
 * Project values take precedence over root values.
 * The combined env is passed to child processes when spawning.
 */
export function loadProjectEnv(projectId: string): Record<string, string> {
  const rootEnvPath = join(RUNTIME_ROOT, ".env");
  const projectEnvPath = join(RUNTIME_ROOT, "projects", projectId, ".env");

  const rootEnv = parseEnvFile(rootEnvPath);
  const projectEnv = parseEnvFile(projectEnvPath);

  // Merge: project values override root values.
  const merged = { ...process.env, ...rootEnv, ...projectEnv } as Record<
    string,
    string
  >;
  return merged;
}

function parseEnvFile(filePath: string): Record<string, string> {
  if (!existsSync(filePath)) return {};

  const result: Record<string, string> = {};
  const lines = readFileSync(filePath, "utf8").split("\n");

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;

    const eqIdx = line.indexOf("=");
    if (eqIdx === -1) continue;

    const key = line.slice(0, eqIdx).trim();
    const value = line
      .slice(eqIdx + 1)
      .trim()
      .replace(/^["']|["']$/g, ""); // strip optional quotes

    if (key) result[key] = value;
  }

  return result;
}

// ── Preflight validation ──────────────────────────────────────────────────────

export interface PreflightResult {
  ok: boolean;
  missing: string[];
  warnings: string[];
  report: string;
}

/**
 * Validate all required env vars are present and non-empty before starting.
 * Returns a structured result — callers decide whether to abort or prompt.
 */
export function runPreflight(
  projectId: string,
  env: Record<string, string>
): PreflightResult {
  const missing: string[] = [];
  const warnings: string[] = [];
  const lines: string[] = [`Preflight check for project: ${projectId}`];

  for (const key of REQUIRED_GLOBAL_VARS) {
    if (!env[key]) {
      missing.push(key);
      lines.push(`  ✗ ${key} — missing`);
    } else {
      lines.push(`  ✓ ${key}`);
    }
  }

  for (const key of REQUIRED_PROJECT_VARS) {
    if (!env[key]) {
      missing.push(key);
      lines.push(`  ✗ ${key} — missing`);
    } else {
      lines.push(`  ✓ ${key}`);
    }
  }

  // Non-blocking warnings.
  if (!env["OPENAI_API_KEY"]) {
    warnings.push("OPENAI_API_KEY not set — OpenAI model tier unavailable");
  }
  if (env["CWD"] && !existsSync(env["CWD"])) {
    warnings.push(`CWD path does not exist: ${env["CWD"]}`);
  }

  for (const w of warnings) {
    lines.push(`  ⚠  ${w}`);
  }

  return {
    ok: missing.length === 0,
    missing,
    warnings,
    report: lines.join("\n"),
  };
}

// ── Interactive key prompter ──────────────────────────────────────────────────

/**
 * For each missing key, prompt the user interactively and write the value
 * to the correct .env file. Runs in the terminal (setup context only).
 * Returns the updated env record.
 */
export async function promptMissingKeys(
  projectId: string,
  missing: string[],
  env: Record<string, string>
): Promise<Record<string, string>> {
  if (missing.length === 0) return env;

  const updated = { ...env };

  for (const key of missing) {
    const isGlobal = (REQUIRED_GLOBAL_VARS as readonly string[]).includes(key);
    const targetFile = isGlobal
      ? join(RUNTIME_ROOT, ".env")
      : join(RUNTIME_ROOT, "projects", projectId, ".env");

    process.stdout.write(`\nEnter value for ${key}: `);
    const value = await readLine();

    if (!value.trim()) {
      console.warn(`  ⚠  Skipped ${key} — value was empty`);
      continue;
    }

    appendEnvVar(targetFile, key, value.trim());
    updated[key] = value.trim();
    console.log(`  ✓ Written to ${targetFile}`);
  }

  return updated;
}

function readLine(): Promise<string> {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.once("data", (chunk) => {
      data += chunk;
      resolve(data.replace(/\n$/, ""));
    });
  });
}

function appendEnvVar(filePath: string, key: string, value: string): void {
  const existing = existsSync(filePath) ? readFileSync(filePath, "utf8") : "";
  const newLine = `${key}=${value}\n`;

  // Replace if key already exists (was empty), otherwise append.
  if (existing.includes(`${key}=`)) {
    const updated = existing.replace(
      new RegExp(`^${key}=.*$`, "m"),
      `${key}=${value}`
    );
    writeFileSync(filePath, updated, "utf8");
  } else {
    writeFileSync(filePath, existing + newLine, "utf8");
  }
}

// ── API key validation ────────────────────────────────────────────────────────

/**
 * Make a cheap test call to confirm the Anthropic API key is valid.
 * Returns true if valid, false if the key is rejected.
 */
export async function validateAnthropicKey(apiKey: string): Promise<boolean> {
  try {
    const res = await fetch("https://api.anthropic.com/v1/models", {
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
    });
    return res.status === 200;
  } catch {
    return false;
  }
}

// ── Config builder ────────────────────────────────────────────────────────────

/**
 * Build the full AgentConfig for a given project.
 * Expects env to be pre-loaded and pre-validated via loadProjectEnv + runPreflight.
 */
export function buildAgentConfig(
  manifest: AgentManifest,
  env: Record<string, string>
): AgentConfig {
  const cwd = resolve(env["CWD"] ?? process.cwd());
  const ownerId = parseInt(env["OWNER_TELEGRAM_ID"] ?? "0", 10);

  if (!ownerId) {
    throw new Error(
      "OWNER_TELEGRAM_ID must be a valid integer Telegram user ID"
    );
  }

  const stateDir = join(STATE_ROOT, manifest.id);

  // Merge manifest model preferences with global defaults.
  const modelRouting: ModelRouting = {
    ...DEFAULT_MODEL_ROUTING,
    reasoning: manifest.modelPreferences.reasoning,
    execution: manifest.modelPreferences.execution,
    stateWrites: manifest.modelPreferences.stateWrites,
  };

  return {
    manifest,
    cwd,
    telegramBotToken: env["TELEGRAM_BOT_TOKEN"] ?? "",
    ownerId,
    stateDir,
    modelRouting,
  };
}

// ── Runtime config (install marker) ──────────────────────────────────────────

export function readRuntimeConfig(): RuntimeConfig | null {
  if (!existsSync(RUNTIME_CONFIG_PATH)) return null;
  try {
    return JSON.parse(readFileSync(RUNTIME_CONFIG_PATH, "utf8")) as RuntimeConfig;
  } catch {
    return null;
  }
}

export function writeRuntimeConfig(config: RuntimeConfig): void {
  const dir = join(RUNTIME_CONFIG_PATH, "..");
  // Ensure directory exists.
  if (!existsSync(dir)) {
    import("fs").then((fs) => fs.mkdirSync(dir, { recursive: true }));
  }
  writeFileSync(RUNTIME_CONFIG_PATH, JSON.stringify(config, null, 2) + "\n", "utf8");
}

// ── Default manifests for built-in roles ─────────────────────────────────────

export const DEFAULT_MANIFESTS: Record<string, Omit<AgentManifest, "scope">> =
  {
    lead: {
      id: "lead",
      role: "lead",
      displayName: "Lead Orchestrator",
      mission:
        "Receives all user requests, examines intent, delegates tasks to role agents by competency, aggregates results from multi-agent workflows, maintains architecture knowledge, coaches prompt quality, and monitors team health.",
      taskTypes: ["orchestrate", "aggregate", "delegate", "status", "restart"],
      collaborators: [
        "frontend",
        "backend",
        "qa",
        "devops",
        "security",
      ],
      modelPreferences: {
        reasoning: "sonnet",
        execution: "sonnet",
        stateWrites: "haiku",
      },
      skills: [
        { id: "multi-project-audit", trigger: "run a multi-project audit" },
        { id: "ai-infra-audit", trigger: "run the ai-infra audit" },
      ],
      healthCheck: { heartbeatIntervalMs: 30000, timeoutMs: 120000 },
    },

    frontend: {
      id: "frontend",
      role: "frontend",
      displayName: "Frontend Engineer",
      mission:
        "Owns UI components, pages, styles, and client-side logic. Ensures visual consistency, accessibility, responsive behaviour, and component test coverage.",
      taskTypes: [
        "implement-feature",
        "fix-bug",
        "code-review",
        "refactor",
        "write-tests",
        "accessibility-audit",
        "performance-audit",
        "cleanup",
      ],
      collaborators: ["qa", "backend", "security"],
      modelPreferences: {
        reasoning: "sonnet",
        execution: "sonnet",
        stateWrites: "haiku",
      },
      skills: [
        { id: "code-review", trigger: "run a code review" },
        { id: "cleanup", trigger: "clean up the mess" },
        { id: "accessibility-audit", trigger: "check accessibility" },
      ],
      healthCheck: { heartbeatIntervalMs: 30000, timeoutMs: 120000 },
    },

    backend: {
      id: "backend",
      role: "backend",
      displayName: "Backend Engineer",
      mission:
        "Owns API routes, services, data models, and server-side logic. Responsible for correctness, performance, and backward compatibility of all backend interfaces.",
      taskTypes: [
        "implement-feature",
        "fix-bug",
        "code-review",
        "refactor",
        "write-tests",
        "api-design-review",
        "db-migration-review",
      ],
      collaborators: ["qa", "frontend", "security", "devops"],
      modelPreferences: {
        reasoning: "sonnet",
        execution: "sonnet",
        stateWrites: "haiku",
      },
      skills: [
        { id: "code-review", trigger: "run a code review" },
        { id: "api-design-review", trigger: "review the API design" },
      ],
      healthCheck: { heartbeatIntervalMs: 30000, timeoutMs: 120000 },
    },

    qa: {
      id: "qa",
      role: "qa",
      displayName: "QA Engineer",
      mission:
        "Validates all work before it is returned to the user. Writes and runs tests, reviews code for correctness and edge cases, and ensures nothing ships without proof.",
      taskTypes: [
        "write-tests",
        "validate-result",
        "code-review",
        "test-plan",
        "regression-check",
      ],
      collaborators: ["frontend", "backend", "devops"],
      modelPreferences: {
        reasoning: "haiku",
        execution: "haiku",
        stateWrites: "haiku",
      },
      skills: [
        { id: "pre-release", trigger: "run a pre-release check" },
        { id: "code-review", trigger: "run a code review" },
      ],
      healthCheck: { heartbeatIntervalMs: 30000, timeoutMs: 120000 },
    },

    devops: {
      id: "devops",
      role: "devops",
      displayName: "DevOps / SRE",
      mission:
        "Owns CI/CD pipelines, infrastructure-as-code, deployment processes, and operational reliability. Ensures builds pass, deployments are safe, and the system is observable.",
      taskTypes: [
        "ci-pipeline-audit",
        "deployment-checklist",
        "implement-feature",
        "fix-bug",
        "observability-baseline",
        "secrets-scan",
      ],
      collaborators: ["backend", "security", "qa"],
      modelPreferences: {
        reasoning: "sonnet",
        execution: "sonnet",
        stateWrites: "haiku",
      },
      skills: [
        { id: "ci-pipeline-audit", trigger: "audit the CI pipeline" },
        { id: "deployment-checklist", trigger: "generate a deployment checklist" },
      ],
      healthCheck: { heartbeatIntervalMs: 30000, timeoutMs: 120000 },
    },

    security: {
      id: "security",
      role: "security",
      displayName: "Security Engineer",
      mission:
        "Read-only auditor across the entire codebase. Identifies vulnerabilities, secrets exposure, auth weaknesses, and dependency risks. Never modifies production code — raises findings as reports.",
      taskTypes: [
        "security-audit",
        "secrets-scan",
        "auth-flow-review",
        "dependency-audit",
        "security-baseline",
      ],
      collaborators: ["backend", "devops", "qa"],
      modelPreferences: {
        reasoning: "sonnet",
        execution: "sonnet",
        stateWrites: "haiku",
      },
      skills: [
        { id: "security-baseline", trigger: "run a security baseline" },
        { id: "secrets-scan", trigger: "scan for secrets" },
        { id: "dependency-audit", trigger: "audit dependencies" },
      ],
      healthCheck: { heartbeatIntervalMs: 30000, timeoutMs: 120000 },
    },
  };

// ── Default scopes for built-in roles ─────────────────────────────────────────
// These are starter defaults. Projects should override via config.ts per-role.

import type { ScopeDefinition } from "./types.js";

export const DEFAULT_SCOPES: Record<string, ScopeDefinition> = {
  lead: {
    readWrite: [".state/**", "_documentation/**"],
    readOnly: ["**"],
    forbidden: [],
  },
  frontend: {
    readWrite: [
      "src/components/**",
      "src/pages/**",
      "src/styles/**",
      "src/hooks/**",
      "src/context/**",
      "tests/**",
    ],
    readOnly: [
      "src/utils/**",
      "src/store/**",
      "src/api/**",
      "package.json",
      "tsconfig.json",
      "vite.config.*",
    ],
    forbidden: ["server/**", "src-tauri/**", "android/**"],
  },
  backend: {
    readWrite: [
      "server/**",
      "src/api/**",
      "src/services/**",
      "src/db/**",
      "tests/**",
    ],
    readOnly: [
      "src/utils/**",
      "package.json",
      "tsconfig.json",
    ],
    forbidden: ["src/components/**", "src/styles/**", "src-tauri/**"],
  },
  qa: {
    readWrite: ["tests/**", "e2e/**", "__tests__/**", "*.test.*", "*.spec.*"],
    readOnly: ["src/**", "server/**", "package.json"],
    forbidden: ["**/.env", "**/*.key", "**/*.pem"],
  },
  devops: {
    readWrite: [".github/**", "infra/**", "docker/**", "Dockerfile*", "*.yml", "*.yaml"],
    readOnly: ["src/**", "server/**", "package.json"],
    forbidden: ["**/.env", "**/*.key", "**/*.pem"],
  },
  security: {
    readWrite: ["security/**", "_documentation/security/**"],
    readOnly: ["**"],
    forbidden: [],
  },
};

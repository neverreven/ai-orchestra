/**
 * AI Orchestra — Programmatic Project Detection Probe
 *
 * TypeScript implementation of the DETECTION.md procedure.
 * Pure filesystem reads — no network, no modifications.
 *
 * Usage:
 *   const profile = await detectProject("/absolute/path/to/project");
 */

import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { join, relative } from "path";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface StackResult {
  id: string;
  confidence: number;
  evidence: string[];
}

export interface SubProject {
  path: string;
  manifest: string;
  type: string;
}

export interface OpenQuestion {
  topic: string;
  score: number;
  evidence: string[];
  question: string;
}

export interface ProjectProfile {
  root: string;
  stacks: StackResult[];
  frameworks: string[];
  packageManagers: string[];
  lockfiles: string[];
  testFrameworks: string[];
  ciSystems: string[];
  documentationFiles: string[];
  isPolyglot: boolean;
  subProjects: SubProject[];
  openQuestions: OpenQuestion[];
}

export interface DetectionLog {
  profile: ProjectProfile;
  log: string[];
}

// ── Exclusion lists ───────────────────────────────────────────────────────────

const EXCLUDED_DIRS = new Set([
  "node_modules", "vendor", ".venv", "venv", "__pycache__",
  "target", "dist", "build", "_test-fixtures", ".git",
  ".cursor", ".claude", ".github", ".idea", ".vscode",
]);

// ── File helpers ──────────────────────────────────────────────────────────────

function fileExists(root: string, ...parts: string[]): boolean {
  return existsSync(join(root, ...parts));
}

function globExists(root: string, patterns: string[]): string[] {
  const found: string[] = [];
  for (const pattern of patterns) {
    if (fileExists(root, pattern)) found.push(pattern);
  }
  return found;
}

function readJson(root: string, file: string): Record<string, unknown> | null {
  const path = join(root, file);
  if (!existsSync(path)) return null;
  try { return JSON.parse(readFileSync(path, "utf8")); } catch { return null; }
}

function hasDependency(pkg: Record<string, unknown> | null, name: string | RegExp): boolean {
  if (!pkg) return false;
  for (const field of ["dependencies", "devDependencies", "peerDependencies"]) {
    const deps = pkg[field] as Record<string, unknown> | undefined;
    if (deps) {
      for (const dep of Object.keys(deps)) {
        if (name instanceof RegExp ? name.test(dep) : dep === name) return true;
      }
    }
  }
  return false;
}

function hasPythonDep(root: string, ...names: string[]): boolean {
  for (const candidate of ["requirements.txt", "pyproject.toml", "setup.py", "Pipfile"]) {
    const path = join(root, candidate);
    if (!existsSync(path)) continue;
    const content = readFileSync(path, "utf8").toLowerCase();
    for (const name of names) {
      if (content.includes(name.toLowerCase())) return true;
    }
  }
  return false;
}

function hasAnyFile(root: string, extensions: string[]): boolean {
  try {
    const entries = readdirSync(root, { withFileTypes: true });
    return entries.some(
      (e) => e.isFile() && extensions.some((ext) => e.name.endsWith(ext))
    );
  } catch { return false; }
}

// ── Stack detectors ───────────────────────────────────────────────────────────

interface Signal {
  description: string;
  weight: number;
  test: (root: string, pkg: Record<string, unknown> | null) => boolean;
}

interface StackDetector {
  id: string;
  signals: Signal[];
  detectFrameworks?: (root: string, pkg: Record<string, unknown> | null) => string[];
}

const STACK_DETECTORS: StackDetector[] = [
  {
    id: "js-ts",
    signals: [
      { description: "package.json exists",    weight: 3, test: (r) => fileExists(r, "package.json") },
      { description: "tsconfig.json exists",   weight: 3, test: (r) => fileExists(r, "tsconfig.json") },
      { description: "lockfile present",       weight: 2, test: (r) => globExists(r, ["package-lock.json","yarn.lock","pnpm-lock.yaml","bun.lockb"]).length > 0 },
      { description: "node_modules/ exists",   weight: 2, test: (r) => fileExists(r, "node_modules") },
      { description: "bundler config present", weight: 2, test: (r) => globExists(r, ["vite.config.js","vite.config.ts","vite.config.mjs","webpack.config.js","webpack.config.ts","rollup.config.js","rollup.config.mjs","esbuild.config.js"]).length > 0 },
      { description: ".ts/.tsx files present", weight: 1, test: (r) => hasAnyFile(join(r, "src"), [".ts",".tsx"]) || hasAnyFile(r, [".ts",".tsx"]) },
      { description: ".js/.jsx files present", weight: 1, test: (r) => hasAnyFile(join(r, "src"), [".js",".jsx"]) || hasAnyFile(r, [".js",".jsx"]) },
      { description: ".npmrc/.nvmrc present",  weight: 1, test: (r) => globExists(r, [".npmrc",".nvmrc"]).length > 0 },
      { description: "eslint config present",  weight: 1, test: (r) => globExists(r, [".eslintrc.js",".eslintrc.json","eslint.config.js","eslint.config.mjs","eslint.config.ts"]).length > 0 },
    ],
    detectFrameworks: (root, pkg) => {
      const frameworks: string[] = [];
      const check = (dep: string, label: string) => { if (hasDependency(pkg, dep)) frameworks.push(label); };
      check("react", "react");
      check("vue", "vue");
      check("svelte", "svelte");
      check("solid-js", "solid");
      check("next", "next");
      check("nuxt", "nuxt");
      if (hasDependency(pkg, /^@remix-run\//)) frameworks.push("remix");
      check("astro", "astro");
      check("vite", "vite");
      check("webpack", "webpack");
      check("electron", "electron");
      check("react-native", "react-native");
      if (hasDependency(pkg, /^@nestjs\//)) frameworks.push("nestjs");
      check("express", "express");
      check("fastify", "fastify");
      return frameworks;
    },
  },
  {
    id: "python",
    signals: [
      { description: "requirements.txt exists", weight: 3, test: (r) => fileExists(r, "requirements.txt") },
      { description: "pyproject.toml exists",   weight: 3, test: (r) => fileExists(r, "pyproject.toml") },
      { description: "setup.py exists",          weight: 2, test: (r) => fileExists(r, "setup.py") },
      { description: "Pipfile exists",           weight: 2, test: (r) => fileExists(r, "Pipfile") },
      { description: ".py files present",        weight: 2, test: (r) => hasAnyFile(r, [".py"]) },
      { description: ".venv/ or venv/ exists",   weight: 1, test: (r) => fileExists(r, ".venv") || fileExists(r, "venv") },
    ],
    detectFrameworks: (root) => {
      const frameworks: string[] = [];
      if (hasPythonDep(root, "django")) frameworks.push("django");
      if (hasPythonDep(root, "flask")) frameworks.push("flask");
      if (hasPythonDep(root, "fastapi")) frameworks.push("fastapi");
      if (hasPythonDep(root, "starlette")) frameworks.push("starlette");
      if (hasPythonDep(root, "tornado")) frameworks.push("tornado");
      return frameworks;
    },
  },
  {
    id: "rust",
    signals: [
      { description: "Cargo.toml at root",  weight: 3, test: (r) => fileExists(r, "Cargo.toml") },
      { description: "Cargo.lock exists",   weight: 2, test: (r) => fileExists(r, "Cargo.lock") },
      { description: "src/main.rs or lib.rs", weight: 2, test: (r) => fileExists(r, "src", "main.rs") || fileExists(r, "src", "lib.rs") },
      { description: ".rs files present",   weight: 1, test: (r) => hasAnyFile(join(r, "src"), [".rs"]) },
    ],
  },
  {
    id: "go",
    signals: [
      { description: "go.mod exists",       weight: 3, test: (r) => fileExists(r, "go.mod") },
      { description: "go.sum exists",       weight: 2, test: (r) => fileExists(r, "go.sum") },
      { description: ".go files present",   weight: 2, test: (r) => hasAnyFile(r, [".go"]) },
    ],
  },
  {
    id: "dotnet",
    signals: [
      { description: ".sln file exists",    weight: 3, test: (r) => hasAnyFile(r, [".sln"]) },
      { description: ".csproj exists",      weight: 3, test: (r) => hasAnyFile(r, [".csproj"]) },
      { description: ".cs files present",   weight: 2, test: (r) => hasAnyFile(r, [".cs"]) },
      { description: "global.json exists",  weight: 1, test: (r) => fileExists(r, "global.json") },
    ],
  },
  {
    id: "mobile",
    signals: [
      { description: "android/ dir exists", weight: 3, test: (r) => fileExists(r, "android") },
      { description: "ios/ dir exists",     weight: 3, test: (r) => fileExists(r, "ios") },
      { description: "capacitor.config.*",  weight: 3, test: (r) => globExists(r, ["capacitor.config.ts","capacitor.config.js","capacitor.config.json"]).length > 0 },
      { description: "app.json (RN/Expo)",  weight: 2, test: (r) => fileExists(r, "app.json") },
    ],
  },
  {
    id: "salesforce",
    signals: [
      { description: "sfdx-project.json",   weight: 3, test: (r) => fileExists(r, "sfdx-project.json") },
      { description: "force-app/ exists",   weight: 3, test: (r) => fileExists(r, "force-app") },
      { description: "cartridges/ exists",  weight: 3, test: (r) => fileExists(r, "cartridges") },
      { description: ".cls files present",  weight: 1, test: (r) => hasAnyFile(r, [".cls"]) },
    ],
  },
];

// ── Auxiliary detectors ───────────────────────────────────────────────────────

const LOCKFILE_MAP: Record<string, string> = {
  "package-lock.json": "npm",
  "yarn.lock": "yarn",
  "pnpm-lock.yaml": "pnpm",
  "bun.lockb": "bun",
  "poetry.lock": "poetry",
  "Pipfile.lock": "pipenv",
  "uv.lock": "uv",
  "Cargo.lock": "cargo",
  "go.sum": "go",
  "Gemfile.lock": "bundler",
};

function detectAuxiliary(root: string, pkg: Record<string, unknown> | null): {
  packageManagers: string[];
  lockfiles: string[];
  testFrameworks: string[];
  ciSystems: string[];
  documentationFiles: string[];
} {
  const lockfiles: string[] = [];
  const packageManagers: string[] = [];
  for (const [file, pm] of Object.entries(LOCKFILE_MAP)) {
    if (fileExists(root, file)) { lockfiles.push(file); packageManagers.push(pm); }
  }

  const testFrameworks: string[] = [];
  const testDeps = ["vitest","jest","mocha","jasmine","playwright","cypress","puppeteer","pytest","unittest"];
  for (const dep of testDeps) {
    if (hasDependency(pkg, dep) || hasDependency(pkg, `@${dep}`) || hasPythonDep(root, dep)) {
      testFrameworks.push(dep);
    }
  }
  if (hasDependency(pkg, /^@testing-library\//)) testFrameworks.push("testing-library");

  const ciSystems: string[] = [];
  if (fileExists(root, ".github", "workflows")) ciSystems.push("github-actions");
  if (fileExists(root, ".gitlab-ci.yml")) ciSystems.push("gitlab-ci");
  if (fileExists(root, ".circleci", "config.yml")) ciSystems.push("circleci");
  if (fileExists(root, "azure-pipelines.yml")) ciSystems.push("azure-pipelines");
  if (fileExists(root, "Jenkinsfile")) ciSystems.push("jenkins");
  if (fileExists(root, "bitbucket-pipelines.yml")) ciSystems.push("bitbucket-pipelines");

  const documentationFiles: string[] = [];
  try {
    const entries = readdirSync(root, { withFileTypes: true });
    for (const e of entries) {
      if (e.isFile() && e.name.endsWith(".md")) documentationFiles.push(e.name);
    }
  } catch { /* ignore */ }

  return { packageManagers, lockfiles, testFrameworks, ciSystems, documentationFiles };
}

// ── Sub-project detection ─────────────────────────────────────────────────────

const SUB_PROJECT_MANIFESTS = [
  "package.json", "Cargo.toml", "pyproject.toml", "go.mod",
  "pom.xml", "build.gradle", "build.gradle.kts", "sfdx-project.json",
];

function detectSubProjects(root: string): SubProject[] {
  const results: SubProject[] = [];
  let dirs: string[] = [];

  try {
    dirs = readdirSync(root, { withFileTypes: true })
      .filter((e) => e.isDirectory() && !EXCLUDED_DIRS.has(e.name) && !e.name.startsWith("."))
      .map((e) => e.name);
  } catch { return []; }

  for (const dir of dirs.sort()) {
    if (results.length >= 20) break;
    for (const manifest of SUB_PROJECT_MANIFESTS) {
      if (fileExists(root, dir, manifest)) {
        results.push({
          path: dir,
          manifest: `${dir}/${manifest}`,
          type: manifest,
        });
      }
    }
    // Also check for .csproj files
    try {
      const subEntries = readdirSync(join(root, dir), { withFileTypes: true });
      for (const e of subEntries) {
        if (e.isFile() && e.name.endsWith(".csproj")) {
          results.push({ path: dir, manifest: `${dir}/${e.name}`, type: e.name });
        }
      }
    } catch { /* skip */ }
  }

  return results.slice(0, 20);
}

// ── Main detection function ───────────────────────────────────────────────────

/**
 * Detect the technology stack of a project at the given root path.
 * Returns a ProjectProfile matching the DETECTION.md spec.
 */
export async function detectProject(projectRoot: string): Promise<DetectionLog> {
  const log: string[] = [];
  const pkg = readJson(projectRoot, "package.json");

  // ── Stack detection ───────────────────────────────────────────────────────
  const stacks: StackResult[] = [];
  const openQuestions: OpenQuestion[] = [];

  for (const detector of STACK_DETECTORS) {
    const maxWeight = detector.signals.reduce((s, sig) => s + sig.weight, 0);
    let matchedWeight = 0;
    const evidence: string[] = [];

    for (const signal of detector.signals) {
      if (signal.test(projectRoot, pkg)) {
        matchedWeight += signal.weight;
        evidence.push(signal.description);
      }
    }

    const confidence = maxWeight > 0 ? matchedWeight / maxWeight : 0;
    stacks.push({ id: detector.id, confidence, evidence });

    if (confidence >= 0.6) {
      log.push(`✅ Stack detected: ${detector.id} (confidence: ${(confidence * 100).toFixed(0)}%, evidence: ${evidence.join(", ")})`);
    } else if (confidence > 0) {
      log.push(`⚪ Stack partial: ${detector.id} (confidence: ${(confidence * 100).toFixed(0)}%, evidence: ${evidence.join(", ")})`);
      if (evidence.length > 0) {
        openQuestions.push({
          topic: detector.id,
          score: confidence,
          evidence,
          question: `Found some ${detector.id} signals (${evidence.join(", ")}) but confidence is below threshold. Is this a ${detector.id} project?`,
        });
      }
    } else {
      log.push(`❌ Stack absent: ${detector.id}`);
    }
  }

  // ── Framework detection (for detected stacks) ──────────────────────────────
  const frameworks: string[] = [];
  for (const stack of stacks) {
    if (stack.confidence < 0.6) continue;
    const detector = STACK_DETECTORS.find((d) => d.id === stack.id);
    if (detector?.detectFrameworks) {
      const found = detector.detectFrameworks(projectRoot, pkg);
      frameworks.push(...found);
      if (found.length > 0) log.push(`  Frameworks for ${stack.id}: ${found.join(", ")}`);
    }
  }

  // ── Auxiliary detection ────────────────────────────────────────────────────
  const aux = detectAuxiliary(projectRoot, pkg);
  log.push(`Package managers: ${aux.packageManagers.join(", ") || "none"}`);
  log.push(`Test frameworks: ${aux.testFrameworks.join(", ") || "none"}`);
  log.push(`CI systems: ${aux.ciSystems.join(", ") || "none"}`);
  log.push(`Docs at root: ${aux.documentationFiles.join(", ") || "none"}`);

  // ── Sub-project detection ──────────────────────────────────────────────────
  const subProjects = detectSubProjects(projectRoot);
  if (subProjects.length > 0) {
    log.push(`Sub-projects: ${subProjects.map((s) => s.path).join(", ")}`);
  }

  // ── Polyglot check ─────────────────────────────────────────────────────────
  const detectedStacks = stacks.filter((s) => s.confidence >= 0.6);
  const isPolyglot = detectedStacks.length >= 2;
  if (isPolyglot) log.push(`🔀 Polyglot project: ${detectedStacks.map((s) => s.id).join(" + ")}`);

  const profile: ProjectProfile = {
    root: projectRoot,
    stacks,
    frameworks: [...new Set(frameworks)],
    ...aux,
    isPolyglot,
    subProjects,
    openQuestions,
  };

  return { profile, log };
}

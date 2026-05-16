#!/usr/bin/env bun
/**
 * AI Orchestra — Process Daemon
 *
 * Wraps `bun run dev:all` in a restart loop with exponential backoff.
 * Designed to be called by a system service (launchd / systemd / Task Scheduler)
 * or run directly in a persistent terminal.
 *
 * Features:
 *   - Exponential backoff: 1s → 2s → 4s → 8s → 16s → 30s → 60s max
 *   - Resets backoff after a stable run (> 30s)
 *   - Writes PID to ~/.ai-orchestra/ensemble.pid
 *   - Forwards SIGTERM / SIGINT to child for graceful shutdown
 *   - Writes structured restart log to ~/.ai-orchestra/daemon.log
 *
 * Usage:
 *   bun run daemon           # from ensemble/
 *   bun run ensemble/scripts/daemon.ts
 */

import { spawn, type ChildProcess } from "child_process";
import { existsSync, mkdirSync, writeFileSync, appendFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";

// ── Config ────────────────────────────────────────────────────────────────────

const BACKOFF_DELAYS_MS = [1000, 2000, 4000, 8000, 16000, 30000, 60000];
const STABLE_THRESHOLD_MS = 30_000; // reset backoff if process ran longer than this
const MAX_CONSECUTIVE_CRASHES = 20;  // give up if it crashes this many times without recovery

const ORCHESTRA_HOME = join(homedir(), ".ai-orchestra");
const PID_FILE = join(ORCHESTRA_HOME, "ensemble.pid");
const LOG_FILE = join(ORCHESTRA_HOME, "daemon.log");

// The ensemble directory is one level up from this script
const ENSEMBLE_DIR = join(import.meta.dirname ?? __dirname, "..");

// ── Logging ───────────────────────────────────────────────────────────────────

function logLine(level: "INFO" | "WARN" | "ERROR", msg: string): void {
  const line = `[${new Date().toISOString()}] [${level}] ${msg}`;
  console.log(line);
  try {
    appendFileSync(LOG_FILE, line + "\n");
  } catch { /* best-effort */ }
}

// ── PID management ────────────────────────────────────────────────────────────

function writePidFile(): void {
  try {
    mkdirSync(ORCHESTRA_HOME, { recursive: true });
    writeFileSync(PID_FILE, String(process.pid));
  } catch { /* best-effort */ }
}

function removePidFile(): void {
  try {
    if (existsSync(PID_FILE)) {
      const content = readFile(PID_FILE);
      if (content.trim() === String(process.pid)) {
        const { unlinkSync } = require("fs");
        unlinkSync(PID_FILE);
      }
    }
  } catch { /* best-effort */ }
}

function readFile(path: string): string {
  try {
    const { readFileSync } = require("fs");
    return readFileSync(path, "utf8");
  } catch { return ""; }
}

// ── Child process ──────────────────────────────────────────────────────────────

let child: ChildProcess | null = null;
let shuttingDown = false;

function spawnEnsemble(): ChildProcess {
  const proc = spawn("bun", ["run", "dev:all"], {
    cwd: ENSEMBLE_DIR,
    stdio: "inherit",
    env: { ...process.env },
  });

  logLine("INFO", `Ensemble started (PID: ${proc.pid})`);
  return proc;
}

function forwardSignal(signal: NodeJS.Signals): void {
  if (child && !child.killed) {
    child.kill(signal);
  }
}

// ── Graceful shutdown ──────────────────────────────────────────────────────────

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  logLine("INFO", `Daemon received ${signal} — shutting down…`);
  forwardSignal("SIGTERM");

  // Give the child 10s to exit gracefully
  await new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      if (child && !child.killed) {
        logLine("WARN", "Child did not exit in 10s — sending SIGKILL");
        child.kill("SIGKILL");
      }
      resolve();
    }, 10_000);

    if (child) {
      child.once("exit", () => { clearTimeout(timeout); resolve(); });
    } else {
      clearTimeout(timeout);
      resolve();
    }
  });

  removePidFile();
  logLine("INFO", "Daemon stopped.");
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));

// ── Restart loop ───────────────────────────────────────────────────────────────

writePidFile();
logLine("INFO", `AI Orchestra Daemon started (daemon PID: ${process.pid}, cwd: ${ENSEMBLE_DIR})`);

let crashCount = 0;
let backoffIndex = 0;

while (!shuttingDown) {
  const startedAt = Date.now();
  child = spawnEnsemble();

  const exitCode = await new Promise<number | null>((resolve) => {
    child!.once("exit", (code) => resolve(code));
    child!.once("error", (err) => {
      logLine("ERROR", `Child process error: ${err.message}`);
      resolve(1);
    });
  });

  if (shuttingDown) break;

  const uptime = Date.now() - startedAt;
  logLine("WARN", `Ensemble exited (code: ${exitCode ?? "null"}, uptime: ${(uptime / 1000).toFixed(1)}s)`);

  // Reset backoff if the process was stable for a while
  if (uptime > STABLE_THRESHOLD_MS) {
    backoffIndex = 0;
    crashCount = 0;
    logLine("INFO", "Process was stable — resetting backoff");
  } else {
    crashCount++;
    backoffIndex = Math.min(backoffIndex + 1, BACKOFF_DELAYS_MS.length - 1);
  }

  if (crashCount >= MAX_CONSECUTIVE_CRASHES) {
    logLine("ERROR", `Ensemble crashed ${crashCount} times consecutively without recovery. Giving up.`);
    removePidFile();
    process.exit(1);
  }

  const delay = BACKOFF_DELAYS_MS[backoffIndex] ?? 60_000;
  logLine("INFO", `Restarting in ${delay / 1000}s (attempt ${crashCount}/${MAX_CONSECUTIVE_CRASHES}, backoff index ${backoffIndex})…`);
  await new Promise<void>((resolve) => setTimeout(resolve, delay));
}

removePidFile();

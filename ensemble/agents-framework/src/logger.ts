import { existsSync, mkdirSync, appendFileSync } from "fs";
import { join } from "path";

// ── Log levels ────────────────────────────────────────────────────────────────

type LogLevel = "debug" | "info" | "warn" | "error";
const LEVEL_RANK: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

// ── Log entry ─────────────────────────────────────────────────────────────────

interface LogEntry {
  ts: string;
  level: LogLevel;
  agentId: string;
  msg: string;
  // Structured fields — never include message content or PII
  fields?: Record<string, unknown>;
}

// ── Logger ────────────────────────────────────────────────────────────────────

export class Logger {
  private readonly agentId: string;
  private readonly logDir: string;
  private readonly minLevel: number;

  constructor(opts: { agentId: string; stateDir: string; level?: LogLevel }) {
    this.agentId = opts.agentId;
    this.logDir = join(opts.stateDir, "logs");
    this.minLevel = LEVEL_RANK[opts.level ?? "info"];

    if (!existsSync(this.logDir)) {
      mkdirSync(this.logDir, { recursive: true });
    }
  }

  private log(
    level: LogLevel,
    msg: string,
    fields?: Record<string, unknown>
  ): void {
    if (LEVEL_RANK[level] < this.minLevel) return;

    const entry: LogEntry = {
      ts: new Date().toISOString(),
      level,
      agentId: this.agentId,
      msg,
      ...(fields ? { fields } : {}),
    };

    const line = JSON.stringify(entry) + "\n";

    // Write to daily log file
    const date = entry.ts.split("T")[0];
    const logFile = join(this.logDir, `${date}.log`);

    try {
      appendFileSync(logFile, line, "utf8");
    } catch { /* non-fatal — logging must not crash the bot */ }

    // Also write to stdout with a human-readable prefix
    const prefix = {
      debug: "🔍",
      info: "ℹ️ ",
      warn: "⚠️ ",
      error: "❌",
    }[level];

    const fieldStr =
      fields && Object.keys(fields).length > 0
        ? " " + Object.entries(fields)
            .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
            .join(" ")
        : "";

    console.log(`${prefix} [${this.agentId}] ${msg}${fieldStr}`);
  }

  debug(msg: string, fields?: Record<string, unknown>): void {
    this.log("debug", msg, fields);
  }

  info(msg: string, fields?: Record<string, unknown>): void {
    this.log("info", msg, fields);
  }

  warn(msg: string, fields?: Record<string, unknown>): void {
    this.log("warn", msg, fields);
  }

  error(msg: string, fields?: Record<string, unknown>): void {
    this.log("error", msg, fields);
  }

  /** Log task lifecycle transitions. Structured — safe to include task IDs. */
  taskEvent(
    taskId: string,
    event: "created" | "started" | "completed" | "failed" | "interrupted",
    fields?: Record<string, unknown>
  ): void {
    this.log("info", `task.${event}`, { taskId, ...fields });
  }

  /** Log bus message events. Never logs payload content. */
  busEvent(
    messageId: string,
    type: string,
    direction: "sent" | "received",
    from: string,
    to: string
  ): void {
    this.log("debug", `bus.${direction}`, { messageId, type, from, to });
  }

  /** Log scope violations. No path content beyond the violation metadata. */
  scopeViolation(
    path: string,
    operation: string,
    level: string,
    escalated: boolean
  ): void {
    // Hash the path to avoid logging potentially sensitive filenames
    const pathHash = Buffer.from(path).toString("base64").slice(0, 16);
    this.log("warn", "scope.violation", { pathHash, operation, level, escalated });
  }
}

// ── Module-level logger factory ───────────────────────────────────────────────

let _defaultLogger: Logger | null = null;

export function initLogger(opts: {
  agentId: string;
  stateDir: string;
  level?: LogLevel;
}): Logger {
  _defaultLogger = new Logger(opts);
  return _defaultLogger;
}

export const logger = {
  debug: (msg: string, fields?: Record<string, unknown>) =>
    _defaultLogger?.debug(msg, fields) ?? console.debug(msg),
  info: (msg: string, fields?: Record<string, unknown>) =>
    _defaultLogger?.info(msg, fields) ?? console.info(msg),
  warn: (msg: string, fields?: Record<string, unknown>) =>
    _defaultLogger?.warn(msg, fields) ?? console.warn(msg),
  error: (msg: string, fields?: Record<string, unknown>) =>
    _defaultLogger?.error(msg, fields) ?? console.error(msg),
};

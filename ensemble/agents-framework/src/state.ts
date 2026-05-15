import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  renameSync,
} from "fs";
import { join, dirname } from "path";

// ── JsonStore ─────────────────────────────────────────────────────────────────

/**
 * Typed read/write for a single JSON file in the .state/ directory.
 * All writes are atomic (write to temp, rename). Reads return the fallback
 * value if the file doesn't exist or is malformed.
 */
export class JsonStore<T> {
  private readonly filePath: string;
  private readonly fallback: T;

  constructor(stateDir: string, filename: string, fallback: T) {
    this.filePath = join(stateDir, filename);
    this.fallback = fallback;
    // Ensure the directory exists
    const dir = dirname(this.filePath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }

  read(): T {
    if (!existsSync(this.filePath)) return this.fallback;
    try {
      return JSON.parse(readFileSync(this.filePath, "utf8")) as T;
    } catch {
      return this.fallback;
    }
  }

  write(data: T): void {
    const tmp = this.filePath + ".tmp";
    writeFileSync(tmp, JSON.stringify(data, null, 2) + "\n", "utf8");
    renameSync(tmp, this.filePath);
  }

  update(updater: (current: T) => T): T {
    const current = this.read();
    const updated = updater(current);
    this.write(updated);
    return updated;
  }

  exists(): boolean {
    return existsSync(this.filePath);
  }

  path(): string {
    return this.filePath;
  }
}

// ── CURRENT_TASKS.md persistence ─────────────────────────────────────────────

/**
 * Write the rendered CURRENT_TASKS.md to the state directory.
 * The file is re-injected into the agent context on each session start.
 */
export function writeCurrentTasksMd(stateDir: string, content: string): void {
  const filePath = join(stateDir, "CURRENT_TASKS.md");
  writeFileSync(filePath, content, "utf8");
}

export function readCurrentTasksMd(stateDir: string): string {
  const filePath = join(stateDir, "CURRENT_TASKS.md");
  if (!existsSync(filePath)) return "## Current Tasks\n\nNo active tasks.\n";
  return readFileSync(filePath, "utf8");
}

// ── Graceful shutdown state flush ─────────────────────────────────────────────

/**
 * Write a shutdown marker to .state/<agentId>/shutdown.json.
 * Contains timestamp and reason. Read on startup to detect unclean shutdowns.
 */
export function writeShutdownMarker(
  stateDir: string,
  reason: "clean" | "sigterm" | "sigint" | "crash"
): void {
  const store = new JsonStore<{
    timestamp: string;
    reason: string;
    pid: number;
  }>(stateDir, "shutdown.json", {
    timestamp: new Date().toISOString(),
    reason,
    pid: process.pid,
  });
  store.write({ timestamp: new Date().toISOString(), reason, pid: process.pid });
}

export function readShutdownMarker(
  stateDir: string
): { timestamp: string; reason: string; pid: number } | null {
  const store = new JsonStore<{
    timestamp: string;
    reason: string;
    pid: number;
  } | null>(stateDir, "shutdown.json", null);
  return store.read();
}

// ── Session history ───────────────────────────────────────────────────────────

export interface SessionRecord {
  sessionId: string;
  agentId: string;
  startedAt: string;
  endedAt?: string;
  messageCount: number;
  tasksCompleted: number;
}

export class SessionStore {
  private readonly store: JsonStore<SessionRecord[]>;
  private current: SessionRecord;

  constructor(stateDir: string, agentId: string) {
    this.store = new JsonStore<SessionRecord[]>(stateDir, "sessions.json", []);
    this.current = {
      sessionId: `sess_${Date.now()}`,
      agentId,
      startedAt: new Date().toISOString(),
      messageCount: 0,
      tasksCompleted: 0,
    };
  }

  incrementMessages(): void {
    this.current.messageCount++;
    this.flush();
  }

  incrementTasksCompleted(): void {
    this.current.tasksCompleted++;
    this.flush();
  }

  end(): void {
    this.current.endedAt = new Date().toISOString();
    this.flush();
  }

  private flush(): void {
    this.store.update((sessions) => {
      const filtered = sessions.filter(
        (s) => s.sessionId !== this.current.sessionId
      );
      filtered.push(this.current);
      // Keep last 50 sessions
      return filtered.slice(-50);
    });
  }
}

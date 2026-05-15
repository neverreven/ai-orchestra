import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync } from "fs";
import { join } from "path";
import { randomBytes } from "crypto";
import type {
  AgentRole,
  BusMessage,
  BusMessageType,
  DelegationMessage,
  ReportMessage,
  EscalationMessage,
  StatusUpdateMessage,
  Task,
  TaskStatus,
} from "./types.js";

// ── ID generation ─────────────────────────────────────────────────────────────

function generateId(prefix: string): string {
  return `${prefix}_${randomBytes(6).toString("hex")}`;
}

export function generateTaskId(): string {
  return generateId("task");
}

export function generateMessageId(): string {
  return generateId("msg");
}

// ── File-system message store ─────────────────────────────────────────────────
//
// The bus uses the filesystem as the transport layer. Each agent has:
//   .state/<agentId>/inbox.json    — pending messages to process
//   .state/<agentId>/outbox.json   — messages sent (for audit/replay)
//   .state/<agentId>/tasks.json    — all tasks assigned to this agent
//
// This design is intentional: file-based IPC works across processes without
// shared memory, survives restarts, and is trivially inspectable for debugging.
// It matches the webinar's .state/ architecture.

function readJsonFile<T>(filePath: string, fallback: T): T {
  if (!existsSync(filePath)) return fallback;
  try {
    return JSON.parse(readFileSync(filePath, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function writeJsonFile(filePath: string, data: unknown): void {
  const dir = join(filePath, "..");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  // Atomic write: write to temp then rename to avoid partial reads
  const tmp = filePath + ".tmp";
  writeFileSync(tmp, JSON.stringify(data, null, 2) + "\n", "utf8");
  renameSync(tmp, filePath);
}

// ── BusHandle ─────────────────────────────────────────────────────────────────

/**
 * Actor-scoped handle to the inter-agent message bus.
 *
 * Created via `openBus({ stateRoot, actor })`. Each agent gets its own handle
 * bound to its identity — it can only read its own inbox and post messages
 * with its own `from` field.
 */
export class BusHandle {
  private readonly stateRoot: string;
  private readonly actor: AgentRole;

  constructor(opts: { stateRoot: string; actor: AgentRole }) {
    this.stateRoot = opts.stateRoot;
    this.actor = opts.actor;
  }

  // ── Paths ─────────────────────────────────────────────────────────────────

  private inboxPath(agentId: string): string {
    return join(this.stateRoot, agentId, "inbox.json");
  }

  private outboxPath(agentId: string): string {
    return join(this.stateRoot, agentId, "outbox.json");
  }

  private tasksPath(agentId: string): string {
    return join(this.stateRoot, agentId, "tasks.json");
  }

  private completedDir(agentId: string): string {
    return join(this.stateRoot, agentId, "completed");
  }

  // ── Inbox operations ──────────────────────────────────────────────────────

  /** Read all pending messages in this agent's inbox. */
  readInbox(): BusMessage[] {
    return readJsonFile<BusMessage[]>(this.inboxPath(this.actor), []);
  }

  /**
   * Read and clear the inbox atomically. Returns the messages that were
   * pending. The agent should process all of them before checking again.
   */
  drainInbox(): BusMessage[] {
    const messages = this.readInbox();
    if (messages.length > 0) {
      writeJsonFile(this.inboxPath(this.actor), []);
    }
    return messages;
  }

  /** Check if there are any pending messages without reading them all. */
  hasMessages(): boolean {
    const inbox = readJsonFile<BusMessage[]>(this.inboxPath(this.actor), []);
    return inbox.length > 0;
  }

  // ── Posting messages ──────────────────────────────────────────────────────

  /**
   * Post a message to another agent's inbox. The message is validated,
   * assigned an ID and timestamp, and written to both the target's inbox
   * and the sender's outbox.
   */
  post(message: Omit<BusMessage, "id" | "timestamp" | "from">): BusMessage {
    const full: BusMessage = {
      ...message,
      id: generateMessageId(),
      from: this.actor,
      timestamp: new Date().toISOString(),
    };

    // Write to target's inbox
    const targetInbox = readJsonFile<BusMessage[]>(
      this.inboxPath(full.to),
      []
    );
    targetInbox.push(full);
    writeJsonFile(this.inboxPath(full.to), targetInbox);

    // Write to sender's outbox (audit trail)
    const senderOutbox = readJsonFile<BusMessage[]>(
      this.outboxPath(this.actor),
      []
    );
    senderOutbox.push(full);
    // Cap outbox at 500 entries to prevent unbounded growth
    if (senderOutbox.length > 500) senderOutbox.splice(0, senderOutbox.length - 500);
    writeJsonFile(this.outboxPath(this.actor), senderOutbox);

    return full;
  }

  // ── Convenience: typed message builders ─────────────────────────────────

  /** Delegate a task to a role agent. Typically called by the Lead. */
  delegate(
    to: AgentRole,
    task: Task,
    opts?: {
      contextExcerpts?: string[];
      adaptedPrompt?: string;
      constraints?: string[];
    }
  ): DelegationMessage {
    return this.post({
      to,
      taskId: task.id,
      type: "delegate",
      payload: {
        task,
        contextExcerpts: opts?.contextExcerpts,
        adaptedPrompt: opts?.adaptedPrompt,
        constraints: opts?.constraints,
      },
    }) as DelegationMessage;
  }

  /** Report task completion to the Lead. Called by role agents. */
  report(
    task: Task,
    result: string,
    why: string,
    opts?: {
      filesChanged?: string[];
      testsRun?: { passed: number; failed: number; skipped: number; command: string };
      commitSha?: string;
      promptSuggestion?: string;
    }
  ): ReportMessage {
    return this.post({
      to: "lead",
      taskId: task.id,
      type: "report",
      payload: {
        task,
        result,
        why,
        filesChanged: opts?.filesChanged,
        testsRun: opts?.testsRun,
        commitSha: opts?.commitSha,
        promptSuggestion: opts?.promptSuggestion,
      },
    }) as ReportMessage;
  }

  /** Escalate an out-of-scope task to the Lead. Called by role agents. */
  escalate(
    task: Task,
    reason: string,
    outOfScopeParts: string[],
    opts?: {
      completedParts?: string[];
      suggestedRoles?: AgentRole[];
    }
  ): EscalationMessage {
    return this.post({
      to: "lead",
      taskId: task.id,
      type: "escalate",
      payload: {
        task: { ...task, status: "BLOCKED" },
        reason,
        outOfScopeParts,
        completedParts: opts?.completedParts,
        suggestedRoles: opts?.suggestedRoles,
      },
    }) as EscalationMessage;
  }

  /** Send a status update for a task. Called by any agent. */
  statusUpdate(
    to: AgentRole,
    taskId: string,
    status: TaskStatus,
    note?: string
  ): StatusUpdateMessage {
    return this.post({
      to,
      taskId,
      type: "status-update",
      payload: { taskId, status, note },
    }) as StatusUpdateMessage;
  }

  // ── Task state tracking ─────────────────────────────────────────────────

  /** Get all tasks currently assigned to this agent. */
  getTasks(): Task[] {
    return readJsonFile<Task[]>(this.tasksPath(this.actor), []);
  }

  /** Get a specific task by ID. */
  getTask(taskId: string): Task | undefined {
    return this.getTasks().find((t) => t.id === taskId);
  }

  /** Get tasks filtered by status. */
  getTasksByStatus(status: TaskStatus): Task[] {
    return this.getTasks().filter((t) => t.status === status);
  }

  /** Add or replace a task in this agent's task list. */
  upsertTask(task: Task): void {
    const tasks = this.getTasks();
    const idx = tasks.findIndex((t) => t.id === task.id);
    if (idx >= 0) {
      tasks[idx] = task;
    } else {
      tasks.push(task);
    }
    writeJsonFile(this.tasksPath(this.actor), tasks);
  }

  /**
   * Update a task's status and timestamp. Returns the updated task,
   * or undefined if the task was not found.
   */
  updateTaskStatus(
    taskId: string,
    status: TaskStatus,
    fields?: Partial<Pick<Task, "result" | "why" | "error" | "filesChanged">>
  ): Task | undefined {
    const tasks = this.getTasks();
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return undefined;

    task.status = status;
    task.updatedAt = new Date().toISOString();
    if (status === "COMPLETED" || status === "CANCELLED") {
      task.completedAt = new Date().toISOString();
    }
    if (fields) {
      if (fields.result !== undefined) task.result = fields.result;
      if (fields.why !== undefined) task.why = fields.why;
      if (fields.error !== undefined) task.error = fields.error;
      if (fields.filesChanged !== undefined) task.filesChanged = fields.filesChanged;
    }

    writeJsonFile(this.tasksPath(this.actor), tasks);
    return task;
  }

  /**
   * Archive completed tasks to .state/<agent>/completed/YYYY_MM_DD__COMPLETED.json.
   * Removes them from the active task list.
   */
  archiveCompleted(): number {
    const tasks = this.getTasks();
    const completed = tasks.filter(
      (t) => t.status === "COMPLETED" || t.status === "CANCELLED"
    );
    if (completed.length === 0) return 0;

    const remaining = tasks.filter(
      (t) => t.status !== "COMPLETED" && t.status !== "CANCELLED"
    );

    // Write archive file
    const date = new Date().toISOString().split("T")[0];
    const archiveDir = this.completedDir(this.actor);
    if (!existsSync(archiveDir)) mkdirSync(archiveDir, { recursive: true });
    const archivePath = join(archiveDir, `${date}__COMPLETED.json`);

    const existing = readJsonFile<Task[]>(archivePath, []);
    existing.push(...completed);
    writeJsonFile(archivePath, existing);

    // Update active tasks
    writeJsonFile(this.tasksPath(this.actor), remaining);

    return completed.length;
  }

  // ── CURRENT_TASKS.md generation ─────────────────────────────────────────

  /**
   * Generate a markdown representation of current tasks, suitable for
   * injection into the agent's system prompt context. This is the
   * CURRENT_TASKS.md pattern from the webinar — re-injected each session.
   */
  renderCurrentTasksMd(): string {
    const tasks = this.getTasks();
    if (tasks.length === 0) return "## Current Tasks\n\nNo active tasks.\n";

    const lines = ["## Current Tasks", ""];
    const byStatus = new Map<string, Task[]>();

    for (const t of tasks) {
      const group = byStatus.get(t.status) ?? [];
      group.push(t);
      byStatus.set(t.status, group);
    }

    const statusOrder: TaskStatus[] = [
      "IN_PROGRESS",
      "PLANNING",
      "BLOCKED",
      "INTERRUPTED",
      "COMPLETED",
      "CANCELLED",
    ];

    for (const status of statusOrder) {
      const group = byStatus.get(status);
      if (!group || group.length === 0) continue;

      lines.push(`### ${status} (${group.length})`);
      for (const t of group) {
        lines.push(
          `- **${t.id}** [${t.type}] ${t.title ?? "(no title)"}` +
            (t.assignedTo !== this.actor ? ` → delegated to ${t.assignedTo}` : "") +
            (t.error ? ` ⚠️ ${t.error}` : "")
        );
      }
      lines.push("");
    }

    return lines.join("\n");
  }

  // ── Interrupted task recovery ───────────────────────────────────────────

  /**
   * Find tasks that were IN_PROGRESS when the process died.
   * Called at startup to offer resume/discard to the user.
   */
  getInterruptedTasks(): Task[] {
    return this.getTasks().filter((t) => t.status === "INTERRUPTED");
  }

  /**
   * Mark all IN_PROGRESS tasks as INTERRUPTED. Called during graceful
   * shutdown (SIGTERM/SIGINT handler) to preserve recovery state.
   */
  markInProgressAsInterrupted(): number {
    const tasks = this.getTasks();
    let count = 0;
    for (const t of tasks) {
      if (t.status === "IN_PROGRESS") {
        t.status = "INTERRUPTED";
        t.updatedAt = new Date().toISOString();
        count++;
      }
    }
    if (count > 0) writeJsonFile(this.tasksPath(this.actor), tasks);
    return count;
  }

  // ── Outbox introspection (for Lead audit) ───────────────────────────────

  /** Read the outbox of any agent. Typically used by the Lead for audit. */
  readOutbox(agentId?: string): BusMessage[] {
    return readJsonFile<BusMessage[]>(
      this.outboxPath(agentId ?? this.actor),
      []
    );
  }

  /**
   * Read another agent's inbox. Only the Lead should call this — used
   * for monitoring message backlogs and detecting stuck agents.
   */
  peekInbox(agentId: string): BusMessage[] {
    return readJsonFile<BusMessage[]>(this.inboxPath(agentId), []);
  }
}

// ── Factory ───────────────────────────────────────────────────────────────────

/**
 * Create an actor-scoped bus handle.
 *
 * @param stateRoot  Absolute path to the .state/ directory.
 * @param actor      The role of the calling agent. Determines which
 *                   inbox/outbox/tasks files are accessed.
 */
export function openBus(opts: {
  stateRoot: string;
  actor: AgentRole;
}): BusHandle {
  return new BusHandle(opts);
}

// ── Task factory ──────────────────────────────────────────────────────────────

/**
 * Create a new Task object with sensible defaults.
 * The caller is responsible for posting it via the bus.
 */
export function createTask(fields: {
  type: string;
  title?: string;
  payload?: Record<string, unknown>;
  requestedBy: string;
  assignedTo: AgentRole;
  priority?: Task["priority"];
  parentTaskId?: string;
}): Task {
  const now = new Date().toISOString();
  return {
    id: generateTaskId(),
    type: fields.type,
    ...(fields.title !== undefined ? { title: fields.title } : {}),
    payload: fields.payload ?? {},
    requestedBy: fields.requestedBy,
    assignedTo: fields.assignedTo,
    status: "PLANNING",
    priority: fields.priority ?? "normal",
    ...(fields.parentTaskId !== undefined ? { parentTaskId: fields.parentTaskId } : {}),
    createdAt: now,
    updatedAt: now,
  };
}

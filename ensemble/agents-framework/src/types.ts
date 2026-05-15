// Shared TypeScript types for the AI Orchestra runtime.
// These mirror the OpenSpec JSON Schema contracts in runtime/openspec/.
// When schemas and types conflict, the schemas are authoritative.

// ── Primitives ────────────────────────────────────────────────────────────────

export type AgentRole =
  | "lead"
  | "frontend"
  | "backend"
  | "qa"
  | "devops"
  | "security"
  | "mobile"
  | "ai-ml"
  | "analytics"
  | "tech-writer"
  | "product-manager";

export type TaskStatus =
  | "PLANNING"
  | "IN_PROGRESS"
  | "BLOCKED"
  | "COMPLETED"
  | "CANCELLED"
  | "INTERRUPTED";

export type TaskPriority = "low" | "normal" | "high" | "critical";

export type ModelTier = "opus" | "sonnet" | "haiku";

export type BusMessageType = "delegate" | "report" | "escalate" | "status-update";

// ── Scope ─────────────────────────────────────────────────────────────────────

export interface ScopeDefinition {
  /** Glob patterns the agent can read and modify. */
  readWrite: string[];
  /** Glob patterns the agent can read but not modify. */
  readOnly: string[];
  /** Glob patterns invisible to the agent — not even readable. */
  forbidden: string[];
  /**
   * Additional paths forbidden for this agent beyond the global defaults.
   * The global defaults (.env, *.pem, *.key, ~/.ssh, etc.) are always applied
   * and cannot be reduced.
   */
  extraForbidden?: string[];
  /**
   * 'bus': when the agent needs a file outside its scope, the middleware
   * requests an excerpt from the Lead via the bus.
   * 'reject': hard denial, no fallback.
   * Defaults to 'bus'.
   */
  escalationPath?: "bus" | "reject";
}

// Paths forbidden for ALL agents regardless of role. Never reducible.
export const GLOBAL_FORBIDDEN_PATTERNS: readonly string[] = [
  "**/.env",
  "**/.env.*",
  "**/*.pem",
  "**/*.key",
  "**/*credentials*",
  "**/*secret*",
  "~/.ssh/**",
  "~/.gnupg/**",
  "~/.aws/**",
];

// ── Model routing ─────────────────────────────────────────────────────────────

export interface ModelRouting {
  /** Complex reasoning: architecture decisions, multi-step planning. */
  reasoning: ModelTier;
  /** Routine task execution: code generation, file edits. */
  execution: ModelTier;
  /** State updates, learnings writes, bus message construction. */
  stateWrites: ModelTier;
  /** QA validation checks. */
  qaValidation: ModelTier;
}

export const DEFAULT_MODEL_ROUTING: ModelRouting = {
  reasoning: "sonnet",
  execution: "sonnet",
  stateWrites: "haiku",
  qaValidation: "haiku",
};

// ── Agent manifest ────────────────────────────────────────────────────────────

export interface SkillEntry {
  /** Skill ID from core/skills/. */
  id: string;
  /** Natural language trigger phrase. */
  trigger: string;
}

export interface HealthCheckConfig {
  /** How often the agent sends a heartbeat to the Lead (ms). Default: 30000. */
  heartbeatIntervalMs: number;
  /** If no heartbeat in this window, Lead considers agent frozen. Default: 120000. */
  timeoutMs: number;
}

export interface AgentManifest {
  /** Matches the project folder name under runtime/projects/. */
  id: string;
  role: AgentRole;
  displayName: string;
  /** One-paragraph mission statement. Injected into system prompt. */
  mission: string;
  scope: ScopeDefinition;
  /** Task types this agent can handle. Used by Lead for routing. */
  taskTypes: string[];
  /** Roles this agent typically collaborates with. Informational. */
  collaborators?: AgentRole[];
  modelPreferences: {
    reasoning: ModelTier;
    execution: ModelTier;
    stateWrites: ModelTier;
  };
  skills?: SkillEntry[];
  healthCheck?: HealthCheckConfig;
}

// ── Agent runtime config ──────────────────────────────────────────────────────

export interface AgentConfig {
  manifest: AgentManifest;
  /** Absolute path to the target project this agent operates in. */
  cwd: string;
  /** Telegram bot token for this agent. */
  telegramBotToken: string;
  /** Telegram user ID of the owner. Always authorized. */
  ownerId: number;
  /** Absolute path to the .state/<project>/ directory. */
  stateDir: string;
  /** Global model routing overrides. Merged with manifest.modelPreferences. */
  modelRouting: ModelRouting;
}

// ── Task ──────────────────────────────────────────────────────────────────────

export interface Task {
  /** Format: task_ + 12 lowercase alphanumeric chars. */
  id: string;
  type: string;
  title?: string;
  payload: Record<string, unknown>;
  /** 'user', a role string, or 'scheduler'. */
  requestedBy: string;
  assignedTo: AgentRole;
  status: TaskStatus;
  priority: TaskPriority;
  /** Parent task ID if this was split from a larger task. */
  parentTaskId?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  /** Deliverable output. Set on completion. */
  result?: string;
  /** Rationale for the approach. Required on completion. */
  why?: string;
  /** Paths of files changed, relative to agent CWD. */
  filesChanged?: string[];
  error?: string;
}

export interface TestsRun {
  passed: number;
  failed: number;
  skipped: number;
  command: string;
}

// ── Bus messages ──────────────────────────────────────────────────────────────

export interface BusMessage {
  /** Format: msg_ + 12 lowercase alphanumeric chars. */
  id: string;
  from: AgentRole;
  to: AgentRole;
  taskId: string;
  type: BusMessageType;
  payload: Record<string, unknown>;
  timestamp: string;
  /** Original message ID if this is a reply. */
  replyTo?: string;
}

export interface DelegationMessage extends BusMessage {
  type: "delegate";
  payload: {
    task: Task;
    /** Relevant file excerpts pre-read by Lead for the role agent. */
    contextExcerpts?: string[];
    /** User's original request rewritten for the target agent's vocabulary. */
    adaptedPrompt?: string;
    /** Constraints the role agent must respect. */
    constraints?: string[];
  };
}

export interface ReportMessage extends BusMessage {
  type: "report";
  to: "lead";
  payload: {
    task: Task;
    result: string;
    why: string;
    filesChanged?: string[];
    testsRun?: TestsRun;
    commitSha?: string;
    /** Suggestion for how the user could phrase similar requests better. */
    promptSuggestion?: string;
  };
}

export interface EscalationMessage extends BusMessage {
  type: "escalate";
  to: "lead";
  payload: {
    task: Task;
    reason: string;
    outOfScopeParts: string[];
    completedParts?: string[];
    suggestedRoles?: AgentRole[];
  };
}

export interface StatusUpdateMessage extends BusMessage {
  type: "status-update";
  payload: {
    taskId: string;
    status: TaskStatus;
    note?: string;
  };
}

// ── Heartbeat ─────────────────────────────────────────────────────────────────

export interface Heartbeat {
  agentId: string;
  role: AgentRole;
  status: "idle" | "working" | "blocked";
  currentTaskId?: string;
  timestamp: string;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface AuthorizedUser {
  telegramId: number;
  username?: string;
  addedAt: string;
  addedBy: number;
}

export interface AccessLogEntry {
  telegramId: number;
  username?: string;
  timestamp: string;
  action: "denied" | "allowed";
}

// ── Runtime config (written by setup.ts) ─────────────────────────────────────

export interface RuntimeConfig {
  version: string;
  installedAt: string;
  activeRoles: AgentRole[];
  telegramEnabled: boolean;
  projectCwd: string;
  setupCompleted: boolean;
  skippedSteps: string[];
}

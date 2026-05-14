// Phase 3a — shared TypeScript types
// TODO: implement in Phase 3a

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

export type ModelTier = "opus" | "sonnet" | "haiku";

export interface ScopeDefinition {
  readWrite: string[];
  readOnly: string[];
  forbidden: string[];
}

export interface AgentConfig {
  id: string;
  role: AgentRole;
  telegramBotToken: string;
  cwd: string;
  scope: ScopeDefinition;
  stateDir: string;
  modelRouting: ModelRouting;
  ownerId: number;
}

export interface ModelRouting {
  leadReasoning: ModelTier;
  taskExecution: ModelTier;
  stateWrites: ModelTier;
  qaValidation: ModelTier;
}

export interface Task {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  requestedBy: string;
  assignedTo: AgentRole;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  result?: string;
  why?: string;
}

export interface BusMessage {
  id: string;
  from: AgentRole;
  to: AgentRole;
  taskId: string;
  type: "delegate" | "report" | "escalate" | "status-update";
  payload: Record<string, unknown>;
  timestamp: string;
}

export interface DelegationMessage extends BusMessage {
  type: "delegate";
  payload: {
    task: Task;
    contextExcerpts?: string[];
  };
}

export interface ReportMessage extends BusMessage {
  type: "report";
  payload: {
    task: Task;
    result: string;
    why: string;
    filesChanged?: string[];
  };
}

export interface EscalationMessage extends BusMessage {
  type: "escalate";
  payload: {
    task: Task;
    reason: string;
    outOfScopeParts: string[];
  };
}

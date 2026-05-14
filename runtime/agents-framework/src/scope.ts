import { resolve, relative, normalize, sep } from "path";
import type { ScopeDefinition, AgentConfig } from "./types.js";
import { GLOBAL_FORBIDDEN_PATTERNS } from "./types.js";

// ── Access levels ─────────────────────────────────────────────────────────────

export type AccessLevel = "readWrite" | "readOnly" | "forbidden" | "globalForbidden";
export type Operation = "read" | "write" | "list" | "exec";

export interface AccessDecision {
  allowed: boolean;
  level: AccessLevel;
  /**
   * What to tell the agent when denied:
   * - forbidden/globalForbidden: "path not found" (do not leak existence)
   * - readOnly + write: "read-only — cannot modify"
   * - escalate: "requesting excerpt from Lead..."
   */
  agentMessage: string;
  /** Whether this denial should be escalated to the Lead via bus. */
  escalate: boolean;
}

export interface ScopeViolation {
  agentId: string;
  path: string;
  operation: Operation;
  level: AccessLevel;
  timestamp: string;
  escalated: boolean;
}

// ── Glob matching (dependency-free, security-critical) ────────────────────────

/**
 * Convert a glob pattern to a RegExp. Supports:
 *  - `**` matches any number of path segments (including zero)
 *  - `*`  matches anything within a single segment (no separators)
 *  - `?`  matches exactly one character (not a separator)
 *  - Literal characters are escaped
 *
 * Patterns are matched against normalized forward-slash paths relative to CWD.
 */
function globToRegex(pattern: string): RegExp {
  // Normalize to forward slashes for cross-platform matching
  const normalized = pattern.replace(/\\/g, "/");
  let regex = "";
  let i = 0;

  while (i < normalized.length) {
    const char = normalized[i];

    if (char === "*" && normalized[i + 1] === "*") {
      // ** — match any depth
      if (normalized[i + 2] === "/") {
        regex += "(?:.+/)?"; // zero or more path segments
        i += 3;
      } else {
        regex += ".*"; // trailing ** — match everything remaining
        i += 2;
      }
    } else if (char === "*") {
      regex += "[^/]*"; // single segment wildcard
      i++;
    } else if (char === "?") {
      regex += "[^/]"; // single character
      i++;
    } else if (char === ".") {
      regex += "\\.";
      i++;
    } else if (char === "/" || char === "\\") {
      regex += "/";
      i++;
    } else if ("()[]{}+^$|".includes(char)) {
      regex += "\\" + char;
      i++;
    } else {
      regex += char;
      i++;
    }
  }

  return new RegExp(`^${regex}$`, "i");
}

function matchesAnyPattern(relPath: string, patterns: string[]): boolean {
  const normalized = relPath.replace(/\\/g, "/");
  for (const pattern of patterns) {
    if (globToRegex(pattern).test(normalized)) return true;
  }
  return false;
}

// ── ScopeEnforcer ─────────────────────────────────────────────────────────────

/**
 * Evaluates file-system access for an agent. Constructed once per agent
 * session; all tool calls pass through `checkAccess()` before execution.
 *
 * Evaluation order (first match wins):
 *   1. Global forbidden (always rejects, returns "path not found")
 *   2. Per-agent forbidden (returns "path not found")
 *   3. Per-agent readWrite (full access)
 *   4. Per-agent readOnly (read allowed, write denied)
 *   5. No match → treated as forbidden (deny-by-default)
 */
export class ScopeEnforcer {
  private readonly agentId: string;
  private readonly cwd: string;
  private readonly readWritePatterns: string[];
  private readonly readOnlyPatterns: string[];
  private readonly forbiddenPatterns: string[];
  private readonly globalForbiddenPatterns: string[];
  private readonly escalationPath: "bus" | "reject";
  private readonly violations: ScopeViolation[] = [];

  constructor(config: AgentConfig) {
    this.agentId = config.manifest.id;
    this.cwd = normalize(config.cwd);
    this.readWritePatterns = config.manifest.scope.readWrite;
    this.readOnlyPatterns = config.manifest.scope.readOnly;
    this.forbiddenPatterns = [
      ...config.manifest.scope.forbidden,
      ...(config.manifest.scope.extraForbidden ?? []),
    ];
    this.globalForbiddenPatterns = [...GLOBAL_FORBIDDEN_PATTERNS];
    this.escalationPath = config.manifest.scope.escalationPath ?? "bus";
  }

  /**
   * Resolve an agent-provided path to a relative path within the project.
   * Returns null if the path escapes the CWD (directory traversal attack).
   */
  private resolvePath(inputPath: string): string | null {
    const abs = resolve(this.cwd, inputPath);
    const rel = relative(this.cwd, abs);

    // Directory traversal: relative path starts with '..' → outside CWD
    if (rel.startsWith("..") || resolve(abs) !== abs && rel.startsWith("..")) {
      return null;
    }
    // Absolute path that isn't under CWD
    if (resolve(this.cwd, rel) !== abs) {
      // Double-check: could be a symlink or weird normalization
      const normalizedCwd = normalize(this.cwd).replace(/\\/g, "/");
      const normalizedAbs = normalize(abs).replace(/\\/g, "/");
      if (!normalizedAbs.startsWith(normalizedCwd)) {
        return null;
      }
    }

    return rel || ".";
  }

  /**
   * Evaluate whether an operation on a path is allowed, denied, or should
   * be escalated. This is the single decision point — every tool call
   * routes through here.
   */
  checkAccess(inputPath: string, operation: Operation): AccessDecision {
    const relPath = this.resolvePath(inputPath);

    // Path escapes CWD — treat as global forbidden
    if (relPath === null) {
      this.recordViolation(inputPath, operation, "globalForbidden", false);
      return {
        allowed: false,
        level: "globalForbidden",
        agentMessage: "Error: path not found",
        escalate: false,
      };
    }

    // 1. Global forbidden — hard reject, no escalation, pretend path doesn't exist
    if (matchesAnyPattern(relPath, this.globalForbiddenPatterns)) {
      this.recordViolation(relPath, operation, "globalForbidden", false);
      return {
        allowed: false,
        level: "globalForbidden",
        agentMessage: "Error: path not found",
        escalate: false,
      };
    }

    // 2. Per-agent forbidden — pretend path doesn't exist, optionally escalate
    if (matchesAnyPattern(relPath, this.forbiddenPatterns)) {
      const escalate = this.escalationPath === "bus" && operation === "read";
      this.recordViolation(relPath, operation, "forbidden", escalate);
      return {
        allowed: false,
        level: "forbidden",
        agentMessage: "Error: path not found",
        escalate,
      };
    }

    // 3. ReadWrite — full access
    if (matchesAnyPattern(relPath, this.readWritePatterns)) {
      return {
        allowed: true,
        level: "readWrite",
        agentMessage: "",
        escalate: false,
      };
    }

    // 4. ReadOnly — reads allowed, writes denied with explanation
    if (matchesAnyPattern(relPath, this.readOnlyPatterns)) {
      if (operation === "read" || operation === "list") {
        return {
          allowed: true,
          level: "readOnly",
          agentMessage: "",
          escalate: false,
        };
      }
      // Write/exec on readOnly → denied with transparent message
      const escalate = this.escalationPath === "bus";
      this.recordViolation(relPath, operation, "readOnly", escalate);
      return {
        allowed: false,
        level: "readOnly",
        agentMessage: `Access denied: ${relPath} is read-only for your role. You can read it but not modify it. To make changes here, request assistance from the Lead agent.`,
        escalate,
      };
    }

    // 5. No pattern matched → deny-by-default (implicit forbidden)
    const escalate = this.escalationPath === "bus" && operation === "read";
    this.recordViolation(relPath, operation, "forbidden", escalate);
    return {
      allowed: false,
      level: "forbidden",
      agentMessage: "Error: path not found",
      escalate,
    };
  }

  /**
   * Check whether a bash command is safe to execute. Extracts path-like
   * arguments and checks each one. Also blocks commands that could bypass
   * scope (curl, wget, ssh, sudo, etc.).
   */
  checkBashCommand(command: string): AccessDecision {
    const blockedCommands = [
      "sudo", "su ", "ssh ", "scp ", "rsync ", "wget ", "curl ",
      "nc ", "ncat ", "telnet ", "ftp ", "sftp ",
      "rm -rf /", "chmod ", "chown ",
      "eval ", "exec ",
    ];

    const lowerCmd = command.toLowerCase().trim();
    for (const blocked of blockedCommands) {
      if (lowerCmd.startsWith(blocked) || lowerCmd.includes(` ${blocked}`)) {
        return {
          allowed: false,
          level: "globalForbidden",
          agentMessage: `Command not allowed: '${blocked.trim()}' is blocked for security. Use the appropriate tool or request via the Lead agent.`,
          escalate: false,
        };
      }
    }

    // Extract file paths from the command and check each
    const pathTokens = extractPathsFromCommand(command);
    for (const token of pathTokens) {
      const decision = this.checkAccess(token, "exec");
      if (!decision.allowed) return decision;
    }

    return {
      allowed: true,
      level: "readWrite",
      agentMessage: "",
      escalate: false,
    };
  }

  private recordViolation(
    path: string,
    operation: Operation,
    level: AccessLevel,
    escalated: boolean
  ): void {
    this.violations.push({
      agentId: this.agentId,
      path,
      operation,
      level,
      timestamp: new Date().toISOString(),
      escalated,
    });
  }

  /** Get all recorded violations for this session. Used by the Lead for review. */
  getViolations(): readonly ScopeViolation[] {
    return this.violations;
  }

  /** Get summary stats for logging. */
  getViolationSummary(): { total: number; escalated: number; globalForbidden: number } {
    return {
      total: this.violations.length,
      escalated: this.violations.filter((v) => v.escalated).length,
      globalForbidden: this.violations.filter((v) => v.level === "globalForbidden").length,
    };
  }
}

// ── Path extraction from bash commands ────────────────────────────────────────

const PATH_LIKE = /(?:^|[\s=])([.~/][^\s;|&><"']+|[a-zA-Z]:\\[^\s;|&><"']+)/g;

function extractPathsFromCommand(command: string): string[] {
  const paths: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = PATH_LIKE.exec(command)) !== null) {
    const token = match[1].trim();
    if (token && token.length > 1) paths.push(token);
  }
  return paths;
}

// ── Tool wrapper factory ──────────────────────────────────────────────────────

/**
 * Operation classification for Claude SDK tool names.
 * Maps the tool name to the operation type used in scope checks.
 */
const TOOL_OPERATIONS: Record<string, Operation> = {
  Read: "read",
  Glob: "list",
  Grep: "read",
  Write: "write",
  StrReplace: "write",
  Delete: "write",
  Shell: "exec",
  Bash: "exec",
};

export interface ToolCallInterceptor {
  /**
   * Call before executing any tool. Returns the access decision.
   * If `allowed` is false, the tool should NOT execute — return
   * `agentMessage` as the tool result instead.
   */
  beforeToolCall(
    toolName: string,
    args: Record<string, unknown>
  ): AccessDecision;
}

/**
 * Create a tool-call interceptor from an AgentConfig.
 * Plug this into the agent's tool execution pipeline.
 */
export function createToolInterceptor(config: AgentConfig): ToolCallInterceptor {
  const enforcer = new ScopeEnforcer(config);

  return {
    beforeToolCall(
      toolName: string,
      args: Record<string, unknown>
    ): AccessDecision {
      const operation = TOOL_OPERATIONS[toolName] ?? "read";

      // Shell/Bash: check the command string
      if (operation === "exec") {
        const command =
          (args["command"] as string) ?? (args["cmd"] as string) ?? "";
        return enforcer.checkBashCommand(command);
      }

      // File tools: extract the path argument
      const path =
        (args["path"] as string) ??
        (args["target"] as string) ??
        (args["file"] as string) ??
        (args["glob_pattern"] as string) ??
        (args["pattern"] as string);

      if (!path) {
        // No path argument — let it through (informational tool calls)
        return {
          allowed: true,
          level: "readWrite",
          agentMessage: "",
          escalate: false,
        };
      }

      return enforcer.checkAccess(path, operation);
    },
  };
}

/**
 * Create a ScopeEnforcer directly (for testing or non-tool-call usage).
 */
export function createScopeEnforcer(config: AgentConfig): ScopeEnforcer {
  return new ScopeEnforcer(config);
}

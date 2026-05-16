/**
 * AI Orchestra — Local Web Dashboard + Chat Server
 *
 * Serves a full browser dashboard (Chat, Status, Tasks, Projects, Logs tabs)
 * and handles WebSocket connections for real-time conversations with the Lead agent.
 *
 * Activation: set ENABLE_WEB_UI=true in the ensemble .env.
 *
 * WebSocket protocol (client ↔ server):
 *   Client → { type: "message", text: string }
 *   Client → { type: "stop" }
 *   Client → { type: "subscribe", feed: "status" | "tasks" | "logs" }
 *   Server → { type: "chunk",          text: string }
 *   Server → { type: "done" }
 *   Server → { type: "error",          message: string }
 *   Server → { type: "echo",           text: string }
 *   Server → { type: "status_update",  agents: AgentStatus[] }
 *   Server → { type: "tasks_update",   tasks: TaskSummary[] }
 *   Server → { type: "log_line",       line: string }
 *
 * HTTP REST:
 *   GET /api/projects  → { projects: ProjectEntry[] }
 *   GET /api/status    → { agents: AgentStatus[] }
 */

import { existsSync, readFileSync, readdirSync, watchFile } from "fs";
import { join } from "path";
import { homedir } from "os";
import Anthropic from "@anthropic-ai/sdk";
import type { MessageStreamEvent } from "@anthropic-ai/sdk/resources/messages";
import { verifyWebhookSignature, parseGitHubEvent, buildGitHubTaskTitle, postToLeadInbox } from "./github.js";

// ── Types ─────────────────────────────────────────────────────────────────────

interface WebServerOptions {
  port: number;
  anthropicApiKey: string;
  cwd: string;
  stateRoot?: string;
  authToken?: string;
  logLevel?: "debug" | "info" | "warn" | "error";
}

interface ClientMessage {
  type: "message" | "stop" | "subscribe";
  text?: string;
  feed?: "status" | "tasks" | "logs";
}

interface AgentStatus {
  role: string;
  running: boolean;
  lastHeartbeat: string | null;
  activeTasks: number;
  blockedTasks: number;
  inboxCount: number;
}

interface TaskSummary {
  id: string;
  title: string;
  status: string;
  role: string;
  createdAt: string;
}

interface ProjectEntry {
  path: string;
  name: string;
  ide: string | null;
  tier: number;
  lastSeenVersion: string;
  lastSeenAt: string;
}

interface WebChatSession {
  history: Array<{ role: "user" | "assistant"; content: string }>;
  abortController: AbortController | null;
  subscriptions: Set<string>;
}

// ── Static dashboard HTML ─────────────────────────────────────────────────────

function getDashboardHtml(port: number, authToken: string | undefined): string {
  const wsUrl = authToken
    ? `ws://localhost:${port}/ws?token=${authToken}`
    : `ws://localhost:${port}/ws`;

  const uiPath = new URL("../../../web-ui/index.html", import.meta.url).pathname;
  if (existsSync(uiPath)) {
    return readFileSync(uiPath, "utf8").replace("__WS_URL__", wsUrl);
  }
  return `<!DOCTYPE html><html><body><p>Dashboard not found at ${uiPath}. Ensure web-ui/index.html is present.</p></body></html>`;
}

// ── State readers ─────────────────────────────────────────────────────────────

const AGENT_ROLES = ["lead", "frontend", "backend", "qa", "devops", "security"];

function readAgentStatus(stateRoot: string): AgentStatus[] {
  return AGENT_ROLES.map((role) => {
    const roleDir = join(stateRoot, role);
    let activeTasks = 0;
    let blockedTasks = 0;
    let lastHeartbeat: string | null = null;
    let inboxCount = 0;

    try {
      const tasksPath = join(roleDir, "tasks.json");
      if (existsSync(tasksPath)) {
        const tasks: Array<{ status: string }> = JSON.parse(readFileSync(tasksPath, "utf8"));
        activeTasks = tasks.filter((t) => t.status === "IN_PROGRESS").length;
        blockedTasks = tasks.filter((t) => t.status === "BLOCKED").length;
      }

      const heartbeatPath = join(roleDir, "heartbeat.json");
      if (existsSync(heartbeatPath)) {
        const hb = JSON.parse(readFileSync(heartbeatPath, "utf8")) as { ts?: string };
        lastHeartbeat = hb.ts ?? null;
      }

      const inboxPath = join(roleDir, "inbox.json");
      if (existsSync(inboxPath)) {
        const inbox: unknown[] = JSON.parse(readFileSync(inboxPath, "utf8"));
        inboxCount = Array.isArray(inbox) ? inbox.length : 0;
      }
    } catch { /* role dir may not exist yet */ }

    const running = lastHeartbeat
      ? Date.now() - new Date(lastHeartbeat).getTime() < 60_000
      : false;

    return { role, running, lastHeartbeat, activeTasks, blockedTasks, inboxCount };
  });
}

function readAllTasks(stateRoot: string): TaskSummary[] {
  const tasks: TaskSummary[] = [];
  for (const role of AGENT_ROLES) {
    const tasksPath = join(stateRoot, role, "tasks.json");
    if (!existsSync(tasksPath)) continue;
    try {
      const raw: Array<{ id: string; title?: string; type?: string; status: string; createdAt?: string }> =
        JSON.parse(readFileSync(tasksPath, "utf8"));
      for (const t of raw) {
        if (t.status !== "COMPLETED") {
          tasks.push({
            id: t.id,
            title: t.title ?? t.type ?? t.id,
            status: t.status,
            role,
            createdAt: t.createdAt ?? "",
          });
        }
      }
    } catch { /* skip */ }
  }
  return tasks.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function readProjects(): ProjectEntry[] {
  const registryPath = join(homedir(), ".ai-orchestra", "projects.json");
  if (!existsSync(registryPath)) return [];
  try {
    const data = JSON.parse(readFileSync(registryPath, "utf8"));
    return Array.isArray(data.projects) ? data.projects : [];
  } catch { return []; }
}

function readRecentLogs(stateRoot: string, lines = 100): string[] {
  const logDir = join(stateRoot, "..", "logs");
  if (!existsSync(logDir)) return [];

  try {
    const files = readdirSync(logDir)
      .filter((f) => f.endsWith(".log"))
      .sort()
      .reverse()
      .slice(0, 3);

    const result: string[] = [];
    for (const file of files.reverse()) {
      const content = readFileSync(join(logDir, file), "utf8");
      result.push(...content.split("\n").filter(Boolean));
    }
    return result.slice(-lines);
  } catch { return []; }
}

// ── System prompt ─────────────────────────────────────────────────────────────

const DASHBOARD_SYSTEM_PROMPT = `You are the Lead Orchestrator of an AI Orchestra ensemble — a team of background agents coordinated to help a software developer.

You can:
- Answer questions about project status, tasks in progress, and agent activity
- Accept task delegation ("build this feature", "review the PR", "run tests")
- Bootstrap score/ into new projects ("/addproject <path>")
- Provide status summaries of all registered projects
- Help the developer understand what each agent is doing

Keep responses concise and practical. When the developer asks you to do work, outline the plan and ask for confirmation before proceeding. Format responses clearly — use bullet points and code blocks where appropriate.`;

// ── Web Server ────────────────────────────────────────────────────────────────

export async function startWebServer(options: WebServerOptions): Promise<{ port: number; stop: () => void }> {
  const { port, anthropicApiKey, cwd, stateRoot, authToken, logLevel = "info" } = options;

  const resolvedStateRoot = stateRoot ?? join(cwd, "..", ".ai-orchestra", ".state");

  const log = (level: string, msg: string) => {
    if (logLevel === "debug" || level !== "debug") {
      console.log(`[web-chat] [${level}] ${msg}`);
    }
  };

  const client = new Anthropic({ apiKey: anthropicApiKey });
  const sessions = new Map<string, WebChatSession>();
  let sessionCounter = 0;

  // ── Status push interval ──────────────────────────────────────────────────
  // We store connected WebSocket references for broadcasting
  const subscribedStatus = new Set<{ send(data: string): void }>();
  const subscribedTasks = new Set<{ send(data: string): void }>();
  const subscribedLogs = new Set<{ send(data: string): void }>();

  const statusInterval = setInterval(() => {
    if (subscribedStatus.size === 0 && subscribedTasks.size === 0) return;

    if (subscribedStatus.size > 0) {
      const agents = readAgentStatus(resolvedStateRoot);
      const msg = JSON.stringify({ type: "status_update", agents });
      subscribedStatus.forEach((ws) => { try { ws.send(msg); } catch { subscribedStatus.delete(ws); } });
    }

    if (subscribedTasks.size > 0) {
      const tasks = readAllTasks(resolvedStateRoot);
      const msg = JSON.stringify({ type: "tasks_update", tasks });
      subscribedTasks.forEach((ws) => { try { ws.send(msg); } catch { subscribedTasks.delete(ws); } });
    }
  }, 5000);

  // ── Server ────────────────────────────────────────────────────────────────

  const server = Bun.serve<{ sessionId: string }>({
    port,

    fetch(req, server) {
      const url = new URL(req.url);

      // Auth check
      const authed = !authToken || url.searchParams.get("token") === authToken;

      // WebSocket upgrade
      if (url.pathname === "/ws") {
        if (!authed) return new Response("Unauthorized", { status: 401 });
        const sessionId = String(++sessionCounter);
        const upgraded = server.upgrade(req, { data: { sessionId } });
        if (upgraded) return undefined as unknown as Response;
        return new Response("WebSocket upgrade failed", { status: 426 });
      }

      // REST: projects list
      if (url.pathname === "/api/projects") {
        if (!authed) return new Response("Unauthorized", { status: 401 });
        const projects = readProjects();
        return new Response(JSON.stringify({ projects }), {
          headers: { "Content-Type": "application/json" },
        });
      }

      // REST: agent status
      if (url.pathname === "/api/status") {
        if (!authed) return new Response("Unauthorized", { status: 401 });
        const agents = readAgentStatus(resolvedStateRoot);
        return new Response(JSON.stringify({ agents }), {
          headers: { "Content-Type": "application/json" },
        });
      }

      // GitHub webhook ingestion — POST /github
      if (url.pathname === "/github" && req.method === "POST") {
        const body = await req.text();
        const secret = process.env["GITHUB_WEBHOOK_SECRET"] ?? "";
        const sig = req.headers.get("x-hub-signature-256");
        const eventType = req.headers.get("x-github-event") ?? "unknown";

        if (secret && !verifyWebhookSignature(body, sig, secret)) {
          log("warn", `GitHub webhook: invalid signature (event: ${eventType})`);
          return new Response("Invalid signature", { status: 401 });
        }

        let payload: Record<string, unknown>;
        try { payload = JSON.parse(body); }
        catch { return new Response("Invalid JSON", { status: 400 }); }

        const event = parseGitHubEvent(eventType, payload);
        log("info", `GitHub event: ${eventType} / action=${JSON.stringify((event as any).action ?? "(none)")}`);

        // Write task to Lead agent inbox so it processes the event on next tick
        try {
          const taskTitle = buildGitHubTaskTitle(event);
          postToLeadInbox(resolvedStateRoot, {
            type: "delegate",
            to: "lead",
            taskId: `gh-${Date.now()}`,
            payload: { event, taskTitle },
          });
          log("info", `GitHub task queued: ${taskTitle}`);
        } catch (err) {
          log("error", `Failed to queue GitHub task: ${err}`);
        }

        return new Response("OK", { status: 200 });
      }

      // Serve the dashboard for all other routes
      const html = getDashboardHtml(port, authToken);
      return new Response(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    },

    websocket: {
      open(ws) {
        const { sessionId } = ws.data;
        sessions.set(sessionId, {
          history: [],
          abortController: null,
          subscriptions: new Set(),
        });
        log("info", `Client connected (session ${sessionId})`);
      },

      close(ws) {
        const { sessionId } = ws.data;
        const session = sessions.get(sessionId);
        if (session?.abortController) session.abortController.abort();
        subscribedStatus.delete(ws as any);
        subscribedTasks.delete(ws as any);
        subscribedLogs.delete(ws as any);
        sessions.delete(sessionId);
        log("info", `Client disconnected (session ${sessionId})`);
      },

      async message(ws, rawMessage) {
        const { sessionId } = ws.data;
        const session = sessions.get(sessionId);
        if (!session) return;

        let parsed: ClientMessage;
        try { parsed = JSON.parse(String(rawMessage)); }
        catch { send(ws, { type: "error", message: "Invalid message format" }); return; }

        // ── Subscribe to feeds ──────────────────────────────────────────────
        if (parsed.type === "subscribe") {
          const feed = parsed.feed;
          if (feed === "status") {
            subscribedStatus.add(ws as any);
            // Send immediate snapshot
            const agents = readAgentStatus(resolvedStateRoot);
            send(ws, { type: "status_update", agents });
          } else if (feed === "tasks") {
            subscribedTasks.add(ws as any);
            const tasks = readAllTasks(resolvedStateRoot);
            send(ws, { type: "tasks_update", tasks });
          } else if (feed === "logs") {
            subscribedLogs.add(ws as any);
            const lines = readRecentLogs(resolvedStateRoot);
            for (const line of lines) {
              send(ws, { type: "log_line", line });
            }
          }
          return;
        }

        // ── Stop ────────────────────────────────────────────────────────────
        if (parsed.type === "stop") {
          if (session.abortController) {
            session.abortController.abort();
            session.abortController = null;
          }
          send(ws, { type: "done" });
          return;
        }

        // ── Chat message ────────────────────────────────────────────────────
        if (parsed.type !== "message" || !parsed.text?.trim()) return;

        const userText = parsed.text.trim();
        send(ws, { type: "echo", text: userText });

        session.history.push({ role: "user", content: userText });
        if (session.history.length > 6) session.history.splice(0, session.history.length - 6);

        const controller = new AbortController();
        session.abortController = controller;

        try {
          let fullResponse = "";

          const stream = await client.messages.stream({
            model: "claude-sonnet-4-5",
            max_tokens: 2048,
            system: `${DASHBOARD_SYSTEM_PROMPT}\n\nProject CWD: ${cwd}`,
            messages: session.history.map((m) => ({ role: m.role, content: m.content })),
          });

          for await (const event of stream as AsyncIterable<MessageStreamEvent>) {
            if (controller.signal.aborted) break;
            if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
              fullResponse += event.delta.text;
              send(ws, { type: "chunk", text: event.delta.text });
            }
          }

          if (fullResponse) session.history.push({ role: "assistant", content: fullResponse });
          send(ws, { type: "done" });
        } catch (err: unknown) {
          if (controller.signal.aborted) { send(ws, { type: "done" }); return; }
          const message = err instanceof Error ? err.message : String(err);
          log("error", `Streaming failed: ${message}`);
          send(ws, { type: "error", message });
        } finally {
          session.abortController = null;
        }
      },
    },
  });

  log("info", `Dashboard running at http://localhost:${port}`);

  return {
    port,
    stop: () => {
      clearInterval(statusInterval);
      server.stop(true);
      log("info", "Dashboard server stopped");
    },
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function send(ws: { send(data: string): void }, msg: object): void {
  try { ws.send(JSON.stringify(msg)); } catch { /* WebSocket may have closed */ }
}

/**
 * AI Orchestra — GitHub Integration
 *
 * Provides:
 *   1. Webhook signature verification (X-Hub-Signature-256)
 *   2. GitHub API client (Octokit wrapper) for PR diffs, comments, check runs
 *   3. Structured event payload types for the Lead agent
 *
 * Requires:
 *   GITHUB_TOKEN          — Personal Access Token (repo + pull_requests scopes)
 *   GITHUB_WEBHOOK_SECRET — Secret set when configuring the webhook on GitHub
 *
 * Add to the ensemble via: bun add @octokit/rest
 */

import { createHmac, timingSafeEqual } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";

// ── Dynamic Octokit import ────────────────────────────────────────────────────

type OctokitInstance = import("@octokit/rest").Octokit;

async function loadOctokit(): Promise<OctokitInstance> {
  try {
    const { Octokit } = await import("@octokit/rest");
    return new Octokit({ auth: process.env["GITHUB_TOKEN"] });
  } catch {
    throw new Error(
      "@octokit/rest is not installed. Run: bun add @octokit/rest\n" +
      "Then set GITHUB_TOKEN in your ensemble .env."
    );
  }
}

// ── Webhook signature verification ───────────────────────────────────────────

/**
 * Verify the `X-Hub-Signature-256` header from GitHub.
 * Returns true if the signature matches; false otherwise.
 * Always returns false if no secret is configured.
 */
export function verifyWebhookSignature(
  body: string,
  signatureHeader: string | null,
  secret: string
): boolean {
  if (!signatureHeader || !secret) return false;

  const expected = "sha256=" + createHmac("sha256", secret).update(body).digest("hex");

  try {
    return timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(expected));
  } catch {
    return false;
  }
}

// ── GitHub event types ────────────────────────────────────────────────────────

export type GitHubEventType =
  | "pull_request"
  | "push"
  | "issues"
  | "issue_comment"
  | "pull_request_review"
  | "unknown";

export interface GitHubPullRequestEvent {
  type: "pull_request";
  action: "opened" | "synchronize" | "closed" | "reopened" | string;
  repo: { owner: string; name: string; fullName: string };
  prNumber: number;
  prTitle: string;
  prBody: string;
  headSha: string;
  baseBranch: string;
  headBranch: string;
  author: string;
  isDraft: boolean;
}

export interface GitHubPushEvent {
  type: "push";
  repo: { owner: string; name: string; fullName: string };
  branch: string;
  commits: Array<{ sha: string; message: string; author: string }>;
  pusher: string;
}

export interface GitHubIssueEvent {
  type: "issues";
  action: "opened" | "closed" | string;
  repo: { owner: string; name: string; fullName: string };
  issueNumber: number;
  issueTitle: string;
  issueBody: string;
  author: string;
}

export type ParsedGitHubEvent =
  | GitHubPullRequestEvent
  | GitHubPushEvent
  | GitHubIssueEvent
  | { type: "unknown"; raw: unknown };

/**
 * Parse a raw GitHub webhook payload into a structured event.
 */
export function parseGitHubEvent(
  eventType: string,
  payload: Record<string, unknown>
): ParsedGitHubEvent {
  const repo = payload["repository"] as Record<string, unknown> | undefined;
  const repoInfo = repo
    ? {
        owner: (repo["owner"] as Record<string, string> | undefined)?.["login"] ?? "",
        name: (repo["name"] as string) ?? "",
        fullName: (repo["full_name"] as string) ?? "",
      }
    : { owner: "", name: "", fullName: "" };

  if (eventType === "pull_request") {
    const pr = payload["pull_request"] as Record<string, unknown>;
    return {
      type: "pull_request",
      action: (payload["action"] as string) ?? "",
      repo: repoInfo,
      prNumber: (payload["number"] as number) ?? 0,
      prTitle: (pr?.["title"] as string) ?? "",
      prBody: (pr?.["body"] as string) ?? "",
      headSha: ((pr?.["head"] as Record<string, string>)?.["sha"]) ?? "",
      baseBranch: ((pr?.["base"] as Record<string, string>)?.["ref"]) ?? "",
      headBranch: ((pr?.["head"] as Record<string, string>)?.["ref"]) ?? "",
      author: ((pr?.["user"] as Record<string, string>)?.["login"]) ?? "",
      isDraft: Boolean(pr?.["draft"]),
    };
  }

  if (eventType === "push") {
    const commits = (payload["commits"] as Array<Record<string, unknown>> | undefined) ?? [];
    const ref = (payload["ref"] as string) ?? "";
    return {
      type: "push",
      repo: repoInfo,
      branch: ref.replace("refs/heads/", ""),
      commits: commits.map((c) => ({
        sha: (c["id"] as string) ?? "",
        message: ((c["message"] as string) ?? "").split("\n")[0] ?? "",
        author: ((c["author"] as Record<string, string>)?.["name"]) ?? "",
      })),
      pusher: ((payload["pusher"] as Record<string, string>)?.["name"]) ?? "",
    };
  }

  if (eventType === "issues") {
    const issue = payload["issue"] as Record<string, unknown>;
    return {
      type: "issues",
      action: (payload["action"] as string) ?? "",
      repo: repoInfo,
      issueNumber: (issue?.["number"] as number) ?? 0,
      issueTitle: (issue?.["title"] as string) ?? "",
      issueBody: (issue?.["body"] as string) ?? "",
      author: ((issue?.["user"] as Record<string, string>)?.["login"]) ?? "",
    };
  }

  return { type: "unknown", raw: payload };
}

// ── GitHub API client ─────────────────────────────────────────────────────────

/**
 * Fetch the unified diff for a pull request.
 * Returns the raw diff string (git format).
 */
export async function getPRDiff(
  owner: string,
  repo: string,
  prNumber: number
): Promise<string> {
  const octokit = await loadOctokit();
  const { data } = await octokit.pulls.get({
    owner,
    repo,
    pull_number: prNumber,
    mediaType: { format: "diff" },
  });
  return (data as unknown as string) ?? "";
}

/**
 * Post a review comment on a pull request.
 * `event`: "APPROVE" | "REQUEST_CHANGES" | "COMMENT" (defaults to "COMMENT")
 */
export async function postPRReview(
  owner: string,
  repo: string,
  prNumber: number,
  body: string,
  event: "APPROVE" | "REQUEST_CHANGES" | "COMMENT" = "COMMENT"
): Promise<void> {
  const octokit = await loadOctokit();
  await octokit.pulls.createReview({
    owner,
    repo,
    pull_number: prNumber,
    body,
    event,
  });
}

/**
 * Create or update a GitHub Check Run to surface pass/fail on a PR.
 */
export async function createCheckRun(opts: {
  owner: string;
  repo: string;
  name: string;
  headSha: string;
  status: "completed";
  conclusion: "success" | "failure" | "neutral" | "action_required";
  title: string;
  summary: string;
}): Promise<void> {
  const octokit = await loadOctokit();
  await octokit.checks.create({
    owner: opts.owner,
    repo: opts.repo,
    name: opts.name,
    head_sha: opts.headSha,
    status: opts.status,
    conclusion: opts.conclusion,
    output: {
      title: opts.title,
      summary: opts.summary,
    },
  });
}

/**
 * Split a unified diff by file path.
 * Returns a map of { filePath → diffChunk }.
 */
export function splitDiffByFile(diff: string): Map<string, string> {
  const result = new Map<string, string>();
  const filePattern = /^diff --git a\/.+ b\/(.+)$/m;
  const parts = diff.split(/^(?=diff --git)/m);

  for (const part of parts) {
    if (!part.trim()) continue;
    const match = filePattern.exec(part);
    if (match?.[1]) {
      result.set(match[1], part);
    }
  }

  return result;
}

/**
 * Route diff chunks to the appropriate agent role based on file paths.
 */
export function routeDiffToRoles(
  diffByFile: Map<string, string>
): Map<string, string[]> {
  const routing = new Map<string, string[]>([
    ["frontend", []],
    ["backend", []],
    ["qa", []],
    ["security", []],
    ["devops", []],
  ]);

  for (const [filePath, chunk] of diffByFile) {
    const role = classifyFilePath(filePath);
    routing.get(role)?.push(chunk);
  }

  // Remove roles with no files
  for (const [role, chunks] of routing) {
    if (chunks.length === 0) routing.delete(role);
  }

  return routing;
}

// ── Inbox helper ─────────────────────────────────────────────────────────────

/**
 * Directly append a message to the Lead agent's inbox.
 * Used by the webhook handler where we don't have a normal bus actor context.
 */
export function postToLeadInbox(
  stateRoot: string,
  message: Record<string, unknown>
): void {
  const inboxPath = join(stateRoot, "lead", "inbox.json");
  try {
    mkdirSync(dirname(inboxPath), { recursive: true });
    const inbox: unknown[] = existsSync(inboxPath)
      ? JSON.parse(readFileSync(inboxPath, "utf8"))
      : [];
    inbox.push({
      id: `gh-${Date.now()}`,
      timestamp: new Date().toISOString(),
      from: "github-webhook",
      ...message,
    });
    writeFileSync(inboxPath, JSON.stringify(inbox, null, 2));
  } catch (err) {
    console.error("[github] Failed to write to lead inbox:", err);
  }
}

/**
 * Build a short human-readable task title from a parsed GitHub event.
 */
export function buildGitHubTaskTitle(event: ParsedGitHubEvent): string {
  if (event.type === "pull_request") {
    return `[GitHub] PR #${event.prNumber} ${event.action}: ${event.prTitle.slice(0, 60)}`;
  }
  if (event.type === "push") {
    const count = event.commits.length;
    return `[GitHub] Push to ${event.branch} (${count} commit${count !== 1 ? "s" : ""})`;
  }
  if (event.type === "issues") {
    return `[GitHub] Issue #${event.issueNumber} ${event.action}: ${event.issueTitle.slice(0, 60)}`;
  }
  return "[GitHub] Unknown event";
}

function classifyFilePath(filePath: string): string {
  const lower = filePath.toLowerCase();

  // Security: auth, crypto, secrets, permissions
  if (/auth|crypto|secret|password|token|permission|policy|security/i.test(lower)) return "security";

  // DevOps: CI, Docker, deploy configs
  if (/\.github\/|dockerfile|docker-compose|\.yml$|\.yaml$|k8s\/|deploy\/|infra\//i.test(lower)) return "devops";

  // QA: test files
  if (/test|spec|\/__tests__|\/tests?\//i.test(lower)) return "qa";

  // Frontend: UI, styles, components
  if (/src\/(components|pages|views|ui|styles|assets)|\.css$|\.scss$|\.svelte$|\.vue$/i.test(lower)) return "frontend";

  // Backend: server, API, DB
  if (/server\/|api\/|db\/|migrations\/|models\/|routes\/|controllers\//i.test(lower)) return "backend";

  // Default to frontend for unclassified source files
  return "frontend";
}

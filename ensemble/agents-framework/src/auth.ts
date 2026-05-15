import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import type { Context, MiddlewareFn } from "grammy";
import type { AgentConfig, AuthorizedUser, AccessLogEntry } from "./types.js";

// ── Storage helpers ───────────────────────────────────────────────────────────

function readJson<T>(filePath: string, fallback: T): T {
  if (!existsSync(filePath)) return fallback;
  try {
    return JSON.parse(readFileSync(filePath, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function writeJson(filePath: string, data: unknown): void {
  const dir = join(filePath, "..");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
}

// ── AuthManager ───────────────────────────────────────────────────────────────

export class AuthManager {
  private readonly ownerId: number;
  private readonly stateDir: string;
  private readonly usersFile: string;
  private readonly accessLogFile: string;
  private readonly rateMap = new Map<number, { count: number; windowStart: number }>();

  // Rate limiting: max 20 messages per 60 seconds per user
  private readonly RATE_LIMIT = 20;
  private readonly RATE_WINDOW_MS = 60_000;

  constructor(config: AgentConfig) {
    this.ownerId = config.ownerId;
    this.stateDir = config.stateDir;
    this.usersFile = join(config.stateDir, "authorized-users.json");
    this.accessLogFile = join(config.stateDir, "access-log.json");
  }

  // ── Authorization checks ────────────────────────────────────────────────────

  isAuthorized(telegramId: number): boolean {
    if (telegramId === this.ownerId) return true;
    const users = this.getAuthorizedUsers();
    return users.some((u) => u.telegramId === telegramId);
  }

  isOwner(telegramId: number): boolean {
    return telegramId === this.ownerId;
  }

  // ── User management ─────────────────────────────────────────────────────────

  getAuthorizedUsers(): AuthorizedUser[] {
    return readJson<AuthorizedUser[]>(this.usersFile, []);
  }

  allowUser(
    telegramId: number,
    username: string | undefined,
    addedBy: number
  ): boolean {
    const users = this.getAuthorizedUsers();
    if (users.some((u) => u.telegramId === telegramId)) return false; // already exists
    users.push({
      telegramId,
      ...(username !== undefined ? { username } : {}),
      addedAt: new Date().toISOString(),
      addedBy,
    });
    writeJson(this.usersFile, users);
    return true;
  }

  revokeUser(telegramId: number): boolean {
    const users = this.getAuthorizedUsers();
    const filtered = users.filter((u) => u.telegramId !== telegramId);
    if (filtered.length === users.length) return false; // not found
    writeJson(this.usersFile, filtered);
    return true;
  }

  // ── Rate limiting ───────────────────────────────────────────────────────────

  checkRateLimit(telegramId: number): boolean {
    const now = Date.now();
    const entry = this.rateMap.get(telegramId);

    if (!entry || now - entry.windowStart > this.RATE_WINDOW_MS) {
      this.rateMap.set(telegramId, { count: 1, windowStart: now });
      return true;
    }

    if (entry.count >= this.RATE_LIMIT) return false;

    entry.count++;
    return true;
  }

  // ── Access logging (no message content — metadata only) ────────────────────

  logDenied(telegramId: number, username: string | undefined): void {
    const log = readJson<AccessLogEntry[]>(this.accessLogFile, []);
    log.push({
      telegramId,
      ...(username !== undefined ? { username } : {}),
      timestamp: new Date().toISOString(),
      action: "denied",
    });
    // Keep last 1000 entries
    if (log.length > 1000) log.splice(0, log.length - 1000);
    writeJson(this.accessLogFile, log);
  }

  getAccessLog(): AccessLogEntry[] {
    return readJson<AccessLogEntry[]>(this.accessLogFile, []);
  }

  getRecentDenials(hours = 24): AccessLogEntry[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    return this.getAccessLog().filter(
      (e) => e.action === "denied" && e.timestamp > cutoff
    );
  }
}

// ── grammy middleware factory ─────────────────────────────────────────────────

/**
 * Returns a grammy middleware that must be the FIRST handler registered.
 * Unauthorized messages are silently dropped (no response) to avoid
 * confirming the bot's existence to probing actors.
 */
export function createAuthMiddleware(auth: AuthManager): MiddlewareFn<Context> {
  return async (ctx, next) => {
    const userId = ctx.from?.id;

    // No sender (system messages, channel posts without author) → drop
    if (!userId) return;

    // Group chat protection — leave immediately
    if (ctx.chat?.type === "group" || ctx.chat?.type === "supergroup") {
      try {
        await ctx.leaveChat();
        await ctx.api.sendMessage(
          auth["ownerId"],
          `⚠️ Bot was added to a group chat by @${ctx.from?.username ?? "unknown"} (${userId}). Left immediately.`
        );
      } catch {
        // best-effort
      }
      return;
    }

    // Authorization check
    if (!auth.isAuthorized(userId)) {
      auth.logDenied(userId, ctx.from?.username);
      return; // silent drop — no response, no acknowledgment
    }

    // Rate limiting (authorized users only — owner is exempt)
    if (!auth.isOwner(userId) && !auth.checkRateLimit(userId)) {
      // Rate limit exceeded — silent drop to avoid timing attacks
      return;
    }

    await next();
  };
}

// ── Owner-only command guard ──────────────────────────────────────────────────

/**
 * Wrap a command handler to only execute for the owner.
 * Non-owners get a silent drop (not an error message).
 */
export function ownerOnly(
  auth: AuthManager,
  handler: (ctx: Context) => Promise<void>
): (ctx: Context) => Promise<void> {
  return async (ctx) => {
    if (!ctx.from || !auth.isOwner(ctx.from.id)) return;
    await handler(ctx);
  };
}

// ── Built-in user management command handlers ─────────────────────────────────

/**
 * Register /allow, /revoke, and /listusers command handlers on a grammy Bot.
 * All three are owner-only.
 *
 * Usage:
 *   /allow 123456789               — allow a user by Telegram ID
 *   /allow @username 123456789     — allow with username label (ID required)
 *   /revoke 123456789              — revoke access
 *   /listusers                     — list all authorized users
 */
export function registerUserManagementCommands(
  bot: { command: (cmd: string, handler: (ctx: Context) => Promise<void>) => void },
  auth: AuthManager
): void {
  bot.command(
    "allow",
    ownerOnly(auth, async (ctx) => {
      const text = ctx.message?.text ?? "";
      const parts = text.trim().split(/\s+/).slice(1); // skip "/allow"

      // Extract numeric ID — last token that is all digits
      const idToken = parts.reverse().find((p) => /^\d+$/.test(p));
      if (!idToken) {
        await ctx.reply("Usage: /allow <telegram_id> [username]");
        return;
      }

      const telegramId = parseInt(idToken, 10);
      const username = parts.find((p) => p.startsWith("@"))?.replace("@", "");

      const added = auth.allowUser(telegramId, username, ctx.from!.id);
      await ctx.reply(
        added
          ? `✅ User ${telegramId}${username ? ` (@${username})` : ""} added.`
          : `ℹ️ User ${telegramId} is already authorized.`
      );
    })
  );

  bot.command(
    "revoke",
    ownerOnly(auth, async (ctx) => {
      const text = ctx.message?.text ?? "";
      const idToken = text.trim().split(/\s+/)[1];

      if (!idToken || !/^\d+$/.test(idToken)) {
        await ctx.reply("Usage: /revoke <telegram_id>");
        return;
      }

      const telegramId = parseInt(idToken, 10);
      if (telegramId === auth["ownerId"]) {
        await ctx.reply("❌ Cannot revoke the owner.");
        return;
      }

      const removed = auth.revokeUser(telegramId);
      await ctx.reply(
        removed
          ? `✅ User ${telegramId} revoked.`
          : `ℹ️ User ${telegramId} was not in the authorized list.`
      );
    })
  );

  bot.command(
    "listusers",
    ownerOnly(auth, async (ctx) => {
      const users = auth.getAuthorizedUsers();
      const recentDenials = auth.getRecentDenials(24);

      if (users.length === 0) {
        await ctx.reply(
          `👥 No additional authorized users.\n` +
            `🔒 Owner only: ${auth["ownerId"]}\n` +
            (recentDenials.length > 0
              ? `⚠️ ${recentDenials.length} unauthorized attempt(s) in the last 24h.`
              : `✅ No unauthorized attempts in the last 24h.`)
        );
        return;
      }

      const userLines = users.map(
        (u) =>
          `• ${u.telegramId}${u.username ? ` (@${u.username})` : ""} — added ${new Date(u.addedAt).toLocaleDateString()}`
      );

      await ctx.reply(
        `👥 Authorized users (${users.length}):\n${userLines.join("\n")}\n\n` +
          (recentDenials.length > 0
            ? `⚠️ ${recentDenials.length} unauthorized attempt(s) in the last 24h.`
            : `✅ No unauthorized attempts in the last 24h.`)
      );
    })
  );
}

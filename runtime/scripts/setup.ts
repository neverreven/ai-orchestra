#!/usr/bin/env bun
/**
 * AI Orchestra Runtime — Interactive Setup
 *
 * Guides the user through:
 *   1. Anthropic API key entry + validation
 *   2. Owner Telegram ID capture
 *   3. Per-agent bot token setup (with optional skip)
 *   4. CWD configuration for the target project
 *   5. Telegram bot team setup (optional, can be deferred)
 *
 * Writes .env files for the root workspace and each project.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { createInterface } from "readline";
import Anthropic from "@anthropic-ai/sdk";

// ── Helpers ───────────────────────────────────────────────────────────────────

const RUNTIME_ROOT = new URL("..", import.meta.url).pathname;

function rl(): ReturnType<typeof createInterface> {
  return createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

async function ask(prompt: string, fallback = ""): Promise<string> {
  const iface = rl();
  return new Promise((resolve) => {
    const display = fallback ? `${prompt} [${fallback}]: ` : `${prompt}: `;
    iface.question(display, (answer) => {
      iface.close();
      resolve(answer.trim() || fallback);
    });
  });
}

async function askSecret(prompt: string): Promise<string> {
  // On most terminals, readline doesn't hide input — warn the user
  const iface = rl();
  return new Promise((resolve) => {
    process.stdout.write(`${prompt} (input visible): `);
    iface.question("", (answer) => {
      iface.close();
      console.log(); // newline after input
      resolve(answer.trim());
    });
  });
}

async function confirm(prompt: string, defaultYes = true): Promise<boolean> {
  const hint = defaultYes ? "[Y/n]" : "[y/N]";
  const answer = await ask(`${prompt} ${hint}`, defaultYes ? "Y" : "N");
  return answer.toLowerCase().startsWith("y");
}

function readEnvFile(filePath: string): Record<string, string> {
  if (!existsSync(filePath)) return {};
  const lines = readFileSync(filePath, "utf8").split("\n");
  const result: Record<string, string> = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    result[key] = value;
  }
  return result;
}

function writeEnvFile(filePath: string, values: Record<string, string>): void {
  const dir = join(filePath, "..");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const lines = Object.entries(values)
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  writeFileSync(filePath, lines + "\n", "utf8");
}

function mergeEnvFile(
  filePath: string,
  updates: Record<string, string>
): void {
  const existing = readEnvFile(filePath);
  writeEnvFile(filePath, { ...existing, ...updates });
}

// ── Step 1: Anthropic API key ─────────────────────────────────────────────────

async function setupAnthropicKey(): Promise<string> {
  console.log("\n── Step 1: Anthropic API Key ─────────────────────────────");
  console.log("Get your key at: https://console.anthropic.com/settings/keys\n");

  const existing = readEnvFile(join(RUNTIME_ROOT, ".env"))["ANTHROPIC_API_KEY"];
  if (existing) {
    const keep = await confirm(`Existing ANTHROPIC_API_KEY found. Keep it?`);
    if (keep) return existing;
  }

  let apiKey = "";
  while (true) {
    apiKey = await askSecret("Enter your Anthropic API key (sk-ant-...)");
    if (!apiKey.startsWith("sk-ant-")) {
      console.log("⚠️  Key should start with sk-ant-. Please try again.");
      continue;
    }

    console.log("🔍 Validating key...");
    try {
      const client = new Anthropic({ apiKey });
      // Use a minimal, cheap call to validate the key
      await client.messages.create({
        model: "claude-haiku-3-5",
        max_tokens: 10,
        messages: [{ role: "user", content: "hi" }],
      });
      console.log("✅ API key is valid.\n");
      break;
    } catch (err) {
      console.error(
        `❌ Key validation failed: ${err instanceof Error ? err.message : String(err)}`
      );
      const retry = await confirm("Try a different key?");
      if (!retry) {
        console.log("⚠️  Skipping key validation. You can update it later in runtime/.env");
        break;
      }
    }
  }

  return apiKey;
}

// ── Step 2: Owner Telegram ID ─────────────────────────────────────────────────

async function setupOwnerTelegramId(): Promise<string> {
  console.log("\n── Step 2: Owner Telegram ID ────────────────────────────");
  console.log(
    "Your Telegram user ID lets the bots recognise you as the owner.\n" +
      "To find it: message @userinfobot on Telegram.\n"
  );

  const existing = readEnvFile(join(RUNTIME_ROOT, ".env"))["OWNER_TELEGRAM_ID"];
  if (existing) {
    const keep = await confirm(`Existing OWNER_TELEGRAM_ID (${existing}) found. Keep it?`);
    if (keep) return existing;
  }

  let id = "";
  while (true) {
    id = await ask("Enter your Telegram user ID (numbers only)");
    if (!/^\d+$/.test(id)) {
      console.log("⚠️  Must be a numeric ID. Please try again.");
      continue;
    }
    break;
  }
  return id;
}

// ── Step 3: Target project CWD ────────────────────────────────────────────────

async function setupCwd(): Promise<string> {
  console.log("\n── Step 3: Target Project Directory ─────────────────────");
  console.log(
    "Agents will work in this directory. It should be the root of your\n" +
      "software project (where package.json / pyproject.toml lives).\n"
  );

  while (true) {
    const cwd = await ask("Enter the full path to your project root");
    if (!existsSync(cwd)) {
      const create = await confirm(`Directory '${cwd}' doesn't exist. Create it?`);
      if (create) {
        mkdirSync(cwd, { recursive: true });
        console.log(`📁 Created ${cwd}`);
        return cwd;
      }
      console.log("Please enter a valid path.");
      continue;
    }
    return cwd;
  }
}

// ── Step 4: Telegram bot team setup ──────────────────────────────────────────

const ROLE_AGENTS = ["lead", "frontend", "backend", "qa", "devops", "security"] as const;
type RoleAgent = (typeof ROLE_AGENTS)[number];

interface BotConfig {
  role: RoleAgent;
  token: string;
}

async function setupTelegramBots(cwd: string): Promise<BotConfig[]> {
  console.log("\n── Step 4: Telegram Bot Team ─────────────────────────────");
  console.log(
    "Each agent needs its own Telegram bot token from @BotFather.\n" +
      "You can skip this now and run `bun run setup:bots` later.\n"
  );

  const skip = await confirm("Skip Telegram bot setup for now?", false);
  if (skip) {
    console.log("⏩ Skipped. Run `bun run setup:bots` when ready.");
    return [];
  }

  console.log(
    "\n📋 Telegram bot creation checklist:\n" +
      "  1. Open Telegram, search for @BotFather\n" +
      "  2. Send /newbot\n" +
      "  3. Follow the prompts to get a token for each agent\n" +
      "  4. Note: you only need the agents you plan to use.\n" +
      "     At minimum, create the Lead bot. Others can be added later.\n"
  );

  const configs: BotConfig[] = [];

  for (const role of ROLE_AGENTS) {
    const isLead = role === "lead";
    const prompt = isLead
      ? `Enter token for the Lead Orchestrator bot (required)`
      : `Enter token for the ${role} agent bot (or press Enter to skip)`;

    const token = await askSecret(prompt);
    if (!token) {
      if (isLead) {
        console.log(
          "⚠️  Lead bot is required for orchestration. Skipping all bots."
        );
        return [];
      }
      console.log(`  ↩  Skipped ${role}`);
      continue;
    }

    if (!token.match(/^\d+:[A-Za-z0-9_-]{35,}$/)) {
      console.log(
        `  ⚠️  Token format looks wrong for ${role}. Setting anyway — you can correct it in projects/${role}/.env`
      );
    }

    configs.push({ role, token });

    // Write to the project's .env file immediately
    mergeEnvFile(join(RUNTIME_ROOT, "projects", role, ".env"), {
      TELEGRAM_BOT_TOKEN: token,
      CWD: cwd,
    });
    console.log(`  ✅ ${role} bot configured`);
  }

  return configs;
}

// ── Step 5: Write root .env ───────────────────────────────────────────────────

function writeRootEnv(
  anthropicKey: string,
  ownerTelegramId: string
): void {
  const rootEnvPath = join(RUNTIME_ROOT, ".env");
  mergeEnvFile(rootEnvPath, {
    ANTHROPIC_API_KEY: anthropicKey,
    OWNER_TELEGRAM_ID: ownerTelegramId,
  });
  console.log(`\n📝 Root .env written to ${rootEnvPath}`);
}

// ── Summary ───────────────────────────────────────────────────────────────────

function printSummary(bots: BotConfig[], cwd: string): void {
  console.log("\n══════════════════════════════════════════════════════════");
  console.log("  🎼 AI Orchestra Runtime — Setup Complete");
  console.log("══════════════════════════════════════════════════════════\n");

  console.log(`  Target project:  ${cwd}`);
  console.log(`  Bots configured: ${bots.length === 0 ? "none (run setup:bots later)" : bots.map((b) => b.role).join(", ")}\n`);

  if (bots.length > 0) {
    console.log("  ▶ Start the Lead Orchestrator:");
    console.log("      bun run dev lead\n");
    console.log("  ▶ Or start all agents:");
    console.log("      bun run dev all\n");
  } else {
    console.log("  ▶ When ready to configure Telegram bots:");
    console.log("      bun run setup:bots\n");
    console.log("  ▶ Test without Telegram (CLI mode):");
    console.log("      bun run dev lead\n");
  }

  console.log("  📖 See runtime/README.md for full documentation.\n");
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("\n══════════════════════════════════════════════════════════");
  console.log("  🎼 AI Orchestra Runtime — Interactive Setup");
  console.log("══════════════════════════════════════════════════════════\n");
  console.log(
    "This wizard will configure your AI Orchestra agent team.\n" +
      "You can re-run it at any time to update your configuration.\n"
  );

  const anthropicKey = await setupAnthropicKey();
  const ownerTelegramId = await setupOwnerTelegramId();
  const cwd = await setupCwd();

  writeRootEnv(anthropicKey, ownerTelegramId);

  // Write CWD to each project .env that doesn't already have one
  for (const role of ROLE_AGENTS) {
    const projectEnvPath = join(RUNTIME_ROOT, "projects", role, ".env");
    const existing = readEnvFile(projectEnvPath);
    if (!existing["CWD"]) {
      mergeEnvFile(projectEnvPath, { CWD: cwd });
    }
  }

  const bots = await setupTelegramBots(cwd);

  printSummary(bots, cwd);
}

main().catch((err) => {
  console.error("\n❌ Setup failed:", err);
  process.exit(1);
});

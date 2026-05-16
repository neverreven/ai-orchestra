/**
 * AI Orchestra — Shared Agent Runner
 *
 * Contains the Anthropic streaming call and the channel-agnostic agent
 * flow logic. Used by both TelegramAdapter and SlackAdapter so that the
 * streaming + bus + system-prompt logic is written exactly once.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { AgentConfig } from "./types.js";
import { buildSystemPrompt } from "./agent.js";
import type { BusHandle } from "./bus.js";
import type { StreamSession } from "./channel.js";

// ── Constants ─────────────────────────────────────────────────────────────────

/** Edit the streaming message every N text tokens or every STREAM_INTERVAL_MS. */
export const STREAM_CHUNK_SIZE = 25;
export const STREAM_INTERVAL_MS = 1200;

// ── Model resolution ──────────────────────────────────────────────────────────

const MODEL_MAP: Record<string, string> = {
  opus: "claude-opus-4-5",
  sonnet: "claude-sonnet-4-5",
  haiku: "claude-haiku-3-5",
};

export function resolveModel(
  routing: AgentConfig["modelRouting"],
  tier: keyof AgentConfig["modelRouting"] = "execution"
): string {
  return MODEL_MAP[routing[tier]] ?? "claude-sonnet-4-5";
}

// ── Core streaming call ───────────────────────────────────────────────────────

/**
 * Stream a single-turn Anthropic response.
 * Calls `onChunk` periodically (throttled by STREAM_CHUNK_SIZE / STREAM_INTERVAL_MS).
 * Returns the full accumulated response text.
 */
export async function runAgentStream(
  client: Anthropic,
  systemPrompt: string,
  userMessage: string,
  model: string,
  abort: AbortController,
  onChunk: (partial: string) => void
): Promise<string> {
  let accumulated = "";
  let chunkCount = 0;
  let lastEditAt = Date.now();

  const stream = await client.messages.stream(
    {
      model,
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    },
    { signal: abort.signal }
  );

  for await (const event of stream) {
    if (abort.signal.aborted) break;

    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      accumulated += event.delta.text;
      chunkCount++;

      const now = Date.now();
      if (
        chunkCount % STREAM_CHUNK_SIZE === 0 ||
        now - lastEditAt >= STREAM_INTERVAL_MS
      ) {
        onChunk(accumulated);
        lastEditAt = now;
      }
    }
  }

  return accumulated;
}

// ── Channel-agnostic agent flow ───────────────────────────────────────────────

/**
 * Run the full agent response flow:
 *   1. Build the system prompt (with current task state from bus)
 *   2. Stream the Anthropic response, pushing chunks via session.onChunk
 *   3. Call session.onDone with the final text
 *   4. Drain the bus inbox for any messages that arrived during processing
 *
 * This function is channel-agnostic — it works with any ChannelAdapter's
 * StreamSession. The adapter handles all UI updates via the session callbacks.
 */
export async function runChannelAgentFlow(
  config: AgentConfig,
  userMessage: string,
  anthropic: Anthropic,
  bus: BusHandle,
  session: StreamSession
): Promise<void> {
  const currentTasksMd = bus.renderCurrentTasksMd();
  const systemPrompt = buildSystemPrompt(config, currentTasksMd);
  const model = resolveModel(config.modelRouting);

  let finalText = "";
  let stopped = false;

  let lastChunked = "";
  try {
    finalText = await runAgentStream(
      anthropic,
      systemPrompt.append,
      userMessage,
      model,
      session.abort,
      (partial) => {
        if (partial === lastChunked) return;
        lastChunked = partial;
        session.onChunk(partial).catch(() => {});
      }
    );
  } catch (err) {
    if (session.abort.signal.aborted) {
      stopped = true;
    } else {
      finalText = `⚠️ Error: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  await session.onDone(finalText, stopped);

  // Drain bus inbox — messages from role agents that arrived during this turn
  const pending = bus.drainInbox();
  for (const msg of pending) {
    console.info(`[bus] inbox: ${msg.type} from ${msg.from} (task: ${msg.taskId})`);
  }
}

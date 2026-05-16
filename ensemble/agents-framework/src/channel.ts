/**
 * AI Orchestra — Channel Adapter Interface
 *
 * Abstracts communication channels (Telegram, Slack, web) behind a common
 * interface so the agent streaming logic can be shared across all channels.
 *
 * A ChannelAdapter handles I/O only — it does not know about Anthropic,
 * the bus, or system prompts. The agent logic lives outside the adapter.
 */

// ── Message types ─────────────────────────────────────────────────────────────

export type ChannelSource = "telegram" | "slack" | "web";

export interface ChannelMessage {
  userId: string;
  text: string;
  channelId: string;
  source: ChannelSource;
}

// ── Streaming session ─────────────────────────────────────────────────────────

/**
 * Returned by `beginStream`. Provides callbacks for the caller to push
 * chunks and signal completion. The adapter handles platform-specific
 * message editing behind these callbacks.
 */
export interface StreamSession {
  /** Called by the runner on each text chunk. Adapter edits in-place. */
  onChunk(partial: string): Promise<void>;
  /** Called when streaming is fully done (success or stopped). */
  onDone(finalText: string, stopped: boolean): Promise<void>;
  /** AbortController to cancel the in-flight Anthropic stream. */
  abort: AbortController;
  /** The channel ID this session belongs to. */
  channelId: string;
}

// ── Adapter interface ─────────────────────────────────────────────────────────

/**
 * Every communication channel implements this interface.
 *
 * Lifecycle: create adapter → register onMessage handler → call start().
 * Stop gracefully with stop().
 */
export interface ChannelAdapter {
  /** Human-readable name for logging (e.g. "telegram", "slack"). */
  readonly name: string;

  /** Start the adapter (connect, begin polling or socket). */
  start(): Promise<void>;

  /** Stop the adapter gracefully (disconnect, clean up). */
  stop(): Promise<void>;

  /**
   * Register the inbound message handler. Called once before `start()`.
   * The handler receives normalized ChannelMessage objects.
   */
  onMessage(handler: (msg: ChannelMessage) => Promise<void>): void;

  /**
   * Begin a streaming response for the given channel.
   * Sends any platform-specific "Generating…" UI and returns a StreamSession.
   * Only one stream per channel at a time — check hasActiveStream first.
   */
  beginStream(channelId: string): Promise<StreamSession>;

  /** Whether a stream is already in progress for this channel. */
  hasActiveStream(channelId: string): boolean;

  /** Cancel an active stream (equivalent to pressing Stop). */
  cancelStream(channelId: string): void;

  /**
   * Send a plain text message to the given channel
   * (outside any streaming context — e.g. error notices, status updates).
   */
  sendText(channelId: string, text: string): Promise<void>;

  /** Whether the given userId is the owner (full permissions). */
  isOwner(userId: string): boolean;
}

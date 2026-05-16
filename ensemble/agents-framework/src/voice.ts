/**
 * AI Orchestra — Voice Message Transcription
 *
 * Transcribes voice/audio messages using the OpenAI Whisper API.
 * Used by the Telegram adapter to handle `message:voice` updates.
 *
 * Requires: OPENAI_API_KEY in the ensemble .env
 * Dependency: openai (bun add openai)
 *
 * Supported input formats: ogg/opus (Telegram default), mp3, mp4, wav, m4a, webm
 */

// ── Dynamic OpenAI import ─────────────────────────────────────────────────────

async function loadOpenAI(): Promise<typeof import("openai").default> {
  try {
    const { default: OpenAI } = await import("openai");
    return OpenAI;
  } catch {
    throw new Error(
      "The openai package is not installed. Run: bun add openai\n" +
      "Alternatively, set OPENAI_API_KEY and restart the ensemble."
    );
  }
}

// ── Transcription ─────────────────────────────────────────────────────────────

export interface TranscribeOptions {
  /** Raw audio bytes. */
  buffer: Buffer;
  /**
   * MIME type of the audio. Whisper accepts:
   * audio/ogg, audio/mpeg, audio/mp4, audio/wav, audio/webm, audio/m4a
   * Defaults to audio/ogg (Telegram voice format).
   */
  mimeType?: string;
  /** Language hint (ISO-639-1). Omit for auto-detection. */
  language?: string;
}

export interface TranscribeResult {
  text: string;
  durationMs?: number;
}

/**
 * Transcribe an audio buffer using the OpenAI Whisper API.
 * Returns the transcript text or throws if the API call fails.
 */
export async function transcribeVoice(
  opts: TranscribeOptions,
  apiKey: string
): Promise<TranscribeResult> {
  const { buffer, mimeType = "audio/ogg", language } = opts;

  const OpenAI = await loadOpenAI();
  const client = new OpenAI({ apiKey });

  const startMs = Date.now();

  // Whisper API expects a File object. We create a Blob with the correct MIME type.
  const extension = mimeTypeToExtension(mimeType);
  const file = new File([buffer], `voice.${extension}`, { type: mimeType });

  const result = await client.audio.transcriptions.create({
    model: "whisper-1",
    file,
    ...(language ? { language } : {}),
    response_format: "text",
  });

  return {
    text: (result as unknown as string).trim(),
    durationMs: Date.now() - startMs,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function mimeTypeToExtension(mimeType: string): string {
  const map: Record<string, string> = {
    "audio/ogg": "ogg",
    "audio/mpeg": "mp3",
    "audio/mp4": "mp4",
    "audio/wav": "wav",
    "audio/webm": "webm",
    "audio/m4a": "m4a",
    "audio/x-m4a": "m4a",
  };
  return map[mimeType] ?? "ogg";
}

/**
 * Download a Telegram file and return its bytes.
 * Requires the Telegram Bot API token to construct the download URL.
 */
export async function downloadTelegramFile(
  fileId: string,
  botToken: string,
  telegramApiBaseUrl = "https://api.telegram.org"
): Promise<Buffer> {
  // Step 1: Get the file path from Telegram
  const metaRes = await fetch(
    `${telegramApiBaseUrl}/bot${botToken}/getFile?file_id=${encodeURIComponent(fileId)}`
  );
  if (!metaRes.ok) {
    throw new Error(`getFile failed: ${metaRes.status} ${metaRes.statusText}`);
  }
  const meta = await metaRes.json() as { ok: boolean; result?: { file_path?: string } };
  if (!meta.ok || !meta.result?.file_path) {
    throw new Error("getFile returned no file_path");
  }

  // Step 2: Download the file bytes
  const fileRes = await fetch(
    `${telegramApiBaseUrl}/file/bot${botToken}/${meta.result.file_path}`
  );
  if (!fileRes.ok) {
    throw new Error(`File download failed: ${fileRes.status} ${fileRes.statusText}`);
  }
  const arrayBuffer = await fileRes.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

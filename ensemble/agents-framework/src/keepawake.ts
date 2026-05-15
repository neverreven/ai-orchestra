import { spawn, type ChildProcess } from "child_process";

// ── Platform detection ────────────────────────────────────────────────────────

type Platform = "macos" | "linux" | "windows" | "unsupported";

function detectPlatform(): Platform {
  switch (process.platform) {
    case "darwin": return "macos";
    case "linux": return "linux";
    case "win32": return "windows";
    default: return "unsupported";
  }
}

// ── Keep-awake process ────────────────────────────────────────────────────────

let keepAwakeProcess: ChildProcess | null = null;

/**
 * Prevent the OS from sleeping while the bot is running. Spawned as a child
 * process tied to the current process lifetime. Killed automatically when
 * `stopKeepAwake()` is called or the process exits.
 *
 * @param botPid  The PID of the bot process (usually `process.pid`).
 */
export function startKeepAwake(botPid: number): void {
  if (keepAwakeProcess !== null) return; // already running

  const platform = detectPlatform();

  switch (platform) {
    case "macos":
      // caffeinate -i prevents idle sleep; -w ties it to the bot process lifetime
      keepAwakeProcess = spawn("caffeinate", ["-i", "-w", String(botPid)], {
        detached: false,
        stdio: "ignore",
      });
      console.info(`[keepawake] macOS caffeinate started (watching PID ${botPid})`);
      break;

    case "linux":
      // systemd-inhibit blocks sleep for the duration of the child process
      keepAwakeProcess = spawn(
        "systemd-inhibit",
        [
          "--what=sleep",
          "--who=ai-orchestra",
          "--why=Agent bots running",
          "--mode=block",
          "sleep",
          "infinity",
        ],
        { detached: false, stdio: "ignore" }
      );
      console.info("[keepawake] Linux systemd-inhibit started");
      break;

    case "windows":
      // PowerShell ES_CONTINUOUS | ES_SYSTEM_REQUIRED keeps the system awake
      const psScript = `
        Add-Type -TypeDefinition @"
          using System;
          using System.Runtime.InteropServices;
          public class SleepPreventer {
            [DllImport("kernel32.dll")]
            public static extern uint SetThreadExecutionState(uint esFlags);
            public const uint ES_CONTINUOUS = 0x80000000;
            public const uint ES_SYSTEM_REQUIRED = 0x00000001;
          }
"@
        [SleepPreventer]::SetThreadExecutionState([SleepPreventer]::ES_CONTINUOUS -bor [SleepPreventer]::ES_SYSTEM_REQUIRED)
        while ($true) { Start-Sleep -Seconds 30 }
      `;
      keepAwakeProcess = spawn("powershell", ["-NoProfile", "-Command", psScript], {
        detached: false,
        stdio: "ignore",
      });
      console.info("[keepawake] Windows PowerShell sleep prevention started");
      break;

    case "unsupported":
      console.warn(
        "[keepawake] Platform not supported for automatic sleep prevention.\n" +
          "  Recommendation: run the bots on a machine that never sleeps,\n" +
          "  such as a VPS, Raspberry Pi, or cloud VM.\n" +
          "  See runtime/README.md for production hosting guidance."
      );
      break;
  }

  if (keepAwakeProcess !== null) {
    keepAwakeProcess.on("error", (err) => {
      // Non-fatal: keep-awake failure should not crash the bot
      console.warn(`[keepawake] Process error (non-fatal): ${err.message}`);
      keepAwakeProcess = null;
    });

    keepAwakeProcess.on("exit", (code) => {
      if (code !== 0 && code !== null) {
        console.warn(`[keepawake] Process exited with code ${code}`);
      }
      keepAwakeProcess = null;
    });
  }
}

/**
 * Stop the keep-awake process. Called during graceful shutdown.
 */
export function stopKeepAwake(): void {
  if (keepAwakeProcess === null) return;
  try {
    keepAwakeProcess.kill("SIGTERM");
  } catch { /* best-effort */ }
  keepAwakeProcess = null;
  console.info("[keepawake] Stopped");
}

export function isKeepAwakeRunning(): boolean {
  return keepAwakeProcess !== null;
}

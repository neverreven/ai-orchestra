#!/usr/bin/env bun
/**
 * AI Orchestra — Service Installer
 *
 * Generates and optionally installs a system service file that runs
 * the ensemble daemon on system startup.
 *
 * Platform support:
 *   macOS    → launchd plist (~/.config/launchd/ or /Library/LaunchAgents/)
 *   Linux    → systemd user unit (~/.config/systemd/user/)
 *   Windows  → Task Scheduler XML (with instructions to import it)
 *
 * Usage:
 *   bun run install-service          # interactive
 *   bun run install-service --auto   # auto-install without confirmation
 *   bun run install-service --print  # just print the service file
 *
 * After installation:
 *   macOS:    launchctl load ~/Library/LaunchAgents/ai.orchestra.ensemble.plist
 *   Linux:    systemctl --user enable --now ai-orchestra-ensemble.service
 *   Windows:  schtasks /Create /XML ai-orchestra-ensemble.xml /TN "AI Orchestra Ensemble"
 */

import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { execSync } from "child_process";

// ── Config ────────────────────────────────────────────────────────────────────

const ENSEMBLE_DIR = join(import.meta.dirname ?? __dirname, "..");
const BUN_PATH = Bun.which("bun") ?? "/usr/local/bin/bun";
const HOME = homedir();
const ORCHESTRA_HOME = join(HOME, ".ai-orchestra");
const LOG_FILE = join(ORCHESTRA_HOME, "daemon.log");

const ARGS = process.argv.slice(2);
const AUTO_INSTALL = ARGS.includes("--auto");
const PRINT_ONLY = ARGS.includes("--print");

// ── Platform detection ────────────────────────────────────────────────────────

type Platform = "macos" | "linux" | "windows" | "unknown";

function detectPlatform(): Platform {
  switch (process.platform) {
    case "darwin": return "macos";
    case "linux":  return "linux";
    case "win32":  return "windows";
    default:       return "unknown";
  }
}

// ── macOS: launchd plist ──────────────────────────────────────────────────────

function generateLaunchdPlist(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>ai.orchestra.ensemble</string>

    <key>ProgramArguments</key>
    <array>
        <string>${BUN_PATH}</string>
        <string>run</string>
        <string>daemon</string>
    </array>

    <key>WorkingDirectory</key>
    <string>${ENSEMBLE_DIR}</string>

    <key>EnvironmentVariables</key>
    <dict>
        <key>HOME</key>
        <string>${HOME}</string>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin</string>
    </dict>

    <key>RunAtLoad</key>
    <true/>

    <key>KeepAlive</key>
    <true/>

    <key>StandardOutPath</key>
    <string>${LOG_FILE}</string>

    <key>StandardErrorPath</key>
    <string>${LOG_FILE}</string>

    <key>ThrottleInterval</key>
    <integer>10</integer>
</dict>
</plist>`;
}

function installLaunchd(): void {
  const plistDir = join(HOME, "Library", "LaunchAgents");
  const plistPath = join(plistDir, "ai.orchestra.ensemble.plist");
  const content = generateLaunchdPlist();

  if (PRINT_ONLY) { console.log(content); return; }

  mkdirSync(plistDir, { recursive: true });
  writeFileSync(plistPath, content);
  console.log(`✅ Plist written: ${plistPath}`);
  console.log("\nTo activate now:");
  console.log(`  launchctl load "${plistPath}"`);
  console.log("\nTo stop:");
  console.log(`  launchctl unload "${plistPath}"`);
  console.log("\nTo check status:");
  console.log("  launchctl list ai.orchestra.ensemble");

  if (AUTO_INSTALL) {
    try {
      execSync(`launchctl load "${plistPath}"`, { stdio: "inherit" });
      console.log("\n✅ Service loaded and started.");
    } catch (err) {
      console.error(`\n⚠️  Failed to load service automatically: ${err}`);
      console.log("Run the launchctl command above manually.");
    }
  }
}

// ── Linux: systemd user unit ──────────────────────────────────────────────────

function generateSystemdUnit(): string {
  return `[Unit]
Description=AI Orchestra Ensemble (Lead + Role Agents)
After=network.target

[Service]
Type=simple
WorkingDirectory=${ENSEMBLE_DIR}
ExecStart=${BUN_PATH} run daemon
Restart=on-failure
RestartSec=10
StandardOutput=append:${LOG_FILE}
StandardError=append:${LOG_FILE}
Environment=HOME=${HOME}
Environment=PATH=/usr/local/bin:/usr/bin:/bin

[Install]
WantedBy=default.target`;
}

function installSystemd(): void {
  const unitDir = join(HOME, ".config", "systemd", "user");
  const unitPath = join(unitDir, "ai-orchestra-ensemble.service");
  const content = generateSystemdUnit();

  if (PRINT_ONLY) { console.log(content); return; }

  mkdirSync(unitDir, { recursive: true });
  writeFileSync(unitPath, content);
  console.log(`✅ Unit file written: ${unitPath}`);
  console.log("\nTo activate:");
  console.log("  systemctl --user daemon-reload");
  console.log("  systemctl --user enable --now ai-orchestra-ensemble.service");
  console.log("\nTo check status:");
  console.log("  systemctl --user status ai-orchestra-ensemble");
  console.log("\nTo view logs:");
  console.log("  journalctl --user -u ai-orchestra-ensemble -f");

  if (AUTO_INSTALL) {
    try {
      execSync("systemctl --user daemon-reload", { stdio: "inherit" });
      execSync("systemctl --user enable --now ai-orchestra-ensemble.service", { stdio: "inherit" });
      console.log("\n✅ Service enabled and started.");
    } catch (err) {
      console.error(`\n⚠️  Auto-install failed: ${err}`);
      console.log("Run the systemctl commands above manually.");
    }
  }
}

// ── Windows: Task Scheduler XML ───────────────────────────────────────────────

function generateTaskSchedulerXml(): string {
  const ensembleDirWin = ENSEMBLE_DIR.replace(/\//g, "\\");
  const bunPathWin = BUN_PATH.replace(/\//g, "\\") || "bun.exe";

  return `<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.4" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo>
    <Description>AI Orchestra Ensemble — Lead and Role Agents</Description>
    <Author>AI Orchestra</Author>
  </RegistrationInfo>
  <Triggers>
    <LogonTrigger>
      <Enabled>true</Enabled>
    </LogonTrigger>
  </Triggers>
  <Principals>
    <Principal id="Author">
      <LogonType>InteractiveToken</LogonType>
      <RunLevel>LeastPrivilege</RunLevel>
    </Principal>
  </Principals>
  <Settings>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <RestartOnFailure>
      <Interval>PT1M</Interval>
      <Count>10</Count>
    </RestartOnFailure>
    <ExecutionTimeLimit>PT0S</ExecutionTimeLimit>
    <Priority>7</Priority>
  </Settings>
  <Actions Context="Author">
    <Exec>
      <Command>${bunPathWin}</Command>
      <Arguments>run daemon</Arguments>
      <WorkingDirectory>${ensembleDirWin}</WorkingDirectory>
    </Exec>
  </Actions>
</Task>`;
}

function installWindows(): void {
  const xmlPath = join(ORCHESTRA_HOME, "ai-orchestra-ensemble.xml");
  const content = generateTaskSchedulerXml();

  if (PRINT_ONLY) { console.log(content); return; }

  mkdirSync(ORCHESTRA_HOME, { recursive: true });
  writeFileSync(xmlPath, content, "utf16le");
  console.log(`✅ Task XML written: ${xmlPath}`);
  console.log("\nTo install (run in an elevated Command Prompt or PowerShell):");
  console.log(`  schtasks /Create /XML "${xmlPath}" /TN "AI Orchestra Ensemble" /F`);
  console.log("\nTo start now:");
  console.log(`  schtasks /Run /TN "AI Orchestra Ensemble"`);
  console.log("\nTo check status:");
  console.log(`  schtasks /Query /TN "AI Orchestra Ensemble" /FO LIST`);

  if (AUTO_INSTALL) {
    try {
      execSync(`schtasks /Create /XML "${xmlPath}" /TN "AI Orchestra Ensemble" /F`, { stdio: "inherit" });
      execSync(`schtasks /Run /TN "AI Orchestra Ensemble"`, { stdio: "inherit" });
      console.log("\n✅ Task created and started.");
    } catch (err) {
      console.error(`\n⚠️  Auto-install failed: ${err}`);
      console.log("Run the schtasks commands above manually in an elevated prompt.");
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

mkdirSync(ORCHESTRA_HOME, { recursive: true });

const platform = detectPlatform();
console.log(`🎼 AI Orchestra — Service Installer`);
console.log(`   Platform: ${platform}`);
console.log(`   Ensemble dir: ${ENSEMBLE_DIR}`);
console.log(`   Bun path: ${BUN_PATH}`);
if (!PRINT_ONLY) console.log(`   Log file: ${LOG_FILE}`);
console.log("");

switch (platform) {
  case "macos":
    installLaunchd();
    break;
  case "linux":
    installSystemd();
    break;
  case "windows":
    installWindows();
    break;
  default:
    console.error(`❌ Unsupported platform: ${process.platform}`);
    console.error("Supported: macOS (launchd), Linux (systemd), Windows (Task Scheduler)");
    process.exit(1);
}

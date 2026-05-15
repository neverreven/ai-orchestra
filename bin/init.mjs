#!/usr/bin/env node
// @neverreven/ai-orchestra installer.
// Usage:
//   npx @neverreven/ai-orchestra init [--force] [--include-fixtures] [target-dir]
//   npx @neverreven/ai-orchestra setup-ensemble [target-dir]
//   npx @neverreven/ai-orchestra setup-telegram [target-dir]
//   npx @neverreven/ai-orchestra extract [--from=<path>] [--to=<path>] [--clean] [--git]
//   npx @neverreven/ai-orchestra --help

import { readFile, mkdir, copyFile, readdir, stat, lstat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import process from 'node:process';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(execFile);

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const positional = args.filter((a) => !a.startsWith('--'));

const HELP_TEXT = `
@neverreven/ai-orchestra — universal agentic toolkit installer

USAGE
  npx @neverreven/ai-orchestra init [options] [target]
  npx @neverreven/ai-orchestra setup-ensemble [target]
  npx @neverreven/ai-orchestra setup-telegram [target]
  npx @neverreven/ai-orchestra extract [options] [project-root]

COMMANDS
  init              Copy the score/ specification into a target project (Tier 1).
  setup-ensemble    Install and configure the agentic ensemble (Tier 2).
                    Runs the interactive setup wizard for API keys and project scope.
  setup-telegram    Configure Telegram bots for the ensemble (Tier 3).
                    Requires setup-ensemble to have been run first.
  extract           Move an existing score/ out of a host project into a
                    standalone directory.

INIT OPTIONS
  [target]            Project root to install into (defaults to current dir).
  --force             Overwrite an existing score/ folder if present.
  --include-fixtures  Also copy _test-fixtures/ (orchestra dev/testing only).
  --no-marker         Don't write .ai-orchestra/installed-from.json.
  --version, -v       Print the installer version and exit.
  --help, -h          Print this help and exit.

EXTRACT OPTIONS
  [project-root]      Root of the host project containing score/ (or legacy ai-orchestra/).
  --from=<path>       Explicit path to the score/ folder to extract.
  --to=<path>         Destination directory (default: ../ai-orchestra-standalone).
  --force             Overwrite destination if it already exists and is non-empty.
  --clean             Delete the source score/ folder after copying.
  --git               Run "git init" + initial commit in the destination folder.

WHAT init DOES
  1. Copies the score/ specification folder (markdown, ~170 KB) into
     <target>/score/. Test fixtures are excluded by default.
  2. Writes <target>/.ai-orchestra/installed-from.json with the version + ISO
     timestamp. The orchestra audit can later detect upgrades.
  3. Prints next-steps: open the project in your IDE and ask the agent to
     "run the orchestra". The agent reads score/RUN.md and follows
     the dry-run-first install flow described there.

WHAT setup-ensemble DOES
  1. Copies the ensemble/ source into <target>/.ai-orchestra/ensemble/.
  2. Checks that Bun is installed; if not, prints installation instructions.
  3. Runs "bun install" inside the copied ensemble directory.
  4. Launches the interactive setup wizard (bun run setup) for API keys
     and project scope configuration.
  5. Writes tier: 2 into .ai-orchestra/install.json (if it exists).

WHAT setup-telegram DOES
  1. Verifies that setup-ensemble has been run.
  2. Launches the Telegram bot configuration wizard (bun run setup:bots).
  3. Guides you through creating bots via BotFather (instructions printed inline).
  4. Writes tier: 3 into .ai-orchestra/install.json (if it exists).

WHAT extract DOES
  1. Copies the score/ folder (or --from path) to the --to destination.
  2. Writes a minimal package.json in the destination (private: true) if absent.
  3. Optionally runs "git init" + an initial commit (--git).
  4. Optionally removes the source folder (--clean).
  Does NOT modify AGENTS.md, .cursor/, .claude/, .vscode/, or anything else.

LEARN MORE
  Ask your agent: "run the orchestra"   — Tier 1 setup
  Ask your agent: "set up agentic team" — Tier 2 activation
  Ask your agent: "set up Telegram"     — Tier 3 activation
`;

const VERSION_FILE = new URL('../VERSION', import.meta.url);

async function readVersion() {
  try {
    const txt = await readFile(VERSION_FILE, 'utf8');
    return txt.trim();
  } catch {
    return 'unknown';
  }
}

async function copyDir(src, dst, { skipNames = new Set() } = {}) {
  await mkdir(dst, { recursive: true });
  const entries = await readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    if (skipNames.has(entry.name)) continue;
    const srcPath = path.join(src, entry.name);
    const dstPath = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, dstPath, { skipNames });
    } else if (entry.isFile()) {
      await copyFile(srcPath, dstPath);
    }
  }
}

async function dirIsEmpty(dir) {
  try {
    const entries = await readdir(dir);
    return entries.length === 0;
  } catch {
    return true;
  }
}

function logHeader(version) {
  console.log('');
  console.log(`  ai-orchestra v${version}`);
  console.log('');
}

function logNextSteps(targetDir) {
  console.log('');
  console.log('  Done. Next steps:');
  console.log('');
  console.log(`    1. Open ${targetDir} in your IDE (Cursor / Claude Code / Codex / VS Code).`);
  console.log('    2. Ask your agent: "run the orchestra"');
  console.log('       (or any natural variant — see score/RUN.md §0).');
  console.log('    3. The agent will give you a structured orientation, then a');
  console.log('       dry-run install plan. No files are written without your consent.');
  console.log('');
  console.log('  To upgrade later: npx @neverreven/ai-orchestra init --force');
  console.log('  Then ask your agent: "upgrade orchestra"');
  console.log('');
  console.log('  To activate the agentic ensemble (Tier 2):');
  console.log('    npx @neverreven/ai-orchestra setup-ensemble');
  console.log('  Or ask your agent: "set up agentic team"');
  console.log('');
}

async function updateInstallMarkerTier(markerDir, tier) {
  const markerPath = path.join(markerDir, 'install.json');
  if (!existsSync(markerPath)) return;
  try {
    const raw = await readFile(markerPath, 'utf8');
    const marker = JSON.parse(raw);
    marker.tier = tier;
    if (!marker.ensemble) marker.ensemble = { installed: false, path: null, version: null, telegramEnabled: false };
    if (tier >= 2) marker.ensemble.installed = true;
    if (tier >= 3) marker.ensemble.telegramEnabled = true;
    await writeFile(markerPath, JSON.stringify(marker, null, 2) + '\n', 'utf8');
  } catch {
    // install.json may not be in the full schema yet; skip silently
  }
}

async function cmdInit() {
  const version = await readVersion();
  logHeader(version);

  const targetRoot = path.resolve(positional[1] ?? '.');
  const pkgRoot = fileURLToPath(new URL('..', import.meta.url));
  const scoreDst = path.join(targetRoot, 'score');

  if (!existsSync(targetRoot)) {
    console.error(`  ERROR: target directory does not exist: ${targetRoot}`);
    process.exit(1);
  }

  if (existsSync(scoreDst)) {
    if (!flags.has('--force') && !(await dirIsEmpty(scoreDst))) {
      console.error(`  ERROR: ${scoreDst} already exists and is not empty.`);
      console.error('         Re-run with --force to overwrite, or remove the folder first.');
      console.error('');
      console.error('  NOTE: If you have a legacy ai-orchestra/ folder, rename it to score/');
      console.error('        or run: npx @neverreven/ai-orchestra init --force');
      process.exit(1);
    }
  }

  const skipNames = new Set([
    '.git',
    '.github',
    'node_modules',
    'package.json',
    'package-lock.json',
    'bin',
    'ensemble',
    '.npmignore',
    '.gitignore',
    '_test-fixtures',
  ]);
  if (flags.has('--include-fixtures')) {
    skipNames.delete('_test-fixtures');
  }

  console.log(`  Copying score/ specification into ${scoreDst} ...`);
  await copyDir(pkgRoot, scoreDst, { skipNames });

  if (!flags.has('--no-marker')) {
    const markerDir = path.join(targetRoot, '.ai-orchestra');
    await mkdir(markerDir, { recursive: true });
    const marker = {
      installedFromPackage: '@neverreven/ai-orchestra',
      installedFromVersion: version,
      installedAt: new Date().toISOString(),
      tier: 1,
      ensemble: { installed: false, path: null, version: null, telegramEnabled: false },
      note: 'This is the npm-package install marker. The full per-project install marker (install.json) is created by the IDE agent during the orchestra install flow.',
    };
    await writeFile(
      path.join(markerDir, 'installed-from.json'),
      JSON.stringify(marker, null, 2) + '\n',
      'utf8',
    );
  }

  logNextSteps(targetRoot);
}

async function cmdSetupEnsemble() {
  const version = await readVersion();
  logHeader(version);

  const targetRoot = path.resolve(positional[1] ?? '.');
  const pkgRoot = fileURLToPath(new URL('..', import.meta.url));
  const ensembleSrc = path.join(pkgRoot, 'ensemble');
  const ensembleDst = path.join(targetRoot, '.ai-orchestra', 'ensemble');
  const markerDir = path.join(targetRoot, '.ai-orchestra');

  if (!existsSync(targetRoot)) {
    console.error(`  ERROR: target directory does not exist: ${targetRoot}`);
    process.exit(1);
  }

  const scoreExists = existsSync(path.join(targetRoot, 'score')) || existsSync(path.join(targetRoot, 'ai-orchestra'));
  if (!scoreExists) {
    console.error('  ERROR: No score/ folder found in the target project.');
    console.error('         Run "npx @neverreven/ai-orchestra init" first to install Tier 1.');
    process.exit(1);
  }

  // Check Bun is available
  console.log('  Checking for Bun runtime ...');
  try {
    await execAsync('bun', ['--version']);
    console.log('  Bun found.');
  } catch {
    console.error('');
    console.error('  ERROR: Bun is not installed or not in PATH.');
    console.error('  The ensemble layer requires Bun to run the agent processes.');
    console.error('');
    console.error('  Install Bun:');
    console.error('    macOS / Linux:  curl -fsSL https://bun.sh/install | bash');
    console.error('    Windows:        powershell -c "irm bun.sh/install.ps1 | iex"');
    console.error('    npm (global):   npm install -g bun');
    console.error('');
    process.exit(1);
  }

  // Copy ensemble source
  if (existsSync(ensembleDst) && !flags.has('--force') && !(await dirIsEmpty(ensembleDst))) {
    console.log(`  Ensemble already present at ${ensembleDst}.`);
    console.log('  Use --force to overwrite. Proceeding with setup wizard ...');
    console.log('');
  } else {
    console.log(`  Copying ensemble source into ${ensembleDst} ...`);
    const skipNames = new Set(['node_modules', '.state', 'bun.lock', '_test-fixtures']);
    await copyDir(ensembleSrc, ensembleDst, { skipNames });
    console.log('  Ensemble source copied.');
  }

  // Install dependencies
  console.log('');
  console.log('  Installing ensemble dependencies (bun install) ...');
  await new Promise((resolve, reject) => {
    const child = spawn('bun', ['install'], { cwd: ensembleDst, stdio: 'inherit', shell: true });
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`bun install exited with ${code}`))));
  });

  // Run interactive setup wizard
  console.log('');
  console.log('  Launching ensemble setup wizard ...');
  console.log('  (You will be asked for your Anthropic API key and project scope.)');
  console.log('');
  await new Promise((resolve, reject) => {
    const child = spawn('bun', ['run', 'setup'], { cwd: ensembleDst, stdio: 'inherit', shell: true });
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`setup exited with ${code}`))));
  });

  // Update install marker
  await mkdir(markerDir, { recursive: true });
  await updateInstallMarkerTier(markerDir, 2);

  console.log('');
  console.log('  Ensemble (Tier 2) is ready.');
  console.log('');
  console.log('  Start the ensemble:');
  console.log(`    cd ${ensembleDst}`);
  console.log('    bun run dev:all    # start all agents');
  console.log('    bun run dev:lead   # start Lead agent only');
  console.log('');
  console.log('  To add Telegram remote access (Tier 3):');
  console.log('    npx @neverreven/ai-orchestra setup-telegram');
  console.log('  Or ask your agent: "set up Telegram orchestration"');
  console.log('');
}

async function cmdSetupTelegram() {
  const version = await readVersion();
  logHeader(version);

  const targetRoot = path.resolve(positional[1] ?? '.');
  const ensembleDst = path.join(targetRoot, '.ai-orchestra', 'ensemble');
  const markerDir = path.join(targetRoot, '.ai-orchestra');

  if (!existsSync(ensembleDst)) {
    console.error('  ERROR: Ensemble not found at .ai-orchestra/ensemble/');
    console.error('         Run "npx @neverreven/ai-orchestra setup-ensemble" first.');
    process.exit(1);
  }

  console.log('  Telegram orchestration setup (Tier 3)');
  console.log('');
  console.log('  Before continuing, create one Telegram bot per agent via BotFather:');
  console.log('');
  console.log('    1. Open Telegram and search for @BotFather');
  console.log('    2. Send: /newbot');
  console.log('    3. Choose a name (e.g. "My Project Lead") and username (e.g. myproject_lead_bot)');
  console.log('    4. Copy the token BotFather gives you');
  console.log('    5. Repeat for each agent you want: lead, frontend, backend, qa, devops, security');
  console.log('');
  console.log('  You only need as many bots as agents you plan to run.');
  console.log('  The Lead bot is required. Role bots are optional.');
  console.log('');

  await new Promise((resolve, reject) => {
    const child = spawn('bun', ['run', 'setup:bots'], { cwd: ensembleDst, stdio: 'inherit', shell: true });
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`setup:bots exited with ${code}`))));
  });

  await updateInstallMarkerTier(markerDir, 3);

  console.log('');
  console.log('  Telegram orchestration (Tier 3) is ready.');
  console.log('');
  console.log('  Start the ensemble and message your Lead bot from Telegram.');
  console.log(`    cd ${ensembleDst} && bun run dev:all`);
  console.log('');
}

async function cmdExtract() {
  const version = await readVersion();
  logHeader(version);

  const projectRoot = path.resolve(positional[1] ?? '.');

  // Resolve source: --from=<path> or score/ with ai-orchestra/ as legacy fallback
  const fromFlag = args.find((a) => a.startsWith('--from='));
  let orchestraSrc;
  if (fromFlag) {
    orchestraSrc = path.resolve(fromFlag.slice('--from='.length));
  } else if (existsSync(path.join(projectRoot, 'score'))) {
    orchestraSrc = path.join(projectRoot, 'score');
  } else if (existsSync(path.join(projectRoot, 'ai-orchestra'))) {
    orchestraSrc = path.join(projectRoot, 'ai-orchestra');
    console.log('  NOTE: Found legacy ai-orchestra/ folder. Consider renaming to score/');
    console.log('        via "upgrade orchestra" in your IDE agent.');
    console.log('');
  } else {
    console.error(`  ERROR: No score/ (or legacy ai-orchestra/) folder found at ${projectRoot}`);
    console.error('         Run from a project root that has a score/ folder,');
    console.error('         or specify the source with --from=<path>.');
    process.exit(1);
  }

  // Verify it looks like an orchestra install
  const srcVersionFile = path.join(orchestraSrc, 'VERSION');
  if (!existsSync(srcVersionFile)) {
    console.error(`  ERROR: ${orchestraSrc} does not look like an ai-orchestra folder (no VERSION file).`);
    process.exit(1);
  }

  const srcVersion = (await readFile(srcVersionFile, 'utf8').catch(() => '')).trim() || 'unknown';

  // Resolve destination
  const toFlag = args.find((a) => a.startsWith('--to='));
  const targetDir = toFlag
    ? path.resolve(toFlag.slice('--to='.length))
    : path.resolve(projectRoot, '..', 'ai-orchestra-standalone');

  if (existsSync(targetDir)) {
    if (!flags.has('--force') && !(await dirIsEmpty(targetDir))) {
      console.error(`  ERROR: ${targetDir} already exists and is not empty.`);
      console.error('         Re-run with --force to overwrite, or specify --to=<path>.');
      process.exit(1);
    }
  }

  console.log(`  Source : ${orchestraSrc} (v${srcVersion})`);
  console.log(`  Target : ${targetDir}`);
  console.log('');
  console.log('  Copying ...');
  await copyDir(orchestraSrc, targetDir, { skipNames: new Set() });

  // Write a minimal package.json if absent
  const pkgPath = path.join(targetDir, 'package.json');
  if (!existsSync(pkgPath)) {
    const pkg = {
      name: 'ai-orchestra',
      version: srcVersion,
      description: 'Universal agentic toolkit — standalone extracted copy.',
      private: true,
    };
    await writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
    console.log('  Wrote minimal package.json (private: true).');
  }

  // --git
  if (flags.has('--git')) {
    try {
      try {
        await execAsync('git', ['init', '--initial-branch=main', targetDir]);
      } catch {
        await execAsync('git', ['init', targetDir]);
      }
      await execAsync('git', ['-C', targetDir, 'add', '.']);
      await execAsync('git', ['-C', targetDir, 'commit', '-m', `chore: extracted ai-orchestra v${srcVersion} standalone repo`]);
      console.log('  Initialized git repo with initial commit.');
    } catch (gitErr) {
      console.warn('  WARNING: git init/commit failed:', gitErr?.message ?? gitErr);
      console.warn('           Extraction completed; run "git init" manually in the target folder.');
    }
  }

  // --clean
  if (flags.has('--clean')) {
    const { rm } = await import('node:fs/promises');
    console.log(`  --clean: removing ${orchestraSrc} ...`);
    await rm(orchestraSrc, { recursive: true, force: true });
    console.log('  Source folder removed from host project.');
    const folderName = path.basename(orchestraSrc);
    console.log('');
    console.log(`  NOTE: If your host project tracks ${folderName}/ in git, run:`);
    console.log(`          git rm -r --cached ${folderName}/`);
    console.log('        and commit the removal before pushing.');
  }

  console.log('');
  console.log(`  Done. Standalone orchestra folder is at:`);
  console.log(`    ${targetDir}`);
  console.log('');
  if (!flags.has('--git')) {
    console.log('  TIP: Run "git init" inside the target folder to start versioning it standalone.');
    console.log('');
  }
}

async function main() {
  if (flags.has('--help') || flags.has('-h') || (positional.length === 0 && flags.size === 0)) {
    console.log(HELP_TEXT);
    process.exit(0);
  }

  if (flags.has('--version') || flags.has('-v')) {
    console.log(await readVersion());
    process.exit(0);
  }

  const cmd = positional[0];

  switch (cmd) {
    case 'init':
      await cmdInit();
      break;
    case 'setup-ensemble':
      await cmdSetupEnsemble();
      break;
    case 'setup-telegram':
      await cmdSetupTelegram();
      break;
    case 'extract':
      await cmdExtract();
      break;
    case undefined:
      console.log(HELP_TEXT);
      break;
    default:
      console.error(`  ERROR: unknown command: ${cmd}`);
      console.error('  Run with --help for usage.');
      process.exit(1);
  }
}

main().catch((err) => {
  console.error('  FATAL:', err?.message ?? err);
  process.exit(1);
});

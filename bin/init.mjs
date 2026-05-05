#!/usr/bin/env node
// @neverreven/ai-orchestra installer.
// Usage:
//   npx @neverreven/ai-orchestra init [--force] [--skip-fixtures] [target-dir]
//   npx @neverreven/ai-orchestra --help
//
// Copies the ai-orchestra/ folder into a target project so an IDE agent can
// "run the orchestra". Pure file copy; no network calls; no telemetry; v1.

import { readFile, mkdir, copyFile, readdir, stat, lstat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import process from 'node:process';

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const positional = args.filter((a) => !a.startsWith('--'));

const HELP_TEXT = `
@neverreven/ai-orchestra — universal agentic toolkit installer

USAGE
  npx @neverreven/ai-orchestra init [options] [target]

ARGUMENTS
  target              Project root to install into (defaults to current dir).

OPTIONS
  --force             Overwrite an existing ai-orchestra/ folder if present.
  --skip-fixtures     Don't copy _test-fixtures/ (saves ~80 KB; recommended).
  --no-marker         Don't write the version marker file (.ai-orchestra/installed-from.json).
  --version, -v       Print the installer version and exit.
  --help, -h          Print this help and exit.

WHAT IT DOES
  1. Copies the ai-orchestra/ specification folder (markdown, ~250 KB) into
     <target>/ai-orchestra/.
  2. Writes <target>/.ai-orchestra/installed-from.json with the version + ISO
     timestamp. The orchestra audit can later detect upgrades.
  3. Prints next-steps: open the project in your IDE and ask the agent to
     "run the ai-orchestra". The agent reads ai-orchestra/RUN.md and follows
     the dry-run-first install flow described there.

WHAT IT DOES NOT DO
  - It never modifies AGENTS.md, .cursor/, .claude/, .vscode/, .github/, or
    anything else under <target>/. The IDE agent does that, with your consent,
    after you ask it to "run the ai-orchestra".
  - It never makes network calls.
  - It never collects telemetry.

LEARN MORE
  https://github.com/neverreven/ai-orchestra
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
  console.log('  https://github.com/neverreven/ai-orchestra');
  console.log('');
}

function logNextSteps(targetDir) {
  console.log('');
  console.log('  Done. Next steps:');
  console.log('');
  console.log(`    1. Open ${targetDir} in your IDE (Cursor / Claude Code / Codex / VS Code).`);
  console.log('    2. Ask your agent: "run the ai-orchestra"');
  console.log('       (or any natural variant — see ai-orchestra/RUN.md §0).');
  console.log('    3. The agent will give you a structured orientation, then a');
  console.log('       dry-run install plan. No files are written without your consent.');
  console.log('');
}

async function cmdInit() {
  const version = await readVersion();
  logHeader(version);

  const targetRoot = path.resolve(positional[1] ?? '.');
  const orchestraSrc = fileURLToPath(new URL('..', import.meta.url));
  const orchestraDst = path.join(targetRoot, 'ai-orchestra');

  if (!existsSync(targetRoot)) {
    console.error(`  ERROR: target directory does not exist: ${targetRoot}`);
    process.exit(1);
  }

  if (existsSync(orchestraDst)) {
    if (!flags.has('--force') && !(await dirIsEmpty(orchestraDst))) {
      console.error(`  ERROR: ${orchestraDst} already exists and is not empty.`);
      console.error('         Re-run with --force to overwrite, or remove the folder first.');
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
    '.npmignore',
    '.gitignore',
  ]);
  if (flags.has('--skip-fixtures')) {
    skipNames.add('_test-fixtures');
  }

  console.log(`  Copying ai-orchestra/ specification into ${orchestraDst} ...`);
  await copyDir(orchestraSrc, orchestraDst, { skipNames });

  if (!flags.has('--no-marker')) {
    const markerDir = path.join(targetRoot, '.ai-orchestra');
    await mkdir(markerDir, { recursive: true });
    const marker = {
      installedFromPackage: '@neverreven/ai-orchestra',
      installedFromVersion: version,
      installedAt: new Date().toISOString(),
      note:
        'This is the npm-package install marker. The full per-project install marker (install.json) is created by the IDE agent during the orchestra install flow.',
    };
    const { writeFile } = await import('node:fs/promises');
    await writeFile(
      path.join(markerDir, 'installed-from.json'),
      JSON.stringify(marker, null, 2) + '\n',
      'utf8',
    );
  }

  logNextSteps(targetRoot);
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
  console.error('  FATAL:', err && err.message ? err.message : err);
  process.exit(1);
});

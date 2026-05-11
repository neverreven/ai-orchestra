#!/usr/bin/env node
// @neverreven/ai-orchestra installer.
// Usage:
//   npx @neverreven/ai-orchestra init [--force] [--skip-fixtures] [target-dir]
//   npx @neverreven/ai-orchestra extract [--from=<path>] [--to=<path>] [--clean] [--git]
//   npx @neverreven/ai-orchestra --help
//
// init:    Copies the ai-orchestra/ specification folder into a target project.
// extract: Moves an existing ai-orchestra/ out of a host project into a
//          standalone folder (or repo). Pure file operations; no network calls.

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
  npx @neverreven/ai-orchestra extract [options] [project-root]

COMMANDS
  init      Copy the ai-orchestra/ specification folder into a target project.
  extract   Move an existing ai-orchestra/ out of a host project into a
            standalone directory (useful before extracting to its own repo).

INIT OPTIONS
  [target]            Project root to install into (defaults to current dir).
  --force             Overwrite an existing ai-orchestra/ folder if present.
  --skip-fixtures     Don't copy _test-fixtures/ (saves ~80 KB; recommended).
  --no-marker         Don't write .ai-orchestra/installed-from.json.
  --version, -v       Print the installer version and exit.
  --help, -h          Print this help and exit.

EXTRACT OPTIONS
  [project-root]      Root of the host project containing ai-orchestra/
                      (defaults to current dir).
  --from=<path>       Explicit path to the ai-orchestra/ folder to extract.
  --to=<path>         Destination directory (default: ../ai-orchestra-standalone).
  --force             Overwrite destination if it already exists and is non-empty.
  --clean             Delete the source ai-orchestra/ folder after copying.
  --git               Run "git init" + initial commit in the destination folder.

WHAT init DOES
  1. Copies the ai-orchestra/ specification folder (markdown, ~250 KB) into
     <target>/ai-orchestra/.
  2. Writes <target>/.ai-orchestra/installed-from.json with the version + ISO
     timestamp. The orchestra audit can later detect upgrades.
  3. Prints next-steps: open the project in your IDE and ask the agent to
     "run the ai-orchestra". The agent reads ai-orchestra/RUN.md and follows
     the dry-run-first install flow described there.

WHAT extract DOES
  1. Copies the ai-orchestra/ folder (or --from path) to the --to destination.
  2. Writes a minimal package.json in the destination (private: true, no scripts)
     if one is not already present.
  3. Optionally runs "git init" + an initial commit (--git).
  4. Optionally removes the source folder (--clean).
  Does NOT modify AGENTS.md, .cursor/, .claude/, .vscode/, .github/, or
  anything else in the host project.

WHAT NEITHER COMMAND DOES
  - Modifies agentic config files (that's the IDE agent's job).
  - Makes network calls.
  - Collects telemetry.

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

async function cmdExtract() {
  const version = await readVersion();
  logHeader(version);

  const projectRoot = path.resolve(positional[1] ?? '.');

  // Resolve source: --from=<path> or <project-root>/ai-orchestra/
  const fromFlag = args.find((a) => a.startsWith('--from='));
  const orchestraSrc = fromFlag
    ? path.resolve(fromFlag.slice('--from='.length))
    : path.join(projectRoot, 'ai-orchestra');

  if (!existsSync(orchestraSrc)) {
    console.error(`  ERROR: ai-orchestra folder not found at ${orchestraSrc}`);
    console.error('         Run from a project root that has an ai-orchestra/ folder,');
    console.error('         or specify the source with --from=<path>.');
    process.exit(1);
  }

  // Verify it looks like an orchestra install (must have a VERSION file)
  const srcVersionFile = path.join(orchestraSrc, 'VERSION');
  if (!existsSync(srcVersionFile)) {
    console.error(`  ERROR: ${orchestraSrc} does not look like an ai-orchestra folder (no VERSION file).`);
    process.exit(1);
  }

  const srcVersion = (await readFile(srcVersionFile, 'utf8').catch(() => '')).trim() || 'unknown';

  // Resolve destination: --to=<path> or ../ai-orchestra-standalone relative to projectRoot
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

  // Write a minimal package.json if the target doesn't already have one
  const pkgPath = path.join(targetDir, 'package.json');
  if (!existsSync(pkgPath)) {
    const { writeFile } = await import('node:fs/promises');
    const pkg = {
      name: 'ai-orchestra',
      version: srcVersion,
      description: 'Universal agentic toolkit — standalone extracted copy.',
      private: true,
    };
    await writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
    console.log('  Wrote minimal package.json (private: true).');
  }

  // --git: init a new repo and create an initial commit
  if (flags.has('--git')) {
    const { execFile } = await import('node:child_process');
    const { promisify } = await import('node:util');
    const exec = promisify(execFile);
    try {
      // Try with --initial-branch (git >= 2.28); fall back silently if flag unsupported
      try {
        await exec('git', ['init', '--initial-branch=main', targetDir]);
      } catch {
        await exec('git', ['init', targetDir]);
      }
      await exec('git', ['-C', targetDir, 'add', '.']);
      await exec('git', ['-C', targetDir, 'commit', '-m', `chore: extracted ai-orchestra v${srcVersion} standalone repo`]);
      console.log('  Initialized git repo with initial commit.');
    } catch (gitErr) {
      console.warn('  WARNING: git init/commit failed:', gitErr && gitErr.message ? gitErr.message : gitErr);
      console.warn('           Extraction completed; run "git init" manually in the target folder.');
    }
  }

  // --clean: remove the source folder from the host project
  if (flags.has('--clean')) {
    const { rm } = await import('node:fs/promises');
    console.log(`  --clean: removing ${orchestraSrc} ...`);
    await rm(orchestraSrc, { recursive: true, force: true });
    console.log('  Source folder removed from host project.');
    console.log('');
    console.log('  NOTE: If your host project tracks ai-orchestra/ in git, run:');
    console.log('          git rm -r --cached ai-orchestra/');
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
  console.error('  FATAL:', err && err.message ? err.message : err);
  process.exit(1);
});

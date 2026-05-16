# AI Orchestra — Project Learnings

> Living context document for AI agents working on the ai-orchestra repository itself.
> Updated at the end of each session that changes code, architecture, or project decisions.

| Field | Value |
|-------|-------|
| Last updated | 2026-05-16 |
| Current version | 3.2.1 |
| npm package | `@neverreven/ai-orchestra` |
| Repository | `github.com/neverreven/ai-orchestra` |

---

## 1. Established Patterns

### npm package structure
- The package root contains: `score/` (spec files), `ensemble/` (Bun agent runtime), `bin/` (CLI entry points), `core/` (symlinked or copied inside score), `package.json`, `README.md`, `VERSION`, `CHANGELOG.md`, `MIGRATION.md`.
- `package.json` `"files"` array must be updated whenever new top-level directories or important files are added. Dockerfile, docker-compose.yml, and `.dockerignore` must be listed there for them to ship with the npm package.
- CLI entry point: `bin/init.mjs` (ESM, not CJS). Use `import { readFileSync, existsSync } from 'node:fs'` — never `require()` in ESM files.

### Versioning convention
- v1.x and v1.4 used a flat version scheme. v3.0 jumped from v1.4 to v3.0 intentionally (v2 was an internal runtime-only release not published as a stable spec version). Never re-use version numbers below 3.0.
- `VERSION` file in the repo root contains the bare semver string (e.g. `3.2.0`). `package.json` `"version"` must match. `CHANGELOG.md` must have an entry. All three must be updated together before publishing.
- SemVer semantics: patch = doc/prose fixes; minor = new additive features (new skills, stacks, channels); major = breaking changes (schema renames, removed roles, new required fields).

### PowerShell-specific pitfalls (dev machine is Windows)
- `&&` is NOT a statement separator in PowerShell — use `;` instead.
- `git commit -m "$(cat <<'EOF'...)"` heredoc syntax does not work in PowerShell — use single-line `-m "message"` for commits.
- `` `u{2014} `` (em-dash escape) only works in PowerShell 7+. On PowerShell < 7 it is inserted as literal text. Use regular hyphen ` - ` or paste the actual UTF-8 em-dash `—` character.
- StrReplace tool can silently fail on multi-line strings with pipe `|` characters (markdown table rows). Use PowerShell array insert pattern with `Get-Content` / `Set-Content` instead.

### Channel abstraction (v3.2)
- `ChannelAdapter` interface in `ensemble/agents-framework/src/channel.ts` defines the contract for all communication channels (Telegram, Slack, web).
- `runner.ts` holds the shared `runChannelAgentFlow` function. Every adapter calls this — agent logic is written once.
- `TelegramAdapter` wraps the Grammy bot. `SlackAdapter` uses `@slack/bolt` Socket Mode.
- `createSlackAdapter()` returns `null` when `SLACK_BOT_TOKEN` / `SLACK_APP_TOKEN` are absent — safe to call unconditionally.

### File-system message bus
- `.state/` directory at the ensemble root holds all runtime state. It is gitignored.
- `inbox.json` per agent: Lead reads its inbox for delegated tasks, each role agent reads its own.
- State files use `JsonStore` from `state.ts` — atomic write via temp file + rename.

### Score folder is read-only during install
- `score/core/` is never edited by the IDE agent during an `"run the orchestra"` install. The agent only mutates target-project files.
- Managed-section marker pairs (`<!-- orchestra:begin -->` / `<!-- orchestra:end -->`) allow the orchestra to own sections of files it did not wholly create.

### Upgrade skill boundary
- `upgrade` skill distinguishes: **orchestra-managed** artifacts (Director rule, unmodified core skills, stack-pack rules) → updated automatically; **project-owned** content (`AI_LEARNINGS.md`, `SESSION_STATE.md`, adapted skills) → never touched; **adapted skills** → diff shown, user must consent.
- The `install.json` `history[]` array records every run. The upgrade skill reads the last entry to determine what is managed vs. project-owned.

### Test fixtures are adversarial by design
- `_test-fixtures/broken-markers/` and `_test-fixtures/name-collision/` test edge cases that must not produce silent failures.
- `upgrade-from-v1/` tests the `ai-orchestra/ → score/` folder rename migration path.
- Fixture `EXPECTED.md` files describe the expected post-install state for agent-driven validation.

---

## 2. Anti-Patterns

### Never embed binary assets in JSON
- When building file-hosting features: keep binary content separate from content JSON. Store file references (IDs/URLs) in the data model, not the binary payload itself.

### Don't publish without updating all three version locations
- `VERSION` file, `package.json` `"version"`, and `CHANGELOG.md` entry must all match. Past sessions have published with a stale `VERSION` file, causing a confusing mismatch between `npm view` and the installed files.

### Don't create npm package entries for non-existent files
- `package.json` `"files"` had entries for files that were staged but not committed, causing `npm publish` to fail. Always `git status` before publish.

### StrReplace tool reliability on Windows markdown tables
- Replacing multi-line blocks that contain `|` pipe characters (table rows) is unreliable with StrReplace on this codebase. The fuzzy matcher returns the wrong position. Use PowerShell `Get-Content` / array splicing / `Set-Content` for bulk table edits.

### Don't leave `.state/` or `runtime/bun.lock` in git staging
- `.state/` is the runtime state directory and must remain gitignored. `runtime/bun.lock` was a leftover from the `runtime/ → ensemble/` rename in v3.0 — was accidentally staged and must be unstaged before commit.

---

## 3. User Preferences

- **Incremental, descriptive commits** — one commit per workstream or logical unit. Commit messages: `feat: ...` / `fix: ...` / `docs: ...` prefix.
- **PowerShell-safe commands** — always use `;` not `&&` when chaining commands. Single-line commit messages.
- **Keep README self-contained** — the npm page (README.md) must work without any external links. No private GitHub repo links. No placeholder sections.
- **Docs stay in sync with code** — `README.md`, `ensemble/README.md`, `MIGRATION.md`, and `ensemble/RUN.md` must be updated in the same session that ships code changes. Don't defer doc updates to a follow-up release.
- **No telemetry, no network calls** in the spec layer or CLI — this is a stated guarantee to users and must never be violated.

---

## 4. Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-01 | Jump from v1.4 to v3.0 (skip v2 as a stable release) | v2 was an internal runtime-only iteration. v3 is the first stable three-tier release with a formal spec+ensemble pairing. Avoids confusing "v2 spec" vs "v2 runtime" versioning. |
| 2026-02 | Rename `runtime/` to `ensemble/` | "Ensemble" better reflects the musical metaphor and is consistent with the Tier 1 / Tier 2 / Tier 3 naming. |
| 2026-02 | Rename `ai-orchestra/` installed folder to `score/` | Aligns with the musical metaphor (a score is what performers read). The upgrade skill handles the `git mv` non-destructively. |
| 2026-03 | `ChannelAdapter` abstraction (v3.2) | Telegram, Slack, and web UI all needed the same streaming/stop/auth flow. Extracting `runner.ts` eliminated 3× duplication and makes adding new channels (Discord, etc.) a one-file task. |
| 2026-03 | Web UI upgraded from simple chat to full 5-tab dashboard (v3.2) | Users wanted visibility into agent status, task queues, and logs without opening a terminal. The dashboard surface also naturally hosts the GitHub webhook receiver. |
| 2026-03 | Programmatic project detection (`detector.ts`) built as a TypeScript implementation of `DETECTION.md` | The DETECTION.md spec already existed as the authoritative detection algorithm. TypeScript impl ensures the Lead agent's autonomous orchestration uses the same logic as the IDE agent's discovery phase. Single source of truth. |
| 2026-03 | Process daemon with exponential backoff (v3.2) | Users running the ensemble on a laptop or VPS need the process to survive crashes without manual intervention. `pm2` was an option but adds a dependency; a self-contained `daemon.ts` keeps the stack minimal. |
| 2026-04 | System-global ensemble install path (v3.1) | One ensemble managing all projects is more efficient than one per project. The `--location=system-global` flag makes the choice explicit; project-local remains the default for isolated setups. |

---

## 5. Environment Notes

- **Dev machine:** Windows / PowerShell - backtick unicode escapes (` `u{2014} `) only work in PowerShell 7+. On older versions they insert literal text. Use ` - ` for separators in table rows.
- **Runtime:** Bun ≥ 1.1 required for the ensemble. The score layer has no runtime dependency — it is pure markdown.
- **npm registry:** `@neverreven/ai-orchestra` on the public npm registry. Publish with `npm publish --access public` from the repo root (not from a subdirectory).
- **Node.js version for CLI:** The `bin/init.mjs` entry point is pure ESM. Requires Node.js ≥ 16 (for top-level `import`). No build step — shipped as-is.
- **Bun workspace:** `ensemble/` is a Bun workspace with `ensemble/package.json` defining the workspace root. `bun install` at the `ensemble/` root installs all agent dependencies. Individual agent packages are in `ensemble/projects/*/`.

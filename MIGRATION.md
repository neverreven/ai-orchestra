# MIGRATION.md — Upgrading the orchestra

> Guidance for moving an installed orchestra from one version to another. v1 sets the policy; v1.x and v2 will populate the version-specific sections as they ship.

The orchestra core follows [Semantic Versioning](https://semver.org/). Per-project installs record their orchestra version in `.ai-orchestra/install.json` (`orchestra.version` field per [`core/registry/install.schema.md`](core/registry/install.schema.md)).

---

## 1. The migration model

The orchestra has no built-in migration runner in v1. Migration is **agent-driven** and uses the audit skill ([`core/skills/audit/ai-infra-audit/SKILL.md`](core/skills/audit/ai-infra-audit/SKILL.md)) as the primary mechanism.

The flow:

1. **Update the orchestra core** in the project (replace `score/` with the new version, or run `npx @neverreven/ai-orchestra@latest init --force` to update from npm).
2. **Re-run the orchestra** (per [`RUN.md`](RUN.md)). The first three phases stay the same. In Phase 3 (existing-infra inventory), the agent finds an existing `.ai-orchestra/install.json` and detects a version mismatch with the new core's `VERSION` file.
3. The orchestra switches to **upgrade-and-audit mode** (per [`RUN.md`](RUN.md) §10 — "The target project already has an `.ai-orchestra/install.json`").
4. The audit skill produces a focused diff describing only the drift between the installed orchestration and the new core.
5. The user reviews the diff and applies it (or selectively skips entries).

This model keeps migrations:

- **Idempotent** — re-running the same upgrade path produces the same result.
- **Reviewable** — every change goes through a dry-run plan first.
- **Reversible** — old files are preserved when conflict-handling rules require it; the install marker's `history[]` records every run.
- **Honest about gaps** — when a feature in the new version cannot be applied (e.g., adapter limitation), the upgrade plan surfaces it explicitly.

---

## 2. Compatibility policy

The orchestra core's SemVer is binding:

- **Patch (1.0.x → 1.0.y):** No structural changes; clarifications, typo fixes, lint-rule severity tweaks, expanded skill prose. Upgrades are safe and almost always produce a small audit diff (or none).
- **Minor (1.x → 1.y):** New roles, new skills, new stack packs, new adapter capabilities, new optional fields in the install marker. **Backward-compatible.** Upgrades surface new install items with `action: create`; existing install items remain `skip`.
- **Major (1 → 2):** Breaking changes — schema field renames, removed roles/skills, contract reshaping, mandatory new fields. **Requires explicit user opt-in.** The upgrade plan flags every breaking change individually with `severity: critical` and asks for confirmation per change before applying.

Stack packs version independently of the orchestra core (per [`core/stack-packs/_overview.md`](core/stack-packs/_overview.md) §5). A pack's `compatibleOrchestraVersions` field declares which core versions it works against. The audit refuses to apply a pack whose declared compatibility excludes the running core version.

---

## 3. Backward-compatibility guarantees of the install marker

The install marker schema in [`core/registry/install.schema.md`](core/registry/install.schema.md) follows additive evolution:

- **Adding optional fields:** safe, minor-version. Old markers without the new field are read with the field unset; the audit skill migrates them in place on the next run (subject to the user's confirmation if the change is non-trivial).
- **Adding required fields:** counts as a major-version change. The migration plan must populate the new field for every existing marker — either by deriving it from existing data (preferred) or by asking the user.
- **Renaming fields:** counts as a major-version change. The audit skill must do an in-place rename on every existing marker.
- **Removing fields:** counts as a major-version change. The migration plan archives the removed value into the marker's `history[].summary` so it is retrievable.

The 1.0.x markers are guaranteed to be readable by every 1.x orchestra release.

---

## 4. Per-version migration notes

The sections below are populated as new versions ship. v1.0.0-alpha is the baseline; no migration is needed to reach it.

### From `1.0.0-alpha` to a future `1.0.0` release

Expected to be a no-op for installed projects: the alpha is feature-complete for v1; the bump to `1.0.0` happens after the post-v1 pilot (per [`README.md`](README.md) §Status) and reflects validation-harness sign-off. Re-run the orchestra; the audit diff should be empty (or limited to clarification-only changes).

### From `1.0.x` to `1.1.x` (placeholder)

To be populated when v1.1 ships. Expected categories of changes:

- New stack packs (Go web, Rust services, .NET, mobile native).
- New roles or skills (additive only).
- Adapter parity improvements (e.g., Codex stop-hook polyfill if the runtime adds support).
- New optional install-marker fields.

### From `2.x` to `3.0` — Three-tier architecture + score/ rename

**v3 is the three-tier release.** Key changes:

| Change | Migration action | Breaking? |
|--------|----------------|-----------|
| Spec folder renamed `ai-orchestra/` → `score/` | Ask agent `"upgrade orchestra"`. The upgrade skill detects the old folder and offers a one-time `git mv ai-orchestra score`. Only applies on explicit user consent; the upgrade proceeds without the rename if you decline (you keep `ai-orchestra/` until you're ready). | **Yes — folder rename** (but lazy: the upgrade is non-blocking without it) |
| Install marker gains `tier`, `installedFolder`, `ensemble` fields | Upgrade skill migrates the marker in place. New fields added with defaults (`tier: 1`, `installedFolder: "ai-orchestra"` for legacy, `ensemble: { installed: false, ... }`). Fully backward-compatible read. | No |
| `runtime/` renamed to `ensemble/` in the package | Existing projects that have not set up the runtime are unaffected. Projects using the `runtime/` folder should rename it to `ensemble/` if they copied it manually. | Only if runtime was copied manually |
| New Tier 2 (`setup-ensemble`) and Tier 3 (`setup-telegram`) activation skills | These are purely additive. No migration needed to use them — they are available once the `score/` folder is updated. | No |
| `ai-orchestra/VERSION` path references in Director rule → `score/VERSION` | Upgrade skill re-renders the Director rule from the updated template, replacing path references. | No (handled by upgrade) |

**Minimal migration path (v2 → v3):**

```
1. npx @neverreven/ai-orchestra@latest init --force
2. Ask agent: "upgrade orchestra"
3. When prompted about the folder rename, reply "yes" to apply git mv
4. Confirm the upgrade plan and apply
```

**If you want Tier 2 or Tier 3 after upgrading:**

```bash
npx @neverreven/ai-orchestra setup-ensemble   # Tier 2
npx @neverreven/ai-orchestra setup-telegram   # Tier 3 (requires Tier 2)
```

Or ask the agent: `"set up agentic team"` / `"set up Telegram"`.

### From `1.x` to `2.0`

v2 introduced the multi-agent runtime layer (Lead + Role agents, Telegram bots, inter-agent message bus). The spec layer (`ai-orchestra/`) was unchanged in v2 — only new capabilities were added on top. Migration from 1.x to 2.x is additive: run `"upgrade orchestra"` to pick up the new spec artifacts; optionally activate the ensemble.

For projects jumping from 1.x to 3.0 directly, follow the 2.x → 3.0 migration above — the 1.x → 2.x step can be skipped.

---

### From `3.0.x` to `3.1`

v3.1 adds system-global ensemble installation and multi-project orchestration. All changes are additive.

| Change | Migration action | Breaking? |
|--------|----------------|-----------|
| System-global ensemble location (`~/.ai-orchestra/ensemble/`) | Optional. Run `npx @neverreven/ai-orchestra setup-ensemble --location=system-global` or ask agent `\"migrate ensemble to system level\"`. Existing project-local installs are unaffected. | No |
| `~/.ai-orchestra/projects.json` global registry | Created automatically on first `setup-ensemble` or `setup-project` run. No action needed for existing installs. | No |
| Web chat UI (`ENABLE_WEB_UI=true`) | Add to `ensemble/.env` and restart. Open with `npx @neverreven/ai-orchestra chat`. | No |

**Minimal migration path (3.0.x  3.1):**

```
1. npx @neverreven/ai-orchestra@latest init --force
2. Ask agent: "upgrade orchestra"
3. Confirm upgrade plan and apply
```

### From `3.1` to `3.2`

v3.2 adds Slack, voice messages, full web dashboard, GitHub PR review, Docker, autonomous orchestration, and the process daemon. All additive.

| Change | Migration action | Breaking? |
|--------|----------------|-----------|
| Slack integration | Add `SLACK_BOT_TOKEN`, `SLACK_APP_TOKEN`, `OWNER_SLACK_USER_ID`, `ENABLE_SLACK=true` to `ensemble/.env`. Ask agent `\"set up Slack\"`. | No |
| Voice messages | Add `OPENAI_API_KEY` to `ensemble/.env`. Telegram voice notes are transcribed automatically. | No |
| Web dashboard (replaces simple chat UI) | Automatic. If `ENABLE_WEB_UI=true` was already set, the dashboard UI is updated on next `bun install`. | No |
| GitHub webhook | Add `GITHUB_WEBHOOK_SECRET` + `GITHUB_TOKEN` to `ensemble/.env`. Ask agent `\"set up GitHub\"`. | No |
| Docker | `ensemble/Dockerfile` + `docker-compose.yml` are new in the package. Copy them and run `docker compose up -d`. | No |
| Process daemon | Run `bun run daemon` instead of `bun run dev` for auto-restart on crash. Or install as a system service: `bun run install-service`. | No |
| ChannelAdapter refactor | Internal change. Existing Telegram bots work unchanged. `TelegramAdapter` wraps the old Grammy logic transparently. | No |

**Minimal migration path (3.1  3.2):**

```
1. npx @neverreven/ai-orchestra@latest init --force
2. Ask agent: "upgrade orchestra"
3. Confirm upgrade plan
4. cd ensemble && bun install    # picks up @slack/bolt and new deps
```

---

## 5. Migrating from a non-orchestra setup to the orchestra

For projects that already have agentic infrastructure not produced by the orchestra (handcrafted `AGENTS.md`, custom `.cursor/rules/*.mdc`, project-specific skills), the orchestra's first-time install is itself a migration.

The procedure is exactly [`RUN.md`](RUN.md), with two emphases:

- **Phase 3 (existing-infra inventory)** is where everything you've built shows up.
- **Phase 5 (install plan)** treats every existing artifact with the appropriate conflict action: `skip` for project-owned files, `extend-section` for files where the orchestra adds to a managed area, `suffix-rename` if a name collision is unavoidable.

The [`_test-fixtures/ongoing-python-web/`](_test-fixtures/ongoing-python-web/) fixture is the canonical example of this scenario (existing `AGENTS.md` + existing project rule). Read its [`EXPECTED.md`](_test-fixtures/ongoing-python-web/EXPECTED.md) to see the orchestra's behaviour against partial pre-existing infrastructure.

If your existing setup is large or unusual, run the dry-run first, review the plan carefully, and use the `revise` reply (per [`RUN.md`](RUN.md) §6) to ask for adjustments before applying.

---

## 6. Migrating between IDEs

If a project changes IDE (e.g., Cursor → Claude Code), the orchestra supports running the relevant adapter against the same project. The previous adapter's installed files (`.cursor/`, etc.) remain in place — the orchestra does not remove them. This is intentional: a team may use multiple IDEs simultaneously.

The new IDE's adapter:

- Inventories existing infra including the previous adapter's files.
- Renders its own installed orchestration into the new IDE's locations.
- Records both adapters in the install marker's `adapters[]` (or equivalent — per the marker schema).

To **fully remove** the previous adapter's files, that's a manual operation outside the orchestra. The orchestra does not delete files in v1.

---

## 7. Rollback

The orchestra has no `rollback` command in v1. Rollback is:

- **Trivial for files we created:** delete `.cursor/`, `.claude/commands/<orchestra-skills>`, etc. The marker can be deleted to remove the registry entry.
- **Less trivial for managed sections in pre-existing files:** find the `<!-- ai-orchestra: managed-section start -->` and `<!-- ai-orchestra: managed-section end -->` markers in the file and delete the content between them, including the markers themselves.
- **Trivial for the install marker:** delete `.ai-orchestra/install.json`. Optionally delete the corresponding entry from `~/.ai-orchestra/projects.json`.

If you want clean uninstall tooling, that's v2 backlog. The current state is "deletable, with care."

---

## 8. References

- [`README.md`](README.md) — orchestra overview.
- [`VERSION`](VERSION) — current core version.
- [`CHANGELOG.md`](CHANGELOG.md) — orchestra evolution log; consult before any upgrade.
- [`RUN.md`](RUN.md) — bootstrap procedure (also drives upgrades via §10).
- [`core/registry/install.schema.md`](core/registry/install.schema.md) — install marker schema (compatibility policy enforced here).
- [`core/skills/audit/ai-infra-audit/SKILL.md`](core/skills/audit/ai-infra-audit/SKILL.md) — audit skill (the primary upgrade-time mechanism).
- [`core/skills/audit/upgrade/SKILL.md`](core/skills/audit/upgrade/SKILL.md) — non-destructive upgrade skill (manages folder rename, diff-and-consent for adapted skills, marker migration).
- [`core/skills/setup/setup-ensemble/SKILL.md`](core/skills/setup/setup-ensemble/SKILL.md) — Tier 2 activation skill.
- [`core/skills/setup/setup-telegram/SKILL.md`](core/skills/setup/setup-telegram/SKILL.md) — Tier 3 activation skill.
- [`core/stack-packs/_overview.md`](core/stack-packs/_overview.md) — stack-pack versioning (independent of core).
- [`_test-fixtures/ongoing-python-web/`](_test-fixtures/ongoing-python-web/) — fixture demonstrating partial-existing-infra migration.

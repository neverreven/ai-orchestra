# V4 Adapter Parity — `render-rules.md` Design Document

> **This is a design spec, not a final file.** The Sonnet pass (V4 adapter parity files) should use this document to write the three `render-rules.md` files for `claude-code/`, `codex/`, and `vscode/`, then update each adapter's `INSTALL.md` to reference the new file, and add a §9 idempotency check to each `post-install-checks.md`.

---

## 1. Why each adapter needs `render-rules.md`

Cursor's `render-rules.md` is the deepest rendering specification — it spells out exact frontmatter shapes, placeholder substitution, description synthesis, the stop-hook prompt body, and the stable-rendering / idempotency contract. The three non-Cursor adapters currently lack this file. Their `mappings.md` and `target-schema.md` contain rendering hints, but they lack the prescriptive, audit-verifiable detail that `render-rules.md` provides. This creates asymmetry:

- The audit skill can verify Cursor installations against `render-rules.md` but has no equivalent check for the other three.
- The idempotency contract is implicit in the three adapters (stated in `INSTALL.md` §5 as prose) rather than backed by a concrete, determinism-preserving spec.
- New features (scheduler, skill description disambiguation, always-on downgrade) are documented in the Cursor `render-rules.md` but only loosely cross-referenced in the other adapters' `mappings.md`.

---

## 2. Common section structure

All three new `render-rules.md` files should follow the same section numbering, adapted to the IDE's native concepts. Here is the canonical section plan:

| § | Section title | Content |
|---|--------------|---------|
| 1 | Why this is its own file | One-paragraph explanation (same rationale as Cursor §1, adapted). |
| 2 | Managed-section rendering conventions | The adapter's equivalent of "frontmatter" — how content is embedded in `CLAUDE.md`, `AGENTS.md`, or `.github/copilot-instructions.md`. Claude-Code and Codex use managed-section markers; VS Code uses the same markers. |
| 3 | Director rule rendering | How the Director rule body from `core/director/RULE.md` is rendered *into* the managed section (since none of these adapters have per-rule files in v1). Placeholder substitution table (same placeholders as Cursor §3.2). Conditional rendering for `{{ARCHITECTURE_DOC_PATH}}`. Body-verbatim contract. |
| 4 | Project-context rendering | How the identity block, roles list, skills list, non-negotiables, and pointers section are generated. Placeholder table. Deterministic ordering rules for roles, skills, stacks, frameworks. |
| 5 | Skill rendering | **Per adapter:** <br>• **Claude Code:** `.claude/commands/<skill-id>.md` — single file with `description:` frontmatter. §5.1 Frontmatter shape. §5.2 Description synthesis (identical to Cursor). §5.3 Body transforms (link rewriting, References stripping). §5.4 No auxiliary files (declared gap). §5.5 Description disambiguation on suffix-rename. <br>• **Codex:** No skill files — skills are referenced from `AGENTS.md`. §5 becomes "Skill catalog rendering" — how the trigger-phrase catalog in the managed section is built. Each skill entry: `- **<skill-id>** (<category>) — <summary line>. Trigger: '<phrase one>', '<phrase two>'.  Read: \`{{INSTALLED_FOLDER}}/core/skills/<category>/<skill-id>/SKILL.md\`.` §5.1 Catalog ordering (alphabetical by skill-id). §5.2 No suffix-rename for Codex (skills are not files). <br>• **VS Code:** `.github/prompts/<skill-id>.prompt.md` — single file with custom-prompt frontmatter. §5.1 Frontmatter shape (VS Code prompt convention: `mode`, `description`, `tools`). §5.2 Description synthesis (same as Cursor). §5.3 Body transforms. §5.4 No auxiliary files (declared gap). §5.5 Description disambiguation on suffix-rename. |
| 6 | Stop-hook prompt rendering | **Claude Code:** The exact prompt body (same template as Cursor with `{{DIRECTOR_RULE_PATH}}` = `CLAUDE.md`). Placeholder substitution table. Length budget note. <br>**Codex:** N/A — declared gap. Section should still exist but state: "Codex has no session-end hook. The stop-hook is a declared gap; see `INSTALL.md` §6. The scheduler integration and learnings review are described in `mappings.md` §5 as manual fallbacks." <br>**VS Code:** N/A — declared gap (same pattern as Codex). |
| 7 | Stack-pack content rendering | How stack-pack rules are inlined into the managed section (Claude Code, Codex) or into `.github/instructions/*.instructions.md` (VS Code future — v1 inlines into `copilot-instructions.md`). Pack-rule glob filtering per `mappings.md` §7/equivalent. |
| 8 | Stable rendering and idempotency | The determinism contract (same rules as Cursor §7): no map iteration order, no system time in rendered content, no random ids, no locale operations. Sorting rules for every iterable. |
| 9 | References | Standard cross-links. |

---

## 3. Per-adapter notes

### 3.1 Claude Code — `adapters/claude-code/render-rules.md`

**Key differences from Cursor:**

- No YAML frontmatter on the consolidated file (`CLAUDE.md`). The frontmatter convention applies only to skill files (`.claude/commands/<skill-id>.md`). §2 should cover the managed-section marker convention instead.
- The Director rule body is **embedded** in the managed section, not in a separate file. §3 explains how the full template from `core/director/RULE.md` (the markdown inside the code fence, starting at `# {{PROJECT_NAME}} — AI Director`) is extracted and placed into the managed section under the heading `## Director protocol (always-on)`.
- The stop-hook prompt body (§6) should include the same scheduler-first template as Cursor, with `{{DIRECTOR_RULE_PATH}}` = `CLAUDE.md`.
- Always-on downgrade on suffix-rename (currently in `mappings.md` §6.1) should be cross-referenced from §3 with a note that the renamed copy (`CLAUDE.orchestra.md`) gets a leading `> **Note:**` paragraph.

**Sections to write:**
1. Why this file exists
2. Managed-section marker conventions
3. Director rule rendering (embedded in managed section)
4. Project-context rendering (Identity, Roles, Skills, Pointers)
5. Skill rendering (`.claude/commands/<id>.md` — frontmatter, description synthesis, body transforms, disambiguation)
6. Stop-hook prompt rendering (`.claude/settings.json` hook prompt body)
7. Stack-pack content rendering (inline into managed section; glob filtering)
8. Stable rendering and idempotency
9. References

### 3.2 Codex — `adapters/codex/render-rules.md`

**Key differences from Cursor:**

- No per-rule files, no per-skill files. Everything lives in `AGENTS.md`'s managed section. §2 covers the managed-section marker convention.
- §5 becomes "Skill catalog rendering" — the skill catalog is a structured list inside the managed section. Each entry has the skill's id, category, summary, trigger phrases, and a pointer to the canonical skill path in the orchestra core. There is no frontmatter convention.
- No stop-hook. §6 exists as a stub stating the gap and pointing to the manual fallbacks.
- Stack-pack content is inlined into the managed section (same as Claude Code).
- No suffix-rename for skills (no skill files to rename). Suffix-rename applies only to `AGENTS.md` itself if the file has content the adapter can't safely extend.

**Sections to write:**
1. Why this file exists
2. Managed-section marker conventions
3. Director rule rendering (embedded in managed section)
4. Project-context rendering (Identity, Roles, Skill catalog, Pointers)
5. Skill catalog rendering (structured list in managed section; ordering; no files to write)
6. Stop-hook — declared gap (stub section)
7. Stack-pack content rendering (inline into managed section; glob filtering)
8. Stable rendering and idempotency
9. References

### 3.3 VS Code — `adapters/vscode/render-rules.md`

**Key differences from Cursor:**

- The consolidated context file is `.github/copilot-instructions.md` (not `CLAUDE.md`), mirrored to `AGENTS.md`.
- Skill files are `.github/prompts/<skill-id>.prompt.md`. The frontmatter convention follows VS Code Copilot's custom-prompt spec:
  ```yaml
  ---
  mode: "agent"
  description: "<synthesised description>"
  ---
  ```
  `mode: "agent"` makes the prompt available as a slash command in Copilot Chat. The `tools` key is omitted in v1 (no tools declared by orchestra prompts).
- No stop-hook (declared gap). §6 is a stub like Codex.
- Stack-pack content is inlined into the managed section of `copilot-instructions.md` in v1. §7 notes that v2 may move to per-pack `.github/instructions/<pack-id>.instructions.md` files with `applyTo` globs if VS Code stabilises that convention.

**Sections to write:**
1. Why this file exists
2. Managed-section marker conventions (`.github/copilot-instructions.md` + `AGENTS.md`)
3. Director rule rendering (embedded in managed section)
4. Project-context rendering
5. Skill rendering (`.github/prompts/<id>.prompt.md` — frontmatter, description synthesis, body transforms, disambiguation)
6. Stop-hook — declared gap (stub section)
7. Stack-pack content rendering (inline; future per-file note)
8. Stable rendering and idempotency
9. References

---

## 4. Changes to existing files

For each of the 3 adapters, the Sonnet pass should also:

### 4.1 `INSTALL.md`

Add a row to the `## 7. Files in this adapter` table:

```markdown
| [`render-rules.md`](render-rules.md) | Exact rendering rules for managed sections, skill files (if applicable), and stop-hook prompts. |
```

### 4.2 `post-install-checks.md`

Add a `§9. Idempotency check` section (or renumber if §9 exists):

```markdown
## 9. Idempotency check

**Check id:** `idempotency.zero-diff`

Re-render every artifact from the same inputs and compare against the files on disk.

| Expected | Check |
|----------|-------|
| Every rendered artifact is byte-identical to the file on disk. | Re-render via `render-rules.md` with the inputs from the install marker. Compare. Zero diff → `pass`. Any diff → report which file and which section diverged. |
| `history[]` did not grow. | Read the marker; the last `history[]` entry's `at` timestamp should match the install/upgrade timestamp, not now. |

This check proves the determinism contract from `render-rules.md` §8. If it fails, either the rendering has a source of non-determinism (bug) or a file was edited externally (expected — the audit surfaces this as drift).
```

### 4.3 Cross-references

Each adapter's `mappings.md` should get a small update in its references section pointing to the new `render-rules.md`:

```markdown
- [`render-rules.md`](render-rules.md) — exact rendering details for managed sections, skill files, and the stop-hook prompt body.
```

---

## 5. Quality gates

After writing the three files, the Sonnet pass should verify:

1. Every section in every new `render-rules.md` references concrete file paths (not "TBD" or "see Cursor").
2. The placeholder substitution tables are complete — every placeholder used in the rendered content is listed.
3. The description-synthesis formula matches Cursor's `render-rules.md` §5.2 exactly (including the 200-character truncation rule).
4. The idempotency section (§8) is consistent across all four adapters — same determinism rules, same sorting policy.
5. All new cross-references resolve (no broken relative links).

---

## 6. What this design does NOT cover

- Writing the actual `render-rules.md` files (that's the Sonnet pass).
- Deepening the `INSTALL.md` scope-mode sections (§9 in `mappings.md`) — Claude Code already has this; Codex and VS Code need equivalent §9 install-scope-handling sections. The Sonnet pass should copy the Claude Code pattern and adapt.
- Changes to `target-schema.md` — those are already adequate.

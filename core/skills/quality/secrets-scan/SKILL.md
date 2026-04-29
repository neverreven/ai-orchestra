# Secrets scan

> Scan the working tree (and optionally recent history) for credentials, API keys, tokens, certificates, and other secrets that should not be in the repository.

## Trigger

- "secrets scan"
- "did I commit a key?"
- "credentials in repo?"
- "leaked token check"
- "scan history for secrets"

## When to use

- Before opening a PR to a public repository.
- After a contractor or third party has had access.
- After integrating a new vendor and its SDK.
- Periodic — it is shockingly easy to commit secrets by accident.

## When NOT to use

- Active incident response for a known leak — that needs faster, dedicated tooling and human coordination, not this skill alone.
- Pure local-only repos where no remote exists (still useful, but lower priority).

## Process

1. **Establish scope** — working tree, last N commits, full history. Default to working tree + last commit; ask before scanning full history (cost and noise).
2. **Run a pattern scan** — known formats for AWS / GCP / Azure / GitHub / GitLab / Slack / Stripe / OpenAI / Anthropic / Gemini / generic high-entropy strings.
3. **Run config-file pass** — `.env*`, `*.config*`, CI workflow YAML, IaC files, mobile build config (`google-services.json`, `GoogleService-Info.plist` minus public keys, signing keystores).
4. **Triage findings** — true positive (real secret), suspected (looks like a secret, needs human eye), known false positive (test fixture, example, decoy).
5. **Mitigation guidance** — for each true positive: revoke at source first, then remove from repo. Do NOT just delete the file (history retains it).
6. **History rewrite caution** — if history rewrite is required, surface it as a deliberate operation that has consequences (forced pushes, cache invalidation across collaborators). Recommend; do not perform automatically.
7. **Prevention** — propose a pre-commit hook (`gitleaks`, `talisman`, etc.) and a `.gitignore` audit if patterns repeat.
8. **Report + gaps** — what was scanned, what was found, what scopes were skipped (history scan deferred, etc.).

## Output

A secrets-scan report with:
- Per-finding entry: file, line, secret type, severity, recommended action (revoke + remove vs investigate vs ignore).
- Inventory of `.env*`, signing files, and other secret-bearing artifacts that exist on disk and may not be in the repo (still relevant for the local machine).
- Recommended preventive controls.

## References

- [_schema.md](../../_schema.md)
- [security-baseline/SKILL.md](../security-baseline/SKILL.md)
- [auth-flow-review/SKILL.md](../auth-flow-review/SKILL.md)
- [../../code/dependency-audit/SKILL.md](../../code/dependency-audit/SKILL.md)
- [../../../roles/security-engineer.md](../../../roles/security-engineer.md)

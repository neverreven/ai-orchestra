# Dependency audit

> Inventory the project's runtime and tooling dependencies, surface CVEs and abandonment, and propose a low-risk update path. Stack-agnostic in process; the actual ecosystem (npm, pip, gem, cargo, NuGet, sfdx) is detected from the project profile.

## Trigger

- "audit dependencies"
- "check for outdated packages"
- "any CVEs?"
- "should I upgrade X?"
- "package vulnerability check"

## When to use

- Before a release.
- When a CVE notice arrives and the question is "are we exposed?"
- During quarterly maintenance.
- When a new dependency is being added — cross-check it against the audit's criteria.

## When NOT to use

- During active feature work — defer dependency surgery to a quiet branch.
- For evaluating a new framework or major architectural choice — use [write-technical-spec](../../docs/write-technical-spec/SKILL.md).

## Process

1. **Identify dependency manifests** from the project profile (`package.json`, `pyproject.toml`/`requirements.txt`, `Gemfile`, `Cargo.toml`, `*.csproj`, `pom.xml`, `sfdx-project.json` + `package.json` for SFRA).
2. **Resolve installed versions** from the lockfile if present (`package-lock.json`, `pnpm-lock.yaml`, `poetry.lock`, `Cargo.lock`, etc.). The skill operates on what is actually installed, not what is requested.
3. **Vulnerability check** — use the ecosystem's standard tool when available (`npm audit`, `pip-audit`, `bundler-audit`, `cargo audit`, `dotnet list package --vulnerable`). Where the tool is unavailable, surface that as a gap rather than fabricating results.
4. **Abandonment + drift** — flag deps with no release in > 18 months, or with major versions far behind, or whose repo is archived.
5. **Risk classification** — `critical` (known exploited CVE, abandoned + still in production path), `high` (CVE without exploit, very stale), `medium` (drift but no known issue), `low` (informational).
6. **Update path proposal** — for each high-risk item, propose a concrete bump (target version, rationale, expected scope of breakage). Do not auto-bump.
7. **Report + gaps** — what was checked, what was found, what couldn't be checked (network unavailable, tool missing).

## Output

A dependency report with:
- A risk-sorted table of dependencies with current → recommended versions.
- Per-item rationale and a link to the upstream advisory or release notes when available.
- Honest "not checked" section for items the agent could not validate.
- Suggested batching (which updates can ship together, which deserve their own PR).

## References

- [_schema.md](../../_schema.md)
- [../../quality/security-baseline/SKILL.md](../../quality/security-baseline/SKILL.md)
- [../../audit/pre-release/SKILL.md](../../audit/pre-release/SKILL.md)
- [../../../roles/security-engineer.md](../../../roles/security-engineer.md)
- [../../../roles/backend-engineer.md](../../../roles/backend-engineer.md)
- [../../../roles/devops-sre.md](../../../roles/devops-sre.md)

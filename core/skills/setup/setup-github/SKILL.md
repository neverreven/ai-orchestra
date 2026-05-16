# Setup GitHub Integration

> Connect the AI Orchestra ensemble to your GitHub repositories. GitHub events (PR opened, push, issues) are forwarded to the Lead agent via a webhook, which routes them to the appropriate role agents (frontend, backend, qa, security, devops) for automated PR review, change analysis, and task creation.

## Trigger

- "set up GitHub integration"
- "connect GitHub"
- "automate PR reviews"
- "set up GitHub webhook"
- "I want the Lead agent to review PRs"

## When to use

- The ensemble (Tier 2) is already running.
- You want automated PR review comments posted by the Lead agent aggregating role agent reports.
- You want GitHub push/issue events to automatically create tasks in the ensemble's task queue.

## When NOT to use

- The ensemble is not set up yet. Run `setup-ensemble` first.
- The repository is private and you cannot expose a webhook endpoint (use `deploy-docker` with a public URL instead, or use the ngrok forwarding approach below).

## Prerequisites

| Requirement | Why | How to check |
|-------------|-----|--------------|
| Ensemble running with web server | Webhooks need an HTTP endpoint | `ENABLE_WEB_UI=true` in `.env` and Lead is running |
| Public URL or ngrok tunnel | GitHub needs to reach your `/github` endpoint | See Step 2 |
| GitHub repository access | To create webhooks | Admin or webhook-creator role |

---

## Process

### Step 1 — Create a GitHub Personal Access Token (PAT)

1. Go to **GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens**.
2. Click **Generate new token**.
3. Set expiration (90 days recommended for production).
4. Under **Repository permissions**, grant:
   - **Pull requests**: Read and write
   - **Contents**: Read-only
   - **Checks**: Read and write (for check runs)
   - **Issues**: Read and write
5. Copy the token — this is your `GITHUB_TOKEN`.

### Step 2 — Expose the webhook endpoint

The ensemble's `/github` endpoint must be reachable by GitHub. Options:

**Option A — ngrok (local development):**
```bash
ngrok http 3847
# Note the https://xxxx.ngrok.io URL
```

**Option B — Docker with reverse proxy (production):** see `deploy-docker/SKILL.md`

**Option C — Railway / Render / Fly.io:** deploy the ensemble and use its public URL.

### Step 3 — Create the GitHub webhook

1. Go to your repository on GitHub → **Settings → Webhooks → Add webhook**.
2. Payload URL: `https://your-public-url/github`
3. Content type: `application/json`
4. Secret: generate a random string (e.g. `openssl rand -hex 32`) — save it as `GITHUB_WEBHOOK_SECRET`
5. Events to subscribe to:
   - ✅ Pull requests
   - ✅ Pushes
   - ✅ Issues
6. Click **Add webhook**.

### Step 4 — Configure the ensemble

Add to `<ensemble-path>/.env`:

```
GITHUB_TOKEN=github_pat_...
GITHUB_WEBHOOK_SECRET=<your-random-secret>
```

Install the dependency:
```bash
cd <ensemble-path> && bun add @octokit/rest
```

### Step 5 — Restart the Lead agent

```bash
cd <ensemble-path> && bun run dev:lead
```

### Step 6 — Test

1. Open a PR on your repository (or re-open an existing one).
2. GitHub sends a webhook to your endpoint.
3. The Lead agent receives the PR event and delegates a review to role agents.
4. The aggregated review is posted as a PR review comment within 1-2 minutes.

### Step 7 — Verify webhook delivery (optional)

In GitHub → Settings → Webhooks → click your webhook → **Recent Deliveries**. A `200 OK` response confirms successful ingestion.

---

## PR Review Workflow

When a `pull_request` event with action `opened` or `synchronize` arrives:

1. Lead agent fetches the full unified diff via Octokit.
2. Diff is split by file path and routed to relevant role agents:
   - Frontend files → `frontend` agent
   - Backend/API files → `backend` agent
   - Test files → `qa` agent
   - Auth/secrets → `security` agent
   - CI/Docker configs → `devops` agent
3. Each role agent reviews its chunk and reports back.
4. Lead aggregates all reports and posts a single GitHub PR review comment.
5. If a check run is configured (`GITHUB_CHECK_RUN=true`), a named check is created.

---

## Output

- `GITHUB_TOKEN` and `GITHUB_WEBHOOK_SECRET` configured in ensemble `.env`
- GitHub webhook delivering events to `/github`
- Automated PR review comments from the Lead agent

## References

- [setup-ensemble/SKILL.md](../setup-ensemble/SKILL.md)
- [deploy-docker/SKILL.md](../deploy-docker/SKILL.md)
- GitHub Webhooks: https://docs.github.com/en/webhooks

## Model hint

- **Preferred:** `sonnet`
- **Reason:** Step-by-step walkthrough with external browser actions.

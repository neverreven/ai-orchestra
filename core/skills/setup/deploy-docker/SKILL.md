# Deploy Ensemble with Docker

> Package the entire AI Orchestra Tier 2 ensemble (Lead + Role agents + web dashboard) into a Docker container. Suitable for running on a cloud VM, Raspberry Pi, or home server with `restart: unless-stopped` so agents survive reboots.

## Trigger

- "deploy ensemble with Docker"
- "run the ensemble in Docker"
- "containerise the agents"
- "I want the orchestra running as a service"
- "deploy with docker-compose"

## When to use

- You want the ensemble to run 24/7 on a server rather than a developer laptop.
- You need a public URL for the GitHub webhook or web dashboard.
- You want the ensemble to auto-restart after a crash or server reboot.

## When NOT to use

- You just need the ensemble running locally for development — use `bun run dev:all` instead.
- The daemon service (W6) is sufficient — use `setup-daemon` if you only need local process management.

---

## Prerequisites

| Requirement | How to check |
|-------------|--------------|
| Docker Engine 24+ | `docker --version` |
| Docker Compose v2 | `docker compose version` |
| A valid `ensemble/.env` file | All required tokens must be present |

---

## Process

### Step 1 — Configure `.env`

Ensure `ensemble/.env` has all required variables:

```
ANTHROPIC_API_KEY=...

# Telegram (optional)
TELEGRAM_BOT_TOKEN=...
OWNER_TELEGRAM_ID=...

# Slack (optional)
SLACK_BOT_TOKEN=...
SLACK_APP_TOKEN=...
OWNER_SLACK_USER_ID=...

# GitHub (optional)
GITHUB_TOKEN=...
GITHUB_WEBHOOK_SECRET=...

# Web dashboard — MUST be enabled so the health check passes
ENABLE_WEB_UI=true
WEB_UI_PORT=3847
WEB_UI_TOKEN=choose-a-strong-secret

# CWD for agents — use the in-container path if bind-mounting a project
CWD=/projects/my-project
```

### Step 2 — Mount project directories

Open `ensemble/docker-compose.yml` and add a volume entry for each project you want the agents to access:

```yaml
volumes:
  - type: bind
    source: /absolute/host/path/to/project
    target: /projects/my-project
    read_only: false
```

Set `CWD=/projects/my-project` in `.env` so agents know where to work.

> ⚠️ **Critical:** Agents need read-write access to the mounted project directories. The `CWD` env var must be the **in-container** path, not the host path.

### Step 3 — Build and start

```bash
cd ensemble

# Build the image
docker compose build

# Start in the background
docker compose up -d

# Check logs
docker compose logs -f ensemble
```

### Step 4 — Verify

```bash
# Check health
docker compose ps

# Access the dashboard
open http://localhost:3847   # or the server's public IP
```

The dashboard should load with all tabs functional.

### Step 5 — Expose publicly (for GitHub webhooks)

To receive GitHub webhooks, the container needs a public URL. Options:

**Option A — Nginx reverse proxy (recommended):**
```nginx
server {
    listen 443 ssl;
    server_name orchestra.yourdomain.com;
    ssl_certificate     /etc/letsencrypt/live/orchestra.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/orchestra.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3847;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

**Option B — Cloudflare Tunnel (zero-config, free):**
```bash
cloudflared tunnel --url http://localhost:3847
# Use the provided *.trycloudflare.com URL for your webhook
```

**Option C — ngrok (development only):**
```bash
ngrok http 3847
```

### Step 6 — Register the public URL with GitHub

See `setup-github/SKILL.md` for the webhook registration steps. Use:
- Payload URL: `https://your-public-url/github`
- Secret: the value of `GITHUB_WEBHOOK_SECRET` in `.env`

---

## Day-2 Operations

### Update the ensemble

```bash
cd ensemble
git pull
docker compose build
docker compose up -d
```

### View logs
```bash
docker compose logs -f ensemble
```

### Stop
```bash
docker compose down
```

### Remove all data (state + logs)
```bash
docker compose down -v
```

---

## Output

- Docker image: `ai-orchestra-ensemble:latest`
- Container: `ai-orchestra-ensemble` running with `restart: unless-stopped`
- Dashboard available at `http://<host>:3847`
- `/github` webhook endpoint available for GitHub integration

## References

- [setup-github/SKILL.md](../setup-github/SKILL.md)
- [setup-daemon/SKILL.md](../setup-daemon/SKILL.md) (local alternative)
- Docker Compose docs: https://docs.docker.com/compose/

## Model hint

- **Preferred:** `sonnet`
- **Reason:** Step-by-step infrastructure setup with terminal commands and config files.

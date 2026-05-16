# AI Orchestra Ensemble — Dockerfile
# Runs all Tier 2 agents (Lead + Role agents) in a single process.
#
# Build:   docker build -t ai-orchestra-ensemble .
# Run:     docker compose up   (preferred; see docker-compose.yml)

FROM oven/bun:1 AS base
WORKDIR /app

# ── Dependency installation stage ──────────────────────────────────────────────
# Copy manifests first for better layer caching

COPY package.json bunfig.toml* ./
COPY agents-framework/package.json agents-framework/
COPY projects/lead/package.json     projects/lead/
COPY projects/frontend/package.json projects/frontend/
COPY projects/backend/package.json  projects/backend/
COPY projects/qa/package.json       projects/qa/
COPY projects/devops/package.json   projects/devops/
COPY projects/security/package.json projects/security/

RUN bun install --frozen-lockfile

# ── Application stage ──────────────────────────────────────────────────────────
FROM base AS app
WORKDIR /app

# Copy all source files
COPY . .

# State directory (bus files live here — mounted as a volume in production)
RUN mkdir -p .state/lead .state/frontend .state/backend .state/qa .state/devops .state/security

# Logs directory
RUN mkdir -p logs

# Create non-root user for security
RUN addgroup --system orchestra && adduser --system --group orchestra
RUN chown -R orchestra:orchestra /app

USER orchestra

# ── Runtime ────────────────────────────────────────────────────────────────────
# Expose web chat / dashboard port and webhook port
EXPOSE 3847

# Health check — pings the web dashboard (requires ENABLE_WEB_UI=true)
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD bun -e "await fetch('http://localhost:3847/').then(r => { if(!r.ok) process.exit(1) })" || exit 1

# Default: run all agents
CMD ["bun", "run", "dev:all"]

# Setup Daemon / Run Ensemble as a Service

> Keep the AI Orchestra ensemble running persistently — surviving crashes and machine reboots — by installing it as a system service. No more manual `bun run dev:all` sessions.

## Trigger

- "keep ensemble running"
- "run ensemble as a service"
- "set up the daemon"
- "install as a system service"
- "auto-start the orchestra on boot"
- "I don't want to manually restart the agents"

## When to use

- The ensemble is already installed and configured (`.env` complete, `bun run dev:all` works).
- You want the agents to start automatically after a reboot.
- You want the ensemble to auto-restart on crash without manual intervention.

## When NOT to use

- You're still in development/testing (just use `bun run dev:all`).
- You're using Docker (`restart: unless-stopped` already covers this — see `deploy-docker/SKILL.md`).

---

## Quick start

```bash
cd <ensemble-path>

# Install and start the system service
bun run install-service --auto

# Or just generate the service file without installing
bun run install-service --print
```

---

## How it works

The daemon wraps `bun run dev:all` in a restart loop:

| Consecutive crashes | Wait before restart |
|--------------------|--------------------|
| 1st | 1 second |
| 2nd | 2 seconds |
| 3rd | 4 seconds |
| 4th | 8 seconds |
| 5th | 16 seconds |
| 6th+ | 30–60 seconds (capped) |

If the process runs stably for 30+ seconds, the backoff counter resets. After 20 consecutive crashes, the daemon gives up and exits (to prevent runaway loops — fix the underlying issue first).

**PID file:** `~/.ai-orchestra/ensemble.pid`
**Log file:** `~/.ai-orchestra/daemon.log`

---

## Platform-specific steps

### macOS — launchd

```bash
# Generate + install plist
bun run install-service --auto

# Manual management:
launchctl load ~/Library/LaunchAgents/ai.orchestra.ensemble.plist
launchctl unload ~/Library/LaunchAgents/ai.orchestra.ensemble.plist
launchctl list ai.orchestra.ensemble
```

**Note:** The service runs as your user account, not root. It starts when you log in.

### Linux — systemd (user session)

```bash
# Generate + install unit file
bun run install-service --auto

# Manual management:
systemctl --user status ai-orchestra-ensemble
systemctl --user enable --now ai-orchestra-ensemble.service
systemctl --user disable ai-orchestra-ensemble.service

# View logs
journalctl --user -u ai-orchestra-ensemble -f
```

**Note:** User systemd services require `loginctl enable-linger <username>` to run without an active login session.

```bash
loginctl enable-linger $(whoami)
```

### Windows — Task Scheduler

```bash
# Generate XML (run from ensemble directory)
bun run install-service

# Install (run in elevated PowerShell):
schtasks /Create /XML "$HOME\.ai-orchestra\ai-orchestra-ensemble.xml" /TN "AI Orchestra Ensemble" /F

# Start now:
schtasks /Run /TN "AI Orchestra Ensemble"

# Check status:
schtasks /Query /TN "AI Orchestra Ensemble" /FO LIST

# Disable:
schtasks /Change /TN "AI Orchestra Ensemble" /Disable
```

---

## Running the daemon directly (no system service)

If you just want crash-recovery without system integration:

```bash
cd <ensemble-path>
bun run daemon
# Runs in the foreground; Ctrl+C for graceful shutdown
```

---

## Logs

All daemon output and restart events are logged to:
```
~/.ai-orchestra/daemon.log
```

Tail in real-time:
```bash
# Unix
tail -f ~/.ai-orchestra/daemon.log

# Windows PowerShell
Get-Content "$HOME\.ai-orchestra\daemon.log" -Wait -Tail 50
```

---

## Output

- System service registered and running
- Ensemble auto-starts on login/boot
- Ensemble auto-restarts on crash with exponential backoff

## References

- [deploy-docker/SKILL.md](../deploy-docker/SKILL.md) — Docker alternative for server deployments
- [setup-ensemble/SKILL.md](../setup-ensemble/SKILL.md)

## Model hint

- **Preferred:** `sonnet`
- **Reason:** Short guided setup with a small number of terminal commands, no complex reasoning needed.

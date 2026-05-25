# Windows Health Monitor — From Bug to Published Plugin

> How debugging a 30-second gateway response time led to creating the first Windows-specific OpenClaw toolkit on ClawHub.

## The Story

### It started with a performance regression

On May 24, 2026, after upgrading OpenClaw from 2026.5.20 to 2026.5.22, health checks went from **226ms to 26,000ms** — a 115x slowdown. Every CLI command took 20-30 seconds. Event loop reports showed `degraded p99=28s util=100%`.

### Hours of debugging revealed the truth

After stripping config blocks, switching model providers, patching source code, and running dozens of diagnostic commands, the breakthrough came: **the gateway HTTP endpoint responded in 70ms**. The gateway itself was perfectly fast. The CLI health command was the bottleneck — it does an expensive WebSocket auth handshake on Windows that the HTTP endpoint skips.

The real issue? `warmCurrentProviderAuthState()` in 2026.5.22 synchronously probes EVERY provider for EVERY agent at startup, blocking the event loop for 30-79 seconds on constrained hosts. This affected the CLI tool most heavily.

### The idea

While debugging, I built a diagnostic workflow:

```bash
# Check health
openclaw health --json

# Check Windows Scheduled Task
Get-ScheduledTask -TaskName "OpenClaw Gateway"

# Check for prewarm blocking
Select-String "provider auth state pre-warmed" .openclaw/logs/*.log

# Check for stuck subagents
Select-String "restart.*deferred.*background task" .openclaw/logs/*.log
```

This was manual and repetitive. Every Windows OpenClaw user was going to hit the same issues. No Windows-specific tooling existed on ClawHub. So I built it.

## What It Does

### Skill (`windows-health-monitor`)

Agent-installed diagnostics. Ask your agent:

- "Run a winhealth_check" → Quick health snapshot (event loop, channels, Windows task, prewarm, alerts)
- "Run winhealth_diagnostics" → Full diagnostic bundle with logs, status, channel probes
- "Show active alerts" → List, dismiss, or clear health alerts

### Plugin (`@jordan-thirkle/openclaw-winhealth`)

Background monitoring service:
- Polls gateway health every 5 minutes
- Detects: event loop degradation, WhatsApp disconnects, Windows task stalls, prewarm blocking, stuck subagents
- Alerts via WhatsApp when thresholds breach
- Configurable thresholds (event loop p99, memory RSS)

## Install

```bash
# Skill (agent commands)
openclaw skills install windows-health-monitor

# Plugin (background monitoring)
openclaw plugins install clawhub:@jordan-thirkle/openclaw-winhealth
```

## Config

```json5
{
  "plugins": {
    "allow": ["winhealth"],
    "entries": {
      "winhealth": {
        "enabled": true,
        "config": {
          "pollIntervalMinutes": 5,
          "eventLoopThresholdMs": 5000,
          "alertChannel": "whatsapp",
          "alertTarget": "+15555550123"
        }
      }
    }
  }
}
```

## Alert Examples

```
⚠️ OpenClaw Health Alert
[CRITICAL] Event loop degraded: p99=8500ms (threshold 5000ms)
Consider: OPENCLAW_SKIP_PROVIDER_AUTH_PREWARM=1
```

## Known Windows Issues Detected

| Issue | How |
|---|---|
| 2026.5.22 prewarm blocking | Log scan for 30-79s prewarm times |
| CLI health slowness | CLI vs HTTP response delta |
| Stuck background subagents | Log scan for deferred restart patterns |
| WhatsApp reconnection | Channel health probe |
| Scheduled Task stall | Windows Task Scheduler state check |
| Event loop saturation | P99 delay + utilization monitoring |

## The Stack

- **Plugin SDK:** `openclaw/plugin-sdk` with `definePluginEntry`
- **Tools:** `winhealth_check`, `winhealth_diagnostics`, `winhealth_alerts`
- **Hooks:** `gateway_start` (initialize monitor), `gateway_stop` (cleanup)
- **Config:** 9 operator-configurable fields with schema validation
- **Alerts:** WhatsApp via `openclaw message send`
- **Platform:** Windows-only (`os: ["win32"]` in SKILL.md)

## Links

- GitHub: https://github.com/jordan-thirkle/openclaw-winhealth
- ClawHub Skill: https://clawhub.ai/jordan-thirkle/windows-health-monitor
- ClawHub Plugin: https://clawhub.ai/plugins/@jordan-thirkle/openclaw-winhealth
- Related PR: https://github.com/openclaw/openclaw/pull/86245 (prewarm env var)
- Related Issue: https://github.com/openclaw/openclaw/issues/85999 (prewarm blocking)

## Architecture

```
Gateway Startup
  └─ gateway_start hook
       ├─ Initial check (60s grace)
       └─ setInterval (5m)
            ├─ HTTP health probe (127.0.0.1:18789/health)
            ├─ Windows task check (Get-ScheduledTask)
            ├─ Prewarm detection (log grep)
            ├─ Stuck subagent detection (log grep)
            ├─ Threshold evaluation
            └─ WhatsApp alert

Agent Turn
  ├─ winhealth_check tool → JSON snapshot
  ├─ winhealth_diagnostics tool → Full bundle
  └─ winhealth_alerts tool → Alert management
```

## The Author

Built by Jordan Thirkle during a single debugging session that turned into a deep understanding of OpenClaw on Windows. Licensed MIT.

https://jordanthirkle.com | https://github.com/jordan-thirkle

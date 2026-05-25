# OpenClaw Windows Health Monitor 🩺

> Diagnose and fix Windows-specific OpenClaw issues. Background health polling, WhatsApp alerts, event loop monitoring, and automated diagnostics.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Platform: Windows](https://img.shields.io/badge/Platform-Windows-0078D6.svg)](#)
[![OpenClaw](https://img.shields.io/badge/OpenClaw-≥2026.5.0-6C47FF.svg)](https://openclaw.ai)

## Why This Exists

OpenClaw on Windows has unique performance characteristics that differ from Linux/macOS. After extensive debugging of the 2026.5.22 performance regression (event loop blocking, CLI tool slowness, prewarm bottlenecks), I built this to automatically detect and diagnose these issues.

**No other Windows-specific tooling exists for OpenClaw.** This is the first.

## Features

### 🔍 Health Checks
- **Gateway health snapshot** — event loop (p99, max, utilization), channel status, memory
- **Windows Scheduled Task** — state, last result, last run time
- **Prewarm detection** — identifies 2026.5.22+ provider auth prewarm blocking (30-79s stalls)
- **Stuck subagent detection** — finds background subagents blocking gateway restart
- **CLI vs HTTP delta** — the key discovery: CLI tool can be 20-30x slower than HTTP endpoint on Windows

### 🚨 Alerts
- WhatsApp alerts when thresholds breach
- Configurable thresholds (event loop p99, memory RSS)
- Alert management (list, dismiss, clear)
- Auto-diagnose on critical alerts

### 🩺 Diagnostics
- Full diagnostic bundle export (`openclaw gateway diagnostics export`)
- Recent log tail extraction
- Channel health probe
- Gateway status summary

### 📊 Background Monitoring
- Periodic health polling (configurable, default 5 minutes)
- Automatic alert generation on degradation
- Non-blocking — uses `gateway_start` lifecycle hook
- Zero-dependency core (uses OpenClaw SDK only)

## Installation

### Prerequisites

- OpenClaw ≥ 2026.5.0
- Node.js ≥ 22.19
- Windows 10/11 (native or WSL2)

### Install the Plugin

```bash
openclaw plugins install clawhub:@jordan-thirkle/openclaw-winhealth
```

### Install the Skill

```bash
openclaw skills install windows-health-monitor
```

Restart the gateway to load the plugin:

```bash
openclaw gateway restart
```

## Configuration

Add to your `openclaw.json`:

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
          "memoryThresholdMB": 1024,
          "alertChannel": "whatsapp",
          "alertTarget": "+15555550123",
          "autoDiagnose": true,
          "checkPrewarm": true,
          "checkWindowsTask": true,
          "checkBackgroundSubagents": true
        }
      }
    }
  }
}
```

### Config Reference

| Field | Type | Default | Description |
|---|---|---|---|
| `enabled` | boolean | `true` | Enable/disable background monitoring |
| `pollIntervalMinutes` | integer | `5` | Minutes between health checks (1-60) |
| `eventLoopThresholdMs` | integer | `5000` | Event loop p99 threshold for alert (500-30000) |
| `memoryThresholdMB` | integer | `1024` | Memory RSS threshold for alert (256-8192) |
| `alertChannel` | string | `"whatsapp"` | Alert channel: "whatsapp", "telegram", or "none" |
| `alertTarget` | string | `""` | Target for alerts (phone number or user ID) |
| `autoDiagnose` | boolean | `true` | Auto-run diagnostics on critical alerts |
| `checkPrewarm` | boolean | `true` | Check for provider auth prewarm blocking |
| `checkWindowsTask` | boolean | `true` | Check Windows Scheduled Task health |
| `checkBackgroundSubagents` | boolean | `true` | Check for stuck background subagents |

## Usage

### Agent Tools

Once the plugin is loaded, agents can use three tools:

| Tool | Purpose |
|---|---|
| `winhealth_check` | Quick health snapshot — event loop, channels, Windows task, prewarm, alerts |
| `winhealth_diagnostics` | Full diagnostic bundle — export, logs, status, channels |
| `winhealth_alerts` | Manage alerts — list, dismiss, clear |

Ask your agent:

> "Run a winhealth_check and tell me if anything is wrong."

> "Run winhealth_diagnostics and summarize the findings."

> "Show me active winhealth alerts."

### Manual CLI

The skill also provides manual diagnostic commands:

```bash
# Quick health snapshot
openclaw health --verbose --json

# Channel status
openclaw channels status --probe

# Windows task
Get-ScheduledTask -TaskName "OpenClaw Gateway"

# Full diagnostic export
openclaw gateway diagnostics export
```

## Alert Examples

### Event Loop Degradation
```
⚠️ OpenClaw Health Alert
[CRITICAL] Event loop degraded: p99=8500ms (threshold 5000ms)

Consider: OPENCLAW_SKIP_PROVIDER_AUTH_PREWARM=1
```

### Stuck Subagents
```
⚠️ OpenClaw Health Alert
[CRITICAL] 4 background subagent(s) blocking gateway restart
```

### Prewarm Detection
```
⚠️ OpenClaw Health Alert
[WARNING] Provider auth prewarm slow: 68000ms. Consider OPENCLAW_SKIP_PROVIDER_AUTH_PREWARM=1
```

## Known Windows Issues This Detects

| Issue | Detection |
|---|---|
| **2026.5.22 prewarm blocking** | Log check for `provider auth state pre-warmed in Xms eventLoopMax=Yms` |
| **CLI tool slowness** | Health via HTTP vs CLI response time delta |
| **Stuck background subagents** | Log check for `restart.*deferred.*background task.*active` |
| **WhatsApp reconnection storm** | Channel health probe + connection age |
| **Scheduled Task stall** | `Get-ScheduledTask` state check |
| **Memory pressure** | RSS threshold monitoring |
| **Event loop saturation** | p99 delay + utilization monitoring |

## Architecture

```
Gateway Startup
  │
  └─ gateway_start hook
       │
       ├─ Initial health check (60s grace)
       └─ setInterval (configurable, default 5m)
            │
            ├─ HTTP health probe (127.0.0.1:18789/health)
            ├─ Windows task check (Get-ScheduledTask)
            ├─ Prewarm detection (log grep)
            ├─ Stuck subagent detection (log grep)
            │
            ├─ Threshold evaluation
            └─ Alert routing (WhatsApp)
```

## Development

```bash
git clone https://github.com/jordan-thirkle/openclaw-winhealth.git
cd openclaw-winhealth
npm install

# Test locally
openclaw plugins install .
openclaw plugins inspect winhealth --runtime --json
```

### Publish to ClawHub

```bash
# Dry run
npm run publish:clawhub:dry

# Publish
npm run publish:clawhub
```

## Contributing

Issues and PRs welcome. Before submitting:
1. Test on Windows 10/11 native
2. Run `openclaw plugins inspect winhealth --runtime --json`
3. Include reproduction steps for any issues

## Related Projects

- [OpenClaw PR #86245](https://github.com/openclaw/openclaw/pull/86245) — Env var to skip provider auth prewarm
- [OpenClaw-Viz PR #3](https://github.com/sltogethertao-sudo/openclaw-viz/pull/3) — Fix calver compatibility
- [OpenClaw Issue #85999](https://github.com/openclaw/openclaw/issues/85999) — Prewarm event loop blocking

## License

MIT © Jordan Thirkle

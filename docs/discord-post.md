# 🩺 Windows Health Monitor for OpenClaw — v1.3.0

**First system health monitoring tool on ClawHub.** Cross-platform (Windows + Linux + macOS). Background monitoring, WhatsApp/Telegram alerts, real-time dashboard.

## Quick Stats
- 27 automated tests (first ClawHub plugin with test suite)
- 3 agent tools: winhealth_check, winhealth_diagnostics, winhealth_alerts
- Background health polling every 5 minutes
- Professional HTML dashboard with live data
- MIT licensed, open source

## What It Monitors
- Event loop health (p99, max, utilization)
- Channel connectivity (WhatsApp, Telegram)
- Agent availability
- Memory pressure
- Provider auth prewarm blocking (2026.5.22+ regression)
- Stuck background subagents
- Windows Task Scheduler state (on Windows)

## Install
```
openclaw skills install windows-health-monitor
openclaw plugins install clawhub:@jordan-thirkle/openclaw-winhealth
```

## Links
- GitHub: https://github.com/jordan-thirkle/openclaw-winhealth
- ClawHub Plugin: https://clawhub.ai/plugins/@jordan-thirkle/openclaw-winhealth
- ClawHub Skill: https://clawhub.ai/jordan-thirkle/windows-health-monitor
- Blog: https://jordanthirkle.com/blog/openclaw-winhealth-launch
- Dashboard: Open dashboard/index.html in any browser

Built from real debugging experience. Contributions welcome.

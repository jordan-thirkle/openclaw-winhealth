# Security & Privacy Disclosure

This document describes the security and privacy properties of the OpenClaw Cross-Platform Health Monitor. It addresses all findings from the [SkillSpector security audit](https://clawhub.ai/plugins/@jordan-thirkle/openclaw-winhealth/security-audit).

## Data Collected

The plugin collects the following operational metrics from your OpenClaw gateway:

| Data | Source | Purpose |
|---|---|---|
| Event loop delay (p99, max, utilization) | `openclaw health --json` | Detect performance degradation |
| Channel status (WhatsApp/Telegram connected/healthy) | `openclaw channels status --probe` | Detect channel disconnections |
| Active agent names | `openclaw status --all` | Agent health awareness |
| Memory RSS | `openclaw health --json` | Memory pressure detection |
| Windows Scheduled Task state | `Get-ScheduledTask` (Windows only) | Detect gateway task failures |
| Provider auth prewarm metrics | Gateway log (regex extraction) | Detect prewarm blocking |
| Stuck background subagent count | Gateway log (regex extraction) | Detect stuck subagents |

## Data Never Collected

- Message content, user conversations, or chat history
- API keys, tokens, or credentials (except one — see below)
- File system contents beyond gateway log files in `%TEMP%\openclaw`
- Screenshots, video, or clipboard data
- Browser history or other application data

## Token Handling

The plugin reads `OPENCLAW_GATEWAY_TOKEN` from the user environment variable. This token is used **exclusively** for making localhost health probes to `http://127.0.0.1:18789/health`. The token is:

- **Never logged** in plaintext
- **Never transmitted** to external services
- **Never persisted** beyond the lifetime of the health check command
- **Never included** in alert payloads or diagnostic bundles

The health probe command runs as a subprocess using `api.runtime.system.runCommandWithTimeout`, which passes the token through the environment of a child PowerShell process. After the command completes, the subprocess terminates and the token is released.

## Diagnostic Bundles

The `winhealth_diagnostics` tool and `openclaw gateway diagnostics export` command create a zip archive containing:

- Stability bundle (event loop history, memory metrics, session state)
- Sanitized log metadata (timestamps, log levels, message text — **not** raw log JSON)
- Gateway status/health snapshots
- Config structure outline (secrets redacted by OpenClaw's built-in sanitation)

**Before sharing a diagnostic bundle**, review its contents. While OpenClaw redacts secrets, the sanitized archive may still contain:

- System hostname or username (if present in log messages)
- Third-party service names you interact with via OpenClaw
- Timestamps correlating to your activity patterns
- Installed plugin names and versions

Share diagnostic bundles only with trusted recipients and only for troubleshooting purposes.

## External Alert Transmission

Alert messages are **only** transmitted to external messaging platforms when ALL of the following conditions are met:

1. `alertChannel` is set to `"whatsapp"` or `"telegram"` (default: `"none"`)
2. `alertTarget` is configured with a valid destination
3. A health threshold is breached (event loop p99 exceeds threshold, task state unhealthy, etc.)

### What Alert Messages Contain

```
⚠️ OpenClaw Health Alert
[WARNING] Event loop degraded: p99=8500ms (threshold 5000ms)

Run 'winhealth_check' or 'winhealth_diagnostics' for details.
Consider: OPENCLAW_SKIP_PROVIDER_AUTH_PREWARM=1
```

Alert payloads include:
- Severity level (warning/critical)
- The specific metric that triggered the alert (e.g., "p99=8500ms")
- Recommended remediation actions

Alert payloads **do not** include:
- API keys or credentials
- Channel authentication tokens
- User conversation history
- System configuration values
- File paths or environment variable values (unless explicitly embedded in a metric name, such as the prewarm env var suggestion)

## Dashboard Token Persistence

The WinHealth dashboard (`dashboard/index.html`) requires your gateway token to make health API requests. By default in v1.4.0+, the token is stored in `sessionStorage` and is automatically cleared when you close the browser tab.

### Security Considerations

- **Shared workstations**: Anyone with access to the browser on your workstation can read `localStorage` values for `localhost:18789`. Use the session-only option.
- **XSS risk**: If any other page served from the same origin (`127.0.0.1:18789`) is compromised with XSS, it could read the stored token. This risk is mitigated by OpenClaw's localhost-only gateway binding.
- **Recommendation**: Always use the session-only storage option. Clear your browser storage periodically. Do not use the dashboard on shared or public computers.

## Plugin Startup Behavior

The plugin activates on gateway startup (`onStartup: true`). This is necessary for continuous health monitoring. However:

- Alerts are **off by default** (`alertChannel: "none"`)
- Auto-diagnosis is **off by default** (`autoDiagnose: false`)
- You can disable the background monitor entirely by setting `enabled: false`
- The plugin performs read-only health probes — it does not modify your configuration or gateway state

## Security Best Practices

### Minimal Alerting
```json5
{
  "plugins": {
    "entries": {
      "winhealth": {
        "enabled": true,
        "config": {
          "alertChannel": "none",
          "autoDiagnose": false
        }
      }
    }
  }
}
```

### Monitoring Without External Transmission
Set `alertChannel: "none"` and the plugin will monitor locally, logging alerts to the gateway console only. No data leaves your machine.

### Full Alert Pipeline (Opt-In)
```json5
{
  "plugins": {
    "entries": {
      "winhealth": {
        "enabled": true,
        "config": {
          "alertChannel": "whatsapp",
          "alertTarget": "+15555550123",
          "autoDiagnose": false
        }
      }
    }
  }
}
```

Only enable external alert channels after reviewing this document and understanding what data your alerts will contain.

## Vulnerability Reporting

Found a security issue? Please do **not** open a public issue. Instead, email the maintainer directly or report via the [GitHub Security Advisories](https://github.com/jordan-thirkle/openclaw-winhealth/security/advisories) page.

## Audit History

| Date | Auditor | Findings | Resolution |
|---|---|---|---|
| 2026-05-26 | NVIDIA SkillSpector v2.4.2 | 11 findings (1 High, 10 Medium) | v1.4.0 — all findings addressed |

/**
 * Background health monitor hook.
 *
 * Capabilities:
 * 1. Periodic gateway health polling (HTTP probe to localhost)
 * 2. Event loop degradation detection with configurable thresholds
 * 3. Windows Scheduled Task state monitoring
 * 4. Optional external alert delivery (WhatsApp/Telegram) — gated behind
 *    config.alertChannel !== "none" AND config.alertTarget is set.
 *    Disabled by default. See SECURITY.md for full disclosure.
 *
 * Token handling:
 * OPENCLAW_GATEWAY_TOKEN is read from the environment for localhost health
 * probes only. It is never logged, persisted, or transmitted externally.
 * It is passed to a child PowerShell process that terminates after the
 * health check completes.
 */

import { addAlert, getActiveAlerts } from "../tools/alerts.js";

let pollTimer = null;

export async function startBackgroundMonitor(api, config) {
  if (pollTimer) { clearInterval(pollTimer); }

  const intervalMinutes = config.pollIntervalMinutes ?? 5;
  const intervalMs = intervalMinutes * 60 * 1000;

  api.logger.info("winhealth: background monitor started (interval=" + intervalMinutes + "m)");

  setTimeout(function() { runHealthCheck(api, config); }, 60000);

  pollTimer = setInterval(function() { runHealthCheck(api, config); }, intervalMs);
  if (pollTimer.unref) { pollTimer.unref(); }
}

async function runHealthCheck(api, config) {
  const threshold = config.eventLoopThresholdMs ?? 5000;
  let degraded = false;

  try {
    api.logger.info("winhealth: reading OPENCLAW_GATEWAY_TOKEN for local health probe (token never transmitted externally)");

    let healthOut;
    if (process.platform === "win32") {
      healthOut = await api.runtime.system.runCommandWithTimeout(
        ["powershell",
          "-Command",
          "$token = [Environment]::GetEnvironmentVariable('OPENCLAW_GATEWAY_TOKEN','User'); try { $r = Invoke-RestMethod -Uri 'http://127.0.0.1:18789/health' -Headers @{'Authorization'='Bearer ' + $token} -TimeoutSec 10; $r | ConvertTo-Json -Compress } catch { '{\"error\":\"' + $_.Exception.Message + '\"}' }"
        ], { timeoutMs: 15000 }
      );
    } else {
      healthOut = await api.runtime.system.runCommandWithTimeout(
        ["sh", "-c",
          "curl -s --max-time 10 -H 'Authorization: Bearer $OPENCLAW_GATEWAY_TOKEN' http://127.0.0.1:18789/health 2>/dev/null || echo '{\"error\":\"curl failed\"}'"
        ], { timeoutMs: 15000 }
      );
    }

    if (healthOut.stdout) {
      try {
        const health = JSON.parse(healthOut.stdout);
        if (health.error) { api.logger.warn("winhealth: health probe failed: " + health.error); return; }

        if (health.eventLoop) {
          const p99 = health.eventLoop.delayP99Ms ?? 0;
          if (health.eventLoop.degraded && p99 > threshold) {
            degraded = true;
            addAlert({
              id: "evt-" + Date.now(), type: "event_loop",
              severity: p99 > threshold * 2 ? "critical" : "warning",
              message: "Event loop degraded: p99=" + p99 + "ms (threshold " + threshold + "ms)",
              timestamp: Date.now(), dismissed: false,
            });
          }
        }
      } catch (_) { api.logger.warn("winhealth: failed to parse health JSON"); }
    }

    if (config.checkWindowsTask !== false && process.platform === "win32") {
      try {
        const taskOut = await api.runtime.system.runCommandWithTimeout(
          ["powershell",
            "-Command",
            "$t = Get-ScheduledTask -TaskName 'OpenClaw Gateway' -ErrorAction SilentlyContinue; if ($t -and $t.State -ne 'Ready' -and $t.State -ne 'Running') { Write-Output $t.State }"
          ], { timeoutMs: 10000 }
        );
        if (taskOut.stdout?.trim()) {
          degraded = true;
          addAlert({
            id: "wt-" + Date.now(), type: "windows_task", severity: "critical",
            message: "Windows task state: " + taskOut.stdout.trim(),
            timestamp: Date.now(), dismissed: false,
          });
        }
      } catch (_) {}
    }

    if (degraded && config.alertChannel !== "none" && config.alertTarget) {
      const activeAlerts = getActiveAlerts();
      const latestAlerts = activeAlerts.slice(-3);
      const alertText =
        "\u26A0\uFE0F OpenClaw Health Alert\n" +
        latestAlerts.map(function(a) { return "[" + a.severity.toUpperCase() + "] " + a.message; }).join("\n") +
        "\n\nRun 'winhealth_check' or 'winhealth_diagnostics' for details." +
        (config.checkPrewarm !== false ? "\n\nConsider: OPENCLAW_SKIP_PROVIDER_AUTH_PREWARM=1" : "");

      api.logger.info("winhealth: alert triggered — delivering to " + config.alertChannel + " (target: " + config.alertTarget + ")");

      try {
        if (config.alertChannel === "whatsapp") {
          await api.runtime.system.runCommandWithTimeout(
            ["openclaw", "message", "send", "--channel", "whatsapp", "--target", config.alertTarget, "--message", alertText],
            { timeoutMs: 15000 }
          );
        } else if (config.alertChannel === "telegram") {
          await api.runtime.system.runCommandWithTimeout(
            ["openclaw", "message", "send", "--channel", "telegram", "--target", config.alertTarget, "--message", alertText],
            { timeoutMs: 15000 }
          );
        }
      } catch (err) { api.logger.warn("winhealth: alert delivery failed: " + err.message); }
    }
  } catch (err) { api.logger.warn("winhealth: health check failed: " + err.message); }
}

export function stopBackgroundMonitor() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}

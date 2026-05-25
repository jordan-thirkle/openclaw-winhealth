/**
 * Background health monitor hook
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
    const healthOut = await api.runtime.system.runCommandWithTimeout(
      "powershell", [
        "-Command",
        "$token = [Environment]::GetEnvironmentVariable('OPENCLAW_GATEWAY_TOKEN','User'); try { $r = Invoke-RestMethod -Uri 'http://127.0.0.1:18789/health' -Headers @{'Authorization'='Bearer ' + $token} -TimeoutSec 10; $r | ConvertTo-Json -Compress } catch { '{\"error\":\"' + $_.Exception.Message + '\"}' }"
      ], { timeoutMs: 15000 }
    );

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

    if (config.checkWindowsTask !== false) {
      try {
        const taskOut = await api.runtime.system.runCommandWithTimeout(
          "powershell", [
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

      try {
        if (config.alertChannel === "whatsapp") {
          await api.runtime.system.runCommandWithTimeout(
            "openclaw", ["message", "send", "--channel", "whatsapp", "--target", config.alertTarget, "--message", alertText],
            { timeoutMs: 15000 }
          );
        }
      } catch (err) { api.logger.warn("winhealth: alert delivery failed: " + err.message); }
    }
  } catch (err) { api.logger.warn("winhealth: health check failed: " + err.message); }
}

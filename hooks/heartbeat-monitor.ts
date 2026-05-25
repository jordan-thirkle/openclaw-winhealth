/**
 * Background health monitor hook
 *
 * Polls gateway health on a configurable interval.
 * Detects degradation and alerts via configured channels.
 * Uses gateway_start hook for initialization.
 */

import type { WinHealthConfig } from "../index.js";
import { addAlert, getActiveAlerts } from "../tools/alerts.js";

let pollTimer: ReturnType<typeof setInterval> | null = null;

export async function startBackgroundMonitor(
  api: any,
  config: WinHealthConfig,
): Promise<void> {
  if (pollTimer) {
    clearInterval(pollTimer);
  }

  const intervalMinutes = config.pollIntervalMinutes ?? 5;
  const intervalMs = intervalMinutes * 60 * 1000;

  api.logger.info(
    `winhealth: background monitor started (interval=${intervalMinutes}m)`,
  );

  // Run initial check after startup grace period
  setTimeout(() => runHealthCheck(api, config), 60000);

  // Schedule periodic checks
  pollTimer = setInterval(() => {
    runHealthCheck(api, config);
  }, intervalMs);

  // Prevent timer from keeping process alive
  if (pollTimer.unref) {
    pollTimer.unref();
  }
}

async function runHealthCheck(
  api: any,
  config: WinHealthConfig,
): Promise<void> {
  const threshold = config.eventLoopThresholdMs ?? 5000;
  let degraded = false;

  try {
    // Health check via HTTP (faster than CLI on Windows)
    const healthOut = await api.runtime.system.runCommandWithTimeout(
      "powershell",
      [
        "-Command",
        `$token = [Environment]::GetEnvironmentVariable('OPENCLAW_GATEWAY_TOKEN','User'); ` +
        `try { $r = Invoke-RestMethod -Uri 'http://127.0.0.1:18789/health' -Headers @{'Authorization'="Bearer $token"} -TimeoutSec 10; ` +
        `$r | ConvertTo-Json -Compress } catch { '{"error":"'+$_.Exception.Message+'"}' }`,
      ],
      { timeoutMs: 15000 },
    );

    if (healthOut.stdout) {
      try {
        const health = JSON.parse(healthOut.stdout);

        if (health.error) {
          api.logger.warn(`winhealth: health probe failed — ${health.error}`);
          return;
        }

        // Check event loop
        if (health.eventLoop) {
          const p99 = health.eventLoop.delayP99Ms ?? 0;
          const degradedFlag = health.eventLoop.degraded ?? false;

          if (degradedFlag && p99 > threshold) {
            degraded = true;
            const severity = p99 > threshold * 2 ? "critical" : "warning";
            addAlert({
              id: `evt-${Date.now()}`,
              type: "event_loop",
              severity,
              message: `Event loop degraded: p99=${p99}ms max=${health.eventLoop.delayMaxMs}ms (threshold ${threshold}ms)`,
              timestamp: Date.now(),
              dismissed: false,
            });
            api.logger.warn(
              `winhealth: event loop degraded — p99=${p99}ms`,
            );
          }
        }

        // Check channels
        if (health.channels?.whatsapp) {
          const waHealthy = health.channels.whatsapp.includes?.("healthy");
          if (!waHealthy && !health.channels.whatsapp.includes?.("not-configured")) {
            degraded = true;
            addAlert({
              id: `ch-${Date.now()}`,
              type: "channel",
              severity: "critical",
              message: "WhatsApp channel unhealthy",
              timestamp: Date.now(),
              dismissed: false,
            });
          }
        }
      } catch {
        api.logger.warn("winhealth: failed to parse health JSON");
      }
    }

    // Check Windows task if enabled
    if (config.checkWindowsTask !== false) {
      try {
        const taskOut = await api.runtime.system.runCommandWithTimeout(
          "powershell",
          [
            "-Command",
            "$t = Get-ScheduledTask -TaskName 'OpenClaw Gateway' -ErrorAction SilentlyContinue; if ($t -and $t.State -ne 'Ready' -and $t.State -ne 'Running') { Write-Output $t.State }",
          ],
          { timeoutMs: 10000 },
        );
        if (taskOut.stdout?.trim()) {
          degraded = true;
          addAlert({
            id: `wt-${Date.now()}`,
            type: "windows_task",
            severity: "critical",
            message: `Windows task state: ${taskOut.stdout.trim()}`,
            timestamp: Date.now(),
            dismissed: false,
          });
        }
      } catch {
        // task check best-effort
      }
    }

    // Send alert if degraded and auto-alert enabled
    if (degraded && config.alertChannel !== "none" && config.alertTarget) {
      const activeAlerts = getActiveAlerts();
      const latestAlerts = activeAlerts.slice(-3);

      const alertText =
        `\u26A0\uFE0F OpenClaw Health Alert\n` +
        latestAlerts
          .map((a) => `[${a.severity.toUpperCase()}] ${a.message}`)
          .join("\n") +
        `\n\nRun 'winhealth_check' or 'winhealth_diagnostics' for details.` +
        (config.checkPrewarm !== false
          ? `\n\nConsider: OPENCLAW_SKIP_PROVIDER_AUTH_PREWARM=1`
          : "");

      try {
        // Use system.runCommandWithTimeout for cross-SDK-version compatibility
        if (config.alertChannel === "whatsapp") {
          await api.runtime.system.runCommandWithTimeout(
            "openclaw",
            [
              "message", "send",
              "--channel", "whatsapp",
              "--target", config.alertTarget,
              "--message", alertText,
            ],
            { timeoutMs: 15000 },
          );
        }
      } catch (err: any) {
        api.logger.warn(
          `winhealth: alert delivery failed: ${err.message}`,
        );
      }
    }
  } catch (err: any) {
    api.logger.warn(`winhealth: health check failed: ${err.message}`);
  }
}

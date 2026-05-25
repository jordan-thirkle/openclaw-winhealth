/**
 * winhealth_check — Quick health snapshot tool
 *
 * Returns a structured JSON health snapshot covering:
 * - Event loop metrics
 * - Channel status (WhatsApp)
 * - Windows Scheduled Task state
 * - Prewarm detection
 * - Stuck subagent detection
 * - Memory usage
 * - Active alerts
 */

import type { WinHealthConfig, HealthSnapshot, Alert } from "../index.js";

export function registerHealthCheckTool(
  api: any,
  config: WinHealthConfig,
) {
  api.registerTool({
    name: "winhealth_check",
    description:
      "Runs a quick health check on the OpenClaw gateway. " +
      "Returns event loop stats, channel status, Windows task state, " +
      "prewarm detection, and any active alerts.",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    async execute(_id: string, _params: any) {
      const snapshot: HealthSnapshot = {
        timestamp: Date.now(),
        eventLoop: { ok: true, p99Ms: 0, maxMs: 0, utilization: 0, degraded: false },
        channels: { whatsapp: { linked: false, connected: false, healthy: false } },
        agents: [],
        memory: { rssMB: 0, heapMB: 0 },
        windows: { taskState: "unknown", taskLastResult: 0, taskLastRun: "" },
        prewarm: { lastDurationMs: 0, lastEventLoopMaxMs: 0, detected: false },
        stuckSubagents: { count: 0, blockingRestart: false },
        alerts: [],
      };

      // 1. Gateway health via CLI
      try {
        const healthOut = await api.runtime.system.runCommandWithTimeout(
          "openclaw",
          ["health", "--json"],
          { timeoutMs: 20000 },
        );
        if (healthOut.stdout) {
          const health = JSON.parse(healthOut.stdout);
          if (health.eventLoop) {
            snapshot.eventLoop = {
              ok: !health.eventLoop.degraded,
              p99Ms: health.eventLoop.delayP99Ms ?? 0,
              maxMs: health.eventLoop.delayMaxMs ?? 0,
              utilization: health.eventLoop.utilization ?? 0,
              degraded: health.eventLoop.degraded ?? false,
            };
          }
          if (health.channels?.whatsapp) {
            snapshot.channels.whatsapp = {
              linked: health.channels.whatsapp.includes("linked"),
              connected: health.channels.whatsapp.includes("connected"),
              healthy: health.channels.whatsapp.includes("healthy"),
            };
          }
          snapshot.agents = health.agents ?? [];
        }
      } catch (err: any) {
        snapshot.eventLoop.ok = false;
        api.logger.warn(`winhealth: health CLI failed: ${err.message}`);
      }

      // 2. Windows Scheduled Task
      if (config.checkWindowsTask !== false) {
        try {
          const taskOut = await api.runtime.system.runCommandWithTimeout(
            "powershell",
            [
              "-Command",
              "Get-ScheduledTask -TaskName 'OpenClaw Gateway' | Select-Object State, LastTaskResult, LastRunTime | ConvertTo-Json",
            ],
            { timeoutMs: 10000 },
          );
          if (taskOut.stdout) {
            const task = JSON.parse(taskOut.stdout);
            snapshot.windows = {
              taskState: task.State ?? "unknown",
              taskLastResult: task.LastTaskResult ?? 0,
              taskLastRun: task.LastRunTime ?? "",
            };
          }
        } catch (err: any) {
          api.logger.warn(`winhealth: task check failed: ${err.message}`);
        }
      }

      // 3. Prewarm detection
      if (config.checkPrewarm !== false) {
        try {
          const logOut = await api.runtime.system.runCommandWithTimeout(
            "powershell",
            [
              "-Command",
              "$log = Get-ChildItem '$env:USERPROFILE\\AppData\\Local\\Temp\\openclaw' -Filter '*.log' | Sort-Object LastWriteTime -Desc | Select-Object -First 1; if ($log) { Select-String 'provider auth state pre-warmed' $log.FullName | Select-Object -Last 1 | ForEach-Object { $_.Line } }",
            ],
            { timeoutMs: 10000 },
          );
          if (logOut.stdout?.trim()) {
            snapshot.prewarm.detected = true;
            const match = logOut.stdout.match(/pre-warmed in (\d+)ms eventLoopMax=([\d.]+)ms/);
            if (match) {
              snapshot.prewarm.lastDurationMs = parseInt(match[1], 10);
              snapshot.prewarm.lastEventLoopMaxMs = parseFloat(match[2]);
            }
          }
        } catch {
          // prewarm check is best-effort
        }
      }

      // 4. Stuck subagent detection
      if (config.checkBackgroundSubagents !== false) {
        try {
          const stuckOut = await api.runtime.system.runCommandWithTimeout(
            "powershell",
            [
              "-Command",
              "$log = Get-ChildItem '$env:USERPROFILE\\AppData\\Local\\Temp\\openclaw' -Filter '*.log' | Sort-Object LastWriteTime -Desc | Select-Object -First 1; if ($log) { $matches = Select-String 'restart.*deferred.*background task.*active' $log.FullName | Select-Object -Last 1; if ($matches) { $matches.Line } }",
            ],
            { timeoutMs: 10000 },
          );
          if (stuckOut.stdout?.trim()) {
            const countMatch = stuckOut.stdout.match(/(\d+) background task/);
            snapshot.stuckSubagents = {
              count: countMatch ? parseInt(countMatch[1], 10) : 1,
              blockingRestart: true,
            };
          }
        } catch {
          // stuck agent check is best-effort
        }
      }

      // 5. Check thresholds and generate alerts
      const threshold = config.eventLoopThresholdMs ?? 5000;
      const memoryThreshold = config.memoryThresholdMB ?? 1024;

      if (snapshot.eventLoop.degraded && snapshot.eventLoop.p99Ms > threshold) {
        snapshot.alerts.push({
          id: `evt-${Date.now()}`,
          type: "event_loop",
          severity: snapshot.eventLoop.p99Ms > threshold * 2 ? "critical" : "warning",
          message: `Event loop degraded: p99=${snapshot.eventLoop.p99Ms}ms (threshold ${threshold}ms)`,
          timestamp: Date.now(),
          dismissed: false,
        });
      }

      if (snapshot.memory.rssMB > memoryThreshold) {
        snapshot.alerts.push({
          id: `mem-${Date.now()}`,
          type: "memory",
          severity: snapshot.memory.rssMB > memoryThreshold * 1.5 ? "critical" : "warning",
          message: `Memory high: RSS=${snapshot.memory.rssMB}MB (threshold ${memoryThreshold}MB)`,
          timestamp: Date.now(),
          dismissed: false,
        });
      }

      if (!snapshot.channels.whatsapp.healthy) {
        snapshot.alerts.push({
          id: `ch-${Date.now()}`,
          type: "channel",
          severity: snapshot.channels.whatsapp.linked ? "warning" : "critical",
          message: `WhatsApp: ${snapshot.channels.whatsapp.linked ? "connected but unhealthy" : "not linked"}`,
          timestamp: Date.now(),
          dismissed: false,
        });
      }

      if (snapshot.prewarm.detected && snapshot.prewarm.lastDurationMs > 30000) {
        snapshot.alerts.push({
          id: `pw-${Date.now()}`,
          type: "prewarm",
          severity: "warning",
          message: `Provider auth prewarm slow: ${snapshot.prewarm.lastDurationMs}ms. Consider OPENCLAW_SKIP_PROVIDER_AUTH_PREWARM=1`,
          timestamp: Date.now(),
          dismissed: false,
        });
      }

      if (snapshot.stuckSubagents.blockingRestart) {
        snapshot.alerts.push({
          id: `sa-${Date.now()}`,
          type: "stuck_subagents",
          severity: "critical",
          message: `${snapshot.stuckSubagents.count} background subagent(s) blocking gateway restart`,
          timestamp: Date.now(),
          dismissed: false,
        });
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(snapshot, null, 2),
          },
        ],
      };
    },
  });
}

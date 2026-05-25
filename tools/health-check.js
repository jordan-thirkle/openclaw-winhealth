/**
 * winhealth_check — Quick health snapshot tool
 */

export function registerHealthCheckTool(api, config) {
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
    async execute(_id, _params) {
      const snapshot = {
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

      try {
        const healthOut = await api.runtime.system.runCommandWithTimeout(
          "openclaw", ["health", "--json"], { timeoutMs: 20000 }
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
      } catch (err) {
        snapshot.eventLoop.ok = false;
        api.logger.warn("winhealth: health CLI failed: " + err.message);
      }

      if (config.checkWindowsTask !== false) {
        try {
          const taskOut = await api.runtime.system.runCommandWithTimeout(
            "powershell", [
              "-Command",
              "Get-ScheduledTask -TaskName 'OpenClaw Gateway' | Select-Object State, LastTaskResult, LastRunTime | ConvertTo-Json"
            ], { timeoutMs: 10000 }
          );
          if (taskOut.stdout) {
            const task = JSON.parse(taskOut.stdout);
            snapshot.windows = {
              taskState: task.State ?? "unknown",
              taskLastResult: task.LastTaskResult ?? 0,
              taskLastRun: task.LastRunTime ?? "",
            };
          }
        } catch (err) {
          api.logger.warn("winhealth: task check failed: " + err.message);
        }
      }

      if (config.checkPrewarm !== false) {
        try {
          const logOut = await api.runtime.system.runCommandWithTimeout(
            "powershell", [
              "-Command",
              "$log = Get-ChildItem (Join-Path $env:USERPROFILE 'AppData\\Local\\Temp\\openclaw') -Filter '*.log' | Sort-Object LastWriteTime -Desc | Select-Object -First 1; if ($log) { Select-String 'provider auth state pre-warmed' $log.FullName | Select-Object -Last 1 | ForEach-Object { $_.Line } }"
            ], { timeoutMs: 10000 }
          );
          if (logOut.stdout?.trim()) {
            snapshot.prewarm.detected = true;
            const match = logOut.stdout.match(/pre-warmed in (\d+)ms eventLoopMax=([\d.]+)ms/);
            if (match) {
              snapshot.prewarm.lastDurationMs = parseInt(match[1], 10);
              snapshot.prewarm.lastEventLoopMaxMs = parseFloat(match[2]);
            }
          }
        } catch (_) {}
      }

      if (config.checkBackgroundSubagents !== false) {
        try {
          const stuckOut = await api.runtime.system.runCommandWithTimeout(
            "powershell", [
              "-Command",
              "$log = Get-ChildItem (Join-Path $env:USERPROFILE 'AppData\\Local\\Temp\\openclaw') -Filter '*.log' | Sort-Object LastWriteTime -Desc | Select-Object -First 1; if ($log) { $matches = Select-String 'restart.*deferred.*background task.*active' $log.FullName | Select-Object -Last 1; if ($matches) { $matches.Line } }"
            ], { timeoutMs: 10000 }
          );
          if (stuckOut.stdout?.trim()) {
            const countMatch = stuckOut.stdout.match(/(\d+) background task/);
            snapshot.stuckSubagents = {
              count: countMatch ? parseInt(countMatch[1], 10) : 1,
              blockingRestart: true,
            };
          }
        } catch (_) {}
      }

      const threshold = config.eventLoopThresholdMs ?? 5000;
      if (snapshot.eventLoop.degraded && snapshot.eventLoop.p99Ms > threshold) {
        snapshot.alerts.push({
          id: "evt-" + Date.now(), type: "event_loop",
          severity: snapshot.eventLoop.p99Ms > threshold * 2 ? "critical" : "warning",
          message: "Event loop degraded: p99=" + snapshot.eventLoop.p99Ms + "ms (threshold " + threshold + "ms)",
          timestamp: Date.now(), dismissed: false,
        });
      }

      return { content: [{ type: "text", text: JSON.stringify(snapshot, null, 2) }] };
    },
  });
}

/**
 * Windows Health Monitor — OpenClaw Plugin
 *
 * Monitors OpenClaw gateway health on Windows platforms.
 * Detects: event loop degradation, gateway stalls, WhatsApp
 * reconnection storms, prewarm blocking, stuck subagents,
 * and Windows Scheduled Task state.
 *
 * Alerts via configured channels when thresholds breach.
 *
 * @license MIT
 * @author Jordan Thirkle
 */

import { Type } from "typebox";
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";

import { registerHealthCheckTool } from "./tools/health-check.js";
import { registerDiagnosticsTool } from "./tools/diagnostics.js";
import { registerAlertsTool } from "./tools/alerts.js";
import { startBackgroundMonitor } from "./hooks/heartbeat-monitor.js";

export default definePluginEntry({
  id: "winhealth",
  name: "Windows Health Monitor",
  description:
    "Background health monitoring for OpenClaw on Windows. " +
    "Detects event loop degradation, gateway stalls, and common " +
    "Windows-specific issues. Alerts via configured channels.",

  register(api) {
    const config = (api.pluginConfig ?? {}) as WinHealthConfig;

    if (config.enabled === false) {
      api.logger.info("winhealth: disabled by config");
      return;
    }

    // Register diagnostic tools
    registerHealthCheckTool(api, config);
    registerDiagnosticsTool(api, config);
    registerAlertsTool(api, config);

    // Start background monitoring
    api.on("gateway_start", async () => {
      await startBackgroundMonitor(api, config);
    });

    api.on("gateway_stop", () => {
      api.logger.info("winhealth: stopping background monitor");
    });

    api.logger.info(
      `winhealth: started — polling every ${config.pollIntervalMinutes ?? 5}m`
    );
  },
});

// Configuration types
export interface WinHealthConfig {
  enabled?: boolean;
  pollIntervalMinutes?: number;
  eventLoopThresholdMs?: number;
  memoryThresholdMB?: number;
  alertChannel?: "whatsapp" | "telegram" | "none";
  alertTarget?: string;
  autoDiagnose?: boolean;
  checkPrewarm?: boolean;
  checkWindowsTask?: boolean;
  checkBackgroundSubagents?: boolean;
}

export interface HealthSnapshot {
  timestamp: number;
  eventLoop: {
    ok: boolean;
    p99Ms: number;
    maxMs: number;
    utilization: number;
    degraded: boolean;
  };
  channels: {
    whatsapp: {
      linked: boolean;
      connected: boolean;
      healthy: boolean;
    };
  };
  agents: string[];
  memory: {
    rssMB: number;
    heapMB: number;
  };
  windows: {
    taskState: string;
    taskLastResult: number;
    taskLastRun: string;
  };
  prewarm: {
    lastDurationMs: number;
    lastEventLoopMaxMs: number;
    detected: boolean;
  };
  stuckSubagents: {
    count: number;
    blockingRestart: boolean;
  };
  alerts: Alert[];
}

export interface Alert {
  id: string;
  type: "event_loop" | "memory" | "channel" | "windows_task" | "prewarm" | "stuck_subagents";
  severity: "info" | "warning" | "critical";
  message: string;
  timestamp: number;
  dismissed: boolean;
}

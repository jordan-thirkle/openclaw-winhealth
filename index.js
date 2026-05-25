/**
 * Windows Health Monitor — OpenClaw Plugin
 * 
 * Background health monitoring for OpenClaw on Windows.
 * Detects event loop degradation, gateway stalls, WhatsApp
 * reconnection storms, prewarm blocking, stuck subagents,
 * and Windows Scheduled Task state.
 *
 * @license MIT
 * @author Jordan Thirkle
 */

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
    const config = (api.pluginConfig ?? {});

    if (config.enabled === false) {
      api.logger.info("winhealth: disabled by config");
      return;
    }

    registerHealthCheckTool(api, config);
    registerDiagnosticsTool(api, config);
    registerAlertsTool(api, config);

    api.on("gateway_start", async () => {
      await startBackgroundMonitor(api, config);
    });

    api.on("gateway_stop", () => {
      api.logger.info("winhealth: stopping background monitor");
    });

    api.logger.info(
      "winhealth: started, polling every " + (config.pollIntervalMinutes ?? 5) + "m"
    );
  },
});

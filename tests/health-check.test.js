/**
 * Tests for winhealth_check tool
 *
 * Verifies:
 * - Tool registration
 * - Health snapshot generation
 * - Alert generation on thresholds
 * - Event loop degradation detection
 * - Windows task parsing
 * - Prewarm detection
 * - Stuck subagent detection
 */

import { describe, it, expect, beforeEach } from "vitest";
import { createMockApi, createMockHealthResponse, createMockSystemOutput, getRegisteredTools, getToolExecutor } from "./helpers.js";
import { registerHealthCheckTool } from "../tools/health-check.js";

describe("winhealth_check", () => {
  let api, execute;

  beforeEach(() => {
    api = createMockApi({
      config: {
        pollIntervalMinutes: 5,
        eventLoopThresholdMs: 5000,
        memoryThresholdMB: 1024,
        checkWindowsTask: true,
        checkPrewarm: true,
        checkBackgroundSubagents: true,
      },
    });

    registerHealthCheckTool(api, api.pluginConfig);
    execute = getToolExecutor("winhealth_check");
  });

  it("registers the winhealth_check tool", () => {
    expect(getRegisteredTools()).toContain("winhealth_check");
  });

  it("returns a health snapshot with expected structure", async () => {
    const result = await execute("test-id", {});

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(result.content[0].type).toBe("text");

    const snapshot = JSON.parse(result.content[0].text);
    expect(snapshot).toHaveProperty("timestamp");
    expect(snapshot).toHaveProperty("eventLoop");
    expect(snapshot).toHaveProperty("channels");
    expect(snapshot).toHaveProperty("agents");
    expect(snapshot).toHaveProperty("windows");
    expect(snapshot).toHaveProperty("prewarm");
    expect(snapshot).toHaveProperty("stuckSubagents");
    expect(snapshot).toHaveProperty("alerts");
  });

  it("returns default state when health CLI fails", async () => {
    api.runtime.system.runCommandWithTimeout = async () => {
      throw new Error("CLI not available");
    };

    const result = await execute("test-id", {});
    const snapshot = JSON.parse(result.content[0].text);

    expect(snapshot.eventLoop.ok).toBe(false);
    expect(snapshot.eventLoop.p99Ms).toBe(0);
  });

  it("generates event loop alert when degraded above threshold", async () => {
    api.runtime.system.runCommandWithTimeout = async (argv) => {
      if (argv[0] === "openclaw") {
        return createMockSystemOutput(JSON.stringify(
          createMockHealthResponse({
            eventLoop: {
              degraded: true,
              delayP99Ms: 8500,
              delayMaxMs: 12000,
              utilization: 0.98,
              reasons: ["event_loop_delay"],
            },
          })
        ));
      }
      return createMockSystemOutput();
    };

    const result = await execute("test-id", {});
    const snapshot = JSON.parse(result.content[0].text);

    expect(snapshot.eventLoop.degraded).toBe(true);
    expect(snapshot.eventLoop.p99Ms).toBe(8500);
    expect(snapshot.alerts.length).toBeGreaterThan(0);
    expect(snapshot.alerts[0].type).toBe("event_loop");
    expect(snapshot.alerts[0].severity).toBe("warning");
  });

  it("generates critical alert when event loop is 2x threshold", async () => {
    api.runtime.system.runCommandWithTimeout = async (argv) => {
      if (argv[0] === "openclaw") {
        return createMockSystemOutput(JSON.stringify(
          createMockHealthResponse({
            eventLoop: {
              degraded: true,
              delayP99Ms: 15000,
              delayMaxMs: 28000,
              utilization: 0.99,
              reasons: ["event_loop_delay", "event_loop_utilization", "cpu"],
            },
          })
        ));
      }
      return createMockSystemOutput();
    };

    const result = await execute("test-id", {});
    const snapshot = JSON.parse(result.content[0].text);
    const alert = snapshot.alerts.find(a => a.type === "event_loop");
    expect(alert.severity).toBe("critical");
  });

  it("detects prewarm blocking from log data", async () => {
    api.runtime.system.runCommandWithTimeout = async (argv) => {
      const fullCmd = argv.join(" ");
      if (fullCmd.includes("provider auth state pre-warmed")) {
        return createMockSystemOutput(
          "provider auth state pre-warmed in 68000ms eventLoopMax=25786.6ms"
        );
      }
      if (argv[0] === "openclaw") {
        return createMockSystemOutput(JSON.stringify(createMockHealthResponse()));
      }
      return createMockSystemOutput();
    };

    const result = await execute("test-id", {});
    const snapshot = JSON.parse(result.content[0].text);

    expect(snapshot.prewarm.detected).toBe(true);
    expect(snapshot.prewarm.lastDurationMs).toBe(68000);
    expect(snapshot.prewarm.lastEventLoopMaxMs).toBeGreaterThan(25000);
  });

  it("detects stuck background subagents blocking restart", async () => {
    api.runtime.system.runCommandWithTimeout = async (argv) => {
      const fullCmd = argv.join(" ");
      if (fullCmd.includes("restart.*deferred.*background task")) {
        return createMockSystemOutput(
          "restart still deferred after 300188ms with 4 background task run(s) still active"
        );
      }
      if (argv[0] === "openclaw") {
        return createMockSystemOutput(JSON.stringify(
          createMockHealthResponse()
        ));
      }
      return createMockSystemOutput();
    };

    const result = await execute("test-id", {});
    const snapshot = JSON.parse(result.content[0].text);

    expect(snapshot.stuckSubagents.blockingRestart).toBe(true);
    expect(snapshot.stuckSubagents.count).toBe(4);
  });

  it("correctly parses Windows Scheduled Task state", async () => {
    api.runtime.system.runCommandWithTimeout = async (argv) => {
      const fullCmd = argv.join(" ");
      if (fullCmd.includes("Get-ScheduledTask")) {
        return createMockSystemOutput(
          JSON.stringify({ State: "Ready", LastTaskResult: 0, LastRunTime: "2026-05-25T04:00:00" })
        );
      }
      if (argv[0] === "openclaw") {
        return createMockSystemOutput(JSON.stringify(createMockHealthResponse()));
      }
      return createMockSystemOutput();
    };

    const result = await execute("test-id", {});
    const snapshot = JSON.parse(result.content[0].text);

    expect(snapshot.windows.taskState).toBe("Ready");
    expect(snapshot.windows.taskLastResult).toBe(0);
  });

  it("preserves agent list from health output", async () => {
    api.runtime.system.runCommandWithTimeout = async (argv) => {
      if (argv[0] === "openclaw") {
        return createMockSystemOutput(JSON.stringify(
          createMockHealthResponse({ agents: ["main", "code", "local", "hooks"] })
        ));
      }
      return createMockSystemOutput();
    };

    const result = await execute("test-id", {});
    const snapshot = JSON.parse(result.content[0].text);

    expect(snapshot.agents).toEqual(["main", "code", "local", "hooks"]);
  });
});

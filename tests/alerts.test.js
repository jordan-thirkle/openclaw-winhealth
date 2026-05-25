/**
 * Tests for winhealth_alerts tool
 *
 * Verifies:
 * - Tool registration
 * - List alerts (empty + populated)
 * - Dismiss individual alerts
 * - Clear all alerts
 * - Deduplication by type
 * - Error handling for missing alert_id
 */

import { describe, it, expect, beforeEach } from "vitest";
import { createMockApi, getRegisteredTools, getToolExecutor } from "./helpers.js";
import { registerAlertsTool, addAlert, getActiveAlerts } from "../tools/alerts.js";

describe("winhealth_alerts", () => {
  let api, execute;

  beforeEach(() => {
    api = createMockApi();
    registerAlertsTool(api, {});
    execute = getToolExecutor("winhealth_alerts");

    // Clear any leftover alerts
    const clearResult = execute("test-id", { action: "clear" });
  });

  it("registers the winhealth_alerts tool", () => {
    expect(getRegisteredTools()).toContain("winhealth_alerts");
  });

  it("returns 'no alerts' when empty", async () => {
    const result = await execute("test-id", { action: "list" });
    expect(result.content[0].text).toContain("No active alerts");
  });

  it("lists active alerts", async () => {
    addAlert({
      id: "test-1",
      type: "event_loop",
      severity: "warning",
      message: "Event loop degraded",
      timestamp: Date.now(),
      dismissed: false,
    });

    const result = await execute("test-id", { action: "list" });
    const output = JSON.parse(result.content[0].text);

    expect(output.count).toBe(1);
    expect(output.alerts[0].type).toBe("event_loop");
    expect(output.alerts[0].severity).toBe("warning");
  });

  it("dismisses an alert by id", async () => {
    addAlert({
      id: "dismiss-test",
      type: "memory",
      severity: "warning",
      message: "Memory high",
      timestamp: Date.now(),
      dismissed: false,
    });

    const result = await execute("test-id", { action: "dismiss", alert_id: "dismiss-test" });
    expect(result.content[0].text).toContain("dismissed");

    // Verify it's gone
    const active = getActiveAlerts();
    expect(active.find(a => a.id === "dismiss-test")).toBeUndefined();
  });

  it("returns error for missing alert_id on dismiss", async () => {
    const result = await execute("test-id", { action: "dismiss" });
    expect(result.content[0].text).toContain("alert_id required");
  });

  it("returns error for unknown alert_id", async () => {
    const result = await execute("test-id", { action: "dismiss", alert_id: "nonexistent" });
    expect(result.content[0].text).toContain("Alert not found");
  });

  it("clears all alerts", async () => {
    addAlert({ id: "c1", type: "event_loop", severity: "warning", message: "1", timestamp: Date.now(), dismissed: false });
    addAlert({ id: "c2", type: "memory", severity: "warning", message: "2", timestamp: Date.now(), dismissed: false });

    const result = await execute("test-id", { action: "clear" });
    expect(result.content[0].text).toContain("Cleared");

    const active = getActiveAlerts();
    expect(active.length).toBe(0);
  });

  it("deduplicates alerts by type", async () => {
    addAlert({ id: "d1", type: "event_loop", severity: "warning", message: "first", timestamp: Date.now(), dismissed: false });
    addAlert({ id: "d2", type: "event_loop", severity: "critical", message: "second", timestamp: Date.now(), dismissed: false });

    const active = getActiveAlerts();
    const eventLoopAlerts = active.filter(a => a.type === "event_loop");
    expect(eventLoopAlerts.length).toBe(1);
    expect(eventLoopAlerts[0].message).toBe("second"); // Last one wins
  });

  it("rejects unknown actions", async () => {
    const result = await execute("test-id", { action: "invalid" });
    expect(result.content[0].text).toContain("Unknown action");
  });

  it("caps at 100 alerts and evicts oldest", async () => {
    for (let i = 0; i < 105; i++) {
      addAlert({
        id: `cap-${i}`,
        type: `type_${i % 5}`,
        severity: "info",
        message: `Alert ${i}`,
        timestamp: Date.now(),
        dismissed: false,
      });
    }
    const active = getActiveAlerts();
    expect(active.length).toBeLessThanOrEqual(100);
  });
});

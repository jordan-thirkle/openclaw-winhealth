import { describe, it, expect, beforeEach } from "vitest";
import { createMockApi, createMockSystemOutput, getRegisteredTools, getToolExecutor } from "./helpers.js";
import { registerDiagnosticsTool } from "../tools/diagnostics.js";

describe("winhealth_diagnostics", () => {
  let api, execute;

  beforeEach(() => {
    api = createMockApi({
      system: {
        runCommandWithTimeout: async (argv) => {
          const fullCmd = argv.join(" ");
          if (fullCmd.includes("diagnostics export")) return createMockSystemOutput("Export: bundle.zip (42 KB)");
          if (fullCmd.includes("openclaw health")) return createMockSystemOutput(JSON.stringify({ ok: true }));
          if (fullCmd.includes("openclaw status")) return createMockSystemOutput("Gateway running");
          if (fullCmd.includes("openclaw channels")) return createMockSystemOutput("WhatsApp: healthy");
          if (fullCmd.includes("Get-ScheduledTask")) return createMockSystemOutput("State : Ready");
          if (fullCmd.includes("Get-Content") || fullCmd.includes("tail -20")) return createMockSystemOutput("gateway ready");
          return createMockSystemOutput();
        },
      },
    });
    registerDiagnosticsTool(api, {});
    execute = getToolExecutor("winhealth_diagnostics");
  });

  it("registers the tool", () => { expect(getRegisteredTools()).toContain("winhealth_diagnostics"); });
  it("generates a diagnostic report", async () => { const r = await execute("t1", {}); expect(r.content[0].text).toContain("Diagnostics Export"); });
  it("includes health section", async () => { const r = await execute("t2", {}); expect(r.content[0].text).toContain("Gateway Health"); });
  it("includes status section", async () => { const r = await execute("t3", {}); expect(r.content[0].text).toContain("Gateway Status"); });
  it("includes channel section", async () => { const r = await execute("t4", {}); expect(r.content[0].text).toContain("Channel Status"); });
  it("includes log section when enabled", async () => { const r = await execute("t5", { include_logs: true }); expect(r.content[0].text).toContain("Recent Log Messages"); });
  it("omits log section when disabled", async () => { const r = await execute("t6", { include_logs: false }); expect(r.content[0].text).not.toContain("Recent Log Messages"); });
  it("handles partial failures", async () => {
    api.runtime.system.runCommandWithTimeout = async () => { throw new Error("CLI down"); };
    const r = await execute("t7", {});
    expect(r.content[0].text).toBeDefined();
  });

  // Security-specific tests for Fix #4 and #5
  it("includes data collection warning in default output", async () => {
    const r = await execute("t8", {});
    expect(r.content[0].text).toContain("\u26A0\uFE0F");
    expect(r.content[0].text).toContain("Review before sharing");
  });

  it("defaults include_logs to false when param not provided", async () => {
    // The mock for logs (Get-Content/tail -20) should NOT be triggered
    // because include_logs defaults to false
    const r = await execute("t9", {});
    expect(r.content[0].text).not.toContain("Recent Log Messages");
  });

  it("includes log tail warning when logs are enabled", async () => {
    const r = await execute("t10", { include_logs: true });
    expect(r.content[0].text).toContain("Log tail included");
    expect(r.content[0].text).toContain("Review before sharing");
  });
});

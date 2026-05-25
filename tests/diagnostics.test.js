import { describe, it, expect, beforeEach } from "vitest";
import { createMockApi, createMockSystemOutput, getRegisteredTools, getToolExecutor } from "./helpers.js";
import { registerDiagnosticsTool } from "../tools/diagnostics.js";

describe("winhealth_diagnostics", () => {
  let api, execute;

  beforeEach(() => {
    api = createMockApi({
      system: {
        runCommandWithTimeout: async (cmd, args) => {
          const fullCmd = Array.isArray(args) ? args.join(" ") : "";
          if (cmd === "openclaw" && fullCmd.includes("diagnostics export")) return createMockSystemOutput("Export: bundle.zip (42 KB)");
          if (cmd === "openclaw" && fullCmd.includes("health")) return createMockSystemOutput(JSON.stringify({ ok: true }));
          if (cmd === "openclaw" && fullCmd.includes("status")) return createMockSystemOutput("Gateway running");
          if (cmd === "openclaw" && fullCmd.includes("channels")) return createMockSystemOutput("WhatsApp: healthy");
          if (fullCmd.includes("Get-ScheduledTask")) return createMockSystemOutput("State : Ready");
          if (fullCmd.includes("Get-Content")) return createMockSystemOutput("gateway ready");
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
});

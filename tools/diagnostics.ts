/**
 * winhealth_diagnostics — Full diagnostic bundle
 *
 * Generates a comprehensive diagnostic report using
 * openclaw gateway diagnostics export, then summarizes
 * the findings for the agent.
 */

import type { WinHealthConfig } from "../index.js";

export function registerDiagnosticsTool(
  api: any,
  _config: WinHealthConfig,
) {
  api.registerTool({
    name: "winhealth_diagnostics",
    description:
      "Generates a full diagnostic bundle for the OpenClaw gateway. " +
      "Exports sanitized logs, stability recorder data, config shape, " +
      "and health snapshots into a zip file. Use for detailed analysis " +
      "or bug reports.",
    parameters: {
      type: "object",
      properties: {
        include_logs: {
          type: "boolean",
          description: "Include recent log tail in the response",
        },
      },
      additionalProperties: false,
    },
    async execute(_id: string, params: any) {
      const results: string[] = [];
      const includeLogs = params?.include_logs ?? true;

      // 1. Run diagnostics export
      try {
        const exportOut = await api.runtime.system.runCommandWithTimeout(
          "openclaw",
          ["gateway", "diagnostics", "export"],
          { timeoutMs: 30000 },
        );
        if (exportOut.stdout) {
          results.push("=== Diagnostics Export ===");
          results.push(exportOut.stdout);
          results.push("");
        }
      } catch (err: any) {
        results.push(`Diagnostics export failed: ${err.message}`);
      }

      // 2. Gateway health
      try {
        const healthOut = await api.runtime.system.runCommandWithTimeout(
          "openclaw",
          ["health", "--verbose", "--json"],
          { timeoutMs: 20000 },
        );
        if (healthOut.stdout) {
          results.push("=== Gateway Health ===");
          results.push(healthOut.stdout);
          results.push("");
        }
      } catch (err: any) {
        results.push(`Health check failed: ${err.message}`);
      }

      // 3. Gateway status
      try {
        const statusOut = await api.runtime.system.runCommandWithTimeout(
          "openclaw",
          ["status", "--all"],
          { timeoutMs: 20000 },
        );
        if (statusOut.stdout) {
          results.push("=== Gateway Status ===");
          results.push(statusOut.stdout);
          results.push("");
        }
      } catch {
        results.push("Status check skipped (gateway may be busy)");
      }

      // 4. Channel status
      try {
        const channelOut = await api.runtime.system.runCommandWithTimeout(
          "openclaw",
          ["channels", "status", "--probe"],
          { timeoutMs: 20000 },
        );
        if (channelOut.stdout) {
          results.push("=== Channel Status ===");
          results.push(channelOut.stdout);
          results.push("");
        }
      } catch {
        results.push("Channel status skipped");
      }

      // 5. Recent log tail
      if (includeLogs) {
        try {
          const logOut = await api.runtime.system.runCommandWithTimeout(
            "powershell",
            [
              "-Command",
              "$log = Get-ChildItem '$env:USERPROFILE\\AppData\\Local\\Temp\\openclaw' -Filter '*.log' | Sort-Object LastWriteTime -Desc | Select-Object -First 1; if ($log) { Get-Content $log.FullName -Tail 20 | ForEach-Object { $msg = $_ | ConvertFrom-Json -ErrorAction SilentlyContinue; if ($msg.message) { $msg.message } } }",
            ],
            { timeoutMs: 15000 },
          );
          if (logOut.stdout?.trim()) {
            results.push("=== Recent Log Messages ===");
            results.push(logOut.stdout);
            results.push("");
          }
        } catch {
          results.push("Log tail extraction failed");
        }
      }

      // 6. Windows task
      try {
        const taskOut = await api.runtime.system.runCommandWithTimeout(
          "powershell",
          [
            "-Command",
            "Get-ScheduledTask -TaskName 'OpenClaw Gateway' | Select-Object State, LastRunTime, LastTaskResult | Format-List",
          ],
          { timeoutMs: 10000 },
        );
        if (taskOut.stdout) {
          results.push("=== Windows Task ===");
          results.push(taskOut.stdout);
          results.push("");
        }
      } catch {
        results.push("Windows task check failed");
      }

      return {
        content: [
          {
            type: "text",
            text: results.join("\n") || "No diagnostics available.",
          },
        ],
      };
    },
  });
}

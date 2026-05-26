/**
 * winhealth_diagnostics — Full diagnostic bundle
 */

export function registerDiagnosticsTool(api, _config) {
  api.registerTool({
    name: "winhealth_diagnostics",
    description:
      "WARNING: This tool collects diagnostic data that may contain sensitive information. " +
      "Generates a full diagnostic bundle: gateway health, channel status, config shape, " +
      "and (if include_logs is true) recent log messages which may contain " +
      "file paths, identifiers, or operational metadata. Review output before sharing.",
    parameters: {
      type: "object",
      properties: { include_logs: { type: "boolean", description: "Include recent log tail in the response. Logs may contain sensitive data. Default: false. Enable only if you need log context." } },
      additionalProperties: false,
    },
    async execute(_id, params) {
      const results = [];
      results.push("\u26A0\uFE0F Diagnostic data collected. Review before sharing. Sensitive items like tokens, paths, and identifiers may be present.\n");
      const includeLogs = params?.include_logs ?? false;

      try {
        const exportOut = await api.runtime.system.runCommandWithTimeout(
          ["openclaw", "gateway", "diagnostics", "export"], { timeoutMs: 30000 }
        );
        if (exportOut.stdout) { results.push("=== Diagnostics Export ===", exportOut.stdout, ""); }
      } catch (err) { results.push("Diagnostics export failed: " + err.message); }

      try {
        const healthOut = await api.runtime.system.runCommandWithTimeout(
          ["openclaw", "health", "--verbose", "--json"], { timeoutMs: 20000 }
        );
        if (healthOut.stdout) { results.push("=== Gateway Health ===", healthOut.stdout, ""); }
      } catch (err) { results.push("Health check failed: " + err.message); }

      try {
        const statusOut = await api.runtime.system.runCommandWithTimeout(
          ["openclaw", "status", "--all"], { timeoutMs: 20000 }
        );
        if (statusOut.stdout) { results.push("=== Gateway Status ===", statusOut.stdout, ""); }
      } catch (_) { results.push("Status check skipped"); }

      try {
        const channelOut = await api.runtime.system.runCommandWithTimeout(
          ["openclaw", "channels", "status", "--probe"], { timeoutMs: 20000 }
        );
        if (channelOut.stdout) { results.push("=== Channel Status ===", channelOut.stdout, ""); }
      } catch (_) { results.push("Channel status skipped"); }

      if (includeLogs) {
        results.push("\u26A0\uFE0F Log tail included. Logs may contain secrets, file paths, or identifiers. Review before sharing.");
        try {
          if (process.platform === "win32") {
            const logOut = await api.runtime.system.runCommandWithTimeout(
              ["powershell",
                "-Command",
                "$log = Get-ChildItem (Join-Path $env:TEMP 'openclaw') -Filter '*.log' | Sort-Object LastWriteTime -Desc | Select-Object -First 1; if ($log) { Get-Content $log.FullName -Tail 20 | ForEach-Object { $msg = $_ | ConvertFrom-Json -ErrorAction SilentlyContinue; if ($msg.message) { $msg.message } } }"
              ], { timeoutMs: 15000 }
            );
            if (logOut.stdout?.trim()) { results.push("=== Recent Log Messages ===", logOut.stdout, ""); }
          } else {
            const logOut = await api.runtime.system.runCommandWithTimeout(
              ["sh", "-c",
                "ls -t $TMPDIR/openclaw/*.log ~/.openclaw/logs/*.log 2>/dev/null | head -1 | xargs tail -20 2>/dev/null"
              ], { timeoutMs: 15000 }
            );
            if (logOut.stdout?.trim()) { results.push("=== Recent Log Messages ===", logOut.stdout, ""); }
          }
        } catch (_) { results.push("Log tail extraction failed"); }
      }

      if (process.platform === "win32") {
        try {
          const taskOut = await api.runtime.system.runCommandWithTimeout(
            ["powershell",
              "-Command",
              "Get-ScheduledTask -TaskName 'OpenClaw Gateway' | Select-Object State, LastRunTime, LastTaskResult | Format-List"
            ], { timeoutMs: 10000 }
          );
          if (taskOut.stdout) { results.push("=== Windows Task ===", taskOut.stdout, ""); }
        } catch (_) { results.push("Windows task check failed"); }
      }

      return { content: [{ type: "text", text: results.join("\n") || "No diagnostics available." }] };
    },
  });
}

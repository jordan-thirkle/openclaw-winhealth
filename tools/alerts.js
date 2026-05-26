/**
 * winhealth_alerts — Alert management tool
 */

const alerts = [];

export function getActiveAlerts() {
  return alerts.filter(function(a) { return !a.dismissed; });
}

export function addAlert(alert) {
  const existing = alerts.findIndex(function(a) { return a.type === alert.type && !a.dismissed; });
  if (existing !== -1) { alerts[existing] = alert; return; }
  alerts.push(alert);
  if (alerts.length > 100) { alerts.splice(0, alerts.length - 100); }
}

export function registerAlertsTool(api, _config) {
  api.registerTool({
    name: "winhealth_alerts",
    description:
      "Manages OpenClaw Health Monitor alerts. List active alerts, dismiss specific alerts, or clear all.",
    parameters: {
      type: "object",
      properties: {
        action: { type: "string", enum: ["list", "dismiss", "clear"], description: "Action to perform" },
        alert_id: { type: "string", description: "Alert ID to dismiss (required for 'dismiss')" },
      },
      required: ["action"],
      additionalProperties: false,
    },
    async execute(_id, params) {
      if (params.action === "list") {
        const active = getActiveAlerts();
        if (active.length === 0) {
          return { content: [{ type: "text", text: "No active alerts. System healthy." }] };
        }
        return { content: [{ type: "text", text: JSON.stringify({
          count: active.length,
          alerts: active.map(function(a) { return { id: a.id, type: a.type, severity: a.severity, message: a.message, age: Math.round((Date.now() - a.timestamp) / 1000) + "s" }; })
        }, null, 2) }] };
      }

      if (params.action === "dismiss") {
        if (!params.alert_id) { return { content: [{ type: "text", text: "Error: alert_id required" }] }; }
        const idx = alerts.findIndex(function(a) { return a.id === params.alert_id; });
        if (idx === -1) { return { content: [{ type: "text", text: "Alert not found: " + params.alert_id }] }; }
        alerts[idx].dismissed = true;
        return { content: [{ type: "text", text: "Alert dismissed: " + params.alert_id }] };
      }

      if (params.action === "clear") {
        const activeBefore = getActiveAlerts().length;
        alerts.forEach(function(a) { a.dismissed = true; });
        return { content: [{ type: "text", text: "Cleared " + activeBefore + " active alerts." }] };
      }

      return { content: [{ type: "text", text: "Unknown action: " + params.action }] };
    },
  });
}

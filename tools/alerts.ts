/**
 * winhealth_alerts — Alert management tool
 *
 * Lists, dismisses, and manages health alerts.
 * Alerts are stored in-memory during the gateway session
 * and persisted to a JSON state file.
 */

import type { Alert } from "../index.js";

const alerts: Alert[] = [];

export function getActiveAlerts(): Alert[] {
  return alerts.filter((a) => !a.dismissed);
}

export function addAlert(alert: Alert): void {
  // Deduplicate by type
  const existing = alerts.findIndex(
    (a) => a.type === alert.type && !a.dismissed,
  );
  if (existing !== -1) {
    alerts[existing] = alert;
    return;
  }
  alerts.push(alert);
  // Keep max 100 alerts
  if (alerts.length > 100) {
    alerts.splice(0, alerts.length - 100);
  }
}

export function registerAlertsTool(
  api: any,
  _config: any,
) {
  api.registerTool({
    name: "winhealth_alerts",
    description:
      "Manages Windows Health Monitor alerts. " +
      "List active alerts, dismiss specific alerts, or clear all. " +
      "Use this to acknowledge and manage health notifications.",
    parameters: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["list", "dismiss", "clear"],
          description: "Action: list active alerts, dismiss one by id, or clear all",
        },
        alert_id: {
          type: "string",
          description: "Alert ID to dismiss (required for 'dismiss' action)",
        },
      },
      required: ["action"],
      additionalProperties: false,
    },
    async execute(_id: string, params: any) {
      switch (params.action) {
        case "list": {
          const active = getActiveAlerts();
          if (active.length === 0) {
            return {
              content: [{ type: "text", text: "No active alerts. System healthy." }],
            };
          }
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    count: active.length,
                    alerts: active.map((a) => ({
                      id: a.id,
                      type: a.type,
                      severity: a.severity,
                      message: a.message,
                      age: Math.round((Date.now() - a.timestamp) / 1000) + "s",
                    })),
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        case "dismiss": {
          if (!params.alert_id) {
            return {
              content: [{ type: "text", text: "Error: alert_id required for dismiss action" }],
            };
          }
          const idx = alerts.findIndex((a) => a.id === params.alert_id);
          if (idx === -1) {
            return {
              content: [{ type: "text", text: `Alert not found: ${params.alert_id}` }],
            };
          }
          alerts[idx].dismissed = true;
          return {
            content: [{ type: "text", text: `Alert dismissed: ${params.alert_id}` }],
          };
        }

        case "clear": {
          alerts.forEach((a) => (a.dismissed = true));
          const cleared = alerts.length;
          return {
            content: [{ type: "text", text: `Cleared ${cleared} alerts.` }],
          };
        }

        default:
          return {
            content: [{ type: "text", text: `Unknown action: ${params.action}` }],
          };
      }
    },
  });
}

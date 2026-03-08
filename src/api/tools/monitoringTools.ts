/**
 * Copilot SDK Agent Tool definitions for monitoring, alerting, and predictive insights.
 *
 * These tools enable the AI agent to:
 * - Create/manage alert rules on telemetry thresholds
 * - Check twin health status
 * - Query active alerts
 * - Get health summaries for production lines
 */

import type { Tool } from "@github/copilot-sdk";
import * as alertService from "../services/alertService.js";
import * as iotService from "../services/iotService.js";

type ToolEventListener = (event: { name: string; status: string; result?: unknown; error?: string }) => void;
let toolEventListener: ToolEventListener | null = null;

export function setMonitoringToolEventListener(listener: ToolEventListener | null): void {
  toolEventListener = listener;
}

function emitToolEvent(name: string, status: string, result?: unknown, error?: string): void {
  toolEventListener?.({ name, status, result, error });
}

export const monitoringTools: Tool<any>[] = [
  {
    name: "create_alert_rule",
    description:
      "Create an alert rule that triggers when a twin's telemetry property crosses a threshold. " +
      "For example: 'Alert me when motor vibration exceeds 5 mm/s'. " +
      "Alerts will appear in the monitoring panel and can be queried.",
    parameters: {
      type: "object",
      properties: {
        twinId: {
          type: "string",
          description: "The twin ID to monitor (e.g. 'filler_motor'). Use '*' to match all twins.",
        },
        property: {
          type: "string",
          description: "The telemetry property to monitor (e.g. 'Temperature', 'Vibration', 'CurrentRPM').",
        },
        condition: {
          type: "string",
          enum: ["above", "below"],
          description: "'above' triggers when value exceeds threshold, 'below' triggers when value drops below.",
        },
        threshold: {
          type: "number",
          description: "The threshold value that triggers the alert.",
        },
        severity: {
          type: "string",
          enum: ["critical", "warning", "info"],
          description: "Alert severity level. Default: 'warning'.",
        },
        message: {
          type: "string",
          description: "Custom alert message. If omitted, a default message is generated.",
        },
      },
      required: ["twinId", "property", "condition", "threshold"],
    },
    handler: async (args: {
      twinId: string;
      property: string;
      condition: "above" | "below";
      threshold: number;
      severity?: "critical" | "warning" | "info";
      message?: string;
    }) => {
      emitToolEvent("create_alert_rule", "executing");
      const rule = alertService.createRule(
        args.twinId,
        args.property,
        args.condition,
        args.threshold,
        args.severity ?? "warning",
        args.message,
      );
      emitToolEvent("create_alert_rule", "completed", rule);
      return {
        success: true,
        rule,
        message: `Alert rule created: ${rule.message}`,
      };
    },
  },

  {
    name: "list_alert_rules",
    description: "List all configured alert rules.",
    parameters: { type: "object", properties: {}, required: [] },
    handler: async () => {
      emitToolEvent("list_alert_rules", "executing");
      const rules = alertService.getRules();
      emitToolEvent("list_alert_rules", "completed", rules);
      return { rules, count: rules.length };
    },
  },

  {
    name: "delete_alert_rule",
    description: "Delete an alert rule by ID.",
    parameters: {
      type: "object",
      properties: {
        ruleId: {
          type: "string",
          description: "The ID of the rule to delete (e.g. 'rule_1').",
        },
      },
      required: ["ruleId"],
    },
    handler: async (args: { ruleId: string }) => {
      emitToolEvent("delete_alert_rule", "executing");
      const deleted = alertService.deleteRule(args.ruleId);
      const result = { success: deleted, ruleId: args.ruleId };
      emitToolEvent("delete_alert_rule", "completed", result);
      return result;
    },
  },

  {
    name: "get_active_alerts",
    description:
      "Get all currently active alerts. Shows which twins have violations, the severity, " +
      "current values, and when the alert was triggered. Use this when the user asks about " +
      "problems, issues, or status of the factory.",
    parameters: {
      type: "object",
      properties: {
        twinId: {
          type: "string",
          description: "Optional: filter alerts to a specific twin.",
        },
      },
      required: [],
    },
    handler: async (args: { twinId?: string }) => {
      emitToolEvent("get_active_alerts", "executing");
      const alerts = args.twinId
        ? alertService.getAlertsByTwin(args.twinId)
        : alertService.getActiveAlerts();
      const result = {
        alerts,
        count: alerts.length,
        bySeverity: {
          critical: alerts.filter((a) => a.severity === "critical").length,
          warning: alerts.filter((a) => a.severity === "warning").length,
          info: alerts.filter((a) => a.severity === "info").length,
        },
      };
      emitToolEvent("get_active_alerts", "completed", result);
      return result;
    },
  },

  {
    name: "get_health_status",
    description:
      "Get the health status of one or all twins. Returns 'healthy', 'warning', or 'critical' " +
      "based on active alerts. Use this for quick health checks.",
    parameters: {
      type: "object",
      properties: {
        twinId: {
          type: "string",
          description: "Optional: specific twin to check. If omitted, returns all twin health statuses.",
        },
      },
      required: [],
    },
    handler: async (args: { twinId?: string }) => {
      emitToolEvent("get_health_status", "executing");
      if (args.twinId) {
        const status = alertService.getTwinHealthStatus(args.twinId);
        const alerts = alertService.getAlertsByTwin(args.twinId);
        const result = { twinId: args.twinId, status, activeAlerts: alerts.length };
        emitToolEvent("get_health_status", "completed", result);
        return result;
      }

      const statuses = alertService.getAllHealthStatuses();
      const simulating = iotService.getActiveSimulations();
      const result = {
        statuses,
        monitoredTwins: simulating.length,
        summary: {
          critical: Object.values(statuses).filter((s) => s === "critical").length,
          warning: Object.values(statuses).filter((s) => s === "warning").length,
          healthy: simulating.length - Object.keys(statuses).length,
        },
      };
      emitToolEvent("get_health_status", "completed", result);
      return result;
    },
  },

  {
    name: "acknowledge_alert",
    description: "Acknowledge an active alert to indicate it has been reviewed.",
    parameters: {
      type: "object",
      properties: {
        alertId: {
          type: "string",
          description: "The alert ID to acknowledge.",
        },
      },
      required: ["alertId"],
    },
    handler: async (args: { alertId: string }) => {
      emitToolEvent("acknowledge_alert", "executing");
      const result = alertService.acknowledgeAlert(args.alertId);
      emitToolEvent("acknowledge_alert", "completed", { success: result });
      return { success: result, alertId: args.alertId };
    },
  },

  {
    name: "setup_default_alerts",
    description:
      "Set up default manufacturing alert rules for common scenarios: " +
      "temperature warnings (>60°C), temperature critical (>80°C), " +
      "vibration warnings (>4mm/s), vibration critical (>7mm/s). " +
      "Use this to quickly enable monitoring for a factory.",
    parameters: { type: "object", properties: {}, required: [] },
    handler: async () => {
      emitToolEvent("setup_default_alerts", "executing");
      const rules = alertService.createDefaultManufacturingRules();
      alertService.startMonitoring();
      const result = {
        success: true,
        rulesCreated: rules.length,
        rules: rules.map((r) => ({ id: r.id, message: r.message, severity: r.severity })),
        message: "Default manufacturing alert rules configured and monitoring started.",
      };
      emitToolEvent("setup_default_alerts", "completed", result);
      return result;
    },
  },
];

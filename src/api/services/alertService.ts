/**
 * Alert Service — threshold-based alerting on telemetry data.
 *
 * Monitors telemetry readings against configurable alert rules and tracks
 * active alerts. Integrates with the IoT telemetry service via listener pattern.
 */

import * as iotService from "./iotService.js";
import type { TelemetryReading } from "./iotService.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AlertRule {
  id: string;
  twinId: string;
  property: string;
  condition: "above" | "below";
  threshold: number;
  severity: "critical" | "warning" | "info";
  message: string;
  enabled: boolean;
  createdAt: string;
}

export interface ActiveAlert {
  id: string;
  ruleId: string;
  twinId: string;
  property: string;
  severity: "critical" | "warning" | "info";
  message: string;
  value: number;
  threshold: number;
  triggeredAt: string;
  acknowledged: boolean;
}

type AlertListener = (alert: ActiveAlert) => void;

// ─── State ────────────────────────────────────────────────────────────────────

const alertRules = new Map<string, AlertRule>();
const activeAlerts = new Map<string, ActiveAlert>();
const alertHistory: ActiveAlert[] = [];
const MAX_ALERT_HISTORY = 200;
const alertListeners = new Set<AlertListener>();
let telemetryUnsubscribe: (() => void) | null = null;

// ─── Listener Management ──────────────────────────────────────────────────────

export function addAlertListener(listener: AlertListener): () => void {
  alertListeners.add(listener);
  return () => alertListeners.delete(listener);
}

function notifyAlertListeners(alert: ActiveAlert): void {
  for (const listener of alertListeners) {
    listener(alert);
  }
}

// ─── Rule Management ──────────────────────────────────────────────────────────

let ruleCounter = 0;

export function createRule(
  twinId: string,
  property: string,
  condition: "above" | "below",
  threshold: number,
  severity: "critical" | "warning" | "info" = "warning",
  message?: string,
): AlertRule {
  ruleCounter++;
  const rule: AlertRule = {
    id: `rule_${ruleCounter}`,
    twinId,
    property,
    condition,
    threshold,
    severity,
    message: message ?? `${property} ${condition} ${threshold} on ${twinId}`,
    enabled: true,
    createdAt: new Date().toISOString(),
  };
  alertRules.set(rule.id, rule);
  return rule;
}

export function deleteRule(ruleId: string): boolean {
  const deleted = alertRules.delete(ruleId);
  // Clear active alerts for this rule
  for (const [alertId, alert] of activeAlerts) {
    if (alert.ruleId === ruleId) {
      activeAlerts.delete(alertId);
    }
  }
  return deleted;
}

export function getRules(): AlertRule[] {
  return Array.from(alertRules.values());
}

export function getRule(ruleId: string): AlertRule | undefined {
  return alertRules.get(ruleId);
}

export function updateRule(ruleId: string, updates: Partial<Pick<AlertRule, "threshold" | "severity" | "enabled" | "message">>): AlertRule | undefined {
  const rule = alertRules.get(ruleId);
  if (!rule) return undefined;
  Object.assign(rule, updates);
  return rule;
}

// ─── Alert Evaluation ─────────────────────────────────────────────────────────

function evaluateReading(reading: TelemetryReading): void {
  for (const rule of alertRules.values()) {
    if (!rule.enabled) continue;
    if (rule.twinId !== reading.twinId || rule.property !== reading.property) continue;

    const isViolating =
      (rule.condition === "above" && reading.value > rule.threshold) ||
      (rule.condition === "below" && reading.value < rule.threshold);

    const alertKey = `${rule.id}::${reading.twinId}::${reading.property}`;

    if (isViolating) {
      if (!activeAlerts.has(alertKey)) {
        const alert: ActiveAlert = {
          id: alertKey,
          ruleId: rule.id,
          twinId: reading.twinId,
          property: reading.property,
          severity: rule.severity,
          message: rule.message,
          value: reading.value,
          threshold: rule.threshold,
          triggeredAt: new Date().toISOString(),
          acknowledged: false,
        };
        activeAlerts.set(alertKey, alert);
        alertHistory.push(alert);
        if (alertHistory.length > MAX_ALERT_HISTORY) alertHistory.shift();
        notifyAlertListeners(alert);
      } else {
        // Update the value on existing alert
        const existing = activeAlerts.get(alertKey)!;
        existing.value = reading.value;
      }
    } else {
      // Condition resolved — clear the alert
      activeAlerts.delete(alertKey);
    }
  }
}

// ─── Query ────────────────────────────────────────────────────────────────────

export function getActiveAlerts(): ActiveAlert[] {
  return Array.from(activeAlerts.values());
}

export function getAlertsByTwin(twinId: string): ActiveAlert[] {
  return Array.from(activeAlerts.values()).filter((a) => a.twinId === twinId);
}

export function getAlertHistory(limit = 50): ActiveAlert[] {
  return alertHistory.slice(-limit);
}

export function acknowledgeAlert(alertId: string): boolean {
  const alert = activeAlerts.get(alertId);
  if (alert) {
    alert.acknowledged = true;
    return true;
  }
  return false;
}

export function clearAlert(alertId: string): boolean {
  return activeAlerts.delete(alertId);
}

// ─── Health Status (computed from alerts) ─────────────────────────────────────

export type HealthStatus = "healthy" | "warning" | "critical";

export function getTwinHealthStatus(twinId: string): HealthStatus {
  const alerts = getAlertsByTwin(twinId);
  if (alerts.some((a) => a.severity === "critical")) return "critical";
  if (alerts.some((a) => a.severity === "warning")) return "warning";
  return "healthy";
}

export function getAllHealthStatuses(): Record<string, HealthStatus> {
  const statuses: Record<string, HealthStatus> = {};
  for (const alert of activeAlerts.values()) {
    const current = statuses[alert.twinId] ?? "healthy";
    if (alert.severity === "critical") {
      statuses[alert.twinId] = "critical";
    } else if (alert.severity === "warning" && current !== "critical") {
      statuses[alert.twinId] = "warning";
    }
  }
  return statuses;
}

// ─── Initialization ───────────────────────────────────────────────────────────

/** Start monitoring telemetry for alert evaluation */
export function startMonitoring(): void {
  if (telemetryUnsubscribe) return; // already monitoring
  telemetryUnsubscribe = iotService.addTelemetryListener(evaluateReading);
  console.log("✓ Alert monitoring started");
}

/** Stop monitoring telemetry */
export function stopMonitoring(): void {
  telemetryUnsubscribe?.();
  telemetryUnsubscribe = null;
}

// ─── Default Alert Rules (auto-created for common manufacturing scenarios) ────

export function createDefaultManufacturingRules(): AlertRule[] {
  const defaults: Array<Omit<AlertRule, "id" | "createdAt" | "enabled">> = [
    { twinId: "*", property: "Temperature", condition: "above", threshold: 80, severity: "critical", message: "Temperature critically high — risk of equipment damage" },
    { twinId: "*", property: "Temperature", condition: "above", threshold: 60, severity: "warning", message: "Temperature elevated — monitor closely" },
    { twinId: "*", property: "Vibration", condition: "above", threshold: 7, severity: "critical", message: "Vibration critically high — possible mechanical failure" },
    { twinId: "*", property: "Vibration", condition: "above", threshold: 4, severity: "warning", message: "Vibration elevated — schedule maintenance check" },
  ];

  return defaults.map((d) =>
    createRule(d.twinId, d.property, d.condition, d.threshold, d.severity, d.message)
  );
}

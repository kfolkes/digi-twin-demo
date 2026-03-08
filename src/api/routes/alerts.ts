/**
 * Alert routes — REST endpoints for alert rules, active alerts, and health status.
 */
import { Router } from "express";
import * as alertService from "../services/alertService.js";

const router = Router();

// ─── Alert Rules ──────────────────────────────────────────────────────────────

/** GET /api/alerts/rules — list all alert rules */
router.get("/api/alerts/rules", (_req, res) => {
  res.json(alertService.getRules());
});

/** POST /api/alerts/rules — create an alert rule */
router.post("/api/alerts/rules", (req, res) => {
  const { twinId, property, condition, threshold, severity, message } = req.body as {
    twinId?: string;
    property?: string;
    condition?: "above" | "below";
    threshold?: number;
    severity?: "critical" | "warning" | "info";
    message?: string;
  };

  if (!twinId || !property || !condition || threshold === undefined) {
    res.status(400).json({ error: "twinId, property, condition, and threshold are required" });
    return;
  }

  const rule = alertService.createRule(twinId, property, condition, threshold, severity, message);
  res.status(201).json(rule);
});

/** DELETE /api/alerts/rules/:id — delete an alert rule */
router.delete("/api/alerts/rules/:id", (req, res) => {
  const deleted = alertService.deleteRule(req.params.id);
  res.json({ success: deleted });
});

// ─── Active Alerts ────────────────────────────────────────────────────────────

/** GET /api/alerts — all active alerts */
router.get("/api/alerts", (_req, res) => {
  res.json(alertService.getActiveAlerts());
});

/** GET /api/alerts/twin/:twinId — alerts for a specific twin */
router.get("/api/alerts/twin/:twinId", (req, res) => {
  res.json(alertService.getAlertsByTwin(req.params.twinId));
});

/** POST /api/alerts/:id/acknowledge — acknowledge an alert */
router.post("/api/alerts/:id/acknowledge", (req, res) => {
  const result = alertService.acknowledgeAlert(req.params.id);
  res.json({ success: result });
});

/** DELETE /api/alerts/:id — clear an alert */
router.delete("/api/alerts/:id", (req, res) => {
  const result = alertService.clearAlert(req.params.id);
  res.json({ success: result });
});

// ─── Alert History ────────────────────────────────────────────────────────────

/** GET /api/alerts/history — recent alert history */
router.get("/api/alerts/history", (req, res) => {
  const limit = typeof req.query.limit === "string" ? parseInt(req.query.limit, 10) : 50;
  res.json(alertService.getAlertHistory(limit));
});

// ─── Health Status ────────────────────────────────────────────────────────────

/** GET /api/health/twins — health status for all monitored twins */
router.get("/api/health/twins", (_req, res) => {
  res.json(alertService.getAllHealthStatuses());
});

/** GET /api/health/twins/:twinId — health status for a specific twin */
router.get("/api/health/twins/:twinId", (req, res) => {
  const status = alertService.getTwinHealthStatus(req.params.twinId);
  const alerts = alertService.getAlertsByTwin(req.params.twinId);
  res.json({ twinId: req.params.twinId, status, activeAlerts: alerts });
});

// ─── Monitoring Control ───────────────────────────────────────────────────────

/** POST /api/alerts/start-monitoring — start alert evaluation on telemetry */
router.post("/api/alerts/start-monitoring", (_req, res) => {
  alertService.startMonitoring();
  res.json({ success: true, message: "Alert monitoring started" });
});

/** POST /api/alerts/setup-defaults — create default manufacturing alert rules */
router.post("/api/alerts/setup-defaults", (_req, res) => {
  const rules = alertService.createDefaultManufacturingRules();
  alertService.startMonitoring();
  res.json({
    success: true,
    rulesCreated: rules.length,
    rules,
  });
});

export default router;

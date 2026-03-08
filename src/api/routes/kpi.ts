/**
 * KPI routes — REST endpoints for manufacturing analytics and OEE metrics.
 */
import { Router } from "express";
import * as kpiService from "../services/kpiService.js";

const router = Router();

/** GET /api/kpi/oee — calculate and return OEE metrics */
router.get("/api/kpi/oee", (_req, res) => {
  const result = kpiService.calculateOEE();
  res.json(result);
});

/** GET /api/kpi/throughput — throughput report with per-station breakdown */
router.get("/api/kpi/throughput", (_req, res) => {
  const report = kpiService.getThroughputReport();
  res.json(report);
});

/** GET /api/kpi/shifts — compare shift performance */
router.get("/api/kpi/shifts", (_req, res) => {
  const comparison = kpiService.compareShifts();
  res.json(comparison);
});

/** GET /api/kpi/summary — manager-level executive summary */
router.get("/api/kpi/summary", (_req, res) => {
  const summary = kpiService.getManagerSummary();
  res.json(summary);
});

export default router;

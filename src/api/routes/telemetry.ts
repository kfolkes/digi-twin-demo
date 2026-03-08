/**
 * Telemetry routes — real-time SSE streaming of twin telemetry data
 * plus REST endpoints for latest readings and history.
 */
import { Router } from "express";
import * as iotService from "../services/iotService.js";

const router = Router();

// ─── SSE: Real-time telemetry stream ──────────────────────────────────────────

/**
 * GET /api/telemetry/stream — Server-Sent Events stream of all telemetry readings.
 * Clients receive events as twins emit telemetry (from IoT Hub or simulator).
 *
 * Optional query params:
 *   ?twinIds=motor_01,filler_motor — filter to specific twins
 */
router.get("/api/telemetry/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const filterTwins = typeof req.query.twinIds === "string"
    ? new Set(req.query.twinIds.split(",").map((s) => s.trim()).filter(Boolean))
    : null;

  const unsubscribe = iotService.addTelemetryListener((reading) => {
    if (filterTwins && !filterTwins.has(reading.twinId)) return;
    if (!res.socket?.destroyed) {
      res.write(`data: ${JSON.stringify(reading)}\n\n`);
    }
  });

  // Send initial snapshot of all latest readings
  const latest = iotService.getAllLatestReadings();
  for (const reading of latest) {
    if (filterTwins && !filterTwins.has(reading.twinId)) continue;
    res.write(`data: ${JSON.stringify(reading)}\n\n`);
  }

  req.on("close", () => {
    unsubscribe();
  });
});

// ─── REST: Latest readings ────────────────────────────────────────────────────

/** GET /api/telemetry/latest — all latest telemetry readings */
router.get("/api/telemetry/latest", (_req, res) => {
  res.json(iotService.getAllLatestReadings());
});

/** GET /api/telemetry/latest/:twinId — latest readings for a specific twin */
router.get("/api/telemetry/latest/:twinId", (req, res) => {
  const all = iotService.getAllLatestReadings();
  const filtered = all.filter((r) => r.twinId === req.params.twinId);
  res.json(filtered);
});

/** GET /api/telemetry/latest/:twinId/:property — latest reading for a specific twin property */
router.get("/api/telemetry/latest/:twinId/:property", (req, res) => {
  const reading = iotService.getLatestReading(req.params.twinId, req.params.property);
  if (!reading) {
    res.status(404).json({ error: `No telemetry for ${req.params.twinId}/${req.params.property}` });
    return;
  }
  res.json(reading);
});

// ─── REST: History ────────────────────────────────────────────────────────────

/** GET /api/telemetry/history/:twinId/:property — recent reading history (up to 60 points) */
router.get("/api/telemetry/history/:twinId/:property", (req, res) => {
  const history = iotService.getReadingHistory(req.params.twinId, req.params.property);
  res.json(history);
});

// ─── REST: Simulation control ─────────────────────────────────────────────────

/** GET /api/telemetry/simulations — list active simulations */
router.get("/api/telemetry/simulations", (_req, res) => {
  res.json({ activeTwins: iotService.getActiveSimulations() });
});

/** POST /api/telemetry/simulate — start simulation for a twin */
router.post("/api/telemetry/simulate", (req, res) => {
  const { twinId, modelId, intervalMs } = req.body as {
    twinId?: string;
    modelId?: string;
    intervalMs?: number;
  };

  if (!twinId || !modelId) {
    res.status(400).json({ error: "twinId and modelId are required" });
    return;
  }

  const result = iotService.startSimulation(twinId, modelId, intervalMs);
  if (!result.success) {
    res.status(400).json({ error: `No simulation profile for model type in '${modelId}'` });
    return;
  }

  res.json({
    success: true,
    twinId,
    simulatingProperties: result.properties,
    message: `Telemetry simulation started for '${twinId}'`,
  });
});

/** DELETE /api/telemetry/simulate/:twinId — stop simulation for a twin */
router.delete("/api/telemetry/simulate/:twinId", (req, res) => {
  const stopped = iotService.stopSimulation(req.params.twinId);
  res.json({
    success: stopped,
    message: stopped
      ? `Simulation stopped for '${req.params.twinId}'`
      : `No active simulation for '${req.params.twinId}'`,
  });
});

/** DELETE /api/telemetry/simulations — stop all simulations */
router.delete("/api/telemetry/simulations", (_req, res) => {
  iotService.stopAllSimulations();
  res.json({ success: true, message: "All simulations stopped" });
});

export default router;

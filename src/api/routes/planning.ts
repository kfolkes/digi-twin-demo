/**
 * Planning Routes — REST endpoints for production orders,
 * schedules, bottleneck analysis, and simulation.
 */
import { Router } from "express";
import * as planningService from "../services/planningService.js";
import * as simulationService from "../services/simulationService.js";

const router = Router();

// ── Production Orders ─────────────────────────────────────────────────────────

router.get("/api/planning/orders", (_req, res) => {
  const orders = planningService.getAllOrders();
  res.json({ orders, total: orders.length });
});

router.post("/api/planning/orders", (req, res) => {
  const { productName, quantity, priority, dueDate, estimatedCycleTimeSec, requiredStations } = req.body;
  if (!productName || !quantity || !dueDate) {
    res.status(400).json({ error: "productName, quantity, and dueDate are required" });
    return;
  }
  const order = planningService.createOrder({
    productName,
    quantity,
    priority,
    dueDate,
    estimatedCycleTimeSec,
    requiredStations,
  });
  res.status(201).json(order);
});

router.patch("/api/planning/orders/:id/status", (req, res) => {
  const { status } = req.body;
  const order = planningService.updateOrderStatus(req.params.id, status);
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  res.json(order);
});

router.delete("/api/planning/orders/:id", (req, res) => {
  const deleted = planningService.deleteOrder(req.params.id);
  res.json({ deleted });
});

// ── Schedules ─────────────────────────────────────────────────────────────────

router.get("/api/planning/schedules", (_req, res) => {
  const schedules = planningService.getAllSchedules();
  res.json({ schedules });
});

router.post("/api/planning/schedules/generate", async (_req, res) => {
  try {
    const schedule = await planningService.generateSchedule();
    res.status(201).json(schedule);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.get("/api/planning/schedules/:id", (req, res) => {
  const schedule = planningService.getSchedule(req.params.id);
  if (!schedule) {
    res.status(404).json({ error: "Schedule not found" });
    return;
  }
  res.json(schedule);
});

// ── Bottleneck Analysis ───────────────────────────────────────────────────────

router.get("/api/planning/bottlenecks", async (_req, res) => {
  try {
    const bottlenecks = await planningService.identifyBottlenecks();
    res.json({ bottlenecks });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// ── Simulation ────────────────────────────────────────────────────────────────

router.get("/api/planning/simulations", (_req, res) => {
  const results = simulationService.getAllSimulationResults();
  res.json({ simulations: results });
});

router.post("/api/planning/simulations", async (req, res) => {
  const { name, description, changes } = req.body;
  if (!name || !changes || !Array.isArray(changes)) {
    res.status(400).json({ error: "name and changes array are required" });
    return;
  }
  try {
    const scenario = simulationService.createScenario({ name, description, changes });
    const result = await simulationService.runSimulation(scenario.id);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.get("/api/planning/simulations/:id", (req, res) => {
  const result = simulationService.getSimulationResult(req.params.id);
  if (!result) {
    res.status(404).json({ error: "Simulation result not found" });
    return;
  }
  res.json(result);
});

export default router;

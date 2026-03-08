/**
 * Supply Chain routes — REST endpoints for inventory, suppliers, shipments, and replenishment.
 */
import { Router } from "express";
import * as supplyChainService from "../services/supplyChainService.js";

const router = Router();

// ─── Inventory ───────────────────────────────────────────────────────────────

/** GET /api/supply-chain/inventory — list all inventory items */
router.get("/api/supply-chain/inventory", (_req, res) => {
  res.json(supplyChainService.getAllInventory());
});

/** GET /api/supply-chain/inventory/:id — get a single inventory item */
router.get("/api/supply-chain/inventory/:id", (req, res) => {
  const item = supplyChainService.getInventoryItem(req.params.id);
  if (!item) {
    res.status(404).json({ error: "Material not found" });
    return;
  }
  res.json(item);
});

// ─── Suppliers ───────────────────────────────────────────────────────────────

/** GET /api/supply-chain/suppliers — list all suppliers */
router.get("/api/supply-chain/suppliers", (_req, res) => {
  res.json(supplyChainService.getAllSuppliers());
});

// ─── Shipments ───────────────────────────────────────────────────────────────

/** GET /api/supply-chain/shipments — list all shipments */
router.get("/api/supply-chain/shipments", (_req, res) => {
  res.json(supplyChainService.getAllShipments());
});

// ─── Replenishment ───────────────────────────────────────────────────────────

/** POST /api/supply-chain/replenish — trigger replenishment for a material */
router.post("/api/supply-chain/replenish", (req, res) => {
  const { materialId, quantity } = req.body as { materialId?: string; quantity?: number };
  if (!materialId) {
    res.status(400).json({ error: "materialId is required" });
    return;
  }
  const result = supplyChainService.triggerReplenishment(materialId, quantity);
  if ("error" in result) {
    res.status(400).json(result);
    return;
  }
  res.status(201).json(result);
});

/** POST /api/supply-chain/auto-replenish — run auto-replenishment check */
router.post("/api/supply-chain/auto-replenish", (_req, res) => {
  const triggered = supplyChainService.checkAutoReplenishment();
  res.json({ triggered: triggered.length, orders: triggered });
});

// ─── Health ──────────────────────────────────────────────────────────────────

/** GET /api/supply-chain/health — overall supply chain health assessment */
router.get("/api/supply-chain/health", (_req, res) => {
  res.json(supplyChainService.getSupplyChainHealth());
});

export default router;

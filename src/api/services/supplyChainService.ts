/**
 * Supply Chain Service — Inventory management, supplier tracking, and replenishment logic.
 *
 * In-memory simulation layer for lights-out manufacturing supply chain visibility.
 */

import { randomUUID } from "node:crypto";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Supplier {
  id: string;
  name: string;
  material: string;
  leadTimeDays: number;
  reliability: number; // 0-100%
  costPerUnit: number;
  status: "active" | "at-risk" | "inactive";
}

export interface InventoryItem {
  materialId: string;
  name: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  unit: string;
  reorderPoint: number;
  dailyConsumption: number;
  daysRemaining: number;
  status: "ok" | "low" | "critical" | "overstock";
}

export interface Shipment {
  id: string;
  supplierId: string;
  material: string;
  quantity: number;
  status: "ordered" | "in-transit" | "delivered" | "delayed";
  orderedAt: string;
  estimatedArrival: string;
  actualArrival?: string;
}

export interface ReplenishmentOrder {
  id: string;
  materialId: string;
  supplierId: string;
  quantity: number;
  triggeredBy: "auto" | "manual";
  status: "pending" | "confirmed" | "shipped" | "delivered";
  createdAt: string;
}

// ─── In-memory stores ────────────────────────────────────────────────────────

const suppliers = new Map<string, Supplier>();
const inventory = new Map<string, InventoryItem>();
const shipments = new Map<string, Shipment>();
const replenishmentOrders = new Map<string, ReplenishmentOrder>();

// Seed demo data
function seed(): void {
  if (suppliers.size > 0) return;

  const demoSuppliers: Supplier[] = [
    { id: "sup-steel-01", name: "SteelCorp Global", material: "steel-plate", leadTimeDays: 5, reliability: 92, costPerUnit: 12.50, status: "active" },
    { id: "sup-elec-01", name: "MicroElec Inc.", material: "pcb-board", leadTimeDays: 3, reliability: 97, costPerUnit: 8.20, status: "active" },
    { id: "sup-poly-01", name: "PolyChem Ltd.", material: "polymer-resin", leadTimeDays: 7, reliability: 78, costPerUnit: 4.80, status: "at-risk" },
    { id: "sup-bolt-01", name: "FastenAll Co.", material: "fasteners", leadTimeDays: 2, reliability: 99, costPerUnit: 0.15, status: "active" },
  ];
  for (const s of demoSuppliers) suppliers.set(s.id, s);

  const demoInventory: InventoryItem[] = [
    { materialId: "steel-plate", name: "Steel Plate (4mm)", currentStock: 450, minStock: 100, maxStock: 2000, unit: "sheets", reorderPoint: 200, dailyConsumption: 80, daysRemaining: 5.6, status: "ok" },
    { materialId: "pcb-board", name: "PCB Controller Board", currentStock: 85, minStock: 50, maxStock: 500, unit: "units", reorderPoint: 100, dailyConsumption: 30, daysRemaining: 2.8, status: "low" },
    { materialId: "polymer-resin", name: "Polymer Resin (ABS)", currentStock: 25, minStock: 50, maxStock: 300, unit: "kg", reorderPoint: 75, dailyConsumption: 15, daysRemaining: 1.7, status: "critical" },
    { materialId: "fasteners", name: "M6 Hex Bolts", currentStock: 12000, minStock: 1000, maxStock: 20000, unit: "pcs", reorderPoint: 3000, dailyConsumption: 500, daysRemaining: 24, status: "ok" },
  ];
  for (const item of demoInventory) inventory.set(item.materialId, item);

  const now = Date.now();
  const demoShipments: Shipment[] = [
    { id: "ship-001", supplierId: "sup-poly-01", material: "polymer-resin", quantity: 150, status: "in-transit", orderedAt: new Date(now - 4 * 86400000).toISOString(), estimatedArrival: new Date(now + 3 * 86400000).toISOString() },
    { id: "ship-002", supplierId: "sup-elec-01", material: "pcb-board", quantity: 200, status: "ordered", orderedAt: new Date(now - 86400000).toISOString(), estimatedArrival: new Date(now + 2 * 86400000).toISOString() },
  ];
  for (const s of demoShipments) shipments.set(s.id, s);
}

seed();

// ─── Supplier operations ─────────────────────────────────────────────────────

export function getAllSuppliers(): Supplier[] {
  return Array.from(suppliers.values());
}

export function getSupplier(id: string): Supplier | undefined {
  return suppliers.get(id);
}

// ─── Inventory operations ────────────────────────────────────────────────────

export function getAllInventory(): InventoryItem[] {
  // Recalculate status
  for (const item of inventory.values()) {
    item.daysRemaining = item.dailyConsumption > 0 ? Math.round((item.currentStock / item.dailyConsumption) * 10) / 10 : 999;
    if (item.currentStock <= item.minStock) item.status = "critical";
    else if (item.currentStock <= item.reorderPoint) item.status = "low";
    else if (item.currentStock >= item.maxStock * 0.9) item.status = "overstock";
    else item.status = "ok";
  }
  return Array.from(inventory.values());
}

export function getInventoryItem(materialId: string): InventoryItem | undefined {
  return inventory.get(materialId);
}

// ─── Shipment operations ─────────────────────────────────────────────────────

export function getAllShipments(): Shipment[] {
  return Array.from(shipments.values());
}

export function getShipment(id: string): Shipment | undefined {
  return shipments.get(id);
}

// ─── Replenishment ───────────────────────────────────────────────────────────

export function triggerReplenishment(
  materialId: string,
  quantity?: number,
  triggeredBy: "auto" | "manual" = "manual",
): ReplenishmentOrder | { error: string } {
  const item = inventory.get(materialId);
  if (!item) return { error: `Material ${materialId} not found` };

  // Find best supplier for this material
  const supplier = Array.from(suppliers.values()).find((s) => s.material === materialId && s.status !== "inactive");
  if (!supplier) return { error: `No active supplier found for ${materialId}` };

  const qty = quantity || (item.maxStock - item.currentStock);
  const id = `repl-${randomUUID().slice(0, 8)}`;
  const order: ReplenishmentOrder = {
    id,
    materialId,
    supplierId: supplier.id,
    quantity: qty,
    triggeredBy,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  replenishmentOrders.set(id, order);

  // Create corresponding shipment
  const shipmentId = `ship-${randomUUID().slice(0, 8)}`;
  const shipment: Shipment = {
    id: shipmentId,
    supplierId: supplier.id,
    material: materialId,
    quantity: qty,
    status: "ordered",
    orderedAt: new Date().toISOString(),
    estimatedArrival: new Date(Date.now() + supplier.leadTimeDays * 86400000).toISOString(),
  };
  shipments.set(shipmentId, shipment);

  return order;
}

export function getAllReplenishmentOrders(): ReplenishmentOrder[] {
  return Array.from(replenishmentOrders.values());
}

// ─── Auto-replenishment check ────────────────────────────────────────────────

export function checkAutoReplenishment(): ReplenishmentOrder[] {
  const triggered: ReplenishmentOrder[] = [];
  for (const item of inventory.values()) {
    if (item.currentStock <= item.reorderPoint) {
      // Check if there's already a pending/shipped order for this material
      const existing = Array.from(replenishmentOrders.values()).find(
        (r) => r.materialId === item.materialId && (r.status === "pending" || r.status === "confirmed" || r.status === "shipped"),
      );
      if (!existing) {
        const result = triggerReplenishment(item.materialId, undefined, "auto");
        if ("id" in result) triggered.push(result);
      }
    }
  }
  return triggered;
}

// ─── Supply chain health ─────────────────────────────────────────────────────

export interface SupplyChainHealth {
  overallStatus: "healthy" | "warning" | "critical";
  inventoryCritical: number;
  inventoryLow: number;
  shipmentsDelayed: number;
  suppliersAtRisk: number;
  daysUntilStockout: number | null;
  recommendations: string[];
}

export function getSupplyChainHealth(): SupplyChainHealth {
  const inv = getAllInventory();
  const critical = inv.filter((i) => i.status === "critical").length;
  const low = inv.filter((i) => i.status === "low").length;
  const delayed = Array.from(shipments.values()).filter((s) => s.status === "delayed").length;
  const atRisk = Array.from(suppliers.values()).filter((s) => s.status === "at-risk").length;

  const minDays = inv.reduce((min, i) => (i.daysRemaining < min ? i.daysRemaining : min), 999);

  const recommendations: string[] = [];
  if (critical > 0) recommendations.push(`${critical} material(s) at critical stock — replenish immediately.`);
  if (low > 0) recommendations.push(`${low} material(s) below reorder point — consider ordering soon.`);
  if (atRisk > 0) recommendations.push(`${atRisk} supplier(s) at risk — identify backup suppliers.`);
  if (delayed > 0) recommendations.push(`${delayed} shipment(s) delayed — contact suppliers for updated ETA.`);
  if (minDays < 3) recommendations.push(`Nearest stockout in ${minDays.toFixed(1)} days — prioritize replenishment.`);
  if (recommendations.length === 0) recommendations.push("Supply chain operating normally.");

  const overallStatus = critical > 0 || delayed > 0 ? "critical" : low > 0 || atRisk > 0 ? "warning" : "healthy";

  return {
    overallStatus,
    inventoryCritical: critical,
    inventoryLow: low,
    shipmentsDelayed: delayed,
    suppliersAtRisk: atRisk,
    daysUntilStockout: minDays < 999 ? minDays : null,
    recommendations,
  };
}

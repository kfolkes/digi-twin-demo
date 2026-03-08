/**
 * Copilot SDK Agent Tool definitions for supply chain visibility and management.
 *
 * Tools enable the AI agent to:
 * - Check material inventory levels
 * - Trigger replenishment orders
 * - Track shipments
 * - Query supplier status
 * - Get supply chain health overview
 */

import type { Tool } from "@github/copilot-sdk";
import * as supplyChainService from "../services/supplyChainService.js";

type ToolEventListener = (event: { name: string; status: string; result?: unknown; error?: string }) => void;
let toolEventListener: ToolEventListener | null = null;

export function setSupplyChainToolEventListener(listener: ToolEventListener | null): void {
  toolEventListener = listener;
}

function emitToolEvent(name: string, status: string, result?: unknown, error?: string): void {
  toolEventListener?.({ name, status, result, error });
}

export const supplyChainTools: Tool<any>[] = [
  {
    name: "check_inventory",
    description:
      "Check material inventory levels across the factory. Returns stock quantities, " +
      "days remaining until stockout, reorder status, and min/max thresholds. " +
      "Use when asked about inventory, stock levels, materials, or supply status.",
    parameters: {
      type: "object",
      properties: {
        materialId: {
          type: "string",
          description: "Optional: specific material ID (e.g. 'steel-plate'). Omit for all materials.",
        },
      },
    },
    handler: async (args: { materialId?: string }) => {
      emitToolEvent("check_inventory", "running");
      try {
        const result = args.materialId
          ? supplyChainService.getInventoryItem(args.materialId) || { error: `Material ${args.materialId} not found` }
          : supplyChainService.getAllInventory();
        emitToolEvent("check_inventory", "completed", result);
        return JSON.stringify(result);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        emitToolEvent("check_inventory", "error", undefined, msg);
        return JSON.stringify({ error: msg });
      }
    },
  },
  {
    name: "trigger_replenishment",
    description:
      "Trigger a replenishment order for a specific material. Automatically selects the " +
      "best supplier and creates a shipment. Use when stock is low or when the user wants " +
      "to reorder materials.",
    parameters: {
      type: "object",
      properties: {
        materialId: {
          type: "string",
          description: "The material ID to replenish (e.g. 'polymer-resin', 'pcb-board').",
        },
        quantity: {
          type: "number",
          description: "Optional: quantity to order. Defaults to filling up to max stock level.",
        },
      },
      required: ["materialId"],
    },
    handler: async (args: { materialId: string; quantity?: number }) => {
      emitToolEvent("trigger_replenishment", "running");
      try {
        const result = supplyChainService.triggerReplenishment(args.materialId, args.quantity);
        emitToolEvent("trigger_replenishment", "completed", result);
        return JSON.stringify(result);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        emitToolEvent("trigger_replenishment", "error", undefined, msg);
        return JSON.stringify({ error: msg });
      }
    },
  },
  {
    name: "track_shipments",
    description:
      "Track all active shipments including their status (ordered, in-transit, delivered, delayed), " +
      "supplier, material, quantity, and estimated arrival. Use when asked about deliveries, " +
      "shipments, or when materials are arriving.",
    parameters: {
      type: "object",
      properties: {},
    },
    handler: async () => {
      emitToolEvent("track_shipments", "running");
      try {
        const result = supplyChainService.getAllShipments();
        emitToolEvent("track_shipments", "completed", result);
        return JSON.stringify(result);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        emitToolEvent("track_shipments", "error", undefined, msg);
        return JSON.stringify({ error: msg });
      }
    },
  },
  {
    name: "list_suppliers",
    description:
      "List all suppliers with their reliability scores, lead times, cost per unit, and status. " +
      "Use when asked about suppliers, vendor management, or sourcing.",
    parameters: {
      type: "object",
      properties: {},
    },
    handler: async () => {
      emitToolEvent("list_suppliers", "running");
      try {
        const result = supplyChainService.getAllSuppliers();
        emitToolEvent("list_suppliers", "completed", result);
        return JSON.stringify(result);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        emitToolEvent("list_suppliers", "error", undefined, msg);
        return JSON.stringify({ error: msg });
      }
    },
  },
  {
    name: "supply_chain_health",
    description:
      "Get an overall supply chain health assessment including critical inventory count, " +
      "delayed shipments, at-risk suppliers, days until stockout, and AI recommendations. " +
      "Use when asked about supply chain status, risk assessment, or overall supply health.",
    parameters: {
      type: "object",
      properties: {},
    },
    handler: async () => {
      emitToolEvent("supply_chain_health", "running");
      try {
        const result = supplyChainService.getSupplyChainHealth();
        emitToolEvent("supply_chain_health", "completed", result);
        return JSON.stringify(result);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        emitToolEvent("supply_chain_health", "error", undefined, msg);
        return JSON.stringify({ error: msg });
      }
    },
  },
  {
    name: "auto_replenish_check",
    description:
      "Run an automatic replenishment check across all inventory. Any material below its " +
      "reorder point that doesn't already have a pending order will get a replenishment " +
      "order created automatically. Returns list of triggered orders.",
    parameters: {
      type: "object",
      properties: {},
    },
    handler: async () => {
      emitToolEvent("auto_replenish_check", "running");
      try {
        const result = supplyChainService.checkAutoReplenishment();
        emitToolEvent("auto_replenish_check", "completed", result);
        return JSON.stringify({ triggered: result.length, orders: result });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        emitToolEvent("auto_replenish_check", "error", undefined, msg);
        return JSON.stringify({ error: msg });
      }
    },
  },
];

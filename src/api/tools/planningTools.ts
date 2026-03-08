/**
 * Planning Tools — Copilot SDK agent tools for production planning & simulation.
 */
import type { Tool } from "@github/copilot-sdk";
import * as planningService from "../services/planningService.js";
import * as simulationService from "../services/simulationService.js";

type ToolEventListener = ((event: { name: string; status: string; result?: unknown; error?: string }) => void) | null;
let emitToolEvent: ToolEventListener = null;

export function setPlanningToolEventListener(listener: ToolEventListener): void {
  emitToolEvent = listener;
}

export const planningTools: Tool<any>[] = [
  // ── Order Management ──────────────────────────────────────────────────────
  {
    name: "create_production_order",
    description: "Create a new production order with product name, quantity, priority, due date, and required station types.",
    parameters: {
      type: "object" as const,
      properties: {
        productName: { type: "string", description: "Name of the product to produce" },
        quantity: { type: "number", description: "Number of units to produce" },
        priority: { type: "string", enum: ["low", "medium", "high", "critical"], description: "Order priority" },
        dueDate: { type: "string", description: "Due date in ISO format (e.g. 2026-03-15)" },
        estimatedCycleTimeSec: { type: "number", description: "Estimated seconds per unit (default 30)" },
        requiredStations: {
          type: "array",
          items: { type: "string" },
          description: "Station types needed (e.g. ['Machining', 'Assembly', 'Inspection'])",
        },
      },
      required: ["productName", "quantity", "dueDate"],
    },
    handler: async (params: {
      productName: string;
      quantity: number;
      priority?: "low" | "medium" | "high" | "critical";
      dueDate: string;
      estimatedCycleTimeSec?: number;
      requiredStations?: string[];
    }) => {
      emitToolEvent?.({ name: "create_production_order", status: "executing" });
      try {
        const order = planningService.createOrder(params);
        emitToolEvent?.({ name: "create_production_order", status: "completed", result: order });
        return JSON.stringify(order);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        emitToolEvent?.({ name: "create_production_order", status: "error", error: msg });
        return JSON.stringify({ error: msg });
      }
    },
  },
  {
    name: "list_production_orders",
    description: "List all production orders and their status (pending, scheduled, in-progress, completed).",
    parameters: { type: "object" as const, properties: {} },
    handler: async () => {
      emitToolEvent?.({ name: "list_production_orders", status: "executing" });
      const orders = planningService.getAllOrders();
      emitToolEvent?.({ name: "list_production_orders", status: "completed", result: { count: orders.length } });
      return JSON.stringify({ orders, total: orders.length });
    },
  },

  // ── Scheduling ────────────────────────────────────────────────────────────
  {
    name: "optimize_schedule",
    description: "Generate an optimized production schedule from all pending orders. Uses constraint-based scheduling considering station availability, priority, and due dates.",
    parameters: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Schedule name (optional)" },
      },
    },
    handler: async (params: { name?: string }) => {
      emitToolEvent?.({ name: "optimize_schedule", status: "executing" });
      try {
        const schedule = await planningService.generateSchedule(params.name);
        emitToolEvent?.({ name: "optimize_schedule", status: "completed", result: { id: schedule.id, entries: schedule.entries.length } });
        return JSON.stringify({
          schedule: {
            id: schedule.id,
            name: schedule.name,
            totalEntries: schedule.entries.length,
            totalDurationHours: schedule.totalDurationHours,
            utilizationPercent: schedule.utilizationPercent,
            unscheduledOrders: schedule.unscheduledOrders,
          },
          entries: schedule.entries,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        emitToolEvent?.({ name: "optimize_schedule", status: "error", error: msg });
        return JSON.stringify({ error: msg });
      }
    },
  },
  {
    name: "list_schedules",
    description: "List all generated production schedules.",
    parameters: { type: "object" as const, properties: {} },
    handler: async () => {
      emitToolEvent?.({ name: "list_schedules", status: "executing" });
      const schedules = planningService.getAllSchedules();
      emitToolEvent?.({
        name: "list_schedules",
        status: "completed",
        result: { count: schedules.length },
      });
      return JSON.stringify(
        schedules.map((s) => ({
          id: s.id,
          name: s.name,
          entries: s.entries.length,
          totalDurationHours: s.totalDurationHours,
          utilizationPercent: s.utilizationPercent,
          generatedAt: s.generatedAt,
        }))
      );
    },
  },

  // ── Bottleneck Analysis ───────────────────────────────────────────────────
  {
    name: "identify_bottlenecks",
    description: "Analyze the current schedule and twin graph for throughput bottlenecks. Returns utilization per station and actionable recommendations.",
    parameters: { type: "object" as const, properties: {} },
    handler: async () => {
      emitToolEvent?.({ name: "identify_bottlenecks", status: "executing" });
      try {
        const bottlenecks = await planningService.identifyBottlenecks();
        emitToolEvent?.({ name: "identify_bottlenecks", status: "completed", result: { count: bottlenecks.length } });
        return JSON.stringify({ bottlenecks });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        emitToolEvent?.({ name: "identify_bottlenecks", status: "error", error: msg });
        return JSON.stringify({ error: msg });
      }
    },
  },

  // ── Simulation ────────────────────────────────────────────────────────────
  {
    name: "simulate_scenario",
    description:
      "Run a what-if simulation scenario. Provide changes like adding/removing stations, changing speed, etc. Returns projected impact on throughput, cycle time, and energy cost vs. current baseline.",
    parameters: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Scenario name" },
        description: { type: "string", description: "Scenario description" },
        changes: {
          type: "array",
          description: "List of changes to simulate",
          items: {
            type: "object",
            properties: {
              type: {
                type: "string",
                enum: ["add_station", "remove_station", "change_speed", "change_capacity", "add_shift"],
                description: "Type of change",
              },
              target: { type: "string", description: "Target twin ID (for remove/change)" },
              stationType: { type: "string", description: "Station type (for add_station)" },
              value: { type: "number", description: "Percentage change for speed/capacity" },
              description: { type: "string", description: "Human-readable description of change" },
            },
            required: ["type", "description"],
          },
        },
      },
      required: ["name", "changes"],
    },
    handler: async (params: {
      name: string;
      description?: string;
      changes: simulationService.ScenarioChange[];
    }) => {
      emitToolEvent?.({ name: "simulate_scenario", status: "executing" });
      try {
        const scenario = simulationService.createScenario(params);
        const result = await simulationService.runSimulation(scenario.id);
        emitToolEvent?.({ name: "simulate_scenario", status: "completed", result: { scenarioId: scenario.id } });
        return JSON.stringify(result);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        emitToolEvent?.({ name: "simulate_scenario", status: "error", error: msg });
        return JSON.stringify({ error: msg });
      }
    },
  },
  {
    name: "list_simulations",
    description: "List all simulation scenarios and their results.",
    parameters: { type: "object" as const, properties: {} },
    handler: async () => {
      emitToolEvent?.({ name: "list_simulations", status: "executing" });
      const results = simulationService.getAllSimulationResults();
      emitToolEvent?.({ name: "list_simulations", status: "completed", result: { count: results.length } });
      return JSON.stringify(
        results.map((r) => ({
          scenarioId: r.scenarioId,
          scenarioName: r.scenarioName,
          throughputChange: `${r.delta.throughputChange}%`,
          energyCostChange: `${r.delta.energyCostChange}%`,
          summary: r.delta.summary,
          simulatedAt: r.simulatedAt,
        }))
      );
    },
  },
];

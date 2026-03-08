/**
 * Copilot SDK Agent Tool definitions for KPI queries and manufacturing analytics.
 *
 * Tools enable the AI agent to:
 * - Calculate OEE (Overall Equipment Effectiveness)
 * - Generate throughput reports
 * - Compare shift performance
 * - Get manager-level executive summaries
 */

import type { Tool } from "@github/copilot-sdk";
import * as kpiService from "../services/kpiService.js";

type ToolEventListener = (event: { name: string; status: string; result?: unknown; error?: string }) => void;
let toolEventListener: ToolEventListener | null = null;

export function setKpiToolEventListener(listener: ToolEventListener | null): void {
  toolEventListener = listener;
}

function emitToolEvent(name: string, status: string, result?: unknown, error?: string): void {
  toolEventListener?.({ name, status, result, error });
}

export const kpiTools: Tool<any>[] = [
  {
    name: "get_oee",
    description:
      "Calculate the Overall Equipment Effectiveness (OEE) for the production line. " +
      "OEE = Availability × Performance × Quality. " +
      "Returns percentages for each component plus a detailed breakdown. " +
      "World-class OEE is 85%+. Use this when asked about equipment efficiency, " +
      "production effectiveness, or OEE metrics.",
    parameters: {
      type: "object",
      properties: {
        lineId: {
          type: "string",
          description: "Optional production line ID. Omit for overall plant OEE.",
        },
      },
    },
    handler: async (args: { lineId?: string }) => {
      emitToolEvent("get_oee", "running");
      try {
        const result = kpiService.calculateOEE(args.lineId);
        emitToolEvent("get_oee", "completed", result);
        return JSON.stringify(result);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        emitToolEvent("get_oee", "error", undefined, msg);
        return JSON.stringify({ error: msg });
      }
    },
  },
  {
    name: "get_throughput_report",
    description:
      "Generate a throughput report showing total units produced, units per hour, " +
      "average cycle time, peak throughput hour, and per-station breakdown. " +
      "Use this when asked about production output, throughput, or cycle times.",
    parameters: {
      type: "object",
      properties: {},
    },
    handler: async () => {
      emitToolEvent("get_throughput_report", "running");
      try {
        const result = kpiService.getThroughputReport();
        emitToolEvent("get_throughput_report", "completed", result);
        return JSON.stringify(result);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        emitToolEvent("get_throughput_report", "error", undefined, msg);
        return JSON.stringify({ error: msg });
      }
    },
  },
  {
    name: "compare_shifts",
    description:
      "Compare Day Shift vs Night Shift performance metrics including throughput, " +
      "OEE, energy cost per unit, and alert counts. Returns the winning shift " +
      "and a summary. Use when asked about shift comparison or shift performance.",
    parameters: {
      type: "object",
      properties: {},
    },
    handler: async () => {
      emitToolEvent("compare_shifts", "running");
      try {
        const result = kpiService.compareShifts();
        emitToolEvent("compare_shifts", "completed", result);
        return JSON.stringify(result);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        emitToolEvent("compare_shifts", "error", undefined, msg);
        return JSON.stringify({ error: msg });
      }
    },
  },
  {
    name: "get_manager_summary",
    description:
      "Generate a comprehensive manager-level executive summary with OEE, throughput, " +
      "alert status, order completion, bottleneck identification, and AI-generated " +
      "recommendations. Use when asked for a summary, dashboard view, or executive report.",
    parameters: {
      type: "object",
      properties: {},
    },
    handler: async () => {
      emitToolEvent("get_manager_summary", "running");
      try {
        const result = kpiService.getManagerSummary();
        emitToolEvent("get_manager_summary", "completed", result);
        return JSON.stringify(result);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        emitToolEvent("get_manager_summary", "error", undefined, msg);
        return JSON.stringify({ error: msg });
      }
    },
  },
];

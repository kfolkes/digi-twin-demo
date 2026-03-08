/**
 * KPI Service — Overall Equipment Effectiveness (OEE) and manufacturing KPI calculations.
 *
 * Computes: OEE = Availability × Performance × Quality
 * Plus: throughput, cycle time, energy efficiency, shift comparison.
 * Uses telemetry history and planning data for calculations.
 */

import * as iotService from "./iotService.js";
import * as planningService from "./planningService.js";
import * as alertService from "./alertService.js";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface OEEResult {
  oee: number; // 0-100 percentage
  availability: number;
  performance: number;
  quality: number;
  breakdown: {
    plannedProductionTimeMin: number;
    actualRunTimeMin: number;
    idealCycleTimeSec: number;
    totalUnits: number;
    goodUnits: number;
    defectRate: number;
  };
  calculatedAt: string;
}

export interface ThroughputReport {
  totalUnitsProduced: number;
  unitsPerHour: number;
  averageCycleTimeSec: number;
  peakThroughputHour: string;
  period: string;
  byStation: Array<{
    stationId: string;
    units: number;
    utilization: number;
  }>;
}

export interface ShiftComparison {
  shift1: ShiftMetrics;
  shift2: ShiftMetrics;
  delta: {
    throughputDiff: number;
    oeeeDiff: number;
    energyDiff: number;
    winner: string;
    summary: string;
  };
}

export interface ShiftMetrics {
  name: string;
  throughputPerHour: number;
  oee: number;
  energyPerUnit: number;
  alertCount: number;
  hours: number;
}

export interface ManagerSummary {
  period: string;
  oee: OEEResult;
  throughput: ThroughputReport;
  activeAlerts: number;
  criticalAlerts: number;
  ordersCompleted: number;
  ordersTotal: number;
  topBottleneck: string | null;
  recommendations: string[];
  generatedAt: string;
}

// ─── OEE Calculation ─────────────────────────────────────────────────────────

/**
 * Calculate OEE for the current production state.
 * Uses time-based heuristics from telemetry + planning data.
 */
export function calculateOEE(lineId?: string): OEEResult {
  // Planned production time (default 8-hour shift in minutes)
  const plannedProductionTimeMin = 480;

  // Availability: actual run time / planned time
  // Estimate from telemetry — if simulations are active, equipment is "running"
  const activeSimulations = iotService.getActiveSimulations();
  const runningCount = activeSimulations.length;
  const totalEquipment = Math.max(runningCount, 5); // assume at least 5 pieces
  const availabilityRatio = totalEquipment > 0 ? runningCount / totalEquipment : 0;
  const actualRunTimeMin = plannedProductionTimeMin * availabilityRatio;

  // Performance: actual throughput / ideal throughput
  // Use order data for actuals
  const orders = planningService.getAllOrders();
  const completedOrders = orders.filter((o) => o.status === "completed");
  const scheduledOrders = orders.filter((o) => o.status === "scheduled" || o.status === "in-progress");
  const totalUnits = [...completedOrders, ...scheduledOrders].reduce((s, o) => s + o.quantity, 0);
  const idealCycleTimeSec = 30;
  const idealOutput = actualRunTimeMin > 0 ? (actualRunTimeMin * 60) / idealCycleTimeSec : 0;
  const performanceRatio = idealOutput > 0 ? Math.min(1, totalUnits / idealOutput) : 0.85;

  // Quality: good units / total units
  // Estimate from alert data — more alerts = lower quality
  const alerts = alertService.getActiveAlerts();
  const criticalAlerts = alerts.filter((a) => a.severity === "critical").length;
  const defectRate = Math.min(0.15, criticalAlerts * 0.02 + Math.random() * 0.01);
  const goodUnits = Math.round(totalUnits * (1 - defectRate));
  const qualityRatio = totalUnits > 0 ? goodUnits / totalUnits : 0.98;

  const availability = Math.round(availabilityRatio * 1000) / 10;
  const performance = Math.round(performanceRatio * 1000) / 10;
  const quality = Math.round(qualityRatio * 1000) / 10;
  const oee = Math.round((availabilityRatio * performanceRatio * qualityRatio) * 1000) / 10;

  return {
    oee,
    availability,
    performance,
    quality,
    breakdown: {
      plannedProductionTimeMin,
      actualRunTimeMin: Math.round(actualRunTimeMin),
      idealCycleTimeSec,
      totalUnits,
      goodUnits,
      defectRate: Math.round(defectRate * 1000) / 10,
    },
    calculatedAt: new Date().toISOString(),
  };
}

// ─── Throughput Report ───────────────────────────────────────────────────────

export function getThroughputReport(): ThroughputReport {
  const orders = planningService.getAllOrders();
  const schedules = planningService.getAllSchedules();
  const latestSchedule = schedules.length > 0 ? schedules[schedules.length - 1] : null;

  const totalUnits = orders
    .filter((o) => o.status === "completed" || o.status === "in-progress" || o.status === "scheduled")
    .reduce((s, o) => s + o.quantity, 0);

  const durationHours = latestSchedule?.totalDurationHours || 8;
  const unitsPerHour = durationHours > 0 ? Math.round((totalUnits / durationHours) * 10) / 10 : 0;
  const avgCycleTime = totalUnits > 0 ? Math.round((durationHours * 3600) / totalUnits) : 30;

  // Station breakdown from schedule
  const stationWork = new Map<string, { units: number; workMs: number }>();
  if (latestSchedule) {
    for (const entry of latestSchedule.entries) {
      const existing = stationWork.get(entry.stationId) || { units: 0, workMs: 0 };
      existing.units += entry.units;
      existing.workMs += new Date(entry.endTime).getTime() - new Date(entry.startTime).getTime();
      stationWork.set(entry.stationId, existing);
    }
  }

  const totalMs = durationHours * 3600 * 1000;
  const byStation = Array.from(stationWork.entries()).map(([stationId, data]) => ({
    stationId,
    units: data.units,
    utilization: totalMs > 0 ? Math.round((data.workMs / totalMs) * 1000) / 10 : 0,
  }));

  return {
    totalUnitsProduced: totalUnits,
    unitsPerHour,
    averageCycleTimeSec: avgCycleTime,
    peakThroughputHour: "10:00-11:00",
    period: "current shift",
    byStation,
  };
}

// ─── Shift Comparison ────────────────────────────────────────────────────────

export function compareShifts(): ShiftComparison {
  // Simulate day vs night shift comparison for demo
  const baseOee = calculateOEE();

  const dayShift: ShiftMetrics = {
    name: "Day Shift (06:00-14:00)",
    throughputPerHour: Math.round((baseOee.breakdown.totalUnits / 8) * (0.9 + Math.random() * 0.2) * 10) / 10,
    oee: Math.min(100, baseOee.oee + 3 + Math.round(Math.random() * 5)),
    energyPerUnit: Math.round((0.08 + Math.random() * 0.04) * 100) / 100,
    alertCount: Math.max(0, alertService.getActiveAlerts().length - 1),
    hours: 8,
  };

  const nightShift: ShiftMetrics = {
    name: "Night Shift (22:00-06:00)",
    throughputPerHour: Math.round(dayShift.throughputPerHour * (0.85 + Math.random() * 0.1) * 10) / 10,
    oee: Math.max(0, dayShift.oee - 5 - Math.round(Math.random() * 8)),
    energyPerUnit: Math.round((dayShift.energyPerUnit * 0.9) * 100) / 100, // cheaper night energy
    alertCount: dayShift.alertCount + Math.round(Math.random() * 3),
    hours: 8,
  };

  const throughputDiff = dayShift.throughputPerHour - nightShift.throughputPerHour;
  const oeeDiff = dayShift.oee - nightShift.oee;
  const energyDiff = dayShift.energyPerUnit - nightShift.energyPerUnit;
  const winner = dayShift.oee >= nightShift.oee ? "Day Shift" : "Night Shift";

  return {
    shift1: dayShift,
    shift2: nightShift,
    delta: {
      throughputDiff: Math.round(throughputDiff * 10) / 10,
      oeeeDiff: Math.round(oeeDiff * 10) / 10,
      energyDiff: Math.round(energyDiff * 1000) / 1000,
      winner,
      summary: `${winner} has higher OEE by ${Math.abs(oeeDiff).toFixed(1)} points. Night shift has ${energyDiff > 0 ? 'lower' : 'higher'} energy cost per unit.`,
    },
  };
}

// ─── Manager Summary ─────────────────────────────────────────────────────────

export function getManagerSummary(): ManagerSummary {
  const oee = calculateOEE();
  const throughput = getThroughputReport();
  const alerts = alertService.getActiveAlerts();
  const orders = planningService.getAllOrders();

  const recommendations: string[] = [];
  if (oee.oee < 60) recommendations.push("OEE is below 60% — investigate major availability or quality losses.");
  if (oee.availability < 80) recommendations.push("Low availability — check for unplanned downtime or maintenance issues.");
  if (oee.quality < 95) recommendations.push("Quality below 95% — review defect sources and inspection processes.");
  if (alerts.filter((a) => a.severity === "critical").length > 0) {
    recommendations.push("Critical alerts active — address immediately to prevent unplanned downtime.");
  }
  if (throughput.byStation.some((s) => s.utilization > 90)) {
    recommendations.push("Station(s) at >90% utilization — bottleneck risk, consider adding capacity.");
  }
  if (recommendations.length === 0) recommendations.push("All metrics within normal range. Continue monitoring.");

  return {
    period: "current shift",
    oee,
    throughput,
    activeAlerts: alerts.length,
    criticalAlerts: alerts.filter((a) => a.severity === "critical").length,
    ordersCompleted: orders.filter((o) => o.status === "completed").length,
    ordersTotal: orders.length,
    topBottleneck: throughput.byStation.sort((a, b) => b.utilization - a.utilization)[0]?.stationId || null,
    recommendations,
    generatedAt: new Date().toISOString(),
  };
}

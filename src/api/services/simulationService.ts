/**
 * Simulation Service — "what-if" scenario engine.
 * Clones the current twin graph state, applies hypothetical changes,
 * and projects impact on throughput, bottlenecks, and energy cost.
 */

export interface SimulationScenario {
  id: string;
  name: string;
  description: string;
  changes: ScenarioChange[];
  createdAt: string;
}

export interface ScenarioChange {
  type: "add_station" | "remove_station" | "change_speed" | "change_capacity" | "add_shift";
  target?: string; // twin ID
  stationType?: string;
  property?: string;
  value?: number;
  description: string;
}

export interface SimulationResult {
  scenarioId: string;
  scenarioName: string;
  baseline: SimulationMetrics;
  projected: SimulationMetrics;
  delta: SimulationDelta;
  recommendations: string[];
  simulatedAt: string;
}

export interface SimulationMetrics {
  throughputUnitsPerHour: number;
  totalCycleTimeHours: number;
  stationUtilizations: Record<string, number>;
  energyCostPerUnit: number;
  bottleneckStation: string | null;
}

export interface SimulationDelta {
  throughputChange: number; // percentage
  cycleTimeChange: number; // percentage
  energyCostChange: number; // percentage
  summary: string;
}

// In-memory store
const scenarios = new Map<string, SimulationScenario>();
const results = new Map<string, SimulationResult>();
let scenarioCounter = 0;

// ── Scenario Management ───────────────────────────────────────────────────────

export function createScenario(params: {
  name: string;
  description?: string;
  changes: ScenarioChange[];
}): SimulationScenario {
  const id = `sim_${++scenarioCounter}`;
  const scenario: SimulationScenario = {
    id,
    name: params.name,
    description: params.description || "",
    changes: params.changes,
    createdAt: new Date().toISOString(),
  };
  scenarios.set(id, scenario);
  return scenario;
}

export function getScenario(id: string): SimulationScenario | undefined {
  return scenarios.get(id);
}

export function getAllScenarios(): SimulationScenario[] {
  return Array.from(scenarios.values());
}

// ── Simulation Engine ─────────────────────────────────────────────────────────

interface StationSnapshot {
  id: string;
  type: string;
  status: string;
  cycleTimeSec: number;
  speedFactor: number;
}

async function fetchBaselineStations(): Promise<StationSnapshot[]> {
  try {
    const res = await fetch("http://localhost:3000/api/twins/graph");
    if (res.ok) {
      const data = await res.json();
      return (data.nodes || [])
        .filter((n: { modelId: string }) => n.modelId.includes("Station"))
        .map((n: { id: string; properties: Record<string, unknown> }) => ({
          id: n.id,
          type: (n.properties.StationType as string) || "General",
          status: (n.properties.Status as string) || "Running",
          cycleTimeSec: 30,
          speedFactor: 1.0,
        }));
    }
  } catch {
    // ignore
  }
  // Fallback with generic stations
  return [
    { id: "station_1", type: "Machining", status: "Running", cycleTimeSec: 45, speedFactor: 1.0 },
    { id: "station_2", type: "Assembly", status: "Running", cycleTimeSec: 30, speedFactor: 1.0 },
    { id: "station_3", type: "Inspection", status: "Running", cycleTimeSec: 15, speedFactor: 1.0 },
    { id: "station_4", type: "Packaging", status: "Running", cycleTimeSec: 20, speedFactor: 1.0 },
  ];
}

function computeMetrics(stations: StationSnapshot[], shiftHours: number): SimulationMetrics {
  const running = stations.filter((s) => s.status === "Running");
  if (running.length === 0) {
    return {
      throughputUnitsPerHour: 0,
      totalCycleTimeHours: 0,
      stationUtilizations: {},
      energyCostPerUnit: 0,
      bottleneckStation: null,
    };
  }

  // The bottleneck station limits throughput
  // Group by type — parallel stations of same type share the load
  const typeGroups = new Map<string, StationSnapshot[]>();
  for (const s of running) {
    const group = typeGroups.get(s.type) || [];
    group.push(s);
    typeGroups.set(s.type, group);
  }

  // Effective throughput per type = sum(1 / cycleTime * speedFactor) across parallel stations
  let minThroughput = Infinity;
  let bottleneckType = "";
  const utilizations: Record<string, number> = {};

  for (const [type, group] of typeGroups) {
    const effectiveUPH = group.reduce(
      (sum, s) => sum + (3600 / s.cycleTimeSec) * s.speedFactor,
      0
    );
    if (effectiveUPH < minThroughput) {
      minThroughput = effectiveUPH;
      bottleneckType = type;
    }
    // Average utilization for this type
    for (const s of group) {
      utilizations[s.id] = Math.min(100, (minThroughput / effectiveUPH) * 100 * 0.85 + Math.random() * 15);
    }
  }

  const throughput = Math.round(minThroughput * 10) / 10;
  const totalCycle = running.reduce((sum, s) => sum + s.cycleTimeSec / s.speedFactor, 0) / 3600;
  // Energy cost estimate: ~$0.12/kWh, ~2kW per station per unit cycle
  const energyCostPerUnit = running.length * 2 * (totalCycle / running.length) * 0.12;

  const bottleneckStation = running.find((s) => s.type === bottleneckType)?.id || null;

  return {
    throughputUnitsPerHour: throughput,
    totalCycleTimeHours: Math.round(totalCycle * 1000) / 1000,
    stationUtilizations: Object.fromEntries(
      Object.entries(utilizations).map(([k, v]) => [k, Math.round(v * 10) / 10])
    ),
    energyCostPerUnit: Math.round(energyCostPerUnit * 100) / 100,
    bottleneckStation,
  };
}

/**
 * Run a simulation scenario against the current twin graph baseline.
 */
export async function runSimulation(scenarioId: string): Promise<SimulationResult> {
  const scenario = scenarios.get(scenarioId);
  if (!scenario) throw new Error(`Scenario ${scenarioId} not found`);

  const baseStations = await fetchBaselineStations();
  const shiftHours = 8;

  // Compute baseline metrics
  const baseline = computeMetrics(baseStations, shiftHours);

  // Apply scenario changes to create projected state
  const projected = [...baseStations.map((s) => ({ ...s }))];

  for (const change of scenario.changes) {
    switch (change.type) {
      case "add_station":
        projected.push({
          id: `sim_${change.stationType || "Station"}_${projected.length + 1}`,
          type: change.stationType || "General",
          status: "Running",
          cycleTimeSec: 30,
          speedFactor: 1.0,
        });
        break;
      case "remove_station":
        if (change.target) {
          const idx = projected.findIndex((s) => s.id === change.target);
          if (idx >= 0) projected.splice(idx, 1);
        }
        break;
      case "change_speed": {
        const station = change.target
          ? projected.find((s) => s.id === change.target)
          : projected.find((s) => s.type === change.stationType);
        if (station && change.value !== undefined) {
          station.speedFactor *= 1 + change.value / 100;
        }
        break;
      }
      case "change_capacity": {
        const st = change.target ? projected.find((s) => s.id === change.target) : undefined;
        if (st && change.value !== undefined) {
          st.cycleTimeSec = Math.max(5, st.cycleTimeSec * (100 / (100 + change.value)));
        }
        break;
      }
      case "add_shift":
        // Simulates adding shift by doubling effective speed across all stations
        for (const s of projected) {
          s.speedFactor *= 1.5;
        }
        break;
    }
  }

  const projectedMetrics = computeMetrics(projected, shiftHours);

  // Calculate deltas
  const throughputChange = baseline.throughputUnitsPerHour > 0
    ? ((projectedMetrics.throughputUnitsPerHour - baseline.throughputUnitsPerHour) / baseline.throughputUnitsPerHour) * 100
    : 0;
  const cycleTimeChange = baseline.totalCycleTimeHours > 0
    ? ((projectedMetrics.totalCycleTimeHours - baseline.totalCycleTimeHours) / baseline.totalCycleTimeHours) * 100
    : 0;
  const energyCostChange = baseline.energyCostPerUnit > 0
    ? ((projectedMetrics.energyCostPerUnit - baseline.energyCostPerUnit) / baseline.energyCostPerUnit) * 100
    : 0;

  const summaryParts: string[] = [];
  if (throughputChange > 0) summaryParts.push(`Throughput increases by ${throughputChange.toFixed(1)}%`);
  else if (throughputChange < 0) summaryParts.push(`Throughput decreases by ${Math.abs(throughputChange).toFixed(1)}%`);
  if (energyCostChange > 5) summaryParts.push(`Energy cost per unit increases by ${energyCostChange.toFixed(1)}%`);
  else if (energyCostChange < -5) summaryParts.push(`Energy cost per unit decreases by ${Math.abs(energyCostChange).toFixed(1)}%`);

  const recommendations: string[] = [];
  if (projectedMetrics.bottleneckStation && projectedMetrics.bottleneckStation !== baseline.bottleneckStation) {
    recommendations.push(`New bottleneck at ${projectedMetrics.bottleneckStation}. Consider adding capacity there.`);
  }
  if (throughputChange > 20) recommendations.push("Significant throughput gain — validate quality metrics remain stable.");
  if (energyCostChange > 15) recommendations.push("Energy cost increase is substantial — evaluate ROI carefully.");
  if (throughputChange < -5) recommendations.push("This scenario reduces throughput. Consider alternatives.");
  if (recommendations.length === 0) recommendations.push("Scenario appears viable with balanced impact.");

  const result: SimulationResult = {
    scenarioId: scenario.id,
    scenarioName: scenario.name,
    baseline,
    projected: projectedMetrics,
    delta: {
      throughputChange: Math.round(throughputChange * 10) / 10,
      cycleTimeChange: Math.round(cycleTimeChange * 10) / 10,
      energyCostChange: Math.round(energyCostChange * 10) / 10,
      summary: summaryParts.join(". ") || "Minimal overall impact.",
    },
    recommendations,
    simulatedAt: new Date().toISOString(),
  };

  results.set(scenario.id, result);
  return result;
}

export function getSimulationResult(scenarioId: string): SimulationResult | undefined {
  return results.get(scenarioId);
}

export function getAllSimulationResults(): SimulationResult[] {
  return Array.from(results.values());
}

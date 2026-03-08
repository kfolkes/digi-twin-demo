/**
 * Planning Service — constraint-based production scheduling.
 * Manages production orders, generates optimized schedules based on
 * machine availability, changeover times, and due dates.
 */

export interface ProductionOrder {
  id: string;
  productName: string;
  quantity: number;
  priority: "low" | "medium" | "high" | "critical";
  dueDate: string; // ISO date
  estimatedCycleTimeSec: number; // seconds per unit
  requiredStations: string[]; // station type names
  status: "pending" | "scheduled" | "in-progress" | "completed" | "cancelled";
  createdAt: string;
}

export interface ScheduleEntry {
  orderId: string;
  stationId: string;
  startTime: string; // ISO
  endTime: string; // ISO
  units: number;
}

export interface Schedule {
  id: string;
  name: string;
  entries: ScheduleEntry[];
  generatedAt: string;
  totalDurationHours: number;
  utilizationPercent: number;
  unscheduledOrders: string[];
}

export interface Bottleneck {
  stationId: string;
  stationType: string;
  utilization: number; // 0-100
  queuedOrders: number;
  recommendation: string;
}

// In-memory stores
const orders = new Map<string, ProductionOrder>();
const schedules = new Map<string, Schedule>();
let orderCounter = 0;
let scheduleCounter = 0;

// ── Order Management ──────────────────────────────────────────────────────────

export function createOrder(params: {
  productName: string;
  quantity: number;
  priority?: ProductionOrder["priority"];
  dueDate: string;
  estimatedCycleTimeSec?: number;
  requiredStations?: string[];
}): ProductionOrder {
  const id = `order_${++orderCounter}`;
  const order: ProductionOrder = {
    id,
    productName: params.productName,
    quantity: params.quantity,
    priority: params.priority || "medium",
    dueDate: params.dueDate,
    estimatedCycleTimeSec: params.estimatedCycleTimeSec || 30,
    requiredStations: params.requiredStations || ["Machining", "Assembly", "Inspection", "Packaging"],
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  orders.set(id, order);
  return order;
}

export function getOrder(id: string): ProductionOrder | undefined {
  return orders.get(id);
}

export function getAllOrders(): ProductionOrder[] {
  return Array.from(orders.values());
}

export function updateOrderStatus(id: string, status: ProductionOrder["status"]): ProductionOrder | undefined {
  const order = orders.get(id);
  if (order) {
    order.status = status;
  }
  return order;
}

export function deleteOrder(id: string): boolean {
  return orders.delete(id);
}

// ── Schedule Generation ───────────────────────────────────────────────────────

interface StationInfo {
  id: string;
  type: string;
  status: string;
}

/**
 * Fetch station twins from the Digital Twin service to know what capacity
 * is available. Falls back to a default set if ADT is unavailable.
 */
async function getAvailableStations(): Promise<StationInfo[]> {
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
        }));
    }
  } catch {
    // ignore
  }
  return [
    { id: "station_1", type: "Machining", status: "Running" },
    { id: "station_2", type: "Assembly", status: "Running" },
    { id: "station_3", type: "Inspection", status: "Running" },
    { id: "station_4", type: "Packaging", status: "Running" },
  ];
}

/**
 * Generate an optimized schedule using a priority-based greedy algorithm.
 * Orders are sorted by priority (critical first) then due date, and
 * assigned to matching stations in time-slot order.
 */
export async function generateSchedule(name?: string): Promise<Schedule> {
  const pending = getAllOrders().filter((o) => o.status === "pending" || o.status === "scheduled");
  const stations = await getAvailableStations();
  const runningStations = stations.filter((s) => s.status === "Running");

  // Sort: critical > high > medium > low, then by earliest due date
  const priorityWeight: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  const sorted = [...pending].sort((a, b) => {
    const pw = (priorityWeight[a.priority] ?? 2) - (priorityWeight[b.priority] ?? 2);
    if (pw !== 0) return pw;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  // Track next-available time per station
  const stationAvailable = new Map<string, Date>();
  const now = new Date();
  for (const s of runningStations) {
    stationAvailable.set(s.id, now);
  }

  const entries: ScheduleEntry[] = [];
  const unscheduled: string[] = [];

  for (const order of sorted) {
    let scheduled = false;

    // For each required station type, find the first available matching station
    for (const reqType of order.requiredStations) {
      const matchingStations = runningStations.filter(
        (s) => s.type.toLowerCase() === reqType.toLowerCase()
      );
      if (matchingStations.length === 0) continue;

      // Pick the station that becomes free earliest
      matchingStations.sort(
        (a, b) => (stationAvailable.get(a.id)?.getTime() ?? 0) - (stationAvailable.get(b.id)?.getTime() ?? 0)
      );
      const station = matchingStations[0];

      const start = stationAvailable.get(station.id) || now;
      const durationMs = order.quantity * order.estimatedCycleTimeSec * 1000;
      const end = new Date(start.getTime() + durationMs);

      entries.push({
        orderId: order.id,
        stationId: station.id,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        units: order.quantity,
      });

      stationAvailable.set(station.id, end);
      scheduled = true;
    }

    if (scheduled) {
      order.status = "scheduled";
    } else {
      unscheduled.push(order.id);
    }
  }

  // Calculate total duration and utilization
  const allEnds = entries.map((e) => new Date(e.endTime).getTime());
  const allStarts = entries.map((e) => new Date(e.startTime).getTime());
  const earliest = allStarts.length > 0 ? Math.min(...allStarts) : now.getTime();
  const latest = allEnds.length > 0 ? Math.max(...allEnds) : now.getTime();
  const totalDurationHours = (latest - earliest) / (1000 * 60 * 60);

  const totalWorkMs = entries.reduce(
    (sum, e) => sum + (new Date(e.endTime).getTime() - new Date(e.startTime).getTime()),
    0
  );
  const totalCapacityMs = runningStations.length * (latest - earliest);
  const utilization = totalCapacityMs > 0 ? (totalWorkMs / totalCapacityMs) * 100 : 0;

  const schedule: Schedule = {
    id: `schedule_${++scheduleCounter}`,
    name: name || `Schedule ${scheduleCounter}`,
    entries,
    generatedAt: new Date().toISOString(),
    totalDurationHours: Math.round(totalDurationHours * 100) / 100,
    utilizationPercent: Math.round(utilization * 10) / 10,
    unscheduledOrders: unscheduled,
  };

  schedules.set(schedule.id, schedule);
  return schedule;
}

export function getSchedule(id: string): Schedule | undefined {
  return schedules.get(id);
}

export function getAllSchedules(): Schedule[] {
  return Array.from(schedules.values());
}

// ── Bottleneck Analysis ───────────────────────────────────────────────────────

export async function identifyBottlenecks(): Promise<Bottleneck[]> {
  const stations = await getAvailableStations();
  const latestSchedule = Array.from(schedules.values()).pop();
  if (!latestSchedule) {
    return stations.map((s) => ({
      stationId: s.id,
      stationType: s.type,
      utilization: 0,
      queuedOrders: 0,
      recommendation: "No schedule generated yet. Create production orders and generate a schedule first.",
    }));
  }

  const stationLoad = new Map<string, { workMs: number; orders: number }>();
  for (const entry of latestSchedule.entries) {
    const dur = new Date(entry.endTime).getTime() - new Date(entry.startTime).getTime();
    const existing = stationLoad.get(entry.stationId) || { workMs: 0, orders: 0 };
    existing.workMs += dur;
    existing.orders += 1;
    stationLoad.set(entry.stationId, existing);
  }

  const allEnds = latestSchedule.entries.map((e) => new Date(e.endTime).getTime());
  const allStarts = latestSchedule.entries.map((e) => new Date(e.startTime).getTime());
  const spanMs = allEnds.length > 0 ? Math.max(...allEnds) - Math.min(...allStarts) : 1;

  return stations.map((s) => {
    const load = stationLoad.get(s.id) || { workMs: 0, orders: 0 };
    const util = spanMs > 0 ? (load.workMs / spanMs) * 100 : 0;
    let recommendation = "";
    if (util > 90) {
      recommendation = `Critical bottleneck — ${s.type} station at ${Math.round(util)}% utilization. Consider adding a parallel station or reducing batch sizes.`;
    } else if (util > 70) {
      recommendation = `High load — ${s.type} station at ${Math.round(util)}% utilization. Monitor for delays.`;
    } else if (util < 20 && load.orders > 0) {
      recommendation = `Underutilized — ${s.type} station at ${Math.round(util)}%. Could absorb more work.`;
    } else if (load.orders === 0) {
      recommendation = `Idle — no orders assigned to ${s.type} station.`;
    } else {
      recommendation = `Healthy utilization at ${Math.round(util)}%.`;
    }

    return {
      stationId: s.id,
      stationType: s.type,
      utilization: Math.round(util * 10) / 10,
      queuedOrders: load.orders,
      recommendation,
    };
  });
}

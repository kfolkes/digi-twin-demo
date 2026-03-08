/**
 * IoT Telemetry Service — bridges IoT device messages to Azure Digital Twins.
 *
 * In production, consumes messages from Azure IoT Hub (via Event Hubs-compatible endpoint).
 * In development, provides a built-in simulator that generates realistic sensor data
 * for motors, temperature sensors, vibration sensors, conveyors, and energy meters.
 *
 * Telemetry updates flow:
 *   IoT Hub (or simulator) → this service → Digital Twins property updates + SSE broadcast
 */

import * as dtService from "./digitalTwinService.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TelemetryReading {
  twinId: string;
  property: string;
  value: number;
  timestamp: string;
  unit?: string;
}

export interface TelemetrySubscription {
  twinId: string;
  properties: string[];
}

type TelemetryListener = (reading: TelemetryReading) => void;

// ─── In-Memory Telemetry Store (latest readings) ──────────────────────────────

const latestReadings = new Map<string, TelemetryReading>();
const telemetryHistory = new Map<string, TelemetryReading[]>();
const MAX_HISTORY = 60; // keep last 60 readings per twin+property

function storageKey(twinId: string, property: string): string {
  return `${twinId}::${property}`;
}

export function getLatestReading(twinId: string, property: string): TelemetryReading | undefined {
  return latestReadings.get(storageKey(twinId, property));
}

export function getReadingHistory(twinId: string, property: string): TelemetryReading[] {
  return telemetryHistory.get(storageKey(twinId, property)) ?? [];
}

export function getAllLatestReadings(): TelemetryReading[] {
  return Array.from(latestReadings.values());
}

function recordReading(reading: TelemetryReading): void {
  const key = storageKey(reading.twinId, reading.property);
  latestReadings.set(key, reading);

  const history = telemetryHistory.get(key) ?? [];
  history.push(reading);
  if (history.length > MAX_HISTORY) history.shift();
  telemetryHistory.set(key, history);
}

// ─── Listener Management (for SSE broadcasting) ──────────────────────────────

const listeners = new Set<TelemetryListener>();

export function addTelemetryListener(listener: TelemetryListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyListeners(reading: TelemetryReading): void {
  for (const listener of listeners) {
    listener(reading);
  }
}

// ─── Process Incoming Telemetry ───────────────────────────────────────────────

/**
 * Process a telemetry reading: store locally, update the digital twin property,
 * and broadcast to all SSE listeners.
 */
export async function processTelemetry(reading: TelemetryReading): Promise<void> {
  recordReading(reading);
  notifyListeners(reading);

  // Update the digital twin property (best-effort — don't fail the telemetry pipeline)
  try {
    await dtService.updateTwinProperty(reading.twinId, reading.property, reading.value);
  } catch {
    // ADT may not be configured in dev mode — telemetry still flows to UI
  }
}

// ─── Simulator ────────────────────────────────────────────────────────────────

/** Simulation profile for a twin's telemetry properties */
interface SimulationProfile {
  twinId: string;
  modelType: string;
  properties: Array<{
    name: string;
    baseValue: number;
    amplitude: number;
    noiseLevel: number;
    unit: string;
    /** Optional: simulate degradation over time (0 = stable, positive = increasing trend) */
    drift: number;
  }>;
}

const activeSimulations = new Map<string, NodeJS.Timeout>();
let simulationStartTime = Date.now();

/** Default simulation profiles for built-in model types */
const DEFAULT_PROFILES: Record<string, Omit<SimulationProfile, "twinId">["properties"]> = {
  Motor: [
    { name: "CurrentRPM", baseValue: 1450, amplitude: 50, noiseLevel: 5, unit: "RPM", drift: 0 },
    { name: "Temperature", baseValue: 45, amplitude: 8, noiseLevel: 1.5, unit: "°C", drift: 0.01 },
    { name: "Vibration", baseValue: 2.5, amplitude: 1.0, noiseLevel: 0.3, unit: "mm/s", drift: 0.005 },
  ],
  TemperatureSensor: [
    { name: "Temperature", baseValue: 22, amplitude: 3, noiseLevel: 0.5, unit: "°C", drift: 0 },
  ],
  VibrationSensor: [
    { name: "Vibration", baseValue: 1.8, amplitude: 0.8, noiseLevel: 0.2, unit: "mm/s", drift: 0 },
  ],
  HumiditySensor: [
    { name: "Humidity", baseValue: 45, amplitude: 10, noiseLevel: 2, unit: "%", drift: 0 },
  ],
  EnergyMeter: [
    { name: "PowerConsumption", baseValue: 12.5, amplitude: 4, noiseLevel: 0.8, unit: "kW", drift: 0 },
  ],
  Conveyor: [
    { name: "Speed", baseValue: 2.0, amplitude: 0.3, noiseLevel: 0.05, unit: "m/s", drift: 0 },
  ],
  RobotArm: [
    { name: "CycleTime", baseValue: 8.5, amplitude: 1.5, noiseLevel: 0.3, unit: "s", drift: 0 },
  ],
};

function generateValue(
  prop: SimulationProfile["properties"][0],
  elapsedSeconds: number,
): number {
  const sinComponent = Math.sin(elapsedSeconds / 30) * prop.amplitude;
  const noise = (Math.random() - 0.5) * 2 * prop.noiseLevel;
  const driftComponent = prop.drift * elapsedSeconds;
  return Math.round((prop.baseValue + sinComponent + noise + driftComponent) * 100) / 100;
}

function getModelType(modelId: string): string {
  const parts = modelId.split(":");
  const lastPart = parts[parts.length - 1];
  return lastPart?.split(";")[0] || "";
}

/**
 * Start simulating telemetry for a specific twin.
 * @param twinId - The twin to simulate
 * @param modelId - The DTDL model ID (used to pick default simulation profiles)
 * @param intervalMs - How often to emit readings (default: 3000ms)
 */
export function startSimulation(
  twinId: string,
  modelId: string,
  intervalMs = 3000,
): { success: boolean; properties: string[] } {
  if (activeSimulations.has(twinId)) {
    return { success: true, properties: [] }; // already running
  }

  const modelType = getModelType(modelId);
  const profileProps = DEFAULT_PROFILES[modelType];
  if (!profileProps) {
    return { success: false, properties: [] };
  }

  const profile: SimulationProfile = {
    twinId,
    modelType,
    properties: profileProps,
  };

  const timer = setInterval(() => {
    const elapsed = (Date.now() - simulationStartTime) / 1000;
    for (const prop of profile.properties) {
      const reading: TelemetryReading = {
        twinId,
        property: prop.name,
        value: generateValue(prop, elapsed),
        timestamp: new Date().toISOString(),
        unit: prop.unit,
      };
      processTelemetry(reading);
    }
  }, intervalMs);

  activeSimulations.set(twinId, timer);
  return { success: true, properties: profileProps.map((p) => p.name) };
}

/** Stop simulation for a specific twin */
export function stopSimulation(twinId: string): boolean {
  const timer = activeSimulations.get(twinId);
  if (timer) {
    clearInterval(timer);
    activeSimulations.delete(twinId);
    return true;
  }
  return false;
}

/** Stop all active simulations */
export function stopAllSimulations(): void {
  for (const [twinId, timer] of activeSimulations) {
    clearInterval(timer);
    activeSimulations.delete(twinId);
  }
}

/** Get list of twins currently being simulated */
export function getActiveSimulations(): string[] {
  return Array.from(activeSimulations.keys());
}

/** Reset the simulation start time (affects drift calculations) */
export function resetSimulationClock(): void {
  simulationStartTime = Date.now();
}

// ─── IoT Hub Consumer (production) ────────────────────────────────────────────

/**
 * Connect to Azure IoT Hub's Event Hubs-compatible endpoint and start consuming telemetry.
 * Requires IOT_HUB_CONNECTION_STRING or IOT_HUB_EVENT_HUB_ENDPOINT environment variables.
 *
 * Messages are expected in format:
 *   { "twinId": "motor_01", "property": "Temperature", "value": 45.2, "unit": "°C" }
 *
 * This is a placeholder for production IoT Hub integration.
 * To enable, install @azure/event-hubs and uncomment the implementation below.
 */
export async function connectToIoTHub(): Promise<boolean> {
  const connectionString = process.env.IOT_HUB_EVENT_HUB_ENDPOINT;
  if (!connectionString) {
    console.log("ℹ IoT Hub not configured — use simulator mode for telemetry");
    return false;
  }

  // Production implementation would use:
  // import { EventHubConsumerClient } from "@azure/event-hubs";
  // const client = new EventHubConsumerClient("$Default", connectionString);
  // const subscription = client.subscribe({ processEvents, processError });
  console.log("✓ IoT Hub consumer connected (placeholder — implement with @azure/event-hubs)");
  return true;
}

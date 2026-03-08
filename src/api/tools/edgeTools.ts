/**
 * Copilot SDK Agent Tool definitions for edge computing and IoT Edge deployment.
 *
 * Tools enable the AI agent to:
 * - Generate IoT Edge deployment manifests
 * - List available edge modules
 * - Query edge device status
 */

import type { Tool } from "@github/copilot-sdk";

type ToolEventListener = (event: { name: string; status: string; result?: unknown; error?: string }) => void;
let toolEventListener: ToolEventListener | null = null;

export function setEdgeToolEventListener(listener: ToolEventListener | null): void {
  toolEventListener = listener;
}

function emitToolEvent(name: string, status: string, result?: unknown, error?: string): void {
  toolEventListener?.({ name, status, result, error });
}

// ─── Edge module catalog ─────────────────────────────────────────────────────

interface EdgeModule {
  name: string;
  image: string;
  description: string;
  category: "analytics" | "vision" | "protocol" | "storage" | "custom";
  envVars: Record<string, string>;
}

const MODULE_CATALOG: EdgeModule[] = [
  {
    name: "OPCPublisher",
    image: "mcr.microsoft.com/iotedge/opc-publisher:latest",
    description: "Connects to OPC UA servers and publishes telemetry to IoT Hub/Edge Hub",
    category: "protocol",
    envVars: { PublishInterval: "1000", BatchSize: "50" },
  },
  {
    name: "StreamAnalytics",
    image: "mcr.microsoft.com/azure-stream-analytics/azureiotedge:1.2.0",
    description: "Real-time stream processing on the edge for anomaly detection and aggregation",
    category: "analytics",
    envVars: { ASAJobInfo: "" },
  },
  {
    name: "CustomVision",
    image: "mcr.microsoft.com/azurecognitiveservices/custom-vision:latest",
    description: "Visual quality inspection using custom-trained object detection models",
    category: "vision",
    envVars: { ModelPath: "/models/quality-check", Confidence: "0.8" },
  },
  {
    name: "BlobStorage",
    image: "mcr.microsoft.com/azure-blob-storage:latest",
    description: "Local edge blob storage for buffering telemetry during connectivity gaps",
    category: "storage",
    envVars: { LOCAL_STORAGE_ACCOUNT_NAME: "edgestore", LOCAL_STORAGE_ACCOUNT_KEY: "auto" },
  },
  {
    name: "ModbusTCP",
    image: "mcr.microsoft.com/azureiotedge/modbus:latest",
    description: "Modbus TCP/RTU protocol translation for legacy PLC and sensor integration",
    category: "protocol",
    envVars: { SlaveConfigs: "" },
  },
  {
    name: "AnomalyDetector",
    image: "mcr.microsoft.com/azure-cognitive-services/decision/anomaly-detector:latest",
    description: "On-device anomaly detection for vibration, temperature, and pressure patterns",
    category: "analytics",
    envVars: { Sensitivity: "85", DetectionMode: "batch" },
  },
];

// ─── In-memory edge device registry ──────────────────────────────────────────

interface EdgeDevice {
  deviceId: string;
  status: "online" | "offline" | "provisioning";
  modules: string[];
  lastSeen: string;
  location: string;
}

const edgeDevices = new Map<string, EdgeDevice>();

// Seed a demo device
edgeDevices.set("edge-factory-01", {
  deviceId: "edge-factory-01",
  status: "online",
  modules: ["OPCPublisher", "StreamAnalytics"],
  lastSeen: new Date().toISOString(),
  location: "Factory Floor - Zone A",
});
edgeDevices.set("edge-factory-02", {
  deviceId: "edge-factory-02",
  status: "online",
  modules: ["ModbusTCP", "BlobStorage"],
  lastSeen: new Date().toISOString(),
  location: "Factory Floor - Zone B",
});

// ─── Tools ───────────────────────────────────────────────────────────────────

export const edgeTools: Tool<any>[] = [
  {
    name: "list_edge_modules",
    description:
      "List available IoT Edge modules that can be deployed to edge devices. " +
      "Includes OPC UA publisher, stream analytics, computer vision for quality inspection, " +
      "blob storage, Modbus protocol adapter, and anomaly detection. " +
      "Use when asked about edge modules, edge capabilities, or what can be deployed.",
    parameters: {
      type: "object",
      properties: {
        category: {
          type: "string",
          enum: ["analytics", "vision", "protocol", "storage", "custom"],
          description: "Optional: filter by module category.",
        },
      },
    },
    handler: async (args: { category?: string }) => {
      emitToolEvent("list_edge_modules", "running");
      try {
        const filtered = args.category
          ? MODULE_CATALOG.filter((m) => m.category === args.category)
          : MODULE_CATALOG;
        emitToolEvent("list_edge_modules", "completed", filtered);
        return JSON.stringify(filtered);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        emitToolEvent("list_edge_modules", "error", undefined, msg);
        return JSON.stringify({ error: msg });
      }
    },
  },
  {
    name: "deploy_edge_module",
    description:
      "Generate an IoT Edge deployment manifest to deploy a module to an edge device. " +
      "Returns the deployment JSON that would be applied. " +
      "Use when asked to deploy, install, or add an edge module to a device.",
    parameters: {
      type: "object",
      properties: {
        deviceId: {
          type: "string",
          description: "Target edge device ID (e.g. 'edge-factory-01').",
        },
        moduleName: {
          type: "string",
          description: "Module to deploy (e.g. 'OPCPublisher', 'CustomVision', 'AnomalyDetector').",
        },
      },
      required: ["deviceId", "moduleName"],
    },
    handler: async (args: { deviceId: string; moduleName: string }) => {
      emitToolEvent("deploy_edge_module", "running");
      try {
        const mod = MODULE_CATALOG.find((m) => m.name === args.moduleName);
        if (!mod) {
          const avail = MODULE_CATALOG.map((m) => m.name).join(", ");
          const error = `Module '${args.moduleName}' not found. Available: ${avail}`;
          emitToolEvent("deploy_edge_module", "error", undefined, error);
          return JSON.stringify({ error });
        }

        const device = edgeDevices.get(args.deviceId);
        if (!device) {
          emitToolEvent("deploy_edge_module", "error", undefined, `Device ${args.deviceId} not found`);
          return JSON.stringify({ error: `Device ${args.deviceId} not found` });
        }

        // Generate deployment manifest
        const manifest = {
          modulesContent: {
            "$edgeAgent": {
              "properties.desired": {
                modules: {
                  [mod.name]: {
                    type: "docker",
                    status: "running",
                    restartPolicy: "always",
                    settings: { image: mod.image },
                    env: Object.fromEntries(
                      Object.entries(mod.envVars).map(([k, v]) => [k, { value: v }]),
                    ),
                  },
                },
              },
            },
          },
          targetDevice: args.deviceId,
          moduleName: mod.name,
          status: "manifest-generated",
          note: "In production, this manifest would be applied via IoT Hub device management API.",
        };

        // Update in-memory device state
        if (!device.modules.includes(mod.name)) {
          device.modules.push(mod.name);
        }

        emitToolEvent("deploy_edge_module", "completed", manifest);
        return JSON.stringify(manifest);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        emitToolEvent("deploy_edge_module", "error", undefined, msg);
        return JSON.stringify({ error: msg });
      }
    },
  },
  {
    name: "list_edge_devices",
    description:
      "List registered IoT Edge devices with their status, deployed modules, " +
      "last seen time, and physical location. " +
      "Use when asked about edge devices, edge gateways, or device fleet status.",
    parameters: {
      type: "object",
      properties: {},
    },
    handler: async () => {
      emitToolEvent("list_edge_devices", "running");
      try {
        const devices = Array.from(edgeDevices.values());
        emitToolEvent("list_edge_devices", "completed", devices);
        return JSON.stringify(devices);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        emitToolEvent("list_edge_devices", "error", undefined, msg);
        return JSON.stringify({ error: msg });
      }
    },
  },
];

/**
 * Copilot SDK Agent Tool definitions for Azure Digital Twins.
 *
 * Each tool follows the SDK's Tool<T> interface:
 *   { name, description, parameters (JSON schema), handler (async function) }
 *
 * The SDK automatically handles tool call routing — when the model decides to
 * invoke a tool, the SDK calls the handler and feeds the result back to the model.
 */

import type { Tool } from "@github/copilot-sdk";
import * as dtService from "../services/digitalTwinService.js";
import * as iotService from "../services/iotService.js";
import { MODEL_LIBRARY, FACTORY_TEMPLATES } from "../models/dtdlModels.js";

// Event emitter so the chat route can notify the SSE stream about tool activity
type ToolEventListener = (event: { name: string; status: string; result?: unknown; error?: string }) => void;
let toolEventListener: ToolEventListener | null = null;

export function setToolEventListener(listener: ToolEventListener | null): void {
  toolEventListener = listener;
}

function emitToolEvent(name: string, status: string, result?: unknown, error?: string): void {
  toolEventListener?.({ name, status, result, error });
}

// ─── Tool Definitions ─────────────────────────────────────────────────────────

export const digitalTwinTools: Tool<any>[] = [
  {
    name: "list_twins",
    description:
      "List all digital twins in the Azure Digital Twins instance. " +
      "Optionally filter by model ID. Returns twin IDs, model types, and properties.",
    parameters: {
      type: "object",
      properties: {
        modelFilter: {
          type: "string",
          description:
            "Optional DTDL model ID to filter by (e.g. 'dtmi:example:Room;1'). " +
            "If omitted, returns all twins.",
        },
      },
      required: [],
    },
    handler: async (args: { modelFilter?: string }) => {
      emitToolEvent("list_twins", "executing");
      try {
        const result = args.modelFilter
          ? await dtService.queryTwins(
              `SELECT * FROM digitaltwins WHERE IS_OF_MODEL('${args.modelFilter}')`
            )
          : await dtService.getAllTwins();
        emitToolEvent("list_twins", "completed", result);
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        emitToolEvent("list_twins", "error", undefined, msg);
        return { error: msg };
      }
    },
  },

  {
    name: "get_twin_details",
    description:
      "Get detailed information about a specific digital twin including all properties, " +
      "metadata, and current telemetry values.",
    parameters: {
      type: "object",
      properties: {
        twinId: {
          type: "string",
          description: "The ID of the twin to retrieve (e.g. 'thermostat67', 'room21').",
        },
      },
      required: ["twinId"],
    },
    handler: async (args: { twinId: string }) => {
      emitToolEvent("get_twin_details", "executing");
      try {
        const result = await dtService.getTwin(args.twinId);
        emitToolEvent("get_twin_details", "completed", result);
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        emitToolEvent("get_twin_details", "error", undefined, msg);
        return { error: msg };
      }
    },
  },

  {
    name: "create_twin",
    description:
      "Create a new digital twin instance. The twin represents a physical or logical asset " +
      "(machine, sensor, room, production line, etc). Requires a model ID and unique twin ID.",
    parameters: {
      type: "object",
      properties: {
        twinId: {
          type: "string",
          description:
            "Unique identifier for the new twin (e.g. 'conveyor_01', 'temp_sensor_3'). " +
            "Use snake_case with descriptive names.",
        },
        modelId: {
          type: "string",
          description:
            "The DTDL model ID defining the twin's type. Use list_available_models to see options. " +
            "Example: 'dtmi:manufacturing:Motor;1'.",
        },
        properties: {
          type: "object",
          description:
            "Initial property values as key-value pairs. Keys must match properties defined in the model. " +
            'Example: { "MotorName": "Main Motor", "RatedPower": 5.5 }',
          additionalProperties: true,
        },
      },
      required: ["twinId", "modelId"],
    },
    handler: async (args: { twinId: string; modelId: string; properties?: Record<string, unknown> }) => {
      emitToolEvent("create_twin", "executing");
      try {
        const result = await dtService.createTwin(args.twinId, args.modelId, args.properties || {});
        emitToolEvent("create_twin", "completed", result);
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        emitToolEvent("create_twin", "error", undefined, msg);
        return { error: msg };
      }
    },
  },

  {
    name: "create_relationship",
    description:
      "Create a relationship (edge) between two digital twins. Relationships define how assets " +
      "connect — e.g. a production line 'hasStation' connecting to a station, or a room 'contains' a sensor.",
    parameters: {
      type: "object",
      properties: {
        sourceTwinId: {
          type: "string",
          description: "The parent/source twin ID (e.g. 'room21').",
        },
        targetTwinId: {
          type: "string",
          description: "The child/target twin ID (e.g. 'thermostat67').",
        },
        relationshipName: {
          type: "string",
          description:
            "The name of the relationship as defined in the source twin's DTDL model. " +
            "Common values: 'contains', 'hasStation', 'hasEquipment', 'hasSensor'.",
        },
      },
      required: ["sourceTwinId", "targetTwinId", "relationshipName"],
    },
    handler: async (args: { sourceTwinId: string; targetTwinId: string; relationshipName: string }) => {
      emitToolEvent("create_relationship", "executing");
      try {
        const result = await dtService.createRelationship(
          args.sourceTwinId,
          args.targetTwinId,
          args.relationshipName
        );
        emitToolEvent("create_relationship", "completed", result);
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        emitToolEvent("create_relationship", "error", undefined, msg);
        return { error: msg };
      }
    },
  },

  {
    name: "update_twin_property",
    description:
      "Update a property value on an existing digital twin. Use this to modify asset state, " +
      "configuration, or metadata.",
    parameters: {
      type: "object",
      properties: {
        twinId: {
          type: "string",
          description: "The ID of the twin to update.",
        },
        propertyName: {
          type: "string",
          description: "The property name to update (e.g. 'Temperature', 'Status', 'LineName').",
        },
        value: {
          description: "The new value for the property. Type must match the DTDL schema.",
        },
      },
      required: ["twinId", "propertyName", "value"],
    },
    handler: async (args: { twinId: string; propertyName: string; value: unknown }) => {
      emitToolEvent("update_twin_property", "executing");
      try {
        await dtService.updateTwinProperty(args.twinId, args.propertyName, args.value);
        const result = { success: true, twinId: args.twinId, property: args.propertyName, newValue: args.value };
        emitToolEvent("update_twin_property", "completed", result);
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        emitToolEvent("update_twin_property", "error", undefined, msg);
        return { error: msg };
      }
    },
  },

  {
    name: "delete_twin",
    description:
      "Delete a digital twin and all its relationships. This is destructive — " +
      "always confirm with the user before calling this.",
    parameters: {
      type: "object",
      properties: {
        twinId: {
          type: "string",
          description: "The ID of the twin to delete.",
        },
      },
      required: ["twinId"],
    },
    handler: async (args: { twinId: string }) => {
      emitToolEvent("delete_twin", "executing");
      try {
        await dtService.deleteTwin(args.twinId);
        const result = { success: true, deleted: args.twinId };
        emitToolEvent("delete_twin", "completed", result);
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        emitToolEvent("delete_twin", "error", undefined, msg);
        return { error: msg };
      }
    },
  },

  {
    name: "query_twins",
    description:
      "Run a query against Azure Digital Twins using ADT SQL-like query syntax. " +
      "Use this for complex searches, filtering, or aggregation. " +
      "Example queries: 'SELECT * FROM digitaltwins WHERE IS_OF_MODEL(\"dtmi:example:Room;1\")', " +
      "'SELECT T FROM digitaltwins T WHERE T.Temperature > 70'.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "ADT query in SQL-like syntax. Always start with 'SELECT'. " +
            "Use IS_OF_MODEL() for model filtering, property access with T.PropertyName.",
        },
      },
      required: ["query"],
    },
    handler: async (args: { query: string }) => {
      emitToolEvent("query_twins", "executing");
      try {
        const result = await dtService.queryTwins(args.query);
        emitToolEvent("query_twins", "completed", result);
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        emitToolEvent("query_twins", "error", undefined, msg);
        return { error: msg };
      }
    },
  },

  {
    name: "get_twin_graph",
    description:
      "Get the complete twin graph — all twins (nodes) and their relationships (edges). " +
      "Returns data for visualization. Use this when the user wants to see or understand the current topology.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
    handler: async () => {
      emitToolEvent("get_twin_graph", "executing");
      try {
        const result = await dtService.getFullGraph();
        emitToolEvent("get_twin_graph", "completed", result);
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        emitToolEvent("get_twin_graph", "error", undefined, msg);
        return { error: msg };
      }
    },
  },

  {
    name: "list_available_models",
    description:
      "List all available DTDL models — both the built-in model library (pre-defined types like " +
      "Floor, Room, Thermostat, Production Line, Station, Motor, sensors, etc.) and any models " +
      "already uploaded to the Azure Digital Twins instance.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
    handler: async () => {
      emitToolEvent("list_available_models", "executing");
      const libraryModels = Object.entries(MODEL_LIBRARY).map(([name, model]) => ({
        displayName: name,
        modelId: (model as Record<string, unknown>)["@id"],
        source: "built-in",
      }));

      let instanceModels: unknown[] = [];
      try {
        instanceModels = (await dtService.listModels()).map((m) => ({
          ...(m as Record<string, unknown>),
          source: "instance",
        }));
      } catch {
        // ADT not connected — return library models only
      }

      const result = { libraryModels, instanceModels };
      emitToolEvent("list_available_models", "completed", result);
      return result;
    },
  },

  {
    name: "upload_model",
    description:
      "Upload a DTDL model to Azure Digital Twins. This defines a new type of asset " +
      "(e.g. a custom sensor, machine type, or area). The model defines what properties, " +
      "telemetry, and relationships instances of this type will have.",
    parameters: {
      type: "object",
      properties: {
        modelId: {
          type: "string",
          description:
            "The DTDL model ID in format 'dtmi:<domain>:<name>;<version>'. " +
            "Example: 'dtmi:manufacturing:PressureSensor;1'.",
        },
        displayName: {
          type: "string",
          description: "Human-readable name for the model (e.g. 'Pressure Sensor').",
        },
        properties: {
          type: "array",
          description: "Array of property definitions.",
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: "Property name" },
              schema: { type: "string", description: "DTDL schema type: string, double, integer, boolean, dateTime" },
            },
            required: ["name", "schema"],
          },
        },
        telemetry: {
          type: "array",
          description: "Array of telemetry definitions (data emitted by devices).",
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: "Telemetry field name" },
              schema: { type: "string", description: "DTDL schema type" },
            },
            required: ["name", "schema"],
          },
        },
        relationships: {
          type: "array",
          description: "Array of relationship definitions.",
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: "Relationship name (e.g. 'contains', 'hasSensor')" },
              target: { type: "string", description: "Optional target model ID" },
            },
            required: ["name"],
          },
        },
      },
      required: ["modelId", "displayName"],
    },
    handler: async (args: {
      modelId: string;
      displayName: string;
      properties?: Array<{ name: string; schema: string }>;
      telemetry?: Array<{ name: string; schema: string }>;
      relationships?: Array<{ name: string; target?: string }>;
    }) => {
      emitToolEvent("upload_model", "executing");
      try {
        const contents: Record<string, unknown>[] = [];

        if (args.properties) {
          for (const prop of args.properties) {
            contents.push({ "@type": "Property", name: prop.name, schema: prop.schema });
          }
        }
        if (args.telemetry) {
          for (const tel of args.telemetry) {
            contents.push({ "@type": "Telemetry", name: tel.name, schema: tel.schema });
          }
        }
        if (args.relationships) {
          for (const rel of args.relationships) {
            const relDef: Record<string, unknown> = { "@type": "Relationship", name: rel.name };
            if (rel.target) relDef.target = rel.target;
            contents.push(relDef);
          }
        }

        const dtdlModel = {
          "@id": args.modelId,
          "@type": "Interface",
          displayName: args.displayName,
          "@context": "dtmi:dtdl:context;2",
          contents,
        };

        const uploadResult = await dtService.uploadModels([dtdlModel]);
        const result = { success: true, model: dtdlModel, uploadResult };
        emitToolEvent("upload_model", "completed", result);
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        emitToolEvent("upload_model", "error", undefined, msg);
        return { error: msg };
      }
    },
  },

  {
    name: "deploy_factory_template",
    description:
      "Deploy a pre-built factory template — creates all models, twins, and relationships at once. " +
      "Available templates: 'building-tutorial' (Floor -> Room -> Thermostat), " +
      "'bottling-line' (Production Line -> Stations -> Motors -> Sensors), " +
      "'automotive-cell' (Assembly Line -> Stations -> Robot Arms -> Conveyors). " +
      "Use this for the greenfield scenario when a customer wants to start fresh.",
    parameters: {
      type: "object",
      properties: {
        templateId: {
          type: "string",
          description: "Template ID: 'building-tutorial', 'bottling-line', or 'automotive-cell'.",
          enum: ["building-tutorial", "bottling-line", "automotive-cell"],
        },
      },
      required: ["templateId"],
    },
    handler: async (args: { templateId: string }) => {
      emitToolEvent("deploy_factory_template", "executing");
      const template = FACTORY_TEMPLATES.find((t) => t.id === args.templateId);
      if (!template) {
        const err = `Template '${args.templateId}' not found. Available: ${FACTORY_TEMPLATES.map((t) => t.id).join(", ")}`;
        emitToolEvent("deploy_factory_template", "error", undefined, err);
        return { error: err };
      }

      const results: Record<string, unknown> = {
        template: template.name,
        modelsCreated: 0,
        twinsCreated: 0,
        relationshipsCreated: 0,
        errors: [] as string[],
      };

      // Upload models (ignore "already exists" errors)
      try {
        await dtService.uploadModels(template.models as Record<string, unknown>[]);
        results.modelsCreated = template.models.length;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!msg.includes("already exists") && !msg.includes("ModelIdAlreadyExists")) {
          (results.errors as string[]).push(`Models: ${msg}`);
        } else {
          results.modelsCreated = template.models.length;
        }
      }

      // Create twins
      let twinsCreated = 0;
      for (const twin of template.twins) {
        try {
          await dtService.createTwin(twin.id, twin.modelId, twin.properties);
          twinsCreated++;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (!msg.includes("already exists")) {
            (results.errors as string[]).push(`Twin ${twin.id}: ${msg}`);
          } else {
            twinsCreated++;
          }
        }
      }
      results.twinsCreated = twinsCreated;

      // Create relationships
      let relsCreated = 0;
      for (const rel of template.relationships) {
        try {
          await dtService.createRelationship(rel.sourceId, rel.targetId, rel.name);
          relsCreated++;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (!msg.includes("already exists")) {
            (results.errors as string[]).push(`Relationship ${rel.sourceId}->${rel.targetId}: ${msg}`);
          } else {
            relsCreated++;
          }
        }
      }
      results.relationshipsCreated = relsCreated;

      emitToolEvent("deploy_factory_template", "completed", results);
      return results;
    },
  },

  {
    name: "list_relationships",
    description:
      "List all relationships (connections) for a specific twin. Shows how the asset connects to other assets.",
    parameters: {
      type: "object",
      properties: {
        twinId: {
          type: "string",
          description: "The twin ID to list relationships for.",
        },
      },
      required: ["twinId"],
    },
    handler: async (args: { twinId: string }) => {
      emitToolEvent("list_relationships", "executing");
      try {
        const result = await dtService.listRelationships(args.twinId);
        emitToolEvent("list_relationships", "completed", result);
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        emitToolEvent("list_relationships", "error", undefined, msg);
        return { error: msg };
      }
    },
  },

  {
    name: "add_component_to_twin",
    description:
      "Add a new component (sensor, equipment, device) to an existing twin. This is a convenience " +
      "method that creates a new twin for the component and creates a relationship from the parent. " +
      "Example: add a humidity sensor to room21, add a motor to a station.",
    parameters: {
      type: "object",
      properties: {
        parentTwinId: {
          type: "string",
          description: "The existing parent twin to attach the component to.",
        },
        componentTwinId: {
          type: "string",
          description: "Unique ID for the new component twin (e.g. 'humidity_sensor_01').",
        },
        componentModelId: {
          type: "string",
          description: "DTDL model ID for the component (e.g. 'dtmi:manufacturing:HumiditySensor;1').",
        },
        relationshipName: {
          type: "string",
          description: "Relationship name from parent to component (e.g. 'contains', 'hasSensor', 'hasEquipment').",
        },
        properties: {
          type: "object",
          description: "Initial property values for the component twin.",
          additionalProperties: true,
        },
      },
      required: ["parentTwinId", "componentTwinId", "componentModelId", "relationshipName"],
    },
    handler: async (args: {
      parentTwinId: string;
      componentTwinId: string;
      componentModelId: string;
      relationshipName: string;
      properties?: Record<string, unknown>;
    }) => {
      emitToolEvent("add_component_to_twin", "executing");
      try {
        const componentTwin = await dtService.createTwin(
          args.componentTwinId,
          args.componentModelId,
          args.properties || {}
        );
        const relationship = await dtService.createRelationship(
          args.parentTwinId,
          args.componentTwinId,
          args.relationshipName
        );
        const result = {
          success: true,
          componentTwin,
          relationship,
          message: `Created ${args.componentTwinId} and linked to ${args.parentTwinId} via '${args.relationshipName}'.`,
        };
        emitToolEvent("add_component_to_twin", "completed", result);
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        emitToolEvent("add_component_to_twin", "error", undefined, msg);
        return { error: msg };
      }
    },
  },

  // ─── Telemetry & Monitoring Tools ─────────────────────────────────────────

  {
    name: "start_telemetry_simulation",
    description:
      "Start simulating real-time telemetry data for a digital twin. Generates realistic " +
      "sensor readings (temperature, vibration, RPM, power, speed, etc.) based on the twin's model type. " +
      "Use this to bring twins 'alive' with streaming data for monitoring and demo purposes. " +
      "Supported model types: Motor, TemperatureSensor, VibrationSensor, HumiditySensor, " +
      "EnergyMeter, Conveyor, RobotArm.",
    parameters: {
      type: "object",
      properties: {
        twinId: {
          type: "string",
          description: "The ID of the twin to simulate telemetry for (e.g. 'filler_motor').",
        },
        modelId: {
          type: "string",
          description:
            "The DTDL model ID of the twin (e.g. 'dtmi:manufacturing:Motor;1'). " +
            "Used to determine which telemetry properties to simulate.",
        },
      },
      required: ["twinId", "modelId"],
    },
    handler: async (args: { twinId: string; modelId: string }) => {
      emitToolEvent("start_telemetry_simulation", "executing");
      const result = iotService.startSimulation(args.twinId, args.modelId);
      if (!result.success) {
        const msg = `No simulation profile for model '${args.modelId}'. Supported: Motor, TemperatureSensor, VibrationSensor, HumiditySensor, EnergyMeter, Conveyor, RobotArm.`;
        emitToolEvent("start_telemetry_simulation", "error", undefined, msg);
        return { error: msg };
      }
      const output = {
        success: true,
        twinId: args.twinId,
        simulatingProperties: result.properties,
        message: `Telemetry simulation started for '${args.twinId}'. Properties: ${result.properties.join(", ")}. View live data in the telemetry panel.`,
      };
      emitToolEvent("start_telemetry_simulation", "completed", output);
      return output;
    },
  },

  {
    name: "stop_telemetry_simulation",
    description:
      "Stop telemetry simulation for a specific twin or all twins.",
    parameters: {
      type: "object",
      properties: {
        twinId: {
          type: "string",
          description:
            "The twin ID to stop simulation for. If omitted, stops all simulations.",
        },
      },
      required: [],
    },
    handler: async (args: { twinId?: string }) => {
      emitToolEvent("stop_telemetry_simulation", "executing");
      if (args.twinId) {
        const stopped = iotService.stopSimulation(args.twinId);
        const result = { success: stopped, twinId: args.twinId };
        emitToolEvent("stop_telemetry_simulation", "completed", result);
        return result;
      }
      iotService.stopAllSimulations();
      const result = { success: true, message: "All simulations stopped" };
      emitToolEvent("stop_telemetry_simulation", "completed", result);
      return result;
    },
  },

  {
    name: "get_live_telemetry",
    description:
      "Get the latest telemetry readings for a twin. Returns the most recent value for each " +
      "telemetry property (temperature, vibration, RPM, etc.). Use this when the user asks about " +
      "current sensor values or equipment status.",
    parameters: {
      type: "object",
      properties: {
        twinId: {
          type: "string",
          description: "The twin ID to get telemetry for.",
        },
        property: {
          type: "string",
          description:
            "Optional: a specific property name (e.g. 'Temperature'). " +
            "If omitted, returns all properties for the twin.",
        },
      },
      required: ["twinId"],
    },
    handler: async (args: { twinId: string; property?: string }) => {
      emitToolEvent("get_live_telemetry", "executing");
      if (args.property) {
        const reading = iotService.getLatestReading(args.twinId, args.property);
        if (!reading) {
          const msg = `No telemetry data for ${args.twinId}/${args.property}. Is simulation running?`;
          emitToolEvent("get_live_telemetry", "completed", { noData: true });
          return { message: msg, activeSimulations: iotService.getActiveSimulations() };
        }
        emitToolEvent("get_live_telemetry", "completed", reading);
        return reading;
      }

      const all = iotService.getAllLatestReadings().filter((r) => r.twinId === args.twinId);
      if (all.length === 0) {
        emitToolEvent("get_live_telemetry", "completed", { noData: true });
        return {
          message: `No telemetry data for '${args.twinId}'. Start simulation first.`,
          activeSimulations: iotService.getActiveSimulations(),
        };
      }
      emitToolEvent("get_live_telemetry", "completed", all);
      return all;
    },
  },

  {
    name: "get_telemetry_history",
    description:
      "Get recent telemetry history for a twin property (up to 60 data points). " +
      "Useful for trend analysis and spotting anomalies.",
    parameters: {
      type: "object",
      properties: {
        twinId: {
          type: "string",
          description: "The twin ID to get history for.",
        },
        property: {
          type: "string",
          description: "The property name to get history for (e.g. 'Temperature', 'Vibration').",
        },
      },
      required: ["twinId", "property"],
    },
    handler: async (args: { twinId: string; property: string }) => {
      emitToolEvent("get_telemetry_history", "executing");
      const history = iotService.getReadingHistory(args.twinId, args.property);
      const result = {
        twinId: args.twinId,
        property: args.property,
        dataPoints: history.length,
        readings: history,
        summary: history.length > 0
          ? {
              min: Math.min(...history.map((r) => r.value)),
              max: Math.max(...history.map((r) => r.value)),
              avg: Math.round((history.reduce((sum, r) => sum + r.value, 0) / history.length) * 100) / 100,
              latest: history[history.length - 1]?.value,
            }
          : null,
      };
      emitToolEvent("get_telemetry_history", "completed", result);
      return result;
    },
  },

  {
    name: "list_active_simulations",
    description:
      "List all twins that are currently running telemetry simulations. " +
      "Shows which twins are emitting live data.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
    handler: async () => {
      emitToolEvent("list_active_simulations", "executing");
      const result = {
        activeTwins: iotService.getActiveSimulations(),
        count: iotService.getActiveSimulations().length,
      };
      emitToolEvent("list_active_simulations", "completed", result);
      return result;
    },
  },
];

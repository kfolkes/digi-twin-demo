import { Router } from "express";
import { getClient } from "../client.js";
import { getSessionOptions, enhanceModelError } from "../model-config.js";
import { digitalTwinTools, setToolEventListener } from "../tools/digitalTwinTools.js";
import { sdlcTools, setSdlcToolEventListener } from "../tools/sdlcTools.js";
import { monitoringTools, setMonitoringToolEventListener } from "../tools/monitoringTools.js";
import { planningTools, setPlanningToolEventListener } from "../tools/planningTools.js";
import { kpiTools, setKpiToolEventListener } from "../tools/kpiTools.js";
import { supplyChainTools, setSupplyChainToolEventListener } from "../tools/supplyChainTools.js";
import { edgeTools, setEdgeToolEventListener } from "../tools/edgeTools.js";

const router = Router();

type SessionLike = {
  on(event: string, cb: (e: unknown) => void): () => void;
  send(msg: { prompt: string }): Promise<void>;
  destroy(): Promise<void>;
};

/** Wait for the session to become idle or error, with a configurable timeout. */
function waitForIdle(session: SessionLike, timeoutMs = 300_000): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      unsubIdle();
      unsubError();
      reject(new Error(`Timeout after ${timeoutMs}ms waiting for response`));
    }, timeoutMs);

    const unsubIdle = session.on("session.idle", () => {
      clearTimeout(timer);
      unsubIdle();
      unsubError();
      resolve();
    });

    const unsubError = session.on("session.error", (event: unknown) => {
      clearTimeout(timer);
      unsubIdle();
      unsubError();
      const msg = (event as { data?: { message?: string } })?.data?.message ?? "Unknown session error";
      reject(new Error(`Session error: ${msg}`));
    });
  });
}

const ALLOWED_ROLES = new Set(["user", "assistant"]);

function isValidHistoryItem(item: unknown): item is { role: string; content: string } {
  return (
    item !== null &&
    typeof item === "object" &&
    typeof (item as Record<string, unknown>).role === "string" &&
    ALLOWED_ROLES.has((item as Record<string, unknown>).role as string) &&
    typeof (item as Record<string, unknown>).content === "string"
  );
}

/** Digital Twin Builder + SDLC system prompt */
const SYSTEM_PROMPT = `You are a Digital Twin Builder assistant for Azure Digital Twins.

## Your Role
You help manufacturing customers create, modify, query, and manage Azure Digital Twins through conversation.
You understand DTDL (Digital Twins Definition Language), industrial assets (machines, sensors, PLCs, conveyors, robot arms), and IoT concepts.

## What You Can Do
- **List and inspect** existing twins, models, and relationships
- **Create new twins** from available DTDL models (Floor, Room, Thermostat, Production Line, Station, Motor, sensors, conveyors, robot arms)
- **Add components** to existing twins (e.g. add a sensor to a machine, add a station to a production line)
- **Create relationships** between twins (contains, hasStation, hasEquipment, hasSensor)
- **Update twin properties** (change status, set values)
- **Deploy factory templates** for quick setup (Building Tutorial, Bottling Line, Automotive Cell)
- **Query the twin graph** using ADT query syntax
- **Upload custom models** when built-in models don't fit the customer's needs
- **Delete twins** (always confirm with the user first)

## Real-Time Telemetry & Monitoring (Lights-Out Manufacturing)
- **Start telemetry simulation** for any twin — generates realistic sensor data (RPM, temperature, vibration, power, speed, cycle time)
- **Get live telemetry** — read current sensor values for any twin
- **View telemetry history** — trend data for any property (up to 60 data points)
- **Create alert rules** — threshold-based alerts (e.g., "alert when vibration > 5mm/s")
- **Set up default manufacturing alerts** — auto-configure common temperature and vibration alerts
- **Check health status** — see which twins are healthy, warning, or critical
- **Query active alerts** — see all open alerts with severity and affected twins
- **Stop simulations** when no longer needed

### Lights-Out Manufacturing Workflow
1. Deploy a factory template (bottling line, automotive cell, or lights-out cell)
2. Start telemetry simulation for sensors and equipment
3. Set up alert rules (or use defaults for temperature/vibration)
4. Monitor health status — the system will flag anomalies
5. Review telemetry trends for predictive insights

## Production Planning & Simulation
- **Create production orders** — specify product, quantity, priority, due date, required stations
- **Generate optimized schedules** — constraint-based scheduling considering machine availability and changeover times
- **Identify bottlenecks** — find overloaded stations and get recommendations
- **Run what-if simulations** — create scenarios (add equipment, change speed, etc.) and see projected impact on throughput, energy, and cost
- **Compare scenarios** — side-by-side simulation results to evaluate options

## KPI Dashboards & Analytics
- **OEE (Overall Equipment Effectiveness)** — calculate availability × performance × quality for any production line
- **Throughput reports** — units produced, cycle times, and efficiency across all lines
- **Shift comparison** — compare day vs. night shift performance
- **Manager summary** — high-level weekly report with OEE, alerts, orders completed, and recommendations

## Supply Chain & Inventory
- **Check inventory levels** — see current stock, reorder points, and days of supply
- **Track shipments** — view in-transit and delivered shipments
- **Trigger replenishment** — manually or auto-replenish low-stock materials
- **Supply chain health** — overall score based on inventory levels and delivery status
- **List suppliers** — view supplier details and lead times

## Edge Computing
- **Generate edge deployment manifests** — create IoT Edge module configurations for local control loops
- **List available edge modules** — see pre-built modules for emergency stop, data filtering, local ML, and protocol translation
- **Generate emergency stop logic** — create edge rules for critical safety thresholds

## SDLC Capabilities (GitHub-integrated)
- **Commit model definitions** and twin definitions to GitHub
- **Open pull requests** for review/approval
- **Check CI pipeline status** for validation workflows
- **Show recent twin/model changes** as an audit trail
- **Create releases** to trigger production deployment

## SDLC Best Practices (from Microsoft Learn guidance)
- Treat DTDL models like source code and keep them in source control
- Prefer model versioning (increment the DTMI version suffix) for model updates
- Validate model syntax/structure before upload and before deploy
- Use PR review and CI validation before promoting to production
- Keep dev/staging/prod environments separate and promote through releases

## Two Scenarios
1. **Existing Twin** — The customer has an existing digital twin (e.g. the Building Tutorial with floor1, room21, thermostat67). Help them add new components, modify properties, or extend the graph.
2. **Greenfield** — The customer is starting fresh. Help them choose a factory template or describe their layout so you can build it from scratch.

## Guidelines
- When a user describes equipment or a factory, translate to DTDL models and twins
- Always show what you've created (list the twins/relationships)
- Confirm before deleting anything
- If a model doesn't exist for what the user describes, offer to create a custom one
- Use clear, non-technical language — the user may not know DTDL or Azure internals
- When creating twins, use descriptive snake_case IDs (e.g. 'filler_station', 'temp_sensor_01')
- After creating or modifying twins, suggest the user refresh the graph visualizer
- After model/twin changes, proactively suggest committing to Git + opening a PR

## Available Built-in Models
- Floor (dtmi:example:Floor;1) — building floor with AverageTemperature
- Room (dtmi:example:Room;1) — room with Temperature, HumidityLevel
- Thermostat (dtmi:example:Thermostat;1) — temperature sensor/device
- Production Line (dtmi:manufacturing:ProductionLine;1) — manufacturing line with Status, Throughput
- Station (dtmi:manufacturing:Station;1) — processing station
- Motor (dtmi:manufacturing:Motor;1) — electric motor with RPM, vibration, temperature
- Temperature Sensor (dtmi:manufacturing:TemperatureSensor;1)
- Vibration Sensor (dtmi:manufacturing:VibrationSensor;1)
- Humidity Sensor (dtmi:manufacturing:HumiditySensor;1)
- Energy Meter (dtmi:manufacturing:EnergyMeter;1)
- Conveyor (dtmi:manufacturing:Conveyor;1)
- Robot Arm (dtmi:manufacturing:RobotArm;1)
- Quality Checkpoint (dtmi:manufacturing:QualityCheckpoint;1)
- PLC Controller (dtmi:manufacturing:PLCController;1)

## Factory Templates
- Building Tutorial — Floor → Room → Thermostat
- Bottling Production Line — filler, capper, labeler with motors and sensors
- Automotive Assembly Cell — welding/painting robots, conveyors
- **Lights-Out Manufacturing Cell** — fully autonomous: CNC machining, robotic assembly, quality inspection, auto packaging, PLC controllers, comprehensive sensors

## GitHub Repository Context
- SDLC tools require: GITHUB_REPO_OWNER, GITHUB_REPO_NAME, and GITHUB_TOKEN
- If repo variables are missing, explain exactly what to set and continue with ADT-only actions
`;

router.post("/chat", async (req, res) => {
  const { message, history } = req.body as {
    message?: unknown;
    history?: unknown;
  };

  if (message === undefined || message === null) {
    res.status(400).json({ error: "Missing 'message' field" });
    return;
  }
  if (typeof message !== "string" || message.trim().length === 0) {
    res.status(400).json({ error: "'message' must be a non-empty string" });
    return;
  }
  if (history !== undefined && !Array.isArray(history)) {
    res.status(400).json({ error: "'history' must be an array" });
    return;
  }
  if (Array.isArray(history) && !history.every(isValidHistoryItem)) {
    res.status(400).json({ error: "Each history item must have 'role' ('user'|'assistant') and 'content' strings" });
    return;
  }

  // Build prompt with system context and conversation history
  const systemContext = `[SYSTEM]\n${SYSTEM_PROMPT}\n[/SYSTEM]\n\n`;
  const historyText = Array.isArray(history) && history.length > 0
    ? history.map((h) => `${h.role}: ${h.content}`).join("\n") + "\n"
    : "";
  const prompt = `${systemContext}${historyText}user: ${message}`;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  let session: SessionLike | null = null;
  let unsubDelta: (() => void) | null = null;

  // Set up tool event listeners so tool activity is streamed to the client
  setToolEventListener((event) => {
    if (!res.socket?.destroyed) {
      res.write(`data: ${JSON.stringify({ toolCall: event })}\n\n`);
    }
  });
  setSdlcToolEventListener((event) => {
    if (!res.socket?.destroyed) {
      res.write(`data: ${JSON.stringify({ toolCall: event })}\n\n`);
    }
  });
  setMonitoringToolEventListener((event) => {
    if (!res.socket?.destroyed) {
      res.write(`data: ${JSON.stringify({ toolCall: event })}\n\n`);
    }
  });
  setPlanningToolEventListener((event) => {
    if (!res.socket?.destroyed) {
      res.write(`data: ${JSON.stringify({ toolCall: event })}\n\n`);
    }
  });
  setKpiToolEventListener((event) => {
    if (!res.socket?.destroyed) {
      res.write(`data: ${JSON.stringify({ toolCall: event })}\n\n`);
    }
  });
  setSupplyChainToolEventListener((event) => {
    if (!res.socket?.destroyed) {
      res.write(`data: ${JSON.stringify({ toolCall: event })}\n\n`);
    }
  });
  setEdgeToolEventListener((event) => {
    if (!res.socket?.destroyed) {
      res.write(`data: ${JSON.stringify({ toolCall: event })}\n\n`);
    }
  });

  try {
    const copilot = await getClient();
    const options = await getSessionOptions({ streaming: true });

    // Create session with ADT + SDLC + monitoring tools — the SDK handles tool execution automatically
    const sessionOpts = {
      ...options,
      tools: [...digitalTwinTools, ...sdlcTools, ...monitoringTools, ...planningTools, ...kpiTools, ...supplyChainTools, ...edgeTools],
      systemMessage: {
        mode: "replace" as const,
        content: SYSTEM_PROMPT,
      },
    };

    session = await copilot.createSession(sessionOpts) as unknown as SessionLike;

    // Stream text deltas to the client
    unsubDelta = session.on("assistant.message_delta", (event: unknown) => {
      if (res.socket?.destroyed) return;
      const delta = (event as { data?: { deltaContent?: string } })?.data?.deltaContent ?? "";
      if (delta) {
        res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
      }
    });

    await session.send({ prompt });
    await waitForIdle(session);

    if (!res.socket?.destroyed) {
      res.write(`data: [DONE]\n\n`);
    }
    res.end();
  } catch (err) {
    const enhanced = enhanceModelError(err);
    if (!res.socket?.destroyed) {
      res.write(`event: error\ndata: ${JSON.stringify({ error: enhanced.message })}\n\n`);
    }
    res.end();
  } finally {
    setToolEventListener(null);
    setSdlcToolEventListener(null);
    setMonitoringToolEventListener(null);
    setPlanningToolEventListener(null);
    setKpiToolEventListener(null);
    setSupplyChainToolEventListener(null);
    setEdgeToolEventListener(null);
    unsubDelta?.();
    await session?.destroy();
  }
});

export default router;

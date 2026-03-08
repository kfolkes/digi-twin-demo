/**
 * REST API routes for direct Digital Twins operations (non-chat).
 * Used by the Twin Graph Visualizer and Model Library UI components.
 */
import { Router } from "express";
import * as dtService from "../services/digitalTwinService.js";
import { MODEL_LIBRARY, FACTORY_TEMPLATES } from "../models/dtdlModels.js";

const router = Router();

// ─── Twin Graph (for visualization) ───────────────────────────────────────────

/** GET /api/twins/graph — full twin graph for the visualizer */
router.get("/api/twins/graph", async (_req, res) => {
  try {
    const graph = await dtService.getFullGraph();
    res.json(graph);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // If ADT is not configured, return an empty graph instead of erroring
    if (msg.includes("ADT_INSTANCE_URL")) {
      res.json({ nodes: [], edges: [], warning: "ADT_INSTANCE_URL not configured — showing empty graph" });
      return;
    }
    res.status(500).json({ error: msg });
  }
});

// ─── Twin CRUD ────────────────────────────────────────────────────────────────

/** GET /api/twins — list all twins */
router.get("/api/twins", async (_req, res) => {
  try {
    const twins = await dtService.getAllTwins();
    res.json(twins);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("ADT_INSTANCE_URL")) {
      res.json([]);
      return;
    }
    res.status(500).json({ error: msg });
  }
});

/** GET /api/twins/:id — get a single twin */
router.get("/api/twins/:id", async (req, res) => {
  try {
    const twin = await dtService.getTwin(req.params.id);
    res.json(twin);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("not found") || msg.includes("404")) {
      res.status(404).json({ error: `Twin '${req.params.id}' not found` });
      return;
    }
    res.status(500).json({ error: msg });
  }
});

/** POST /api/twins — create a twin */
router.post("/api/twins", async (req, res) => {
  const { twinId, modelId, properties } = req.body as {
    twinId?: string;
    modelId?: string;
    properties?: Record<string, unknown>;
  };

  if (!twinId || !modelId) {
    res.status(400).json({ error: "twinId and modelId are required" });
    return;
  }

  try {
    const result = await dtService.createTwin(twinId, modelId, properties || {});
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

/** DELETE /api/twins/:id — delete a twin */
router.delete("/api/twins/:id", async (req, res) => {
  try {
    await dtService.deleteTwin(req.params.id);
    res.json({ success: true, deleted: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

/** PATCH /api/twins/:id — update twin properties */
router.patch("/api/twins/:id", async (req, res) => {
  const { propertyName, value } = req.body as {
    propertyName?: string;
    value?: unknown;
  };

  if (!propertyName) {
    res.status(400).json({ error: "propertyName is required" });
    return;
  }

  try {
    await dtService.updateTwinProperty(req.params.id, propertyName, value);
    res.json({ success: true, twinId: req.params.id, property: propertyName, newValue: value });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// ─── Relationships ────────────────────────────────────────────────────────────

/** GET /api/twins/:id/relationships — list relationships for a twin */
router.get("/api/twins/:id/relationships", async (req, res) => {
  try {
    const rels = await dtService.listRelationships(req.params.id);
    res.json(rels);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

/** POST /api/relationships — create a relationship */
router.post("/api/relationships", async (req, res) => {
  const { sourceTwinId, targetTwinId, relationshipName } = req.body as {
    sourceTwinId?: string;
    targetTwinId?: string;
    relationshipName?: string;
  };

  if (!sourceTwinId || !targetTwinId || !relationshipName) {
    res.status(400).json({ error: "sourceTwinId, targetTwinId, and relationshipName are required" });
    return;
  }

  try {
    const result = await dtService.createRelationship(sourceTwinId, targetTwinId, relationshipName);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// ─── Models ───────────────────────────────────────────────────────────────────

/** GET /api/models — list all available models (library + instance) */
router.get("/api/models", async (_req, res) => {
  const libraryModels = Object.entries(MODEL_LIBRARY).map(([name, model]) => ({
    displayName: name,
    modelId: (model as Record<string, unknown>)["@id"],
    source: "built-in" as const,
    definition: model,
  }));

  let instanceModels: unknown[] = [];
  try {
    instanceModels = await dtService.listModels();
  } catch {
    // ADT not connected — library models only
  }

  res.json({ libraryModels, instanceModels });
});

/** POST /api/models — upload a DTDL model */
router.post("/api/models", async (req, res) => {
  const { models } = req.body as { models?: Record<string, unknown>[] };
  if (!models || !Array.isArray(models)) {
    res.status(400).json({ error: "models array is required" });
    return;
  }

  try {
    const result = await dtService.uploadModels(models);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// ─── Factory Templates ────────────────────────────────────────────────────────

/** GET /api/templates — list available factory templates */
router.get("/api/templates", (_req, res) => {
  const templates = FACTORY_TEMPLATES.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    twinCount: t.twins.length,
    relationshipCount: t.relationships.length,
    modelCount: t.models.length,
  }));
  res.json(templates);
});

/** GET /api/templates/:id — get a specific template with full detail */
router.get("/api/templates/:id", (req, res) => {
  const template = FACTORY_TEMPLATES.find((t) => t.id === req.params.id);
  if (!template) {
    res.status(404).json({ error: `Template '${req.params.id}' not found` });
    return;
  }
  res.json(template);
});

// ─── Query ────────────────────────────────────────────────────────────────────

/** POST /api/query — run an ADT query */
router.post("/api/query", async (req, res) => {
  const { query } = req.body as { query?: string };
  if (!query) {
    res.status(400).json({ error: "query string is required" });
    return;
  }

  try {
    const results = await dtService.queryTwins(query);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

export default router;

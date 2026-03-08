import { DigitalTwinsClient } from "@azure/digital-twins-core";
import { DefaultAzureCredential, ManagedIdentityCredential } from "@azure/identity";

let client: DigitalTwinsClient | null = null;

/**
 * Get or create a singleton DigitalTwinsClient.
 * Uses ManagedIdentityCredential in production, DefaultAzureCredential for local dev.
 */
export function getDigitalTwinsClient(): DigitalTwinsClient {
  if (!client) {
    const adtUrl = process.env.ADT_INSTANCE_URL;
    if (!adtUrl) {
      throw new Error(
        "ADT_INSTANCE_URL environment variable is not set. " +
        "Set it to your Azure Digital Twins instance URL, e.g. https://<instance>.api.eus.digitaltwins.azure.net"
      );
    }
    const credential = process.env.NODE_ENV === "production"
      ? new ManagedIdentityCredential()
      : new DefaultAzureCredential();
    client = new DigitalTwinsClient(adtUrl, credential);
  }
  return client;
}

// ─── Model Operations ─────────────────────────────────────────────────────────

/** List all DTDL models in the ADT instance */
export async function listModels(): Promise<unknown[]> {
  const dtClient = getDigitalTwinsClient();
  const models: unknown[] = [];
  const iter = dtClient.listModels();
  for await (const model of iter) {
    models.push(model);
  }
  return models;
}

/** Upload one or more DTDL models */
export async function uploadModels(dtdlModels: Record<string, unknown>[]): Promise<unknown[]> {
  const dtClient = getDigitalTwinsClient();
  const result = await dtClient.createModels(dtdlModels);
  return result;
}

/** Delete a model by ID */
export async function deleteModel(modelId: string): Promise<void> {
  const dtClient = getDigitalTwinsClient();
  await dtClient.deleteModel(modelId);
}

/** Get a single model by ID */
export async function getModel(modelId: string): Promise<unknown> {
  const dtClient = getDigitalTwinsClient();
  const model = await dtClient.getModel(modelId);
  return model;
}

// ─── Twin Operations ──────────────────────────────────────────────────────────

/** Create or replace a digital twin */
export async function createTwin(
  twinId: string,
  modelId: string,
  properties: Record<string, unknown> = {}
): Promise<unknown> {
  const dtClient = getDigitalTwinsClient();
  const twinData: Record<string, unknown> = {
    $dtId: twinId,
    $metadata: {
      $model: modelId,
    },
    ...properties,
  };
  const result = await dtClient.upsertDigitalTwin(twinId, JSON.stringify(twinData));
  return JSON.parse(result.body as string);
}

/** Get a twin by ID */
export async function getTwin(twinId: string): Promise<unknown> {
  const dtClient = getDigitalTwinsClient();
  const result = await dtClient.getDigitalTwin(twinId);
  return JSON.parse(result.body as string);
}

/** Update twin properties using JSON Patch */
export async function updateTwinProperty(
  twinId: string,
  propertyPath: string,
  value: unknown
): Promise<void> {
  const dtClient = getDigitalTwinsClient();
  const patch = [
    {
      op: "add",
      path: `/${propertyPath}`,
      value,
    },
  ];
  await dtClient.updateDigitalTwin(twinId, patch);
}

/** Delete a twin by ID */
export async function deleteTwin(twinId: string): Promise<void> {
  const dtClient = getDigitalTwinsClient();
  // First delete all relationships
  const incomingRels = dtClient.listIncomingRelationships(twinId);
  for await (const rel of incomingRels) {
    if (rel.sourceId && rel.relationshipId) {
      await dtClient.deleteRelationship(rel.sourceId, rel.relationshipId);
    }
  }
  const outgoingRels = dtClient.listRelationships(twinId);
  for await (const rel of outgoingRels) {
    const r = rel as Record<string, unknown>;
    if (r.$relationshipId) {
      await dtClient.deleteRelationship(twinId, r.$relationshipId as string);
    }
  }
  await dtClient.deleteDigitalTwin(twinId);
}

// ─── Query Operations ─────────────────────────────────────────────────────────

/** Run an ADT query (SQL-like syntax) */
export async function queryTwins(query: string): Promise<unknown[]> {
  const dtClient = getDigitalTwinsClient();
  const results: unknown[] = [];
  const iter = dtClient.queryTwins(query);
  for await (const item of iter) {
    results.push(item);
  }
  return results;
}

/** Get all twins in the instance */
export async function getAllTwins(): Promise<unknown[]> {
  return queryTwins("SELECT * FROM digitaltwins");
}

// ─── Relationship Operations ──────────────────────────────────────────────────

/** Create a relationship between two twins */
export async function createRelationship(
  sourceTwinId: string,
  targetTwinId: string,
  relationshipName: string,
  relationshipId?: string
): Promise<unknown> {
  const dtClient = getDigitalTwinsClient();
  const relId = relationshipId || `${sourceTwinId}-${relationshipName}-${targetTwinId}`;
  const relationship = {
    $relationshipId: relId,
    $sourceId: sourceTwinId,
    $targetId: targetTwinId,
    $relationshipName: relationshipName,
  };
  const result = await dtClient.upsertRelationship(
    sourceTwinId,
    relId,
    relationship
  );
  return result.body;
}

/** List all relationships for a twin */
export async function listRelationships(twinId: string): Promise<unknown[]> {
  const dtClient = getDigitalTwinsClient();
  const relationships: unknown[] = [];
  const iter = dtClient.listRelationships(twinId);
  for await (const rel of iter) {
    relationships.push(rel);
  }
  return relationships;
}

/** Delete a specific relationship */
export async function deleteRelationship(
  twinId: string,
  relationshipId: string
): Promise<void> {
  const dtClient = getDigitalTwinsClient();
  await dtClient.deleteRelationship(twinId, relationshipId);
}

// ─── Graph Operations (for visualization) ─────────────────────────────────────

export interface TwinNode {
  id: string;
  modelId: string;
  properties: Record<string, unknown>;
}

export interface TwinEdge {
  id: string;
  sourceId: string;
  targetId: string;
  relationshipName: string;
}

export interface TwinGraph {
  nodes: TwinNode[];
  edges: TwinEdge[];
}

/** Get the full twin graph — all twins and all relationships */
export async function getFullGraph(): Promise<TwinGraph> {
  const twins = await getAllTwins();
  const nodes: TwinNode[] = twins.map((t) => {
    const twin = t as Record<string, unknown>;
    const metadata = twin.$metadata as Record<string, unknown> | undefined;
    return {
      id: twin.$dtId as string,
      modelId: (metadata?.$model as string) || "unknown",
      properties: Object.fromEntries(
        Object.entries(twin).filter(([k]) => !k.startsWith("$"))
      ),
    };
  });

  const edges: TwinEdge[] = [];
  for (const node of nodes) {
    const rels = await listRelationships(node.id);
    for (const rel of rels) {
      const r = rel as Record<string, unknown>;
      edges.push({
        id: (r.$relationshipId as string) || `${r.$sourceId}-${r.$relationshipName}-${r.$targetId}`,
        sourceId: r.$sourceId as string,
        targetId: r.$targetId as string,
        relationshipName: r.$relationshipName as string,
      });
    }
  }

  return { nodes, edges };
}

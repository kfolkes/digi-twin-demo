/**
 * TwinGraphViewer — interactive graph visualization of Azure Digital Twins.
 * Uses React Flow to render twin nodes and relationship edges.
 */
import { useCallback, useEffect, useState, useRef } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type NodeTypes,
  Position,
  MarkerType,
  useNodesState,
  useEdgesState,
} from 'reactflow'
import 'reactflow/dist/style.css'

interface TwinNode {
  id: string
  modelId: string
  properties: Record<string, unknown>
}

interface TwinEdge {
  id: string
  sourceId: string
  targetId: string
  relationshipName: string
}

interface TwinGraph {
  nodes: TwinNode[]
  edges: TwinEdge[]
  warning?: string
}

interface Props {
  refreshTrigger?: number // increment to force a refresh
}

// Color map by model category
function getNodeColor(modelId: string): string {
  if (modelId.includes('Floor')) return '#4a90d9'
  if (modelId.includes('Room')) return '#50c878'
  if (modelId.includes('Thermostat')) return '#ff8c42'
  if (modelId.includes('ProductionLine')) return '#9b59b6'
  if (modelId.includes('Station')) return '#3498db'
  if (modelId.includes('Motor')) return '#e67e22'
  if (modelId.includes('Sensor') || modelId.includes('Meter')) return '#1abc9c'
  if (modelId.includes('Conveyor')) return '#95a5a6'
  if (modelId.includes('Robot')) return '#e74c3c'
  if (modelId.includes('Quality') || modelId.includes('Checkpoint')) return '#27ae60'
  if (modelId.includes('PLC') || modelId.includes('Controller')) return '#8e44ad'
  return '#7f8c8d'
}

function getModelDisplayName(modelId: string): string {
  const parts = modelId.split(':')
  const lastPart = parts[parts.length - 1]
  return lastPart?.split(';')[0] || modelId
}

// Custom node component
function TwinNodeComponent({ data }: { data: { label: string; modelName: string; color: string; properties: Record<string, unknown>; healthStatus?: 'healthy' | 'warning' | 'critical' } }) {
  const [expanded, setExpanded] = useState(false)
  const propEntries = Object.entries(data.properties).filter(([k]) => !k.startsWith('$'))

  const healthBorder = data.healthStatus === 'critical'
    ? '3px solid #e74c3c'
    : data.healthStatus === 'warning'
    ? '3px solid #f39c12'
    : '2px solid rgba(255,255,255,0.3)'

  const healthGlow = data.healthStatus === 'critical'
    ? '0 0 12px rgba(231,76,60,0.6)'
    : data.healthStatus === 'warning'
    ? '0 0 12px rgba(243,156,18,0.4)'
    : '0 2px 8px rgba(0,0,0,0.2)'

  return (
    <div
      style={{
        padding: '10px 14px',
        borderRadius: '8px',
        background: data.color,
        color: '#fff',
        border: healthBorder,
        minWidth: '140px',
        fontSize: '12px',
        cursor: 'pointer',
        boxShadow: healthGlow,
        position: 'relative',
      }}
      onClick={() => setExpanded(!expanded)}
    >
      {data.healthStatus && data.healthStatus !== 'healthy' && (
        <span style={{
          position: 'absolute',
          top: '-6px',
          right: '-6px',
          fontSize: '14px',
        }}>
          {data.healthStatus === 'critical' ? '🔴' : '🟡'}
        </span>
      )}
      <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '2px' }}>{data.label}</div>
      <div style={{ opacity: 0.8, fontSize: '10px' }}>{data.modelName}</div>
      {expanded && propEntries.length > 0 && (
        <div style={{ marginTop: '6px', borderTop: '1px solid rgba(255,255,255,0.3)', paddingTop: '4px' }}>
          {propEntries.slice(0, 6).map(([key, val]) => (
            <div key={key} style={{ fontSize: '10px', opacity: 0.9 }}>
              <strong>{key}:</strong> {String(val)}
            </div>
          ))}
          {propEntries.length > 6 && (
            <div style={{ fontSize: '10px', opacity: 0.7 }}>+{propEntries.length - 6} more...</div>
          )}
        </div>
      )}
    </div>
  )
}

const nodeTypes: NodeTypes = {
  twinNode: TwinNodeComponent,
}

// Simple auto-layout: arrange nodes in a hierarchical tree
function layoutNodes(twinNodes: TwinNode[], twinEdges: TwinEdge[]): Node[] {
  // Find root nodes (nodes not targeted by any edge)
  const targetIds = new Set(twinEdges.map((e) => e.targetId))
  const roots = twinNodes.filter((n) => !targetIds.has(n.id))
  if (roots.length === 0 && twinNodes.length > 0) {
    roots.push(twinNodes[0])
  }

  // BFS to assign levels
  const levels = new Map<string, number>()
  const childrenMap = new Map<string, string[]>()
  for (const edge of twinEdges) {
    const children = childrenMap.get(edge.sourceId) || []
    children.push(edge.targetId)
    childrenMap.set(edge.sourceId, children)
  }

  const queue = roots.map((r) => ({ id: r.id, level: 0 }))
  for (const root of queue) {
    levels.set(root.id, 0)
  }

  while (queue.length > 0) {
    const current = queue.shift()!
    const children = childrenMap.get(current.id) || []
    for (const childId of children) {
      if (!levels.has(childId)) {
        levels.set(childId, current.level + 1)
        queue.push({ id: childId, level: current.level + 1 })
      }
    }
  }

  // Assign positions to unvisited nodes
  for (const node of twinNodes) {
    if (!levels.has(node.id)) {
      levels.set(node.id, 0)
    }
  }

  // Group nodes by level and position
  const nodesByLevel = new Map<number, TwinNode[]>()
  for (const node of twinNodes) {
    const level = levels.get(node.id)!
    const group = nodesByLevel.get(level) || []
    group.push(node)
    nodesByLevel.set(level, group)
  }

  const HORIZONTAL_SPACING = 220
  const VERTICAL_SPACING = 150

  const flowNodes: Node[] = []
  for (const [level, nodesAtLevel] of nodesByLevel) {
    const totalWidth = (nodesAtLevel.length - 1) * HORIZONTAL_SPACING
    const startX = -totalWidth / 2

    nodesAtLevel.forEach((node, index) => {
      const modelName = getModelDisplayName(node.modelId)
      const color = getNodeColor(node.modelId)

      flowNodes.push({
        id: node.id,
        type: 'twinNode',
        position: { x: startX + index * HORIZONTAL_SPACING, y: level * VERTICAL_SPACING },
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
        data: {
          label: node.id,
          modelName,
          color,
          properties: node.properties,
          healthStatus: undefined as 'healthy' | 'warning' | 'critical' | undefined,
        },
      })
    })
  }

  return flowNodes
}

export function TwinGraphViewer({ refreshTrigger }: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const healthMapRef = useRef<Map<string, 'healthy' | 'warning' | 'critical'>>(new Map())

  // Periodically fetch health statuses
  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await fetch('/api/health/twins')
        if (res.ok) {
          const data = await res.json()
          const map = new Map<string, 'healthy' | 'warning' | 'critical'>()
          for (const entry of data.statuses || []) {
            map.set(entry.twinId, entry.status)
          }
          healthMapRef.current = map
          // Update existing node data with new health
          setNodes((prev) =>
            prev.map((n) => ({
              ...n,
              data: { ...n.data, healthStatus: map.get(n.id) || 'healthy' },
            }))
          )
        }
      } catch {
        // ignore
      }
    }
    fetchHealth()
    const interval = setInterval(fetchHealth, 5000)
    return () => clearInterval(interval)
  }, [setNodes])

  const fetchGraph = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/twins/graph')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: TwinGraph = await res.json()

      if (data.warning) {
        setWarning(data.warning)
      }

      const flowNodes = layoutNodes(data.nodes, data.edges)
      // Apply current health status to nodes
      for (const node of flowNodes) {
        node.data.healthStatus = healthMapRef.current.get(node.id) || 'healthy'
      }
      const flowEdges: Edge[] = data.edges.map((e) => ({
        id: e.id,
        source: e.sourceId,
        target: e.targetId,
        label: e.relationshipName,
        type: 'smoothstep',
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { stroke: '#888', strokeWidth: 2 },
        labelStyle: { fontSize: 10, fill: '#666' },
      }))

      setNodes(flowNodes)
      setEdges(flowEdges)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [setNodes, setEdges])

  useEffect(() => {
    fetchGraph()
  }, [fetchGraph, refreshTrigger])

  const nodeCount = nodes.length
  const edgeCount = edges.length

  const minimapNodeColor = useCallback((node: Node) => {
    return node.data?.color || '#7f8c8d'
  }, [])

  return (
    <div className="twin-graph-viewer">
      <div className="graph-header">
        <h3>Twin Graph</h3>
        <div className="graph-stats">
          <span className="stat">{nodeCount} twins</span>
          <span className="stat">{edgeCount} relationships</span>
          <button className="refresh-btn" onClick={fetchGraph} disabled={loading} title="Refresh graph">
            {loading ? '...' : '\u21bb'}
          </button>
        </div>
      </div>
      {error && (
        <div className="graph-error">
          <strong>Error:</strong> {error}
        </div>
      )}
      {warning && !error && (
        <div className="graph-warning">
          {warning}
        </div>
      )}
      <div className="graph-canvas">
        {nodes.length === 0 && !loading && !error ? (
          <div className="graph-empty">
            <p>No twins found</p>
            <p className="graph-empty-hint">
              Use the chat to create twins, or deploy a factory template to get started.
            </p>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            minZoom={0.2}
            maxZoom={2}
            attributionPosition="bottom-left"
          >
            <Background gap={20} size={1} />
            <Controls />
            <MiniMap
              nodeColor={minimapNodeColor}
              nodeStrokeWidth={3}
              pannable
              zoomable
            />
          </ReactFlow>
        )}
      </div>
    </div>
  )
}

/**
 * LiveTelemetry — real-time sensor data panel that connects to the
 * telemetry SSE endpoint and displays live readings with sparklines.
 */
import { useEffect, useState, useRef, useCallback } from 'react'

interface TelemetryReading {
  twinId: string
  property: string
  value: number
  timestamp: string
  unit?: string
}

// Rolling window of values per twin+property for sparkline rendering
interface ReadingBuffer {
  values: number[]
  latest: TelemetryReading
}

interface Props {
  /** When non-null, filter to only these twin IDs */
  filterTwinIds?: string[]
}

const MAX_SPARKLINE = 30

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const w = 120
  const h = 28
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w
      const y = h - ((v - min) / range) * h
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <polyline fill="none" stroke={color} strokeWidth={1.5} points={points} />
    </svg>
  )
}

function healthColor(value: number, property: string): string {
  if (property.toLowerCase().includes('temp')) {
    if (value > 80) return '#e74c3c'
    if (value > 60) return '#f39c12'
    return '#2ecc71'
  }
  if (property.toLowerCase().includes('vibration')) {
    if (value > 7) return '#e74c3c'
    if (value > 4) return '#f39c12'
    return '#2ecc71'
  }
  return '#3498db'
}

export function LiveTelemetry({ filterTwinIds }: Props) {
  const [buffers, setBuffers] = useState<Map<string, ReadingBuffer>>(new Map())
  const [connected, setConnected] = useState(false)
  const [simulations, setSimulations] = useState<string[]>([])
  const eventSourceRef = useRef<EventSource | null>(null)

  // Fetch active simulations
  const fetchSimulations = useCallback(async () => {
    try {
      const res = await fetch('/api/telemetry/simulations')
      if (res.ok) {
        const data = await res.json()
        setSimulations(data.simulations || [])
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    fetchSimulations()
    const interval = setInterval(fetchSimulations, 10000)
    return () => clearInterval(interval)
  }, [fetchSimulations])

  // SSE connection
  useEffect(() => {
    const url = filterTwinIds?.length
      ? `/api/telemetry/stream?twinIds=${filterTwinIds.join(',')}`
      : '/api/telemetry/stream'

    const es = new EventSource(url)
    eventSourceRef.current = es

    es.onopen = () => setConnected(true)
    es.onerror = () => setConnected(false)

    es.onmessage = (event) => {
      try {
        const reading: TelemetryReading = JSON.parse(event.data)
        const key = `${reading.twinId}::${reading.property}`
        setBuffers((prev) => {
          const next = new Map(prev)
          const existing = next.get(key)
          const values = existing ? [...existing.values, reading.value].slice(-MAX_SPARKLINE) : [reading.value]
          next.set(key, { values, latest: reading })
          return next
        })
      } catch {
        // ignore
      }
    }

    return () => {
      es.close()
      eventSourceRef.current = null
    }
  }, [filterTwinIds])

  const entries = Array.from(buffers.entries()).sort((a, b) => a[0].localeCompare(b[0]))

  // Group by twinId
  const grouped = new Map<string, Array<[string, ReadingBuffer]>>()
  for (const [key, buf] of entries) {
    const twinId = buf.latest.twinId
    const group = grouped.get(twinId) || []
    group.push([key, buf])
    grouped.set(twinId, group)
  }

  return (
    <div className="live-telemetry">
      <div className="telemetry-header">
        <h3>Live Telemetry</h3>
        <span className={`telemetry-status ${connected ? 'connected' : 'disconnected'}`}>
          {connected ? '● Connected' : '○ Disconnected'}
        </span>
      </div>

      {simulations.length === 0 && entries.length === 0 && (
        <div className="telemetry-empty">
          <p>No active telemetry streams.</p>
          <p className="telemetry-hint">
            Ask the chat to &quot;start telemetry simulation&quot; for a twin.
          </p>
        </div>
      )}

      <div className="telemetry-readings">
        {Array.from(grouped.entries()).map(([twinId, readings]) => (
          <div key={twinId} className="telemetry-twin-group">
            <div className="telemetry-twin-id">{twinId}</div>
            {readings.map(([key, buf]) => {
              const { latest, values } = buf
              const color = healthColor(latest.value, latest.property)
              return (
                <div key={key} className="telemetry-reading">
                  <div className="reading-info">
                    <span className="reading-property">{latest.property}</span>
                    <span className="reading-value" style={{ color }}>
                      {latest.value.toFixed(1)}
                      {latest.unit ? ` ${latest.unit}` : ''}
                    </span>
                  </div>
                  <Sparkline values={values} color={color} />
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

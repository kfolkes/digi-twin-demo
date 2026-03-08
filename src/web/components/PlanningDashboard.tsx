/**
 * PlanningDashboard — production order management, schedule visualization,
 * bottleneck analysis, and what-if simulation UI.
 */
import { useEffect, useState, useCallback } from 'react'

interface ProductionOrder {
  id: string
  productName: string
  quantity: number
  priority: 'low' | 'medium' | 'high' | 'critical'
  dueDate: string
  status: 'pending' | 'scheduled' | 'in-progress' | 'completed' | 'cancelled'
  createdAt: string
}

interface ScheduleEntry {
  orderId: string
  stationId: string
  startTime: string
  endTime: string
  units: number
}

interface ScheduleSummary {
  id: string
  name: string
  entries: number
  totalDurationHours: number
  utilizationPercent: number
  generatedAt: string
}

interface Bottleneck {
  stationId: string
  stationType: string
  utilization: number
  queuedOrders: number
  recommendation: string
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: '#e74c3c',
  high: '#e67e22',
  medium: '#3498db',
  low: '#95a5a6',
}

const STATUS_ICONS: Record<string, string> = {
  pending: '⏳',
  scheduled: '📋',
  'in-progress': '🔄',
  completed: '✅',
  cancelled: '❌',
}

export function PlanningDashboard() {
  const [orders, setOrders] = useState<ProductionOrder[]>([])
  const [schedules, setSchedules] = useState<ScheduleSummary[]>([])
  const [bottlenecks, setBottlenecks] = useState<Bottleneck[]>([])
  const [activeTab, setActiveTab] = useState<'orders' | 'schedule' | 'bottlenecks'>('orders')
  const [loading, setLoading] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [ordersRes, schedulesRes, bottlenecksRes] = await Promise.all([
        fetch('/api/planning/orders'),
        fetch('/api/planning/schedules'),
        fetch('/api/planning/bottlenecks'),
      ])
      if (ordersRes.ok) {
        const data = await ordersRes.json()
        setOrders(data.orders || [])
      }
      if (schedulesRes.ok) {
        const data = await schedulesRes.json()
        setSchedules(
          (data.schedules || []).map((s: Record<string, unknown>) => ({
            id: s.id,
            name: s.name,
            entries: Array.isArray(s.entries) ? s.entries.length : 0,
            totalDurationHours: s.totalDurationHours,
            utilizationPercent: s.utilizationPercent,
            generatedAt: s.generatedAt,
          }))
        )
      }
      if (bottlenecksRes.ok) {
        const data = await bottlenecksRes.json()
        setBottlenecks(data.bottlenecks || [])
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 10000)
    return () => clearInterval(interval)
  }, [fetchData])

  const generateSchedule = async () => {
    setLoading(true)
    try {
      await fetch('/api/planning/schedules/generate', { method: 'POST' })
      await fetchData()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="planning-dashboard">
      <div className="planning-header">
        <h3>Production Planning</h3>
        <div className="planning-tabs">
          <button
            className={`planning-tab ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            Orders ({orders.length})
          </button>
          <button
            className={`planning-tab ${activeTab === 'schedule' ? 'active' : ''}`}
            onClick={() => setActiveTab('schedule')}
          >
            Schedule
          </button>
          <button
            className={`planning-tab ${activeTab === 'bottlenecks' ? 'active' : ''}`}
            onClick={() => setActiveTab('bottlenecks')}
          >
            Bottlenecks
          </button>
        </div>
      </div>

      {activeTab === 'orders' && (
        <div className="planning-orders">
          {orders.length === 0 ? (
            <div className="planning-empty">
              <p>No production orders yet.</p>
              <p className="planning-hint">Ask the chat to &quot;create a production order&quot; to get started.</p>
            </div>
          ) : (
            <div className="order-list">
              {orders.map((order) => (
                <div key={order.id} className="order-card">
                  <div className="order-header">
                    <span className="order-status">{STATUS_ICONS[order.status] || '❓'}</span>
                    <span className="order-product">{order.productName}</span>
                    <span
                      className="order-priority"
                      style={{ background: PRIORITY_COLORS[order.priority] }}
                    >
                      {order.priority}
                    </span>
                  </div>
                  <div className="order-details">
                    <span>Qty: {order.quantity}</span>
                    <span>Due: {new Date(order.dueDate).toLocaleDateString()}</span>
                    <span className="order-id">{order.id}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'schedule' && (
        <div className="planning-schedule">
          <button
            className="generate-schedule-btn"
            onClick={generateSchedule}
            disabled={loading || orders.filter((o) => o.status === 'pending').length === 0}
          >
            {loading ? 'Generating...' : '⚡ Generate Schedule'}
          </button>
          {schedules.length === 0 ? (
            <div className="planning-empty">
              <p>No schedules generated yet.</p>
            </div>
          ) : (
            <div className="schedule-list">
              {schedules.map((s) => (
                <div key={s.id} className="schedule-card">
                  <div className="schedule-name">{s.name}</div>
                  <div className="schedule-stats">
                    <span>{s.entries} tasks</span>
                    <span>{s.totalDurationHours}h duration</span>
                    <span>{s.utilizationPercent}% utilization</span>
                  </div>
                  <div className="schedule-bar">
                    <div
                      className="schedule-bar-fill"
                      style={{ width: `${Math.min(100, s.utilizationPercent)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'bottlenecks' && (
        <div className="planning-bottlenecks">
          {bottlenecks.length === 0 ? (
            <div className="planning-empty">
              <p>No bottleneck data available.</p>
            </div>
          ) : (
            <div className="bottleneck-list">
              {bottlenecks.map((b) => (
                <div
                  key={b.stationId}
                  className={`bottleneck-card ${b.utilization > 90 ? 'critical' : b.utilization > 70 ? 'warning' : 'healthy'}`}
                >
                  <div className="bottleneck-header">
                    <span className="bottleneck-station">{b.stationId}</span>
                    <span className="bottleneck-type">{b.stationType}</span>
                  </div>
                  <div className="bottleneck-bar-container">
                    <div className="bottleneck-bar">
                      <div
                        className="bottleneck-bar-fill"
                        style={{
                          width: `${Math.min(100, b.utilization)}%`,
                          background: b.utilization > 90 ? '#e74c3c' : b.utilization > 70 ? '#f39c12' : '#2ecc71',
                        }}
                      />
                    </div>
                    <span className="bottleneck-percent">{b.utilization}%</span>
                  </div>
                  <div className="bottleneck-recommendation">{b.recommendation}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

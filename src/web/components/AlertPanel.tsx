/**
 * AlertPanel — displays active alerts and overall twin health status.
 * Polls the alerts API for real-time visibility into anomalies.
 */
import { useEffect, useState, useCallback } from 'react'

interface ActiveAlert {
  id: string
  ruleId: string
  twinId: string
  property: string
  severity: 'warning' | 'critical'
  message: string
  value: number
  threshold: number
  triggeredAt: string
  acknowledged: boolean
}

interface HealthEntry {
  twinId: string
  status: 'healthy' | 'warning' | 'critical'
  activeAlerts: number
}

export function AlertPanel() {
  const [alerts, setAlerts] = useState<ActiveAlert[]>([])
  const [healthMap, setHealthMap] = useState<HealthEntry[]>([])
  const [loading, setLoading] = useState(false)

  const fetchAlerts = useCallback(async () => {
    try {
      const [alertRes, healthRes] = await Promise.all([
        fetch('/api/alerts'),
        fetch('/api/health/twins'),
      ])
      if (alertRes.ok) {
        const data = await alertRes.json()
        setAlerts(data.alerts || [])
      }
      if (healthRes.ok) {
        const data = await healthRes.json()
        setHealthMap(data.statuses || [])
      }
    } catch {
      // ignore fetch errors
    }
  }, [])

  useEffect(() => {
    fetchAlerts()
    const interval = setInterval(fetchAlerts, 5000)
    return () => clearInterval(interval)
  }, [fetchAlerts])

  const acknowledge = async (alertId: string) => {
    setLoading(true)
    try {
      await fetch(`/api/alerts/${alertId}/acknowledge`, { method: 'POST' })
      await fetchAlerts()
    } finally {
      setLoading(false)
    }
  }

  const criticals = alerts.filter((a) => a.severity === 'critical' && !a.acknowledged)
  const warnings = alerts.filter((a) => a.severity === 'warning' && !a.acknowledged)
  const unhealthy = healthMap.filter((h) => h.status !== 'healthy')

  const hasIssues = criticals.length > 0 || warnings.length > 0

  return (
    <div className="alert-panel">
      <div className="alert-header">
        <h3>Alerts & Health</h3>
        <div className="alert-summary">
          {criticals.length > 0 && (
            <span className="alert-badge critical">{criticals.length} critical</span>
          )}
          {warnings.length > 0 && (
            <span className="alert-badge warning">{warnings.length} warning</span>
          )}
          {!hasIssues && <span className="alert-badge healthy">All healthy</span>}
        </div>
      </div>

      {/* Active alerts */}
      {hasIssues && (
        <div className="alert-list">
          {[...criticals, ...warnings].map((alert) => (
            <div key={alert.id} className={`alert-item ${alert.severity}`}>
              <div className="alert-item-header">
                <span className={`alert-severity ${alert.severity}`}>
                  {alert.severity === 'critical' ? '🔴' : '🟡'} {alert.severity.toUpperCase()}
                </span>
                <span className="alert-twin">{alert.twinId}</span>
              </div>
              <div className="alert-message">{alert.message}</div>
              <div className="alert-details">
                {alert.property}: {alert.value.toFixed(1)} (threshold: {alert.threshold})
              </div>
              <button
                className="alert-ack-btn"
                onClick={() => acknowledge(alert.id)}
                disabled={loading}
              >
                Acknowledge
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Health overview */}
      {unhealthy.length > 0 && (
        <div className="health-overview">
          <h4>Twin Health</h4>
          {unhealthy.map((h) => (
            <div key={h.twinId} className={`health-entry ${h.status}`}>
              <span className="health-dot">
                {h.status === 'critical' ? '🔴' : h.status === 'warning' ? '🟡' : '🟢'}
              </span>
              <span className="health-twin">{h.twinId}</span>
              <span className="health-alert-count">{h.activeAlerts} alert{h.activeAlerts !== 1 ? 's' : ''}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

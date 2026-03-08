import { useState, useEffect, useCallback } from "react";

interface OEEResult {
  oee: number;
  availability: number;
  performance: number;
  quality: number;
  breakdown: {
    plannedProductionTimeMin: number;
    actualRunTimeMin: number;
    idealCycleTimeSec: number;
    totalUnits: number;
    goodUnits: number;
    defectRate: number;
  };
  calculatedAt: string;
}

interface ThroughputReport {
  totalUnitsProduced: number;
  unitsPerHour: number;
  averageCycleTimeSec: number;
  peakThroughputHour: string;
  period: string;
  byStation: Array<{ stationId: string; units: number; utilization: number }>;
}

interface ShiftComparison {
  shift1: { name: string; throughputPerHour: number; oee: number; energyPerUnit: number; alertCount: number };
  shift2: { name: string; throughputPerHour: number; oee: number; energyPerUnit: number; alertCount: number };
  delta: { throughputDiff: number; oeeeDiff: number; energyDiff: number; winner: string; summary: string };
}

interface ManagerSummary {
  oee: OEEResult;
  throughput: ThroughputReport;
  activeAlerts: number;
  criticalAlerts: number;
  ordersCompleted: number;
  ordersTotal: number;
  topBottleneck: string | null;
  recommendations: string[];
  generatedAt: string;
}

type Persona = "engineer" | "manager" | "it-ot";

const API = import.meta.env.VITE_API_URL ?? "";

export default function KpiDashboard() {
  const [persona, setPersona] = useState<Persona>("engineer");
  const [oee, setOee] = useState<OEEResult | null>(null);
  const [throughput, setThroughput] = useState<ThroughputReport | null>(null);
  const [shifts, setShifts] = useState<ShiftComparison | null>(null);
  const [summary, setSummary] = useState<ManagerSummary | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [oeeRes, tpRes, shiftRes, sumRes] = await Promise.all([
        fetch(`${API}/api/kpi/oee`),
        fetch(`${API}/api/kpi/throughput`),
        fetch(`${API}/api/kpi/shifts`),
        fetch(`${API}/api/kpi/summary`),
      ]);
      if (oeeRes.ok) setOee(await oeeRes.json());
      if (tpRes.ok) setThroughput(await tpRes.json());
      if (shiftRes.ok) setShifts(await shiftRes.json());
      if (sumRes.ok) setSummary(await sumRes.json());
    } catch {
      /* silent — will retry on next tick */
    }
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 15000);
    return () => clearInterval(id);
  }, [fetchData]);

  // ─── Style helpers ─────────────────────────────────
  const card: React.CSSProperties = {
    background: "var(--bg-secondary, #1e1e1e)",
    border: "1px solid var(--border-color, #333)",
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
  };

  const oeeColor = (val: number) => (val >= 85 ? "#4caf50" : val >= 60 ? "#ff9800" : "#f44336");

  const gauge = (value: number, label: string, size = 80) => {
    const r = (size - 10) / 2;
    const c = Math.PI * 2 * r;
    const offset = c * (1 - value / 100);
    return (
      <div style={{ textAlign: "center", display: "inline-block", margin: "0 8px" }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#333" strokeWidth={5} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={oeeColor(value)}
            strokeWidth={5}
            strokeDasharray={c}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
          <text x="50%" y="50%" textAnchor="middle" dy="0.35em" fill="var(--text-primary, #e0e0e0)" fontSize={14} fontWeight={700}>
            {value}%
          </text>
        </svg>
        <div style={{ fontSize: 11, color: "var(--text-secondary, #aaa)", marginTop: 2 }}>{label}</div>
      </div>
    );
  };

  // ─── Persona tabs ──────────────────────────────────
  const personas: { key: Persona; label: string; icon: string }[] = [
    { key: "engineer", label: "Floor Engineer", icon: "🔧" },
    { key: "manager", label: "Operations Mgr", icon: "📊" },
    { key: "it-ot", label: "IT/OT", icon: "🖥️" },
  ];

  return (
    <div style={{ padding: 10, height: "100%", overflow: "auto" }}>
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {personas.map((p) => (
          <button
            key={p.key}
            onClick={() => setPersona(p.key)}
            style={{
              flex: 1,
              padding: "6px 4px",
              background: persona === p.key ? "var(--accent-color, #0078d4)" : "var(--bg-secondary, #1e1e1e)",
              color: persona === p.key ? "#fff" : "var(--text-primary, #e0e0e0)",
              border: `1px solid ${persona === p.key ? "var(--accent-color, #0078d4)" : "var(--border-color, #333)"}`,
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            {p.icon} {p.label}
          </button>
        ))}
      </div>

      {/* ─── OEE Gauges (all personas) ─── */}
      {oee && (
        <div style={{ ...card, textAlign: "center" }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>OEE Overview</div>
          {gauge(oee.oee, "OEE", 90)}
          {gauge(oee.availability, "Avail")}
          {gauge(oee.performance, "Perf")}
          {gauge(oee.quality, "Quality")}
        </div>
      )}

      {/* ─── Floor Engineer View ─── */}
      {persona === "engineer" && throughput && (
        <>
          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Throughput</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              <Stat label="Units/hr" value={throughput.unitsPerHour} />
              <Stat label="Total Units" value={throughput.totalUnitsProduced} />
              <Stat label="Avg Cycle" value={`${throughput.averageCycleTimeSec}s`} />
              <Stat label="Peak Hour" value={throughput.peakThroughputHour} />
            </div>
          </div>
          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Station Utilization</div>
            {throughput.byStation.length === 0 && (
              <div style={{ fontSize: 12, color: "var(--text-secondary, #aaa)" }}>No schedule data yet</div>
            )}
            {throughput.byStation.map((s) => (
              <div key={s.stationId} style={{ marginBottom: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                  <span>{s.stationId}</span>
                  <span>{s.utilization}%</span>
                </div>
                <div style={{ height: 6, background: "#333", borderRadius: 3 }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.min(100, s.utilization)}%`,
                      background: s.utilization > 90 ? "#f44336" : s.utilization > 70 ? "#ff9800" : "#4caf50",
                      borderRadius: 3,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ─── Operations Manager View ─── */}
      {persona === "manager" && summary && (
        <>
          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Executive Summary</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              <Stat label="Orders Done" value={`${summary.ordersCompleted}/${summary.ordersTotal}`} />
              <Stat label="Active Alerts" value={summary.activeAlerts} color={summary.criticalAlerts > 0 ? "#f44336" : undefined} />
              <Stat label="Critical" value={summary.criticalAlerts} color={summary.criticalAlerts > 0 ? "#f44336" : undefined} />
              <Stat label="Bottleneck" value={summary.topBottleneck || "None"} />
            </div>
          </div>
          {shifts && (
            <div style={card}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Shift Comparison</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, fontSize: 11 }}>
                <div style={{ fontWeight: 600 }}>{shifts.shift1.name.split(" (")[0]}</div>
                <div style={{ fontWeight: 600 }}>{shifts.shift2.name.split(" (")[0]}</div>
                <div>OEE: {shifts.shift1.oee}%</div>
                <div>OEE: {shifts.shift2.oee}%</div>
                <div>Units/hr: {shifts.shift1.throughputPerHour}</div>
                <div>Units/hr: {shifts.shift2.throughputPerHour}</div>
                <div>Energy: ${shifts.shift1.energyPerUnit}/unit</div>
                <div>Energy: ${shifts.shift2.energyPerUnit}/unit</div>
              </div>
              <div style={{ fontSize: 11, color: "var(--text-secondary, #aaa)", marginTop: 6 }}>{shifts.delta.summary}</div>
            </div>
          )}
          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>AI Recommendations</div>
            {summary.recommendations.map((r, i) => (
              <div key={i} style={{ fontSize: 11, padding: "4px 0", borderBottom: "1px solid #333" }}>
                💡 {r}
              </div>
            ))}
          </div>
        </>
      )}

      {/* ─── IT/OT View ─── */}
      {persona === "it-ot" && oee && throughput && (
        <>
          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>System Metrics</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              <Stat label="Run Time" value={`${oee.breakdown.actualRunTimeMin}m`} />
              <Stat label="Planned" value={`${oee.breakdown.plannedProductionTimeMin}m`} />
              <Stat label="Defect Rate" value={`${oee.breakdown.defectRate}%`} color={oee.breakdown.defectRate > 5 ? "#f44336" : undefined} />
              <Stat label="Good Units" value={oee.breakdown.goodUnits} />
            </div>
          </div>
          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Raw KPI Data</div>
            <pre style={{ fontSize: 10, color: "var(--text-secondary, #aaa)", overflow: "auto", maxHeight: 200 }}>
              {JSON.stringify({ oee: oee.oee, throughput: throughput.unitsPerHour, stations: throughput.byStation.length }, null, 2)}
            </pre>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: "var(--text-secondary, #aaa)" }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: color || "var(--text-primary, #e0e0e0)" }}>{String(value)}</div>
    </div>
  );
}

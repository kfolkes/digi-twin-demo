import { useState, useEffect, useCallback } from "react";

interface InventoryItem {
  materialId: string;
  name: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  unit: string;
  reorderPoint: number;
  dailyConsumption: number;
  daysRemaining: number;
  status: "ok" | "low" | "critical" | "overstock";
}

interface Supplier {
  id: string;
  name: string;
  material: string;
  leadTimeDays: number;
  reliability: number;
  costPerUnit: number;
  status: "active" | "at-risk" | "inactive";
}

interface Shipment {
  id: string;
  supplierId: string;
  material: string;
  quantity: number;
  status: "ordered" | "in-transit" | "delivered" | "delayed";
  estimatedArrival: string;
}

interface SupplyChainHealth {
  overallStatus: "healthy" | "warning" | "critical";
  inventoryCritical: number;
  inventoryLow: number;
  shipmentsDelayed: number;
  suppliersAtRisk: number;
  daysUntilStockout: number | null;
  recommendations: string[];
}

type Tab = "inventory" | "suppliers" | "shipments";

const API = import.meta.env.VITE_API_URL ?? "";

const statusColors: Record<string, string> = {
  ok: "#4caf50",
  low: "#ff9800",
  critical: "#f44336",
  overstock: "#2196f3",
  active: "#4caf50",
  "at-risk": "#ff9800",
  inactive: "#666",
  ordered: "#2196f3",
  "in-transit": "#ff9800",
  delivered: "#4caf50",
  delayed: "#f44336",
  healthy: "#4caf50",
  warning: "#ff9800",
};

export default function SupplyChainView() {
  const [tab, setTab] = useState<Tab>("inventory");
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [health, setHealth] = useState<SupplyChainHealth | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [invRes, supRes, shipRes, healthRes] = await Promise.all([
        fetch(`${API}/api/supply-chain/inventory`),
        fetch(`${API}/api/supply-chain/suppliers`),
        fetch(`${API}/api/supply-chain/shipments`),
        fetch(`${API}/api/supply-chain/health`),
      ]);
      if (invRes.ok) setInventory(await invRes.json());
      if (supRes.ok) setSuppliers(await supRes.json());
      if (shipRes.ok) setShipments(await shipRes.json());
      if (healthRes.ok) setHealth(await healthRes.json());
    } catch {
      /* retry on next tick */
    }
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 15000);
    return () => clearInterval(id);
  }, [fetchData]);

  const card: React.CSSProperties = {
    background: "var(--bg-secondary, #1e1e1e)",
    border: "1px solid var(--border-color, #333)",
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  };

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "inventory", label: "Inventory", icon: "📦" },
    { key: "suppliers", label: "Suppliers", icon: "🏭" },
    { key: "shipments", label: "Shipments", icon: "🚚" },
  ];

  return (
    <div style={{ padding: 10, height: "100%", overflow: "auto" }}>
      {/* ─── Health banner ─── */}
      {health && (
        <div
          style={{
            ...card,
            borderLeft: `4px solid ${statusColors[health.overallStatus] || "#666"}`,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Supply Chain: {health.overallStatus.toUpperCase()}</div>
            {health.daysUntilStockout !== null && (
              <div
                style={{
                  fontSize: 11,
                  color: health.daysUntilStockout < 3 ? "#f44336" : "var(--text-secondary, #aaa)",
                }}
              >
                ⏱ {health.daysUntilStockout.toFixed(1)}d to stockout
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 6, fontSize: 11 }}>
            {health.inventoryCritical > 0 && <span style={{ color: "#f44336" }}>🔴 {health.inventoryCritical} critical</span>}
            {health.inventoryLow > 0 && <span style={{ color: "#ff9800" }}>🟡 {health.inventoryLow} low</span>}
            {health.shipmentsDelayed > 0 && <span style={{ color: "#f44336" }}>📦 {health.shipmentsDelayed} delayed</span>}
            {health.suppliersAtRisk > 0 && <span style={{ color: "#ff9800" }}>⚠ {health.suppliersAtRisk} at-risk</span>}
          </div>
        </div>
      )}

      {/* ─── Tab buttons ─── */}
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flex: 1,
              padding: "6px 4px",
              background: tab === t.key ? "var(--accent-color, #0078d4)" : "var(--bg-secondary, #1e1e1e)",
              color: tab === t.key ? "#fff" : "var(--text-primary, #e0e0e0)",
              border: `1px solid ${tab === t.key ? "var(--accent-color, #0078d4)" : "var(--border-color, #333)"}`,
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ─── Inventory tab ─── */}
      {tab === "inventory" &&
        inventory.map((item) => (
          <div key={item.materialId} style={{ ...card, borderLeft: `3px solid ${statusColors[item.status]}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{item.name}</div>
              <span
                style={{
                  fontSize: 10,
                  padding: "2px 6px",
                  borderRadius: 4,
                  background: statusColors[item.status] + "22",
                  color: statusColors[item.status],
                  fontWeight: 600,
                }}
              >
                {item.status.toUpperCase()}
              </span>
            </div>
            <div style={{ marginTop: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                <span>
                  {item.currentStock} / {item.maxStock} {item.unit}
                </span>
                <span>{item.daysRemaining}d remaining</span>
              </div>
              <div style={{ height: 6, background: "#333", borderRadius: 3, marginTop: 4 }}>
                <div
                  style={{
                    height: "100%",
                    width: `${Math.min(100, (item.currentStock / item.maxStock) * 100)}%`,
                    background: statusColors[item.status],
                    borderRadius: 3,
                  }}
                />
              </div>
              <div style={{ fontSize: 10, color: "var(--text-secondary, #aaa)", marginTop: 4 }}>
                Consumption: {item.dailyConsumption} {item.unit}/day | Reorder at: {item.reorderPoint}
              </div>
            </div>
          </div>
        ))}

      {/* ─── Suppliers tab ─── */}
      {tab === "suppliers" &&
        suppliers.map((sup) => (
          <div key={sup.id} style={{ ...card, borderLeft: `3px solid ${statusColors[sup.status]}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{sup.name}</div>
              <span
                style={{
                  fontSize: 10,
                  padding: "2px 6px",
                  borderRadius: 4,
                  background: statusColors[sup.status] + "22",
                  color: statusColors[sup.status],
                  fontWeight: 600,
                }}
              >
                {sup.status}
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginTop: 6, fontSize: 11 }}>
              <div>Material: {sup.material}</div>
              <div>Lead time: {sup.leadTimeDays}d</div>
              <div>Reliability: {sup.reliability}%</div>
              <div>Cost: ${sup.costPerUnit}/unit</div>
            </div>
            <div style={{ marginTop: 4 }}>
              <div style={{ height: 4, background: "#333", borderRadius: 2 }}>
                <div
                  style={{
                    height: "100%",
                    width: `${sup.reliability}%`,
                    background: sup.reliability > 90 ? "#4caf50" : sup.reliability > 80 ? "#ff9800" : "#f44336",
                    borderRadius: 2,
                  }}
                />
              </div>
            </div>
          </div>
        ))}

      {/* ─── Shipments tab ─── */}
      {tab === "shipments" && (
        <>
          {shipments.length === 0 && (
            <div style={{ ...card, textAlign: "center", fontSize: 12, color: "var(--text-secondary, #aaa)" }}>
              No active shipments
            </div>
          )}
          {shipments.map((ship) => (
            <div key={ship.id} style={{ ...card, borderLeft: `3px solid ${statusColors[ship.status]}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{ship.material}</div>
                <span
                  style={{
                    fontSize: 10,
                    padding: "2px 6px",
                    borderRadius: 4,
                    background: statusColors[ship.status] + "22",
                    color: statusColors[ship.status],
                    fontWeight: 600,
                  }}
                >
                  {ship.status}
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginTop: 6, fontSize: 11 }}>
                <div>Qty: {ship.quantity}</div>
                <div>ID: {ship.id}</div>
                <div>
                  ETA: {new Date(ship.estimatedArrival).toLocaleDateString()}
                </div>
                <div>Supplier: {ship.supplierId}</div>
              </div>
            </div>
          ))}
        </>
      )}

      {/* ─── Recommendations ─── */}
      {health && health.recommendations.length > 0 && (
        <div style={{ ...card, marginTop: 4 }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Recommendations</div>
          {health.recommendations.map((r, i) => (
            <div key={i} style={{ fontSize: 11, padding: "3px 0", borderBottom: "1px solid #333" }}>
              💡 {r}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

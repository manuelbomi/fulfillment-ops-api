import type { WarehouseCapacity as WarehouseCapacityPoint } from "../types";

interface Props {
  warehouses: WarehouseCapacityPoint[];
  loading: boolean;
  error: string | null;
}

function utilizationStatus(pct: number): "good" | "warning" | "critical" {
  if (pct >= 100) return "critical";
  if (pct >= 80) return "warning";
  return "good";
}

export function WarehouseCapacity({ warehouses, loading, error }: Props) {
  if (loading) return <p role="status">Loading warehouse capacity…</p>;
  if (error) return <p role="alert">Failed to load warehouse capacity: {error}</p>;

  return (
    <ul className="capacity-list">
      {warehouses.map((w) => {
        const status = utilizationStatus(w.utilizationPct);
        return (
          <li key={w.id} className="capacity-row">
            <div className="capacity-row-header">
              <span className="capacity-name">{w.name}</span>
              <span className={`capacity-pct capacity-${status}`}>
                {w.utilizationPct.toFixed(0)}%
              </span>
            </div>
            <div
              className="capacity-bar-track"
              role="progressbar"
              aria-valuenow={Math.min(w.utilizationPct, 100)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${w.name} utilization`}
            >
              <div
                className={`capacity-bar-fill capacity-${status}`}
                style={{ width: `${Math.min(w.utilizationPct, 100)}%` }}
              />
            </div>
            <span className="capacity-detail">
              {w.activeOrders} active orders / {w.capacityUnits} capacity units
            </span>
          </li>
        );
      })}
    </ul>
  );
}

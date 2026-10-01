import type { OrderListFilters, OrderStatus } from "../types";

const STATUSES: OrderStatus[] = [
  "pending",
  "processing",
  "picked",
  "packed",
  "shipped",
  "delivered",
  "cancelled",
];

interface Props {
  filters: OrderListFilters;
  onChange: (filters: OrderListFilters) => void;
}

export function OrderFilters({ filters, onChange }: Props) {
  return (
    <div className="filters" role="group" aria-label="Order filters">
      <label>
        Status
        <select
          data-testid="status-filter"
          value={filters.status ?? ""}
          onChange={(e) =>
            onChange({
              ...filters,
              page: 1,
              status: (e.target.value || undefined) as OrderStatus | undefined,
            })
          }
        >
          <option value="">All statuses</option>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </label>

      <label>
        SLA
        <select
          data-testid="sla-filter"
          value={filters.slaBreached === undefined ? "" : String(filters.slaBreached)}
          onChange={(e) =>
            onChange({
              ...filters,
              page: 1,
              slaBreached: e.target.value === "" ? undefined : e.target.value === "true",
            })
          }
        >
          <option value="">All orders</option>
          <option value="true">Breached only</option>
          <option value="false">On track only</option>
        </select>
      </label>
    </div>
  );
}

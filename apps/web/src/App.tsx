import { useState } from "react";
import "./App.css";
import { apiClient } from "./api/client";
import { OrderFilters } from "./components/OrderFilters";
import { OrdersTable } from "./components/OrdersTable";
import { OrderVolumeChart } from "./components/OrderVolumeChart";
import { Pagination } from "./components/Pagination";
import { WarehouseCapacity } from "./components/WarehouseCapacity";
import { useAsync } from "./hooks/useAsync";
import type { OrderListFilters } from "./types";

const PAGE_SIZE = 10;

export default function App() {
  const [filters, setFilters] = useState<OrderListFilters>({ page: 1, pageSize: PAGE_SIZE });

  const ordersState = useAsync(() => apiClient.listOrders(filters), [JSON.stringify(filters)]);
  const volumeState = useAsync(() => apiClient.getOrderVolume(90), []);
  const capacityState = useAsync(() => apiClient.listWarehouseCapacity(), []);

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Fulfillment Ops Dashboard</h1>
        <p className="app-subtitle">
          Order volume, SLA health, and warehouse capacity across the network.
        </p>
      </header>

      <main className="app-grid">
        <section className="panel panel-wide">
          <h2>Order volume &amp; SLA breaches (last 90 days)</h2>
          <OrderVolumeChart
            data={volumeState.data ?? []}
            loading={volumeState.loading}
            error={volumeState.error}
          />
        </section>

        <section className="panel">
          <h2>Warehouse capacity</h2>
          <WarehouseCapacity
            warehouses={capacityState.data ?? []}
            loading={capacityState.loading}
            error={capacityState.error}
          />
        </section>

        <section className="panel panel-wide">
          <h2>Orders</h2>
          <OrderFilters filters={filters} onChange={setFilters} />
          <OrdersTable
            orders={ordersState.data?.items ?? []}
            loading={ordersState.loading}
            error={ordersState.error}
          />
          {ordersState.data && (
            <Pagination
              page={ordersState.data.page}
              pageSize={ordersState.data.pageSize}
              total={ordersState.data.total}
              onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
            />
          )}
        </section>
      </main>
    </div>
  );
}

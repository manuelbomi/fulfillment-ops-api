import type { Order } from "../types";

interface Props {
  orders: Order[];
  loading: boolean;
  error: string | null;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function OrdersTable({ orders, loading, error }: Props) {
  if (loading) return <p role="status">Loading orders…</p>;
  if (error) return <p role="alert">Failed to load orders: {error}</p>;
  if (orders.length === 0) return <p>No orders match these filters.</p>;

  return (
    <table className="orders-table">
      <thead>
        <tr>
          <th>Order #</th>
          <th>Customer</th>
          <th>Status</th>
          <th>Order date</th>
          <th>Promised ship date</th>
          <th>SLA</th>
        </tr>
      </thead>
      <tbody>
        {orders.map((order) => (
          <tr key={order.id}>
            <td>{order.orderNumber}</td>
            <td>{order.customerName}</td>
            <td>
              <span className={`status-pill status-${order.status}`}>{order.status}</span>
            </td>
            <td>{formatDate(order.orderDate)}</td>
            <td>{formatDate(order.promisedShipDate)}</td>
            <td>
              {order.slaBreached ? (
                <span className="sla-breached">Breached</span>
              ) : (
                <span className="sla-ok">On track</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

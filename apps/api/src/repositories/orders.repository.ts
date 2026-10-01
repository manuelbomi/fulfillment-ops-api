import type { PoolClient } from "pg";
import { pool, query, withTransaction } from "../db/pool";
import type { CreateOrderInput, ListOrdersQuery } from "../schemas/order.schema";

export interface OrderRow {
  id: number;
  order_number: string;
  warehouse_id: number;
  customer_name: string;
  customer_email: string;
  status: string;
  order_date: Date;
  promised_ship_date: Date;
  shipped_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface OrderLineItemRow {
  id: number;
  order_id: number;
  sku_id: number;
  quantity: number;
  unit_price: string;
  sku_code?: string;
  sku_name?: string;
}

function generateOrderNumber(): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `ORD-${stamp}-${rand}`;
}

export const ordersRepository = {
  async list(filters: ListOrdersQuery): Promise<{ rows: OrderRow[]; total: number }> {
    const { page, pageSize, status, warehouseId, slaBreached } = filters;
    const offset = (page - 1) * pageSize;

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (status) {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }
    if (warehouseId) {
      params.push(warehouseId);
      conditions.push(`warehouse_id = $${params.length}`);
    }
    if (slaBreached === true) {
      conditions.push(
        `((shipped_at IS NOT NULL AND shipped_at > promised_ship_date)
          OR (shipped_at IS NULL AND status NOT IN ('cancelled') AND now() > promised_ship_date))`,
      );
    } else if (slaBreached === false) {
      conditions.push(
        `NOT ((shipped_at IS NOT NULL AND shipped_at > promised_ship_date)
          OR (shipped_at IS NULL AND status NOT IN ('cancelled') AND now() > promised_ship_date))`,
      );
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const listParams = [...params, pageSize, offset];
    const rowsResult = await query<OrderRow>(
      `SELECT * FROM orders ${whereClause}
       ORDER BY order_date DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      listParams,
    );

    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM orders ${whereClause}`,
      params,
    );

    return { rows: rowsResult.rows, total: Number(countResult.rows[0].count) };
  },

  async findById(id: number): Promise<OrderRow | null> {
    const result = await query<OrderRow>(`SELECT * FROM orders WHERE id = $1`, [id]);
    return result.rows[0] ?? null;
  },

  async findLineItems(orderId: number): Promise<OrderLineItemRow[]> {
    const result = await query<OrderLineItemRow>(
      `SELECT li.*, s.sku_code, s.name AS sku_name
       FROM order_line_items li
       JOIN skus s ON s.id = li.sku_id
       WHERE li.order_id = $1
       ORDER BY li.id ASC`,
      [orderId],
    );
    return result.rows;
  },

  async create(input: CreateOrderInput): Promise<OrderRow> {
    return withTransaction(async (client: PoolClient) => {
      const orderNumber = generateOrderNumber();
      const orderResult = await client.query<OrderRow>(
        `INSERT INTO orders (order_number, warehouse_id, customer_name, customer_email, promised_ship_date)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [orderNumber, input.warehouseId, input.customerName, input.customerEmail, input.promisedShipDate],
      );
      const order = orderResult.rows[0];

      for (const item of input.lineItems) {
        await client.query(
          `INSERT INTO order_line_items (order_id, sku_id, quantity, unit_price)
           VALUES ($1, $2, $3, $4)`,
          [order.id, item.skuId, item.quantity, item.unitPrice],
        );
      }

      return order;
    });
  },

  async updateStatus(id: number, status: string): Promise<OrderRow | null> {
    const shippedAtClause = status === "shipped" ? `, shipped_at = now()` : "";
    const result = await query<OrderRow>(
      `UPDATE orders SET status = $1, updated_at = now()${shippedAtClause} WHERE id = $2 RETURNING *`,
      [status, id],
    );
    return result.rows[0] ?? null;
  },

  async remove(id: number): Promise<boolean> {
    const result = await query(`DELETE FROM orders WHERE id = $1`, [id]);
    return (result.rowCount ?? 0) > 0;
  },

  /** Exposed for tests/seed scripts that need a raw pool connection. */
  pool,
};

import { query } from "../db/pool";
import type { CreateShipmentInput } from "../schemas/shipment.schema";

export interface ShipmentRow {
  id: number;
  order_id: number;
  warehouse_id: number;
  carrier: string;
  tracking_number: string;
  status: string;
  shipped_at: Date | null;
  delivered_at: Date | null;
  created_at: Date;
}

export const shipmentsRepository = {
  async list(
    page: number,
    pageSize: number,
    status?: string,
  ): Promise<{ rows: ShipmentRow[]; total: number }> {
    const offset = (page - 1) * pageSize;
    const whereClause = status ? `WHERE status = $3` : "";
    const listParams = status ? [pageSize, offset, status] : [pageSize, offset];

    const [rows, count] = await Promise.all([
      query<ShipmentRow>(
        `SELECT * FROM shipments ${whereClause} ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
        listParams,
      ),
      query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM shipments ${status ? "WHERE status = $1" : ""}`,
        status ? [status] : [],
      ),
    ]);
    return { rows: rows.rows, total: Number(count.rows[0].count) };
  },

  async findById(id: number): Promise<ShipmentRow | null> {
    const result = await query<ShipmentRow>(`SELECT * FROM shipments WHERE id = $1`, [id]);
    return result.rows[0] ?? null;
  },

  async create(input: CreateShipmentInput): Promise<ShipmentRow> {
    const result = await query<ShipmentRow>(
      `INSERT INTO shipments (order_id, warehouse_id, carrier, tracking_number)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [input.orderId, input.warehouseId, input.carrier, input.trackingNumber],
    );
    return result.rows[0];
  },

  async updateStatus(id: number, status: string): Promise<ShipmentRow | null> {
    const deliveredAtClause = status === "delivered" ? `, delivered_at = now()` : "";
    const shippedAtClause = status === "in_transit" ? `, shipped_at = COALESCE(shipped_at, now())` : "";
    const result = await query<ShipmentRow>(
      `UPDATE shipments SET status = $1${deliveredAtClause}${shippedAtClause} WHERE id = $2 RETURNING *`,
      [status, id],
    );
    return result.rows[0] ?? null;
  },
};

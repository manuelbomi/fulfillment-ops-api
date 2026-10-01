import { query } from "../db/pool";
import type { CreateWarehouseInput, UpdateWarehouseInput } from "../schemas/warehouse.schema";

export interface WarehouseRow {
  id: number;
  code: string;
  name: string;
  city: string;
  state: string;
  country: string;
  capacity_units: number;
  created_at: Date;
  updated_at: Date;
}

export const warehousesRepository = {
  async list(page: number, pageSize: number): Promise<{ rows: WarehouseRow[]; total: number }> {
    const offset = (page - 1) * pageSize;
    const [rows, count] = await Promise.all([
      query<WarehouseRow>(
        `SELECT * FROM warehouses ORDER BY name ASC LIMIT $1 OFFSET $2`,
        [pageSize, offset],
      ),
      query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM warehouses`),
    ]);
    return { rows: rows.rows, total: Number(count.rows[0].count) };
  },

  async findById(id: number): Promise<WarehouseRow | null> {
    const result = await query<WarehouseRow>(`SELECT * FROM warehouses WHERE id = $1`, [id]);
    return result.rows[0] ?? null;
  },

  async create(input: CreateWarehouseInput): Promise<WarehouseRow> {
    const result = await query<WarehouseRow>(
      `INSERT INTO warehouses (code, name, city, state, country, capacity_units)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [input.code, input.name, input.city, input.state, input.country, input.capacityUnits],
    );
    return result.rows[0];
  },

  async update(id: number, input: UpdateWarehouseInput): Promise<WarehouseRow | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const result = await query<WarehouseRow>(
      `UPDATE warehouses
       SET code = $1, name = $2, city = $3, state = $4, country = $5,
           capacity_units = $6, updated_at = now()
       WHERE id = $7
       RETURNING *`,
      [
        input.code ?? existing.code,
        input.name ?? existing.name,
        input.city ?? existing.city,
        input.state ?? existing.state,
        input.country ?? existing.country,
        input.capacityUnits ?? existing.capacity_units,
        id,
      ],
    );
    return result.rows[0];
  },

  async remove(id: number): Promise<boolean> {
    const result = await query(`DELETE FROM warehouses WHERE id = $1`, [id]);
    return (result.rowCount ?? 0) > 0;
  },
};

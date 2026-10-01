import { query } from "../db/pool";
import type { CreateSkuInput, UpdateSkuInput } from "../schemas/sku.schema";

export interface SkuRow {
  id: number;
  sku_code: string;
  name: string;
  category: string;
  unit_cost: string;
  weight_kg: string;
  created_at: Date;
  updated_at: Date;
}

export const skusRepository = {
  async list(
    page: number,
    pageSize: number,
    category?: string,
  ): Promise<{ rows: SkuRow[]; total: number }> {
    const offset = (page - 1) * pageSize;
    const whereClause = category ? `WHERE category = $3` : "";
    const params = category ? [pageSize, offset, category] : [pageSize, offset];

    const [rows, count] = await Promise.all([
      query<SkuRow>(
        `SELECT * FROM skus ${whereClause} ORDER BY name ASC LIMIT $1 OFFSET $2`,
        params,
      ),
      query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM skus ${category ? "WHERE category = $1" : ""}`,
        category ? [category] : [],
      ),
    ]);
    return { rows: rows.rows, total: Number(count.rows[0].count) };
  },

  async findById(id: number): Promise<SkuRow | null> {
    const result = await query<SkuRow>(`SELECT * FROM skus WHERE id = $1`, [id]);
    return result.rows[0] ?? null;
  },

  async create(input: CreateSkuInput): Promise<SkuRow> {
    const result = await query<SkuRow>(
      `INSERT INTO skus (sku_code, name, category, unit_cost, weight_kg)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [input.skuCode, input.name, input.category, input.unitCost, input.weightKg],
    );
    return result.rows[0];
  },

  async update(id: number, input: UpdateSkuInput): Promise<SkuRow | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const result = await query<SkuRow>(
      `UPDATE skus
       SET sku_code = $1, name = $2, category = $3, unit_cost = $4, weight_kg = $5, updated_at = now()
       WHERE id = $6
       RETURNING *`,
      [
        input.skuCode ?? existing.sku_code,
        input.name ?? existing.name,
        input.category ?? existing.category,
        input.unitCost ?? existing.unit_cost,
        input.weightKg ?? existing.weight_kg,
        id,
      ],
    );
    return result.rows[0];
  },

  async remove(id: number): Promise<boolean> {
    const result = await query(`DELETE FROM skus WHERE id = $1`, [id]);
    return (result.rowCount ?? 0) > 0;
  },
};

import { NotFoundError } from "../utils/AppError";
import { skusRepository, type SkuRow } from "../repositories/skus.repository";
import type { CreateSkuInput, UpdateSkuInput } from "../schemas/sku.schema";

function toDto(row: SkuRow) {
  return {
    id: row.id,
    skuCode: row.sku_code,
    name: row.name,
    category: row.category,
    unitCost: Number(row.unit_cost),
    weightKg: Number(row.weight_kg),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const skusService = {
  async list(page: number, pageSize: number, category?: string) {
    const { rows, total } = await skusRepository.list(page, pageSize, category);
    return { items: rows.map(toDto), total, page, pageSize };
  },

  async get(id: number) {
    const row = await skusRepository.findById(id);
    if (!row) throw new NotFoundError("Sku", id);
    return toDto(row);
  },

  async create(input: CreateSkuInput) {
    const row = await skusRepository.create(input);
    return toDto(row);
  },

  async update(id: number, input: UpdateSkuInput) {
    const row = await skusRepository.update(id, input);
    if (!row) throw new NotFoundError("Sku", id);
    return toDto(row);
  },

  async remove(id: number) {
    const deleted = await skusRepository.remove(id);
    if (!deleted) throw new NotFoundError("Sku", id);
  },
};

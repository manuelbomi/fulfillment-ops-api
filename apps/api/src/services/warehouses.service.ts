import { NotFoundError } from "../utils/AppError";
import { warehousesRepository, type WarehouseRow } from "../repositories/warehouses.repository";
import type { CreateWarehouseInput, UpdateWarehouseInput } from "../schemas/warehouse.schema";

function toDto(row: WarehouseRow) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    city: row.city,
    state: row.state,
    country: row.country,
    capacityUnits: row.capacity_units,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const warehousesService = {
  async list(page: number, pageSize: number) {
    const { rows, total } = await warehousesRepository.list(page, pageSize);
    return { items: rows.map(toDto), total, page, pageSize };
  },

  async get(id: number) {
    const row = await warehousesRepository.findById(id);
    if (!row) throw new NotFoundError("Warehouse", id);
    return toDto(row);
  },

  async create(input: CreateWarehouseInput) {
    const row = await warehousesRepository.create(input);
    return toDto(row);
  },

  async update(id: number, input: UpdateWarehouseInput) {
    const row = await warehousesRepository.update(id, input);
    if (!row) throw new NotFoundError("Warehouse", id);
    return toDto(row);
  },

  async remove(id: number) {
    const deleted = await warehousesRepository.remove(id);
    if (!deleted) throw new NotFoundError("Warehouse", id);
  },
};

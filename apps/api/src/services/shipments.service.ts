import { NotFoundError } from "../utils/AppError";
import { shipmentsRepository, type ShipmentRow } from "../repositories/shipments.repository";
import type { CreateShipmentInput } from "../schemas/shipment.schema";

function toDto(row: ShipmentRow) {
  return {
    id: row.id,
    orderId: row.order_id,
    warehouseId: row.warehouse_id,
    carrier: row.carrier,
    trackingNumber: row.tracking_number,
    status: row.status,
    shippedAt: row.shipped_at,
    deliveredAt: row.delivered_at,
    createdAt: row.created_at,
  };
}

export const shipmentsService = {
  async list(page: number, pageSize: number, status?: string) {
    const { rows, total } = await shipmentsRepository.list(page, pageSize, status);
    return { items: rows.map(toDto), total, page, pageSize };
  },

  async get(id: number) {
    const row = await shipmentsRepository.findById(id);
    if (!row) throw new NotFoundError("Shipment", id);
    return toDto(row);
  },

  async create(input: CreateShipmentInput) {
    const row = await shipmentsRepository.create(input);
    return toDto(row);
  },

  async updateStatus(id: number, status: string) {
    const row = await shipmentsRepository.updateStatus(id, status);
    if (!row) throw new NotFoundError("Shipment", id);
    return toDto(row);
  },
};

import { NotFoundError } from "../utils/AppError";
import { ordersRepository, type OrderRow } from "../repositories/orders.repository";
import type { CreateOrderInput, ListOrdersQuery } from "../schemas/order.schema";

/**
 * An order has breached its SLA if it already shipped after its promised
 * ship date, or if it's still unshipped (and not cancelled) past that date.
 * This mirrors the SQL predicate used in the analytics queries, exposed
 * here as a small pure function so it has unit-test coverage of its own.
 */
export function isSlaBreached(order: Pick<OrderRow, "status" | "shipped_at" | "promised_ship_date">, now: Date = new Date()): boolean {
  if (order.status === "cancelled") return false;
  const promised = new Date(order.promised_ship_date);
  if (order.shipped_at) {
    return new Date(order.shipped_at) > promised;
  }
  return now > promised;
}

function toDto(row: OrderRow) {
  return {
    id: row.id,
    orderNumber: row.order_number,
    warehouseId: row.warehouse_id,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    status: row.status,
    orderDate: row.order_date,
    promisedShipDate: row.promised_ship_date,
    shippedAt: row.shipped_at,
    slaBreached: isSlaBreached(row),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const ordersService = {
  async list(filters: ListOrdersQuery) {
    const { rows, total } = await ordersRepository.list(filters);
    return { items: rows.map(toDto), total, page: filters.page, pageSize: filters.pageSize };
  },

  async get(id: number) {
    const row = await ordersRepository.findById(id);
    if (!row) throw new NotFoundError("Order", id);
    const lineItems = await ordersRepository.findLineItems(id);
    return {
      ...toDto(row),
      lineItems: lineItems.map((li) => ({
        id: li.id,
        skuId: li.sku_id,
        skuCode: li.sku_code,
        skuName: li.sku_name,
        quantity: li.quantity,
        unitPrice: Number(li.unit_price),
      })),
    };
  },

  async create(input: CreateOrderInput) {
    const row = await ordersRepository.create(input);
    return toDto(row);
  },

  async updateStatus(id: number, status: string) {
    const row = await ordersRepository.updateStatus(id, status);
    if (!row) throw new NotFoundError("Order", id);
    return toDto(row);
  },

  async remove(id: number) {
    const deleted = await ordersRepository.remove(id);
    if (!deleted) throw new NotFoundError("Order", id);
  },
};

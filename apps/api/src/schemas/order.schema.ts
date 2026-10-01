import { z } from "zod";

export const orderStatuses = [
  "pending",
  "processing",
  "picked",
  "packed",
  "shipped",
  "delivered",
  "cancelled",
] as const;

export const orderLineItemInputSchema = z.object({
  skuId: z.number().int().positive(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
});

export const createOrderSchema = z.object({
  warehouseId: z.number().int().positive(),
  customerName: z.string().trim().min(2).max(160),
  customerEmail: z.string().trim().email(),
  promisedShipDate: z.coerce.date(),
  lineItems: z.array(orderLineItemInputSchema).min(1),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(orderStatuses),
});

export const listOrdersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(orderStatuses).optional(),
  warehouseId: z.coerce.number().int().positive().optional(),
  slaBreached: z.coerce.boolean().optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;

import { z } from "zod";

export const shipmentStatuses = ["label_created", "in_transit", "delivered", "exception"] as const;

export const createShipmentSchema = z.object({
  orderId: z.number().int().positive(),
  warehouseId: z.number().int().positive(),
  carrier: z.string().trim().min(2).max(60),
  trackingNumber: z.string().trim().min(4).max(60),
});

export const updateShipmentStatusSchema = z.object({
  status: z.enum(shipmentStatuses),
});

export const listShipmentsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(shipmentStatuses).optional(),
});

export type CreateShipmentInput = z.infer<typeof createShipmentSchema>;
export type UpdateShipmentStatusInput = z.infer<typeof updateShipmentStatusSchema>;

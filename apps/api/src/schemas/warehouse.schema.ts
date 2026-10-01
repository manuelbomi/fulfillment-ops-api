import { z } from "zod";

export const createWarehouseSchema = z.object({
  code: z.string().trim().min(2).max(16),
  name: z.string().trim().min(2).max(120),
  city: z.string().trim().min(1).max(120),
  state: z.string().trim().min(1).max(60),
  country: z.string().trim().min(2).max(60).default("US"),
  capacityUnits: z.number().int().positive(),
});

export const updateWarehouseSchema = createWarehouseSchema.partial();

export const listWarehousesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateWarehouseInput = z.infer<typeof createWarehouseSchema>;
export type UpdateWarehouseInput = z.infer<typeof updateWarehouseSchema>;

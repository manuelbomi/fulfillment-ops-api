import { z } from "zod";

export const createSkuSchema = z.object({
  skuCode: z.string().trim().min(2).max(32),
  name: z.string().trim().min(2).max(160),
  category: z.string().trim().min(2).max(60),
  unitCost: z.number().nonnegative(),
  weightKg: z.number().nonnegative(),
});

export const updateSkuSchema = createSkuSchema.partial();

export const listSkusQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  category: z.string().trim().min(1).optional(),
});

export type CreateSkuInput = z.infer<typeof createSkuSchema>;
export type UpdateSkuInput = z.infer<typeof updateSkuSchema>;

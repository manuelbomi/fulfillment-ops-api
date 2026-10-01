import { Router } from "express";
import { warehousesController } from "../controllers/warehouses.controller";
import { validate } from "../middleware/validate";
import {
  createWarehouseSchema,
  listWarehousesQuerySchema,
  updateWarehouseSchema,
} from "../schemas/warehouse.schema";
import { asyncHandler } from "../utils/asyncHandler";

export const warehousesRouter = Router();

warehousesRouter.get(
  "/",
  validate(listWarehousesQuerySchema, "query"),
  asyncHandler(warehousesController.list),
);
warehousesRouter.get("/:id", asyncHandler(warehousesController.get));
warehousesRouter.post(
  "/",
  validate(createWarehouseSchema),
  asyncHandler(warehousesController.create),
);
warehousesRouter.patch(
  "/:id",
  validate(updateWarehouseSchema),
  asyncHandler(warehousesController.update),
);
warehousesRouter.delete("/:id", asyncHandler(warehousesController.remove));

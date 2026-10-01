import { Router } from "express";
import { shipmentsController } from "../controllers/shipments.controller";
import { validate } from "../middleware/validate";
import {
  createShipmentSchema,
  listShipmentsQuerySchema,
  updateShipmentStatusSchema,
} from "../schemas/shipment.schema";
import { asyncHandler } from "../utils/asyncHandler";

export const shipmentsRouter = Router();

shipmentsRouter.get(
  "/",
  validate(listShipmentsQuerySchema, "query"),
  asyncHandler(shipmentsController.list),
);
shipmentsRouter.get("/:id", asyncHandler(shipmentsController.get));
shipmentsRouter.post(
  "/",
  validate(createShipmentSchema),
  asyncHandler(shipmentsController.create),
);
shipmentsRouter.patch(
  "/:id/status",
  validate(updateShipmentStatusSchema),
  asyncHandler(shipmentsController.updateStatus),
);

import { Router } from "express";
import { ordersController } from "../controllers/orders.controller";
import { validate } from "../middleware/validate";
import {
  createOrderSchema,
  listOrdersQuerySchema,
  updateOrderStatusSchema,
} from "../schemas/order.schema";
import { asyncHandler } from "../utils/asyncHandler";

export const ordersRouter = Router();

ordersRouter.get(
  "/",
  validate(listOrdersQuerySchema, "query"),
  asyncHandler(ordersController.list),
);
ordersRouter.get("/:id", asyncHandler(ordersController.get));
ordersRouter.post("/", validate(createOrderSchema), asyncHandler(ordersController.create));
ordersRouter.patch(
  "/:id/status",
  validate(updateOrderStatusSchema),
  asyncHandler(ordersController.updateStatus),
);
ordersRouter.delete("/:id", asyncHandler(ordersController.remove));

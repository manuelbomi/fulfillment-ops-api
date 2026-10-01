import { Router } from "express";
import { analyticsController } from "../controllers/analytics.controller";
import { asyncHandler } from "../utils/asyncHandler";

export const analyticsRouter = Router();

analyticsRouter.get("/orders-at-risk", asyncHandler(analyticsController.ordersAtRisk));
analyticsRouter.get(
  "/fulfillment-rate",
  asyncHandler(analyticsController.fulfillmentRateByWarehouse),
);
analyticsRouter.get("/slow-moving-skus", asyncHandler(analyticsController.slowMovingSkus));
analyticsRouter.get("/warehouse-capacity", asyncHandler(analyticsController.warehouseCapacity));
analyticsRouter.get("/order-volume", asyncHandler(analyticsController.orderVolumeTimeseries));

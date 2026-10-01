import type { Request, Response } from "express";
import { analyticsService } from "../services/analytics.service";

export const analyticsController = {
  async ordersAtRisk(req: Request, res: Response) {
    const limit = Number(req.query.limit ?? 50);
    res.json(await analyticsService.ordersAtRisk(limit));
  },

  async fulfillmentRateByWarehouse(req: Request, res: Response) {
    const weeks = Number(req.query.weeks ?? 12);
    res.json(await analyticsService.fulfillmentRateByWarehouse(weeks));
  },

  async slowMovingSkus(req: Request, res: Response) {
    const limit = Number(req.query.limit ?? 20);
    res.json(await analyticsService.slowMovingSkus(limit));
  },

  async warehouseCapacity(_req: Request, res: Response) {
    res.json(await analyticsService.warehouseCapacity());
  },

  async orderVolumeTimeseries(req: Request, res: Response) {
    const days = Number(req.query.days ?? 90);
    res.json(await analyticsService.orderVolumeTimeseries(days));
  },
};

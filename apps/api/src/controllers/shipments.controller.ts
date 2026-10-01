import type { Request, Response } from "express";
import { shipmentsService } from "../services/shipments.service";

export const shipmentsController = {
  async list(req: Request, res: Response) {
    const { page, pageSize, status } = req.query as unknown as {
      page: number;
      pageSize: number;
      status?: string;
    };
    res.json(await shipmentsService.list(page, pageSize, status));
  },

  async get(req: Request, res: Response) {
    const id = Number(req.params.id);
    res.json(await shipmentsService.get(id));
  },

  async create(req: Request, res: Response) {
    const shipment = await shipmentsService.create(req.body);
    res.status(201).json(shipment);
  },

  async updateStatus(req: Request, res: Response) {
    const id = Number(req.params.id);
    res.json(await shipmentsService.updateStatus(id, req.body.status));
  },
};

import type { Request, Response } from "express";
import { skusService } from "../services/skus.service";

export const skusController = {
  async list(req: Request, res: Response) {
    const { page, pageSize, category } = req.query as unknown as {
      page: number;
      pageSize: number;
      category?: string;
    };
    res.json(await skusService.list(page, pageSize, category));
  },

  async get(req: Request, res: Response) {
    const id = Number(req.params.id);
    res.json(await skusService.get(id));
  },

  async create(req: Request, res: Response) {
    const sku = await skusService.create(req.body);
    res.status(201).json(sku);
  },

  async update(req: Request, res: Response) {
    const id = Number(req.params.id);
    res.json(await skusService.update(id, req.body));
  },

  async remove(req: Request, res: Response) {
    const id = Number(req.params.id);
    await skusService.remove(id);
    res.status(204).send();
  },
};

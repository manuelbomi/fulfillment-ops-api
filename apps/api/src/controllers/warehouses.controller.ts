import type { Request, Response } from "express";
import { warehousesService } from "../services/warehouses.service";

export const warehousesController = {
  async list(req: Request, res: Response) {
    const { page, pageSize } = req.query as unknown as { page: number; pageSize: number };
    res.json(await warehousesService.list(page, pageSize));
  },

  async get(req: Request, res: Response) {
    const id = Number(req.params.id);
    res.json(await warehousesService.get(id));
  },

  async create(req: Request, res: Response) {
    const warehouse = await warehousesService.create(req.body);
    res.status(201).json(warehouse);
  },

  async update(req: Request, res: Response) {
    const id = Number(req.params.id);
    res.json(await warehousesService.update(id, req.body));
  },

  async remove(req: Request, res: Response) {
    const id = Number(req.params.id);
    await warehousesService.remove(id);
    res.status(204).send();
  },
};

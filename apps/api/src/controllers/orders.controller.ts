import type { Request, Response } from "express";
import { ordersService } from "../services/orders.service";
import type { ListOrdersQuery } from "../schemas/order.schema";

export const ordersController = {
  async list(req: Request, res: Response) {
    const filters = req.query as unknown as ListOrdersQuery;
    res.json(await ordersService.list(filters));
  },

  async get(req: Request, res: Response) {
    const id = Number(req.params.id);
    res.json(await ordersService.get(id));
  },

  async create(req: Request, res: Response) {
    const order = await ordersService.create(req.body);
    res.status(201).json(order);
  },

  async updateStatus(req: Request, res: Response) {
    const id = Number(req.params.id);
    res.json(await ordersService.updateStatus(id, req.body.status));
  },

  async remove(req: Request, res: Response) {
    const id = Number(req.params.id);
    await ordersService.remove(id);
    res.status(204).send();
  },
};

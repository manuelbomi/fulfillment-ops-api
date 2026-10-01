import { Router } from "express";
import { skusController } from "../controllers/skus.controller";
import { validate } from "../middleware/validate";
import { createSkuSchema, listSkusQuerySchema, updateSkuSchema } from "../schemas/sku.schema";
import { asyncHandler } from "../utils/asyncHandler";

export const skusRouter = Router();

skusRouter.get("/", validate(listSkusQuerySchema, "query"), asyncHandler(skusController.list));
skusRouter.get("/:id", asyncHandler(skusController.get));
skusRouter.post("/", validate(createSkuSchema), asyncHandler(skusController.create));
skusRouter.patch("/:id", validate(updateSkuSchema), asyncHandler(skusController.update));
skusRouter.delete("/:id", asyncHandler(skusController.remove));

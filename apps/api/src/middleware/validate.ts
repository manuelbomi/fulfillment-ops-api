import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";
import { ValidationError } from "../utils/AppError";

type Target = "body" | "query" | "params";

/**
 * Validates `req[target]` against a zod schema and replaces it with the
 * parsed (and coerced/defaulted) value. Any failure is surfaced as a 400
 * through the centralized error handler, so route handlers can assume
 * their input already matches the schema's inferred type.
 */
export function validate(schema: ZodSchema, target: Target = "body") {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      next(new ValidationError(result.error.flatten()));
      return;
    }
    (req as Record<Target, unknown>)[target] = result.data;
    next();
  };
}

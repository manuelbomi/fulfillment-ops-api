import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { validate } from "../../src/middleware/validate";
import { ValidationError } from "../../src/utils/AppError";

function mockRes(): Response {
  return {} as Response;
}

describe("validate middleware", () => {
  const schema = z.object({ name: z.string().min(1) });

  it("calls next with no error and replaces the target on success", () => {
    const req = { body: { name: "warehouse-1" } } as unknown as Request;
    const next = jest.fn() as NextFunction;

    validate(schema)(req, mockRes(), next);

    expect(next).toHaveBeenCalledWith();
    expect(req.body).toEqual({ name: "warehouse-1" });
  });

  it("calls next with a ValidationError on failure", () => {
    const req = { body: { name: "" } } as unknown as Request;
    const next = jest.fn() as NextFunction;

    validate(schema)(req, mockRes(), next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = (next as jest.Mock).mock.calls[0][0];
    expect(err).toBeInstanceOf(ValidationError);
  });
});

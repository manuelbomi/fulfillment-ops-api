/**
 * Base class for errors that should be translated into a specific HTTP
 * response by the centralized error handler, instead of a generic 500.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(message: string, statusCode: number, details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = true;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string | number) {
    super(id === undefined ? `${resource} not found` : `${resource} ${id} not found`, 404);
  }
}

export class ValidationError extends AppError {
  constructor(details: unknown) {
    super("Request validation failed", 400, details);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 409, details);
  }
}

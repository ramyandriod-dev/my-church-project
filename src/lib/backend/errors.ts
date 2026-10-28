/**
 * Backend Error Handling
 *
 * Standardized error classes for the service layer.
 * API routes catch these and convert to proper HTTP responses.
 */

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(
    code: string,
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    const msg = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super("NOT_FOUND", msg, 404);
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Authentication required") {
    super("UNAUTHORIZED", message, 401);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Insufficient permissions") {
    super("FORBIDDEN", message, 403);
    this.name = "ForbiddenError";
  }
}

export class ValidationError extends AppError {
  public readonly details: Record<string, string[]>;

  constructor(details: Record<string, string[]>) {
    super("VALIDATION_ERROR", "Request validation failed", 400);
    this.name = "ValidationError";
    this.details = details;
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super("CONFLICT", message, 409);
    this.name = "ConflictError";
  }
}

export class TenantError extends AppError {
  constructor(message: string = "Invalid tenant context") {
    super("TENANT_ERROR", message, 400);
    this.name = "TenantError";
  }
}

/**
 * Convert any error to a safe API response.
 * Never exposes internal error details to the client.
 */
export function toApiResponse(error: unknown) {
  if (error instanceof ValidationError) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    };
  }

  if (error instanceof AppError) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
    };
  }

  // Unknown errors — log internally, return generic message
  console.error("[Internal Error]", error);
  return {
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
    },
  };
}

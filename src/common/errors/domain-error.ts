/**
 * Base class for all business/domain errors. Domain and application layers throw
 * these framework-agnostic errors; the HTTP layer (AllExceptionsFilter) maps them
 * to responses. This keeps inner layers free of framework coupling (Clean Architecture).
 */
export abstract class DomainError extends Error {
  /** Stable, machine-readable error code (see docs/ERRORS.md). */
  abstract readonly code: string;
  /** Suggested HTTP status when surfaced over REST. */
  abstract readonly httpStatus: number;

  constructor(
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class NotFoundError extends DomainError {
  readonly httpStatus = 404;
  constructor(
    readonly code: string,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message, details);
  }
}

export class ConflictError extends DomainError {
  readonly httpStatus = 409;
  constructor(
    readonly code: string,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message, details);
  }
}

export class ValidationError extends DomainError {
  readonly httpStatus = 422;
  constructor(
    readonly code: string,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message, details);
  }
}

export class UnauthorizedError extends DomainError {
  readonly httpStatus = 401;
  constructor(
    readonly code: string,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message, details);
  }
}

export class ForbiddenError extends DomainError {
  readonly httpStatus = 403;
  constructor(
    readonly code: string,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message, details);
  }
}

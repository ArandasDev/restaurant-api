import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { DomainError } from '../errors/domain-error';

interface NormalizedError {
  status: number;
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Translates every thrown error into the canonical ErrorResponse envelope and
 * emits a structured log. Domain errors keep their code/status; framework
 * HttpExceptions are mapped; unknown errors become a safe 500 without leaking internals.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const normalized = this.normalize(exception);

    if (normalized.status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        { err: exception, path: request.url, code: normalized.code },
        'Unhandled exception',
      );
    } else {
      this.logger.warn(
        { path: request.url, code: normalized.code, status: normalized.status },
        normalized.message,
      );
    }

    response.status(normalized.status).json({
      statusCode: normalized.status,
      code: normalized.code,
      message: normalized.message,
      ...(normalized.details ? { details: normalized.details } : {}),
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private normalize(exception: unknown): NormalizedError {
    if (exception instanceof DomainError) {
      return {
        status: exception.httpStatus,
        code: exception.code,
        message: exception.message,
        details: exception.details,
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      const message =
        typeof res === 'string'
          ? res
          : (((res as Record<string, unknown>).message as string) ??
            exception.message);
      const details =
        typeof res === 'object' && res !== null
          ? (res as Record<string, unknown>)
          : undefined;
      return {
        status,
        code: this.httpStatusToCode(status),
        message: Array.isArray(message) ? message.join('; ') : message,
        details: Array.isArray((details as { message?: unknown })?.message)
          ? { fields: (details as { message: string[] }).message }
          : undefined,
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    };
  }

  private httpStatusToCode(status: number): string {
    const map: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'VALIDATION_ERROR',
      429: 'TOO_MANY_REQUESTS',
    };
    return map[status] ?? 'ERROR';
  }
}

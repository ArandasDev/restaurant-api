import { ApiProperty } from '@nestjs/swagger';

/**
 * Canonical error envelope returned by the API for every non-2xx response.
 * Documented once and reused across Swagger via @ApiResponse({ type: ErrorResponse }).
 */
export class ErrorResponse {
  @ApiProperty({ example: 400 })
  statusCode!: number;

  @ApiProperty({
    example: 'VALIDATION_ERROR',
    description: 'Stable machine-readable error code (see docs/ERRORS.md).',
  })
  code!: string;

  @ApiProperty({ example: 'Validation failed' })
  message!: string;

  @ApiProperty({
    required: false,
    description: 'Optional field-level or contextual details.',
    example: { fields: { email: 'must be a valid email' } },
  })
  details?: Record<string, unknown>;

  @ApiProperty({ example: '2026-07-30T12:00:00.000Z' })
  timestamp!: string;

  @ApiProperty({ example: '/api/v1/auth/login' })
  path!: string;
}

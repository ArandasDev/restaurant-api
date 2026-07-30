# Error catalog

Every non-2xx response uses a single, stable envelope so clients can handle errors
uniformly:

```json
{
  "statusCode": 409,
  "code": "TENANT_SLUG_TAKEN",
  "message": "The slug \"pizzaria\" is already in use",
  "details": { "slug": "pizzaria" },
  "timestamp": "2026-07-30T12:00:00.000Z",
  "path": "/api/v1/tenants"
}
```

- `statusCode` — HTTP status.
- `code` — stable, machine-readable identifier (below). Prefer branching on this.
- `message` — human-readable summary (do not parse).
- `details` — optional structured context (e.g. `fields` for validation errors).
- `timestamp`, `path` — for correlation/debugging.

Unexpected errors are returned as a generic `INTERNAL_SERVER_ERROR` (500) and never
leak internal details; the underlying error is logged server-side.

## Domain error codes

| Code                          | HTTP | Meaning                                                        |
| ----------------------------- | ---- | ------------------------------------------------------------- |
| `VALIDATION_ERROR`            | 422  | Request failed domain validation.                             |
| `BAD_REQUEST`                 | 400  | Request body/params failed input validation (`details.fields`). |
| `TENANT_REQUIRED`             | 422  | A tenant-scoped operation was called without `X-Tenant-Slug`. |
| `TENANT_SLUG_TAKEN`           | 409  | The requested tenant slug already exists.                     |
| `AUTH_INVALID_CREDENTIALS`    | 401  | Email/password combination is invalid.                        |
| `AUTH_INVALID_REFRESH_TOKEN`  | 401  | Refresh token is missing, expired, revoked or reused.         |
| `AUTH_INVALID_RESET_TOKEN`    | 422  | Password-reset token is invalid, expired or already used.     |
| `CONSUMER_EMAIL_TAKEN`        | 409  | An account with this email already exists in the tenant.      |
| `CONSUMER_NOT_FOUND`          | 404  | No consumer profile for the current user.                     |
| `ADDRESS_NOT_FOUND`           | 404  | Address does not exist for the consumer.                      |
| `ADDRESS_INCOMPLETE`          | 422  | Street fields missing and CEP lookup did not resolve them.    |
| `INVALID_CEP`                 | 422  | CEP is not 8 digits.                                          |
| `CEP_NOT_FOUND`               | 404  | CEP could not be resolved.                                    |
| `UNAUTHORIZED`                | 401  | Authentication is required or the access token is invalid.    |
| `FORBIDDEN`                   | 403  | Authenticated but lacking the required role (RBAC).           |
| `TOO_MANY_REQUESTS`           | 429  | Rate limit exceeded.                                          |
| `INTERNAL_SERVER_ERROR`       | 500  | Unexpected server error (details are not exposed).            |

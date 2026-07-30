/**
 * Environment defaults for the e2e suite. Points the app at the dedicated test
 * database and provides deterministic secrets. Values already set in the
 * environment (e.g. in CI) take precedence.
 */
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ??=
  'postgresql://restaurant:restaurant@localhost:5432/restaurant_test?schema=public';
process.env.JWT_ACCESS_SECRET ??= 'test-access-secret-0123456789-abcdefgh';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret-0123456789-abcdefgh';
process.env.JWT_ACCESS_TTL ??= '900';
process.env.PASSWORD_RESET_TTL ??= '3600';
process.env.CORS_ORIGINS ??= '*';
process.env.LOG_LEVEL ??= 'silent';
// Generous throttle so functional assertions are not rate-limited.
process.env.THROTTLE_LIMIT ??= '1000';
process.env.AUTH_THROTTLE_LIMIT ??= '1000';

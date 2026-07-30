/**
 * Strongly-typed configuration namespaces derived from validated env vars.
 * Consumed via ConfigService.get<AppConfig>('app'), etc.
 */
export interface AppConfig {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  globalPrefix: string;
  logLevel: string;
  corsOrigins: string[];
}

export interface JwtConfig {
  accessSecret: string;
  accessTtl: number;
  refreshSecret: string;
  refreshTtl: number;
  passwordResetTtl: number;
}

export interface ThrottleConfig {
  ttl: number;
  limit: number;
  authTtl: number;
  authLimit: number;
}

export interface ServicesConfig {
  viaCepBaseUrl: string;
}

export interface DatabaseConfig {
  url: string;
}

export const configuration = () => ({
  app: {
    nodeEnv: process.env.NODE_ENV as AppConfig['nodeEnv'],
    port: parseInt(process.env.PORT ?? '3000', 10),
    globalPrefix: process.env.API_GLOBAL_PREFIX ?? 'api',
    logLevel: process.env.LOG_LEVEL ?? 'info',
    corsOrigins: (process.env.CORS_ORIGINS ?? '*')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
  } satisfies AppConfig,
  database: {
    url: process.env.DATABASE_URL as string,
  } satisfies DatabaseConfig,
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET as string,
    accessTtl: parseInt(process.env.JWT_ACCESS_TTL ?? '900', 10),
    refreshSecret: process.env.JWT_REFRESH_SECRET as string,
    refreshTtl: parseInt(process.env.JWT_REFRESH_TTL ?? '1209600', 10),
    passwordResetTtl: parseInt(process.env.PASSWORD_RESET_TTL ?? '3600', 10),
  } satisfies JwtConfig,
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL ?? '60', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT ?? '120', 10),
    authTtl: parseInt(process.env.AUTH_THROTTLE_TTL ?? '60', 10),
    authLimit: parseInt(process.env.AUTH_THROTTLE_LIMIT ?? '10', 10),
  } satisfies ThrottleConfig,
  services: {
    viaCepBaseUrl: process.env.VIACEP_BASE_URL ?? 'https://viacep.com.br/ws',
  } satisfies ServicesConfig,
});

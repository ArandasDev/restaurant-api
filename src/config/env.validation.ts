import * as Joi from 'joi';

/**
 * Boot-time validation of environment variables (Security First: fail fast on
 * missing/weak secrets instead of starting in an insecure state).
 */
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  API_GLOBAL_PREFIX: Joi.string().default('api'),
  LOG_LEVEL: Joi.string()
    .valid('fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent')
    .default('info'),

  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgresql', 'postgres'] })
    .required(),

  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_TTL: Joi.number().positive().default(900),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_TTL: Joi.number().positive().default(1209600),
  PASSWORD_RESET_TTL: Joi.number().positive().default(3600),

  CORS_ORIGINS: Joi.string().default('*'),
  THROTTLE_TTL: Joi.number().positive().default(60),
  THROTTLE_LIMIT: Joi.number().positive().default(120),
  AUTH_THROTTLE_TTL: Joi.number().positive().default(60),
  AUTH_THROTTLE_LIMIT: Joi.number().positive().default(10),

  VIACEP_BASE_URL: Joi.string().uri().default('https://viacep.com.br/ws'),
});

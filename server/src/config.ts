import { z } from 'zod';

const environmentSchema = z.object({
  DATABASE_HOST: z.string().min(1),
  DATABASE_PORT: z.coerce.number().int().positive().default(3306),
  DATABASE_NAME: z.string().min(1),
  DATABASE_USER: z.string().min(1),
  DATABASE_PASSWORD: z.string(),
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['production', 'development', 'test']).default('development'),
  SESSION_SECRET: z.string().min(1),
  COOKIE_SECRET: z.string().min(1),
  PRESENTER_PIN_HASH: z.string().min(1),
  APP_ORIGIN: z.string().min(1), // e.g. https://feedback.thatumdonruea.com or http://localhost:5173
});

export type AppConfig = ReturnType<typeof getAppConfig>;
export type DatabaseConfig = AppConfig['db'];

export function getAppConfig(environment: NodeJS.ProcessEnv = process.env) {
  const value = environmentSchema.parse(environment);
  return {
    port: value.PORT,
    nodeEnv: value.NODE_ENV,
    sessionSecret: value.SESSION_SECRET,
    cookieSecret: value.COOKIE_SECRET,
    presenterPinHash: value.PRESENTER_PIN_HASH,
    appOrigin: value.APP_ORIGIN,
    db: {
      host: value.DATABASE_HOST,
      port: value.DATABASE_PORT,
      database: value.DATABASE_NAME,
      user: value.DATABASE_USER,
      password: value.DATABASE_PASSWORD,
      charset: 'utf8mb4',
    },
  } as const;
}

export function getDatabaseConfig(environment: NodeJS.ProcessEnv = process.env) {
  return getAppConfig(environment).db;
}


import { z } from 'zod';

const databaseEnvironmentSchema = z.object({
  DATABASE_HOST: z.string().min(1),
  DATABASE_PORT: z.coerce.number().int().positive().default(3306),
  DATABASE_NAME: z.string().min(1),
  DATABASE_USER: z.string().min(1),
  DATABASE_PASSWORD: z.string(),
});

export type DatabaseConfig = ReturnType<typeof getDatabaseConfig>;

export function getDatabaseConfig(environment: NodeJS.ProcessEnv = process.env) {
  const value = databaseEnvironmentSchema.parse(environment);
  return {
    host: value.DATABASE_HOST,
    port: value.DATABASE_PORT,
    database: value.DATABASE_NAME,
    user: value.DATABASE_USER,
    password: value.DATABASE_PASSWORD,
    charset: 'utf8mb4',
  } as const;
}

import { createPool, type Pool } from 'mysql2/promise';
import type { DatabaseConfig } from '../config';

export function createDatabasePool(config: DatabaseConfig): Pool {
  return createPool({
    ...config,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    namedPlaceholders: false,
  });
}

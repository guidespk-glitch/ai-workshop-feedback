import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { createConnection } from 'mysql2/promise';
import { getDatabaseConfig } from '../config';

export async function runInitialMigration(): Promise<void> {
  const connection = await createConnection({
    ...getDatabaseConfig(),
    multipleStatements: true,
  });

  try {
    const sql = await readFile(new URL('../../../migrations/001_initial.sql', import.meta.url), 'utf8');
    await connection.query(sql);
  } finally {
    await connection.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runInitialMigration()
    .then(() => console.log('Migration 001_initial.sql completed.'))
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : 'Migration failed.');
      process.exitCode = 1;
    });
}

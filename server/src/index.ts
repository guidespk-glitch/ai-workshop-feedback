import 'dotenv/config';
import { createServer } from 'node:http';
import session from 'express-session';
import MySQLStoreFactory from 'express-mysql-session';
import { getAppConfig } from './config';
import { createDatabasePool } from './db/pool';
import { SubmissionRepository } from './db/submissionRepository';
import { SubmissionService } from './services/submissionService';
import { ResultsService } from './services/resultsService';
import { PresenterAuthService } from './services/presenterAuthService';
import { createApp } from './app';

const MySQLStore = MySQLStoreFactory(session as any);

async function startServer() {
  const config = getAppConfig();
  const pool = createDatabasePool(config.db);

  // Initialize repository and services
  const repository = new SubmissionRepository(pool);
  const submissionService = new SubmissionService(repository);
  const resultsService = new ResultsService(repository);
  const presenterAuthService = new PresenterAuthService(config.presenterPinHash);

  // Initialize session store
  const sessionStore = new MySQLStore(
    {
      clearExpired: true,
      checkExpirationInterval: 900000, // 15 minutes
      expiration: 86400000, // 1 day
      createDatabaseTable: false, // Schema 001_initial.sql has presenter_sessions
      schema: {
        tableName: 'presenter_sessions',
        columnNames: {
          session_id: 'session_id',
          expires: 'expires',
          data: 'data',
        },
      },
    },
    pool as any
  );

  const app = createApp({
    config,
    submissionService,
    resultsService,
    presenterAuthService,
    sessionStore,
    dbPool: pool,
  });

  const httpServer = createServer(app);

  // Note: Socket.IO attachment will happen here in Task 5

  httpServer.listen(config.port, () => {
    console.log(`Server is running on port ${config.port} in ${config.nodeEnv} mode`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

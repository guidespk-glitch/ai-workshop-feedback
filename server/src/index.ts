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
import { attachRealtime } from './realtime/realtimeGateway';

const MySQLStore = MySQLStoreFactory(session as any);

class MockSubmissionRepository {
  private submissions: Array<{ tokenHash: string; input: any }> = [];

  async create(tokenHash: string, input: any) {
    if (this.submissions.find((s) => s.tokenHash === tokenHash)) {
      const err = new Error('Duplicate entry');
      (err as any).code = 'ER_DUP_ENTRY';
      throw err;
    }
    this.submissions.push({ tokenHash, input });
    return { id: this.submissions.length };
  }

  async getAggregateSource() {
    const totalSubmissions = this.submissions.length;
    const answers = this.submissions.flatMap((s) => s.input.answers);
    const emojiCountsMap: Record<string, number> = {};
    for (const s of this.submissions) {
      for (const e of s.input.emojis) {
        emojiCountsMap[e] = (emojiCountsMap[e] || 0) + 1;
      }
    }
    const emojiCounts = Object.entries(emojiCountsMap).map(([id, count]) => ({
      id: id as any,
      count,
    }));
    return {
      totalSubmissions,
      answers,
      emojiCounts,
    };
  }
}

async function startServer() {
  const config = getAppConfig();
  const isMock = process.env.MOCK_DATABASE === 'true';

  let pool: any = null;
  let repository: any = null;
  let sessionStore: any = undefined;

  if (isMock) {
    repository = new MockSubmissionRepository();
  } else {
    pool = createDatabasePool(config.db);
    repository = new SubmissionRepository(pool);
    sessionStore = new MySQLStore(
      {
        clearExpired: true,
        checkExpirationInterval: 900000,
        expiration: 86400000,
        createDatabaseTable: false,
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
  }

  const submissionService = new SubmissionService(repository);
  const resultsService = new ResultsService(repository);
  const presenterAuthService = new PresenterAuthService(config.presenterPinHash);

  // Build the session middleware to share with HTTP and Socket.IO
  const sessionMiddleware = session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    name: 'presenter_sid',
    cookie: {
      httpOnly: true,
      secure: config.nodeEnv === 'production' && !isMock,
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    },
  });

  const app = createApp({
    config,
    submissionService,
    resultsService,
    presenterAuthService,
    sessionMiddleware,
    dbPool: pool,
  });

  const httpServer = createServer(app);

  // Attach Socket.IO realtime server
  attachRealtime(httpServer, sessionMiddleware, resultsService);

  httpServer.listen(config.port, () => {
    console.log(`Server is running on port ${config.port} in ${config.nodeEnv} mode`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import rateLimit from 'express-rate-limit';
import crypto from 'node:crypto';
import type { AppConfig } from './config';
import type { SubmissionService } from './services/submissionService';
import type { ResultsService } from './services/resultsService';
import type { PresenterAuthService } from './services/presenterAuthService';
import { originGuard } from './middleware/originGuard';
import { createSubmissionSchema } from '../../shared/schemas';
import { publishResults } from './realtime/realtimeGateway';

interface AppDependencies {
  config: AppConfig;
  submissionService: SubmissionService;
  resultsService: ResultsService;
  presenterAuthService: PresenterAuthService;
  sessionStore?: session.Store;
  sessionMiddleware?: express.RequestHandler;
  dbPool?: {
    execute(sql: string): Promise<any>;
  };
}

export function createApp({
  config,
  submissionService,
  resultsService,
  presenterAuthService,
  sessionStore,
  sessionMiddleware,
  dbPool,
}: AppDependencies): express.Express {
  const app = express();

  // Trust proxy for secure cookies behind reverse proxy (Plesk)
  app.set('trust proxy', 1);

  // Security headers
  app.use(helmet());

  // Limit request body size
  app.use(express.json({ limit: '16kb' }));

  // Cookie parsing with signed secret
  app.use(cookieParser(config.cookieSecret));

  // Rate limiters
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: { error: 'กรอกรหัสผ่านผิดเกินกำหนด โปรดลองอีกครั้งในภายหลัง' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  const submissionLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    message: { error: 'ส่งข้อมูลบ่อยเกินไป โปรดลองอีกครั้งในภายหลัง' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Session configuration
  const sessionMiddlewareToUse = sessionMiddleware || session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: sessionStore, // Fallback to memory store if undefined
    name: 'presenter_sid',
    cookie: {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    },
  });
  app.use(sessionMiddlewareToUse);

  // Participant cookie generator middleware
  app.use((req, res, next) => {
    // Generate participant token if not present
    if (!req.signedCookies.participant) {
      const token = crypto.randomBytes(32).toString('hex');
      res.cookie('participant', token, {
        signed: true,
        httpOnly: true,
        secure: config.nodeEnv === 'production',
        sameSite: 'strict',
        maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
      });
      req.signedCookies.participant = token;
    }
    next();
  });

  // Health endpoint (Public, no originGuard or session required)
  app.get('/health', async (req, res) => {
    try {
      if (dbPool) {
        await dbPool.execute('SELECT 1');
      }
      res.status(200).json({ status: 'ok', database: 'connected' });
    } catch (error: any) {
      console.error('Health check failed:', error);
      res.status(500).json({ status: 'error', database: 'disconnected', error: error.message });
    }
  });

  // Reset version counter — increments each time presenter clears data
  let resetVersion = 0;

  // Apply Origin guard to all /api routes
  app.use('/api', originGuard(config.appOrigin));

  // Public endpoint for participants to check reset version
  app.get('/api/reset-version', (_req, res) => {
    res.json({ version: resetVersion });
  });

  // Public submission endpoint
  app.post('/api/submissions', submissionLimiter, async (req, res) => {
    try {
      const participantToken = req.signedCookies.participant;
      if (!participantToken) {
        res.status(400).json({ error: 'ไม่พบข้อมูลผู้เข้าร่วม' });
        return;
      }

      // Validate inputs with Zod
      const parsed = createSubmissionSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'ข้อมูลคำตอบไม่ถูกต้องหรือไม่ครบถ้วน' });
        return;
      }

      const result = await submissionService.submit(participantToken, parsed.data);

      // Async fetch and broadcast updated results to presenter
      resultsService.getResults()
        .then((snapshot) => publishResults(snapshot))
        .catch((err) => console.error('Failed to broadcast results:', err));

      res.status(201).json({ success: true, id: result.id });
    } catch (error: any) {
      if (error.code === 'ER_DUP_ENTRY' || error.message?.includes('Duplicate entry')) {
        res.status(409).json({ error: 'คุณได้ส่งคำตอบแล้วจากอุปกรณ์นี้' });
      } else {
        res.status(500).json({ error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' });
      }
    }
  });

  // Presenter Login
  app.post('/api/presenter/login', loginLimiter, async (req, res) => {
    try {
      const { pin } = req.body;
      console.log('[DEBUG] Login PIN attempt:', pin);
      if (!pin) {
        res.status(400).json({ error: 'โปรดระบุรหัสผ่าน (PIN)' });
        return;
      }

      const isValid = await presenterAuthService.verify(pin);
      console.log('[DEBUG] PIN validation result:', isValid);
      if (isValid) {
        (req.session as any).presenter = true;
        console.log('[DEBUG] Session set presenter=true, sessionID:', req.sessionID);
        res.status(200).json({ success: true });
      } else {
        res.status(401).json({ error: 'รหัสผ่าน (PIN) ไม่ถูกต้อง' });
      }
    } catch (error: any) {
      console.error('[DEBUG] Login error:', error);
      res.status(500).json({ error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' });
    }
  });

  // Presenter Logout
  app.post('/api/presenter/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        res.status(500).json({ error: 'ไม่สามารถออกจากระบบได้' });
      } else {
        res.clearCookie('presenter_sid');
        res.status(200).json({ success: true });
      }
    });
  });

  // Presenter Session Check
  app.get('/api/presenter/session', (req, res) => {
    const authenticated = !!(req.session as any).presenter;
    console.log('[DEBUG] Session check, sessionID:', req.sessionID, 'authenticated:', authenticated, 'session:', req.session);
    res.status(200).json({ authenticated });
  });

  // Presenter Results Endpoint (Guarded by session auth)
  app.get('/api/presenter/results', async (req, res) => {
    if (!(req.session as any).presenter) {
      res.status(401).json({ error: 'ไม่มีสิทธิ์เข้าถึงข้อมูลผู้นำเสนอ' });
      return;
    }

    try {
      const results = await resultsService.getResults();
      res.status(200).json(results);
    } catch (error) {
      res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูลผลรวม' });
    }
  });

  // Presenter Reset Endpoint (Guarded by session auth)
  app.post('/api/presenter/reset', async (req, res) => {
    if (!(req.session as any).presenter) {
      res.status(401).json({ error: 'ไม่มีสิทธิ์เข้าถึงข้อมูลผู้นำเสนอ' });
      return;
    }

    try {
      await submissionService.clearAllSubmissions();
      resetVersion++;
      const emptyResults = await resultsService.getResults();
      publishResults(emptyResults);
      res.status(200).json({ success: true, message: 'ล้างข้อมูลสำเร็จ', resetVersion });
    } catch (error) {
      console.error('Failed to reset submissions:', error);
      res.status(500).json({ error: 'เกิดข้อผิดพลาดในการล้างข้อมูล' });
    }
  });

  // Serve static assets in production
  if (config.nodeEnv === 'production') {
    const rootDir = path.dirname(fileURLToPath(import.meta.url)); // dist/server
    const publicDir = path.join(rootDir, '../public'); // dist/public

    app.use(express.static(publicDir));

    app.get(/.*/, (req, res, next) => {
      if (req.path.startsWith('/api/')) {
        next();
        return;
      }
      res.sendFile(path.join(publicDir, 'index.html'), (err) => {
        if (err) {
          // Fallback content if the index.html file does not exist during tests/builds
          res.status(200).send('<!DOCTYPE html><html><body>SPA Fallback</body></html>');
        }
      });
    });
  }

  return app;
}

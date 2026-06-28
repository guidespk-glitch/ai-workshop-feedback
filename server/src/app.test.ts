import { describe, expect, it, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createApp } from './app';
import type { AppConfig } from './config';
import type { SubmissionService } from './services/submissionService';
import type { ResultsService } from './services/resultsService';
import type { PresenterAuthService } from './services/presenterAuthService';

const mockConfig: AppConfig = {
  port: 3000,
  nodeEnv: 'test',
  sessionSecret: 'test-session-secret',
  cookieSecret: 'test-cookie-secret',
  presenterPinHash: 'test-hash',
  appOrigin: 'https://feedback.thatumdonruea.com',
  db: {
    host: 'localhost',
    port: 3306,
    database: 'test',
    user: 'test',
    password: 'test',
    charset: 'utf8mb4',
  },
};

describe('Express API App', () => {
  let submissionServiceMock: any;
  let resultsServiceMock: any;
  let presenterAuthServiceMock: any;
  let app: express.Express;

  beforeEach(() => {
    submissionServiceMock = {
      submit: vi.fn(),
      clearAllSubmissions: vi.fn(),
    };
    resultsServiceMock = {
      getResults: vi.fn().mockResolvedValue({
        totalSubmissions: 0,
        words: [],
        emojis: [],
        updatedAt: '2026-06-28T05:00:00Z',
      }),
    };
    presenterAuthServiceMock = {
      verify: vi.fn(),
    };

    app = createApp({
      config: mockConfig,
      submissionService: submissionServiceMock as unknown as SubmissionService,
      resultsService: resultsServiceMock as unknown as ResultsService,
      presenterAuthService: presenterAuthServiceMock as unknown as PresenterAuthService,
      sessionStore: undefined as any, // use memory store
    });
  });

  describe('Origin check and basic headers', () => {
    it('returns 403 Forbidden for API requests missing the Origin header', async () => {
      const response = await request(app)
        .post('/api/submissions')
        .send({ answers: ['a', 'b', 'c'], emojis: ['wow', 'fun'] });
      expect(response.status).toBe(403);
    });

    it('returns 403 Forbidden for API requests with non-matching Origin header', async () => {
      const response = await request(app)
        .post('/api/submissions')
        .set('Origin', 'https://malicious.com')
        .send({ answers: ['a', 'b', 'c'], emojis: ['wow', 'fun'] });
      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/submissions', () => {
    const validPayload = {
      answers: ['AI', 'สร้างสรรค์', 'นำไปใช้'],
      emojis: ['wow', 'fun'],
    };

    it('creates a participant cookie and returns 201 for a valid submission', async () => {
      submissionServiceMock.submit.mockResolvedValue({ id: 123 });

      const response = await request(app)
        .post('/api/submissions')
        .set('Origin', 'https://feedback.thatumdonruea.com')
        .send(validPayload);

      expect(response.status).toBe(201);
      expect(response.body).toEqual({ success: true, id: 123 });
      expect(response.headers['set-cookie'][0]).toContain('participant=');
      expect(submissionServiceMock.submit).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          answers: ['AI', 'สร้างสรรค์', 'นำไปใช้'],
          emojis: ['wow', 'fun'],
        }),
      );
    });

    it('returns 400 for validation errors', async () => {
      const response = await request(app)
        .post('/api/submissions')
        .set('Origin', 'https://feedback.thatumdonruea.com')
        .send({
          answers: ['short', ''],
          emojis: ['wow', 'wow'],
        });

      expect(response.status).toBe(400);
      expect(submissionServiceMock.submit).not.toHaveBeenCalled();
    });

    it('returns 409 Conflict if submission already exists', async () => {
      const dbError = new Error('Duplicate entry');
      (dbError as any).code = 'ER_DUP_ENTRY';
      submissionServiceMock.submit.mockRejectedValue(dbError);

      const response = await request(app)
        .post('/api/submissions')
        .set('Origin', 'https://feedback.thatumdonruea.com')
        .send(validPayload);

      expect(response.status).toBe(409);
      expect(response.body).toEqual({ error: 'คุณได้ส่งคำตอบแล้วจากอุปกรณ์นี้' });
    });
  });

  describe('Presenter API endpoints', () => {
    it('keeps presenter results private with 401', async () => {
      const response = await request(app)
        .get('/api/presenter/results')
        .set('Origin', 'https://feedback.thatumdonruea.com');
      expect(response.status).toBe(401);
    });

    it('returns session status authenticated = false when not logged in', async () => {
      const response = await request(app)
        .get('/api/presenter/session')
        .set('Origin', 'https://feedback.thatumdonruea.com');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ authenticated: false });
    });

    it('handles login, session state, fetching results, and logout', async () => {
      presenterAuthServiceMock.verify.mockResolvedValue(true);
      resultsServiceMock.getResults.mockResolvedValue({
        totalSubmissions: 1,
        words: [],
        emojis: [],
        updatedAt: '2026-06-28T05:00:00Z',
      });

      const agent = request.agent(app);

      // login
      const loginRes = await agent
        .post('/api/presenter/login')
        .set('Origin', 'https://feedback.thatumdonruea.com')
        .send({ pin: '123456' });
      expect(loginRes.status).toBe(200);
      expect(loginRes.body).toEqual({ success: true });

      // check session
      const sessionRes = await agent
        .get('/api/presenter/session')
        .set('Origin', 'https://feedback.thatumdonruea.com');
      expect(sessionRes.status).toBe(200);
      expect(sessionRes.body).toEqual({ authenticated: true });

      // check results
      const resultsRes = await agent
        .get('/api/presenter/results')
        .set('Origin', 'https://feedback.thatumdonruea.com');
      expect(resultsRes.status).toBe(200);
      expect(resultsRes.body.totalSubmissions).toBe(1);

      // logout
      const logoutRes = await agent
        .post('/api/presenter/logout')
        .set('Origin', 'https://feedback.thatumdonruea.com');
      expect(logoutRes.status).toBe(200);

      // check session again
      const sessionRes2 = await agent
        .get('/api/presenter/session')
        .set('Origin', 'https://feedback.thatumdonruea.com');
      expect(sessionRes2.status).toBe(200);
      expect(sessionRes2.body).toEqual({ authenticated: false });
    });

    it('keeps reset endpoint private with 401', async () => {
      const response = await request(app)
        .post('/api/presenter/reset')
        .set('Origin', 'https://feedback.thatumdonruea.com');
      expect(response.status).toBe(401);
    });

    it('allows authorized presenter to reset data', async () => {
      presenterAuthServiceMock.verify.mockResolvedValue(true);
      submissionServiceMock.clearAllSubmissions.mockResolvedValue(undefined);
      resultsServiceMock.getResults.mockResolvedValue({
        totalSubmissions: 0,
        words: [],
        emojis: [],
        updatedAt: '2026-06-28T05:00:00Z',
      });

      const agent = request.agent(app);

      // login
      await agent
        .post('/api/presenter/login')
        .set('Origin', 'https://feedback.thatumdonruea.com')
        .send({ pin: '123456' });

      // reset
      const resetRes = await agent
        .post('/api/presenter/reset')
        .set('Origin', 'https://feedback.thatumdonruea.com');
      expect(resetRes.status).toBe(200);
      expect(resetRes.body).toEqual({ success: true, message: 'ล้างข้อมูลสำเร็จ', resetVersion: 1 });
      expect(submissionServiceMock.clearAllSubmissions).toHaveBeenCalled();
    });
  });
});

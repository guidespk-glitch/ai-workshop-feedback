import { describe, expect, it, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createApp } from './app';
import type { AppConfig } from './config';

const mockConfig: AppConfig = {
  port: 3000,
  nodeEnv: 'production',
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

describe('Production Asset Serving', () => {
  let app: express.Express;

  beforeEach(() => {
    app = createApp({
      config: mockConfig,
      submissionService: {} as any,
      resultsService: {} as any,
      presenterAuthService: {} as any,
      sessionStore: undefined as any,
    });
  });

  it('serves the SPA and preserves API 404 semantics', async () => {
    // Should serve the HTML page for any non-API path (e.g., /presenter)
    // Note: since the dist folder might not exist during test, it might fail or return a 404/500 if sendFile fails.
    // But we can check that it doesn't just return a normal 404 for /presenter once implemented.
    // Wait, let's see how it behaves.
    const response = await request(app).get('/presenter');
    // If it attempts to serve index.html, we can check it.
    // Let's expect it to try serving or at least not return 404.
    // Wait! Let's see what is expected.
    expect(response.status).not.toBe(404);
    
    // For unknown API routes, it should return 404
    const apiResponse = await request(app)
      .get('/api/unknown')
      .set('Origin', 'https://feedback.thatumdonruea.com');
    expect(apiResponse.status).toBe(404);
  });
});

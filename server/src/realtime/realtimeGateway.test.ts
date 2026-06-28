import { describe, expect, it, beforeAll, afterAll, vi } from 'vitest';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import express from 'express';
import session from 'express-session';
import { io as ioClient, type Socket } from 'socket.io-client';
import request from 'supertest';
import { attachRealtime, publishResults } from './realtimeGateway';
import type { ResultsSnapshot } from '../../../shared/results';

describe('Socket.IO Realtime Gateway', () => {
  let server: any;
  let url: string;
  let sessionMiddleware: any;
  let resultsServiceMock: any;
  let sessionCookie: string = '';

  beforeAll(async () => {
    const app = express();
    sessionMiddleware = session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: false,
      name: 'presenter_sid',
      cookie: { httpOnly: true, secure: false, sameSite: 'strict' },
    });

    app.use(sessionMiddleware);

    // Mock login route to set session for testing auth
    app.post('/login', (req, res) => {
      (req.session as any).presenter = true;
      res.sendStatus(200);
    });

    server = createServer(app);
    resultsServiceMock = {};

    attachRealtime(server, sessionMiddleware, resultsServiceMock);

    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as AddressInfo).port;
    url = `http://localhost:${port}`;

    // Get a valid session cookie
    const response = await request(app).post('/login');
    sessionCookie = response.headers['set-cookie'][0];
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  const waitForConnectError = (socket: Socket): Promise<string> => {
    return new Promise((resolve) => {
      socket.on('connect_error', (err) => {
        resolve(err.message);
      });
    });
  };

  const waitForEvent = (socket: Socket, event: string, trigger: () => void): Promise<any> => {
    return new Promise((resolve) => {
      socket.on(event, (data) => {
        resolve(data);
      });
      trigger();
    });
  };

  it('rejects sockets without a presenter session', async () => {
    const socket = ioClient(url, {
      transports: ['websocket'],
      reconnection: false,
      forceNew: true,
    });

    await expect(waitForConnectError(socket)).resolves.toMatch(/unauthorized/i);
    socket.close();
  });

  it('publishes aggregate-only results to the presenter room', async () => {
    const socket = ioClient(url, {
      transports: ['websocket'],
      reconnection: false,
      forceNew: true,
      extraHeaders: {
        cookie: sessionCookie,
      },
    });

    await new Promise<void>((resolve, reject) => {
      socket.on('connect', resolve);
      socket.on('connect_error', reject);
    });

    const snapshot: ResultsSnapshot = {
      totalSubmissions: 5,
      words: [{ key: 'ai', label: 'AI', count: 5 }],
      emojis: [],
      updatedAt: '2026-06-28T05:00:00Z',
    };

    const payload = await waitForEvent(socket, 'results:update', () => {
      publishResults(snapshot);
    });

    expect(payload).toEqual(snapshot);
    expect(payload).not.toHaveProperty('participantToken');

    socket.close();
  });
});

import { Server } from 'socket.io';
import type { ResultsSnapshot } from '../../../shared/results';

let ioInstance: Server | null = null;

export function attachRealtime(server: any, sessionMiddleware: any, resultsService: any): Server {
  const io = new Server(server, {
    cors: {
      origin: true,
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  io.engine.use(sessionMiddleware);

  io.use((socket, next) => {
    const req = socket.request as any;
    if (req.session && req.session.presenter) {
      next();
    } else {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    socket.join('presenters');

    // Send initial results on connection if method exists
    if (typeof resultsService.getResults === 'function') {
      resultsService
        .getResults()
        .then((results: any) => {
          socket.emit('results:update', results);
        })
        .catch(() => {});
    }
  });

  ioInstance = io;
  return io;
}

export function publishResults(snapshot: ResultsSnapshot): void {
  if (ioInstance) {
    ioInstance.to('presenters').emit('results:update', snapshot);
  }
}

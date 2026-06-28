import { io, type Socket } from 'socket.io-client';
import type { ResultsSnapshot } from '../../../../shared/results';

export function connectResultsSocket(
  onUpdate: (data: ResultsSnapshot) => void,
  onStateChange: (state: 'connected' | 'reconnecting' | 'disconnected') => void
): Socket {
  // Connect to the same host
  const socket = io({
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 2000,
  });

  socket.on('connect', () => {
    onStateChange('connected');
  });

  socket.on('disconnect', () => {
    onStateChange('disconnected');
  });

  socket.on('reconnect_attempt', () => {
    onStateChange('reconnecting');
  });

  socket.on('results:update', (data: ResultsSnapshot) => {
    onUpdate(data);
  });

  return socket;
}

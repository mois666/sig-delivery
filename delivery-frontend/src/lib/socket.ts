import { io, Socket } from 'socket.io-client';
import { logger } from '@/lib/logger';

const URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';

export const socket: Socket = io(URL, {
  autoConnect: true,
  transports: ['websocket'],
  withCredentials: true,
});

// Depuración opcional en desarrollo
if (import.meta.env.DEV) {
  socket.on('connect', () => {
    logger.success('[Socket] Conectado exitosamente con ID:', socket.id);
  });

  socket.on('disconnect', (reason) => {
    logger.warning('[Socket] Desconectado:', reason);
  });

  socket.on('connect_error', (error) => {
    logger.error('[Socket] Error de conexión:', error.message);
  });
}

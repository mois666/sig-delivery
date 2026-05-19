import { create } from 'zustand';
import { socket } from '@/lib/socket';

interface SocketState {
  isConnected: boolean;
  initConnectionListener: () => void;
  disconnect: () => void;
}

export const useSocketStore = create<SocketState>((set) => ({
  isConnected: socket.connected,

  initConnectionListener: () => {
    // 1. Verificar estado actual
    set({ isConnected: socket.connected });

    // 2. Vincular eventos para cambios futuros
    socket.on('connect', () => {
      set({ isConnected: true });
      console.log('[Socket] Conectado exitosamente');
    });

    socket.on('disconnect', () => {
      set({ isConnected: false });
      console.log('[Socket] Desconectado');
    });
  },

  disconnect: () => {
    socket.disconnect();
    set({ isConnected: false });
  }
}));
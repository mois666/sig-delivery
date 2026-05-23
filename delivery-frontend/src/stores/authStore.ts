import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { appDB } from '@/api/appDB';
import { isAxiosError } from 'axios';
import { toast } from 'sonner';
import { ICity } from '@/interfaces/city-interface';

export type UserRole = 'super_admin' | 'admin' | 'driver' | 'client';

export interface User {
  id:     string;
  name:   string;
  phone:  string;
  email?: string;
  role:   UserRole;
  city:   ICity;   // objeto completo de la ciudad
  level?: number;
  totalPoints?: number;
  transport_type?: string;
}

interface AuthState {
  accessToken:     string | null;
  user:            User | null;
  isAuthenticated: boolean;
  isLoading:       boolean;
  error:           string | null;

  login:     (credentials: { phone: string; pin: string; city_id: number }) => Promise<boolean>;
  setAuth:   (user: User, token: string) => void;
  logout:    () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken:     null,
      user:            null,
      isAuthenticated: false,
      isLoading:       false,
      error:           null,

      setAuth: (user, token) => set({
        user,
        accessToken:     token,
        isAuthenticated: true,
        isLoading:       false,
        error:           null,
      }),

      login: async ({ phone, pin, city_id }) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await appDB.post('/auth/login', { phone, pin, city_id });

          // El backend devuelve user con la relación city completa
          const userWithCity: User = {
            ...data.user,
            // Si el backend ya trae city como objeto, lo usamos directamente.
            // Si no (por compatibilidad), creamos un objeto mínimo desde city_id.
            city: data.user.city ?? { id: city_id, name: '', country: 'Bolivia', currency: 'BOB' },
          };

          get().setAuth(userWithCity, data.accessToken);
          toast.success(`Bienvenido ${data.user.name} — ${userWithCity.city.name}`);
          return true;
        } catch (error) {
          set({ isLoading: false });
          if (isAxiosError(error)) {
            const message = error.response?.data.message || 'Error al iniciar sesión';
            set({ error: message });
            toast.error('Error', { description: message });
          }
          return false;
        }
      },

      logout: () => {
        set({
          accessToken:     null,
          user:            null,
          isAuthenticated: false,
          error:           null,
        });
        appDB.post('/auth/logout', {}, { withCredentials: true }).catch(() => {});
        localStorage.removeItem('auth-storage');
        window.location.reload();
      },

      clearError: () => set({ error: null }),
    }),
    {
      name:    'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user:            state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
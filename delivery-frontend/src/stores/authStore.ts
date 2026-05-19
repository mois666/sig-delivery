import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { appDB } from '@/api/appDB';
import { isAxiosError } from 'axios';
import { toast } from 'sonner';

export type UserRole = 'admin' | 'driver';

export interface User {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  city: string;
  avatar?: string;
  level: number;
  totalPoints: number;
}

interface AuthState {
  accessToken: string | null; // Solo en memoria (RAM)
  user: User | null;
  city: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Acciones
  login: (credentials: { phone: string; pin: string; city: string }) => Promise<boolean>;
  setAuth: (user: User, token: string, city: string) => void;
  toggleRole: () => void;
  logout: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null, // Inicia nulo siempre
      user: null,
      city: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Acción para actualizar sesión (usada por Login y AuthProvider)
      setAuth: (user, token, city) => set({
        user,
        accessToken: token,
        city,
        isAuthenticated: true,
        isLoading: false,
        error: null
      }),

      login: async ({ phone, pin, city }) => {
        set({ isLoading: true, error: null });
        try {
          // Petición al backend Laravel
          const { data } = await appDB.post("/auth/login", { phone, pin });

          // data.accessToken viene en el JSON, el refreshToken viene en Cookie HttpOnly
          get().setAuth(
            { ...data.user}, 
            data.accessToken,
            city // Proviene del formulario de login
          ); 

          toast.success(`Bienvenido ${data.user.name}`);
          return true;
        } catch (error) {
          set({ isLoading: false });
          if (isAxiosError(error)) {
            const message = error.response?.data.message || "Error al iniciar sesión";
            set({ error: message });
            toast.error("Error", { description: message });
          }
          return false;
        }
      },

      toggleRole: () => {
        const currentUser = get().user;
        if (!currentUser) return;
        const newRole: UserRole = currentUser.role === 'admin' ? 'driver' : 'admin';
        set({ user: { ...currentUser, role: newRole } });
      },

      logout: () => {
        // 1. Limpiar el estado local inmediatamente
        set({
          accessToken: null,
          user: null,
          city: null,
          isAuthenticated: false,
          error: null
        });

        // 2. Intentar avisar al servidor, pero usando una instancia limpia o 
        // simplemente ignorando si falla (ya que localmente ya cerramos sesión)
        appDB.post(`/auth/logout`, {}, {
          withCredentials: true
        }).catch(() => {
          console.log("Sesión finalizada solo localmente");
        });

        // Opcional: Limpiar el localStorage si quieres ser drástico
        localStorage.removeItem('auth-storage');
        window.location.reload();
      },
      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      // IMPORTANTE: Solo persistimos el usuario y el estado de auth.
      // El accessToken se excluye automáticamente al no estar en esta lista.
      partialize: (state) => ({
        user: state.user,
        city: state.city,
        isAuthenticated: state.isAuthenticated
      }),
    }
  )
);
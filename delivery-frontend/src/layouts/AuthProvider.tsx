import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { appDB } from '@/api/appDB';
import { Loader2 } from 'lucide-react';

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { setAuth, logout, isAuthenticated } = useAuthStore();
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    const verifySession = async () => {
      try {
        // Intentamos obtener un nuevo accessToken usando la cookie HttpOnly
        const { data } = await appDB.post('/auth/refresh');
        
        // Si el backend responde con éxito, restauramos el estado en memoria
        setAuth(data.user, data.accessToken);
      } catch (error) {
        // Si falla (cookie expirada o inexistente), limpiamos el estado
        console.log("Sesión no recuperable");
        logout();
      } finally {
        setIsVerifying(false);
      }
    };

    // Solo verificamos si el store dice que "estaba" autenticado 
    // pero no tenemos el accessToken en memoria (ej. tras un F5)
    if (isAuthenticated) {
      verifySession();
    } else {
      setIsVerifying(false);
    }
  }, []);

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground animate-pulse">Restaurando sesión...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
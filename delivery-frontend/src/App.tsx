import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { ThemeProvider } from "@/components/ThemeProvider";
import { MainLayout } from "@/layouts/MainLayout";
import Login from "./pages/Login";
import DriverHome from "./pages/DriverHome";
import ActiveDelivery from "./pages/ActiveDelivery";
import Ranking from "./pages/Ranking";
import Wallet from "./pages/Wallet";
import Profile from "./pages/Profile";
import AdminDashboard from "./pages/admin/AdminDashboard";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "./layouts/AuthProvider";
import AdminZone from "./pages/admin/AdminZone";
import { AdminOrders } from "./pages/admin/AdminOrders";
import { useSocketStore } from "./stores/socketStore";
import { useEffect } from "react";
import AdminUsers from "./pages/admin/AdminUsers";
import { AdminShowUser } from "./pages/admin/AdminShowUser";

const queryClient = new QueryClient();

// Protected route component
const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: ('super_admin' | 'admin' | 'driver' | 'client')[] }) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/home'} replace />;
  }

  return <>{children}</>;
};

const AppRoutes = () => (
  <MainLayout>
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Login />} />

      {/* Driver routes */}
      <Route path="/home" element={
        <ProtectedRoute allowedRoles={['driver']}>
          <DriverHome />
        </ProtectedRoute>
      } />
      <Route path="/active-delivery" element={
        <ProtectedRoute allowedRoles={['driver']}>
          <ActiveDelivery />
        </ProtectedRoute>
      } />
      <Route path="/wallet" element={
        <ProtectedRoute allowedRoles={['driver']}>
          <Wallet />
        </ProtectedRoute>
      } />

      {/* Admin routes */}
      <Route path="/admin" element={
        <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
          <AdminDashboard />
        </ProtectedRoute>
      } />

      <Route path="/users" element={
        <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
          <AdminUsers />
        </ProtectedRoute>
      } />
      <Route path="/users/:id" element={
        <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
          <AdminShowUser />
        </ProtectedRoute>
      } />
      {/* Zonas */}
      <Route path="/zone" element={
        <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
          <AdminZone />
        </ProtectedRoute>
      } />
      <Route path="/orders" element={
        <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
          <AdminOrders />
        </ProtectedRoute>
      } />

      {/* Shared routes */}
      <Route path="/ranking" element={
        <ProtectedRoute>
          <Ranking />
        </ProtectedRoute>
      } />
      <Route path="/profile" element={
        <ProtectedRoute>
          <Profile />
        </ProtectedRoute>
      } />

      {/* Catch-all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  </MainLayout>
);
// Componente para gestionar la conexión global
const SocketManager = () => {
  const { isAuthenticated } = useAuthStore();
  const { initConnectionListener } = useSocketStore();

  useEffect(() => {
    if (isAuthenticated) {
      console.log("🚀 Usuario autenticado, activando listeners de Reverb...");
      initConnectionListener();
    }
  }, [isAuthenticated, initConnectionListener]);

  return null; // No renderiza nada visualmente
};
const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      {/* El Provider verifica la sesión antes de cargar las rutas */}
      <AuthProvider>
        <SocketManager />
        <AppRoutes />
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Star, Bike, LogOut, ChevronRight, Settings, Bell, HelpCircle } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useOrderStore } from '@/stores/orderStore';
import { useSocketStore } from '@/stores/socketStore';
import LevelBadge from '@/components/LevelBadge';

import { Button } from '@heroui/react';

const Profile = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { completedOrders } = useOrderStore();
  const { disconnect } = useSocketStore();

  const handleLogout = () => {
    disconnect();
    logout();
    navigate('/');
  };

  const stats = [
    { label: 'Entregas', value: completedOrders.length + 68, icon: Bike },
    { label: 'Nivel', value: user?.level || 1, icon: Star },
    { label: 'Puntos', value: user?.totalPoints?.toLocaleString() || '0', icon: Star },
  ];

  const menuItems = [
    { label: 'Configuración', icon: Settings, action: () => {} },
    { label: 'Notificaciones', icon: Bell, action: () => {} },
    { label: 'Ayuda', icon: HelpCircle, action: () => {} },
  ];

  return (
    <div className="min-h-screen bg-background pb-24 safe-top">
      {/* Profile Header */}
      <div className="glass-card border-b border-border/50 px-4 py-8">
        <div className="flex flex-col items-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mb-4"
          >
            <LevelBadge level={user?.level || 1} totalPoints={user?.totalPoints || 0} size="lg" />
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-center"
          >
            <h1 className="text-2xl font-display font-bold text-foreground mb-1">
              {user?.name || 'Usuario'}
            </h1>
            <p className="text-sm text-muted-foreground">{user?.phone}</p>
            <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${
              user?.role === 'admin' || user?.role === 'super_admin'
                ? 'bg-accent/20 text-accent' 
                : user?.role === 'client'
                  ? 'bg-success/20 text-success'
                  : 'bg-primary/20 text-primary'
            }`}>
              {user?.role === 'super_admin' ? 'Super Admin' :
               user?.role === 'admin' ? 'Administrador' :
               user?.role === 'client' ? 'Cliente' : 'Repartidor'}
            </span>
          </motion.div>
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 py-6">
        <div className="grid grid-cols-3 gap-3">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.05 }}
              className="glass-card p-4 text-center"
            >
              <stat.icon className="w-5 h-5 text-primary mx-auto mb-2" />
              <p className="text-xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Menu */}
      <div className="px-4 space-y-2">
        {menuItems.map((item, index) => (
          <motion.button
            key={item.label}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + index * 0.05 }}
            onClick={item.action}
            className="w-full glass-card p-4 flex items-center gap-4 touch-target"
          >
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <item.icon className="w-5 h-5 text-muted-foreground" />
            </div>
            <span className="flex-1 text-left font-medium text-foreground">{item.label}</span>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </motion.button>
        ))}
      </div>

      {/* Logout */}
      <div className="px-4 mt-8">
        <Button
          onClick={handleLogout}
          variant="outline"
          className="w-full h-12 border-destructive/50 text-destructive hover:bg-destructive/10 touch-target"
        >
          <LogOut className="w-5 h-5 mr-2" />
          Cerrar sesión
        </Button>
      </div>

      
    </div>
  );
};

export default Profile;

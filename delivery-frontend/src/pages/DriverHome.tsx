import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, Star, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { socket } from '@/lib/socket';

// Stores e Interfaces
import { useAuthStore } from '@/stores/authStore';
import { useOrderStore } from '@/stores/orderStore';
import { useSocketStore } from '@/stores/socketStore';

import ChallengeCard from '@/components/ChallengeCard';
import LevelBadge from '@/components/LevelBadge';
import { cn } from '@/lib/utils';

const DriverHome = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { availableOrders, activeOrder, fetchOrders, acceptOrder, addOrderLocally } = useOrderStore();
  const { isConnected, initConnectionListener } = useSocketStore();

  // 1. Monitorear conexión y cargar datos iniciales
  useEffect(() => {
    // Inicializa el listener de estado de conexión
    initConnectionListener();
    // Carga las órdenes iniciales
    fetchOrders();
  }, []); // Se ejecuta una sola vez al cargar/actualizar la página

  // 2. Redirigir si hay una orden en curso
  useEffect(() => {
    if (activeOrder) navigate('/active-delivery');
  }, [activeOrder, navigate]);

  // 3. Listener de Tiempo Real (Socket.io)
  useEffect(() => {
    socket.on('order_published', (order: any) => {
      addOrderLocally(order);

      toast.success('¡Nueva orden!', {
        description: `Bs. ${order.delivery_fee} - ${order.pickup}`,
      });

      const audio = new Audio('/sounds/order.mp3');
      audio.play().catch(() => {
        toast.info("Toca la pantalla para activar alertas sonoras", {
          icon: "🔔"
        });
      });
    });

    return () => {
      socket.off('order_published');
    };
  }, [addOrderLocally]);

  const handleAcceptOrder = (orderId: string) => {
    if (user) acceptOrder(orderId, user.id);
  };

  return (
    <div className="min-h-screen bg-background pb-24 safe-top">
      <div className="sticky top-0 z-40 glass-card border-b border-border/50 px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LevelBadge level={user?.level || 1} totalPoints={user?.totalPoints || 0} size="sm" />
            <div>
              <h2 className="font-semibold text-foreground">Hola, {user?.name?.split(' ')[0]}</h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Star className="w-4 h-4 text-accent" />
                <span>{user?.totalPoints?.toLocaleString() || 0} pts</span>
              </div>
            </div>
          </div>

          <div className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors",
            isConnected ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'
          )}>
            {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            <span>{isConnected ? 'EN LÍNEA' : 'SIN CONEXIÓN'}</span>
          </div>
        </div>
      </div>

      <div className="px-4 py-6">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-warning" />
          <h3 className="font-display text-lg font-semibold text-foreground">Entregas Disponibles</h3>
          <span className="ml-auto text-sm font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
            {availableOrders.length}
          </span>
        </div>

        <AnimatePresence mode="popLayout">
          {availableOrders.length > 0 ? (
            <div className="space-y-4">
              {availableOrders.map((order, index) => (
                <motion.div
                  key={order.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChallengeCard order={order} onAccept={handleAcceptOrder} />
                </motion.div>
              ))}
            </div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-12 text-center border-dashed">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <Zap className="w-8 h-8 text-muted-foreground/30" />
              </div>
              <h4 className="font-semibold text-foreground mb-1">Esperando pedidos...</h4>
              <p className="text-xs text-muted-foreground">Aparecerán aquí automáticamente</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
    </div>
  );
};

export default DriverHome;
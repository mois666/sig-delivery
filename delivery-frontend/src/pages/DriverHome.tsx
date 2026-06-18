import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, Star, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { socket } from '@/lib/socket';

// Stores e Interfaces
import { useAuthStore } from '@/stores/authStore';
import { useOrderStore } from '@/stores/orderStore';
import { useSocketStore } from '@/stores/socketStore';
import { IAddOrder } from '@/interfaces/orders-interface';

// Componentes
import ChallengeCard from '@/components/ChallengeCard';
import LevelBadge from '@/components/LevelBadge';
import { FloatingBubble } from '@/components/FloatingBubble';
import { OrderDetailModal } from '@/components/modals/OrderDetailModal';
import { PreAssignModal } from '@/components/modals/PreAssignModal';
import { cn } from '@/lib/utils';

const DriverHome = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    availableOrders,
    activeOrder,
    preAssignedOrder,
    reservationExpiresAt,
    fetchAvailableOrders,
    preAssignOrder,
    startDelivery,
    abortDelivery,
    addOrderLocally,
    removeOrderLocally,
    setPreAssignedOrder,
    clearPreAssignment,
  } = useOrderStore();
  const { isConnected, initConnectionListener } = useSocketStore();

  // ─── Estado local de modales ───────────────────────────────────────────────
  const [detailOrder, setDetailOrder] = useState<IAddOrder | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showPreAssignModal, setShowPreAssignModal] = useState(false);
  const [isAcceptLoading, setIsAcceptLoading] = useState(false);
  const [isStartLoading, setIsStartLoading] = useState(false);
  const [isAbortLoading, setIsAbortLoading] = useState(false);

  // 1. Monitorear conexión y cargar datos iniciales
  useEffect(() => {
    initConnectionListener();
    fetchAvailableOrders();
  }, []);

  // 2. Redirigir si hay una orden activa (assigned)
  useEffect(() => {
    if (activeOrder) navigate('/active-delivery');
  }, [activeOrder, navigate]);

  // 3. Socket — Tiempo Real
  useEffect(() => {
    // Nueva orden publicada por admin
    socket.on('order_published', (order: any) => {
      addOrderLocally(order);
      toast.success('¡Nueva orden!', {
        description: `Bs. ${order.delivery_fee} — ${order.address_a || order.pickup}`,
      });
      const audio = new Audio('/sounds/order.mp3');
      audio.play().catch(() => {
        toast.info('Toca la pantalla para activar alertas sonoras', { icon: '🔔' });
      });
    });

    // Alguien más tomó un pedido que estaba disponible
    socket.on('order_pre_assigned', (order: any) => {
      // Si NO somos el driver reservador, sacarlo de nuestra lista
      if (order.reserved_driver_id !== user?.id) {
        removeOrderLocally(String(order.id));
      }
    });

    // Un pedido volvió a estar disponible (reserva expiró o fue abortada por otro)
    socket.on('order_activated', (order: any) => {
      // Verificar que no lo tenemos ya
      const state = useOrderStore.getState();
      const exists = state.availableOrders.some((o) => o.id === String(order.id));
      if (!exists) addOrderLocally(order);
    });

    // La reserva propia expiró (back la mandó a active)
    socket.on('order_reservation_expired', (payload: { order_id: number }) => {
      const state = useOrderStore.getState();
      if (state.preAssignedOrder && state.preAssignedOrder.id === String(payload.order_id)) {
        clearPreAssignment();
        setShowPreAssignModal(false);
        toast.warning('La reserva expiró. El pedido volvió a estar disponible.');
      }
    });

    // El pedido fue tomado definitivamente por alguien
    socket.on('order_assigned', (order: any) => {
      removeOrderLocally(String(order.id));
    });

    return () => {
      socket.off('order_published');
      socket.off('order_pre_assigned');
      socket.off('order_activated');
      socket.off('order_reservation_expired');
      socket.off('order_assigned');
    };
  }, [user?.id, addOrderLocally, removeOrderLocally, clearPreAssignment]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleCardAccept = (orderId: string) => {
    const order = availableOrders.find((o) => o.id === orderId);
    if (!order) return;
    setDetailOrder(order);
    setShowDetailModal(true);
  };

  const handleDetailAccept = async (order: IAddOrder) => {
    if (!user) return;
    setIsAcceptLoading(true);
    try {
      await preAssignOrder(order.id, user.id);
      setShowDetailModal(false);
      setShowPreAssignModal(true);
    } finally {
      setIsAcceptLoading(false);
    }
  };

  const handleStartDelivery = async (order: IAddOrder) => {
    if (!user) return;
    setIsStartLoading(true);
    try {
      await startDelivery(order.id, user.id);
      setShowPreAssignModal(false);
      // Redirige automáticamente por el useEffect de activeOrder
    } finally {
      setIsStartLoading(false);
    }
  };

  const handleAbortDelivery = async (order: IAddOrder) => {
    if (!user) return;
    setIsAbortLoading(true);
    try {
      await abortDelivery(order.id, user.id);
      setShowPreAssignModal(false);
    } finally {
      setIsAbortLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24 safe-top">

      {/* Header */}
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
            'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors',
            isConnected ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'
          )}>
            {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            <span>{isConnected ? 'EN LÍNEA' : 'SIN CONEXIÓN'}</span>
          </div>
        </div>
      </div>

      {/* Lista de pedidos */}
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
              {availableOrders.map((order) => (
                <motion.div
                  key={order.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChallengeCard order={order} onAccept={handleCardAccept} />
                </motion.div>
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-card p-12 text-center border-dashed"
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <Zap className="w-8 h-8 text-muted-foreground/30" />
              </div>
              <h4 className="font-semibold text-foreground mb-1">Esperando pedidos...</h4>
              <p className="text-xs text-muted-foreground">Aparecerán aquí automáticamente</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── Bolita flotante ─────────────────────────────────────────────────── */}
      {preAssignedOrder && !activeOrder && (
        <FloatingBubble
          mode="pre-assigned"
          expiresAt={reservationExpiresAt}
          duration={preAssignedOrder.duration}
          onClick={() => setShowPreAssignModal(true)}
        />
      )}

      {/* ─── Modal de detalle del pedido ─────────────────────────────────────── */}
      <OrderDetailModal
        order={detailOrder}
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        onAccept={handleDetailAccept}
        isLoading={isAcceptLoading}
      />

      {/* ─── Modal de pre-asignación ──────────────────────────────────────────── */}
      <PreAssignModal
        order={preAssignedOrder}
        isOpen={showPreAssignModal}
        onClose={() => setShowPreAssignModal(false)}
        onStart={handleStartDelivery}
        onAbort={handleAbortDelivery}
        isStartLoading={isStartLoading}
        isAbortLoading={isAbortLoading}
      />
    </div>
  );
};

export default DriverHome;
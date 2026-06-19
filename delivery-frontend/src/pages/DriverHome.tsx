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

// Componentes
import ChallengeCard from '@/components/ChallengeCard';
import LevelBadge from '@/components/LevelBadge';
import { FloatingBubble } from '@/components/FloatingBubble';
import { OrderDetailModal } from '@/components/modals/OrderDetailModal';
import { cn } from '@/lib/utils';

// Helper to parse duration string (HH:MM:SS or e.g., "25 min") to seconds
const parseDurationToSeconds = (durationStr: string | null | undefined): number => {
  if (!durationStr) return 0;
  const parts = durationStr.split(':');
  if (parts.length === 3) {
    const hh = parseInt(parts[0], 10) || 0;
    const mm = parseInt(parts[1], 10) || 0;
    const ss = parseInt(parts[2], 10) || 0;
    return hh * 3600 + mm * 60 + ss;
  }
  const match = durationStr.match(/(\d+)/);
  if (match) {
    return parseInt(match[0], 10) * 60;
  }
  return 15 * 60;
};

const DriverHome = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuthStore();
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
    clearPreAssignment,
    updateOrderStatus,
    completeOrder,
  } = useOrderStore();
  const { isConnected, initConnectionListener } = useSocketStore();

  // ─── Estado local de modales ───────────────────────────────────────────────
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isViewingActiveOrPreassigned, setIsViewingActiveOrPreassigned] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isAcceptLoading, setIsAcceptLoading] = useState(false);
  const [isStartLoading, setIsStartLoading] = useState(false);
  const [isAbortLoading, setIsAbortLoading] = useState(false);

  // 1. Monitorear conexión y cargar datos iniciales
  useEffect(() => {
    initConnectionListener();
    fetchAvailableOrders();
  }, []);

  // 2. Auto-abrir modal si ya hay un pedido activo o pre-asignado al cargar la página
  useEffect(() => {
    const state = useOrderStore.getState();
    if (state.activeOrder || state.preAssignedOrder) {
      setIsViewingActiveOrPreassigned(true);
      setShowDetailModal(true);
    }
  }, []);

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
      if (order.reserved_driver_id !== user?.id) {
        removeOrderLocally(String(order.id));
      }
    });

    // Un pedido volvió a estar disponible (reserva expiró o fue abortada por otro)
    socket.on('order_activated', (order: any) => {
      const state = useOrderStore.getState();
      const exists = state.availableOrders.some((o) => o.id === String(order.id));
      if (!exists) addOrderLocally(order);
    });

    // La reserva propia expiró (back la mandó a active)
    socket.on('order_reservation_expired', (payload: { order_id: number }) => {
      const state = useOrderStore.getState();
      if (state.preAssignedOrder && String(state.preAssignedOrder.id) === String(payload.order_id)) {
        clearPreAssignment();
        setShowDetailModal(false);
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
    setSelectedOrderId(orderId);
    setIsViewingActiveOrPreassigned(false);
    setShowDetailModal(true);
  };

  const handleDetailAccept = async (order: any) => {
    if (!user) return;
    setIsAcceptLoading(true);
    try {
      await preAssignOrder(order.id, user.id);
      setIsViewingActiveOrPreassigned(true);
      setSelectedOrderId(null);
    } finally {
      setIsAcceptLoading(false);
    }
  };

  const handleStartDelivery = async (order: any) => {
    if (!user) return;
    setIsStartLoading(true);
    try {
      await startDelivery(order.id, user.id);
      setIsViewingActiveOrPreassigned(true);
      setSelectedOrderId(null);
    } finally {
      setIsStartLoading(false);
    }
  };

  const handleAbortDelivery = async (order: any) => {
    if (!user) return;
    setIsAbortLoading(true);
    try {
      await abortDelivery(order.id, user.id);
      setShowDetailModal(false);
      setIsViewingActiveOrPreassigned(false);
      setSelectedOrderId(null);
    } finally {
      setIsAbortLoading(false);
    }
  };

  const handleCompleteOrder = async (orderId: string) => {
    try {
      const currentOrder = activeOrder || preAssignedOrder;
      const points = currentOrder?.reward_points ?? currentOrder?.points ?? 0;
      await completeOrder(orderId);
      if (user) {
        updateUser({ totalPoints: (user.totalPoints ?? 0) + points });
      }
    } catch (error) {
      console.error('Error completing order:', error);
    }
  };

  const handleBubbleClick = () => {
    setIsViewingActiveOrPreassigned(true);
    setSelectedOrderId(null);
    setShowDetailModal(true);
  };

  // Determinar qué orden pasar al modal
  let modalOrder = null;
  if (isViewingActiveOrPreassigned) {
    modalOrder = activeOrder || preAssignedOrder;
  } else if (selectedOrderId) {
    modalOrder = availableOrders.find((o) => o.id === selectedOrderId) || null;
  }

  // Calcular expiresAt para la bolita si está en carrera asignada
  let bubbleExpiresAt = reservationExpiresAt;
  if (activeOrder) {
    const collectedAt = activeOrder.assignments?.[0]?.status_metadata?.collected_at;
    if (collectedAt) {
      const durationSec = parseDurationToSeconds(activeOrder.duration);
      const expiresAtMs = new Date(collectedAt).getTime() + durationSec * 1000;
      bubbleExpiresAt = new Date(expiresAtMs).toISOString();
    }
  }

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
      {(preAssignedOrder || activeOrder) && (
        <FloatingBubble
          mode={activeOrder ? 'assigned' : 'pre-assigned'}
          expiresAt={activeOrder ? bubbleExpiresAt : reservationExpiresAt}
          duration={activeOrder ? activeOrder.duration : preAssignedOrder?.duration}
          onClick={handleBubbleClick}
          visible={!showDetailModal}
        />
      )}

      {/* ─── Modal de detalle del pedido ─────────────────────────────────────── */}
      <OrderDetailModal
        order={modalOrder}
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedOrderId(null);
          setIsViewingActiveOrPreassigned(false);
        }}
        onAccept={handleDetailAccept}
        onStart={handleStartDelivery}
        onAbort={handleAbortDelivery}
        onUpdateStatus={updateOrderStatus}
        onComplete={handleCompleteOrder}
        isLoading={isAcceptLoading}
        isStartLoading={isStartLoading}
        isAbortLoading={isAbortLoading}
      />
    </div>
  );
};

export default DriverHome;
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Clock, User, Phone, ChevronRight, CheckCircle,
  Star, XCircle, Package, Bike, AlertTriangle, DollarSign
} from 'lucide-react';
import { Button, Chip } from '@heroui/react';
import { useOrderStore } from '@/stores/orderStore';
import { useAuthStore } from '@/stores/authStore';
import StatusTimeline from '@/components/StatusTimeline';
import { toast } from 'sonner';

// ─── Etiquetas de estado ───────────────────────────────────────────────────────
const statusMessages: Record<string, { label: string; color: string }> = {
  collected:      { label: 'Recogido — Prepara la entrega', color: 'text-primary' },
  running:        { label: 'En camino al destino', color: 'text-warning' },
  arrived:        { label: 'Llegaste al punto de entrega', color: 'text-success' },
  delivered:      { label: '¡Entrega completada!', color: 'text-success' },
  'not-delivered': { label: 'No se pudo entregar', color: 'text-destructive' },
  // Fallbacks
  pending:        { label: 'Pendiente', color: 'text-muted-foreground' },
  active:         { label: 'Disponible', color: 'text-primary' },
  assigned:       { label: 'Asignado', color: 'text-primary' },
};

// ─── Componente ───────────────────────────────────────────────────────────────
const ActiveDelivery = () => {
  const navigate = useNavigate();
  const { activeOrder, updateOrderStatus, completeOrder } = useOrderStore();
  const { user, updateUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [showNotDeliveredConfirm, setShowNotDeliveredConfirm] = useState(false);

  if (!activeOrder) {
    navigate('/home');
    return null;
  }

  const currentStatus = activeOrder.status;
  const statusInfo = statusMessages[currentStatus] ?? { label: currentStatus, color: 'text-muted-foreground' };
  const rewardPts = (activeOrder as any).reward_points ?? (activeOrder as any).points ?? 0;

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleUpdateStatus = async (nextStatus: string) => {
    setIsLoading(true);
    try {
      await updateOrderStatus(activeOrder.id, nextStatus);
      const labels: Record<string, string> = {
        running:  '¡En camino! El cliente fue notificado.',
        arrived:  '¡Llegaste! Confirma la entrega cuando estés listo.',
      };
      if (labels[nextStatus]) toast.success(labels[nextStatus]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      await completeOrder(activeOrder.id);
      // Actualizar puntos localmente (el backend también lo hace)
      if (user) {
        updateUser({ totalPoints: (user.totalPoints ?? 0) + rewardPts });
      }
      toast.success('🎉 ¡Entrega completada!', {
        description: `+Bs ${Number((activeOrder as any).delivery_fee ?? 0).toFixed(2)} y +${rewardPts} puntos`,
      });
      navigate('/home');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotDelivered = async () => {
    setIsLoading(true);
    try {
      await updateOrderStatus(activeOrder.id, 'not-delivered');
      toast.warning('Pedido marcado como no entregado.', {
        description: 'El administrador será notificado.',
      });
      navigate('/home');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Botones dinámicos ─────────────────────────────────────────────────────
  const getActions = () => {
    switch (currentStatus) {
      case 'collected':
        return (
          <Button
            color="primary"
            className="w-full h-14 text-base font-bold rounded-2xl touch-target"
            onClick={() => handleUpdateStatus('running')}
            isLoading={isLoading}
            endContent={!isLoading && <Bike className="w-5 h-5 ml-1" />}
          >
            Salí a Entregar
          </Button>
        );

      case 'running':
        return (
          <Button
            color="warning"
            className="w-full h-14 text-base font-bold rounded-2xl touch-target"
            onClick={() => handleUpdateStatus('arrived')}
            isLoading={isLoading}
            endContent={!isLoading && <MapPin className="w-5 h-5 ml-1" />}
          >
            Llegué al Destino
          </Button>
        );

      case 'arrived':
        return (
          <div className="flex gap-3">
            <Button
              color="danger"
              variant="flat"
              className="flex-1 h-14 font-bold rounded-2xl"
              onClick={() => setShowNotDeliveredConfirm(true)}
              isDisabled={isLoading}
              startContent={<XCircle className="w-4 h-4" />}
            >
              No Entregué
            </Button>
            <Button
              color="success"
              className="flex-[1.6] h-14 font-bold rounded-2xl shadow-lg shadow-success/20"
              onClick={handleComplete}
              isLoading={isLoading}
              startContent={!isLoading && <CheckCircle className="w-5 h-5" />}
            >
              Entregar
            </Button>
          </div>
        );

      case 'delivered':
      case 'not-delivered':
        return (
          <Button
            color="primary"
            variant="flat"
            className="w-full h-14 font-bold rounded-2xl"
            onClick={() => navigate('/home')}
          >
            Volver al inicio
          </Button>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-32 safe-top">

      {/* Header */}
      <div className="glass-card border-b border-border/50 px-4 py-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase font-bold mb-0.5">Entrega activa</p>
            <h2 className="text-xl font-display font-bold text-foreground">
              #{String(activeOrder.id).slice(-6).toUpperCase()}
            </h2>
          </div>
          <div className="text-right space-y-1">
            <Chip
              color="success"
              variant="flat"
              size="lg"
              startContent={<DollarSign className="w-3 h-3" />}
              className="font-bold text-base"
            >
              Bs {Number((activeOrder as any).delivery_fee ?? 0).toFixed(2)}
            </Chip>
            {rewardPts > 0 && (
              <div className="flex items-center justify-end gap-1 text-sm text-warning">
                <Star className="w-3.5 h-3.5" />
                <span className="font-bold">+{rewardPts} pts</span>
              </div>
            )}
          </div>
        </div>

        {/* Estado actual */}
        <motion.div
          key={currentStatus}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-3 rounded-2xl bg-primary/8 border border-primary/15"
        >
          <p className={`font-bold text-sm ${statusInfo.color}`}>{statusInfo.label}</p>
        </motion.div>
      </div>

      {/* Timeline */}
      <div className="px-4 py-5">
        <StatusTimeline currentStatus={currentStatus as any} />
      </div>

      {/* Detalles */}
      <div className="px-4 space-y-4">

        {/* Cliente */}
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-primary/15 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground truncate">
                {(activeOrder as any).client_name || (activeOrder as any).customerName || 'Cliente'}
              </p>
              <p className="text-xs text-muted-foreground">Pedido #{String(activeOrder.id).slice(-6).toUpperCase()}</p>
            </div>
            <Button variant="flat" size="sm" isIconOnly className="rounded-full">
              <Phone className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Ruta */}
        <div className="glass-card p-4 space-y-4">
          <div className="flex gap-3">
            <div className="flex flex-col items-center gap-1 pt-1">
              <div className="w-3 h-3 rounded-full bg-success border-2 border-success/30" />
              <div className="w-0.5 flex-1 bg-border min-h-[32px]" />
              <div className="w-3 h-3 rounded-full bg-primary border-2 border-primary/30" />
            </div>
            <div className="flex-1 space-y-4 min-w-0">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold mb-0.5">Recoger en</p>
                <p className="font-medium text-foreground text-sm leading-snug">
                  {(activeOrder as any).address_a || (activeOrder as any).pickup || (activeOrder as any).pickupAddress}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold mb-0.5">Entregar en</p>
                <p className="font-medium text-foreground text-sm leading-snug">
                  {(activeOrder as any).address_b || (activeOrder as any).delivery || (activeOrder as any).deliveryAddress}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 pt-3 border-t border-border/40">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span className="text-xs font-medium">
                {(activeOrder as any).address_metadata?.total_distance_km
                  ? `${(activeOrder as any).address_metadata.total_distance_km} km`
                  : (activeOrder as any).distance || '—'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span className="text-xs font-medium">
                {(activeOrder as any).duration || '~15 min'}
              </span>
            </div>
          </div>
        </div>

        {/* Descripción si existe */}
        {(activeOrder as any).description && (
          <div className="glass-card p-4 rounded-2xl">
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-4 h-4 text-primary" />
              <p className="text-xs font-bold uppercase text-muted-foreground">Descripción</p>
            </div>
            <p className="text-sm text-foreground leading-relaxed">{(activeOrder as any).description}</p>
          </div>
        )}
      </div>

      {/* Botón de acción fijo */}
      <div className="fixed bottom-20 left-4 right-4 z-30">
        {getActions()}
      </div>

      {/* ─── Modal de confirmación: No entregado ───────────────────────────────── */}
      <AnimatePresence>
        {showNotDeliveredConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28 }}
              className="w-full max-w-md bg-background rounded-t-3xl p-6 pb-10"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-full bg-destructive/15 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">¿No pudiste entregar?</h3>
                  <p className="text-sm text-muted-foreground">El pedido quedará registrado como no entregado.</p>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button
                  variant="flat"
                  className="flex-1 font-bold"
                  onClick={() => setShowNotDeliveredConfirm(false)}
                >
                  Cancelar
                </Button>
                <Button
                  color="danger"
                  className="flex-1 font-bold"
                  onClick={() => {
                    setShowNotDeliveredConfirm(false);
                    handleNotDelivered();
                  }}
                  isLoading={isLoading}
                >
                  Confirmar
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ActiveDelivery;

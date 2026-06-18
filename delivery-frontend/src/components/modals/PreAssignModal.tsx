import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, ChevronRight, Star, DollarSign, MapPin } from 'lucide-react';
import { Button, Chip } from '@heroui/react';
import { IAddOrder } from '@/interfaces/orders-interface';

// ─── Countdown hook ────────────────────────────────────────────────────────────
const useCountdown = (expiresAt: string | null | undefined) => {
  const [remaining, setRemaining] = useState<number>(0);

  useEffect(() => {
    if (!expiresAt) { setRemaining(0); return; }
    const update = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      setRemaining(Math.max(0, Math.floor(diff / 1000)));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return {
    seconds: remaining,
    mm: String(Math.floor(remaining / 60)).padStart(2, '0'),
    ss: String(remaining % 60).padStart(2, '0'),
    isUrgent: remaining < 60,
    isExpired: remaining === 0,
  };
};

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Props {
  order: IAddOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onStart: (order: IAddOrder) => void;
  onAbort: (order: IAddOrder) => void;
  isStartLoading?: boolean;
  isAbortLoading?: boolean;
}

// ─── Componente ───────────────────────────────────────────────────────────────
export const PreAssignModal = ({
  order,
  isOpen,
  onClose,
  onStart,
  onAbort,
  isStartLoading,
  isAbortLoading,
}: Props) => {
  const { mm, ss, isUrgent, isExpired, seconds } = useCountdown(order?.reservation_expires_at);
  const totalSecs = 5 * 60;
  const progress = order?.reservation_expires_at
    ? (seconds / totalSecs) * 100
    : 0;

  // Cerrar automáticamente si expiró
  useEffect(() => {
    if (isExpired && isOpen) onClose();
  }, [isExpired, isOpen, onClose]);

  if (!order) return null;

  const rewardPts = order.reward_points ?? 0;

  // Color del timer según urgencia
  const timerColor = isUrgent ? 'text-destructive' : seconds < 120 ? 'text-warning' : 'text-primary';
  const ringColor = isUrgent ? '#ef4444' : seconds < 120 ? '#f97316' : '#3b82f6';

  const circumference = 2 * Math.PI * 52;
  const strokeDash = (progress / 100) * circumference;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="w-full sm:max-w-md bg-background rounded-t-3xl sm:rounded-3xl overflow-hidden"
            style={{ boxShadow: '0 -8px 40px rgba(0,0,0,0.5)' }}
          >
            {/* Header con X */}
            <div className="px-5 pt-5 pb-2 flex items-center justify-between">
              <h2 className="text-lg font-display font-bold text-foreground">Pedido Reservado</h2>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Countdown circular grande */}
            <div className="flex flex-col items-center py-6">
              <div className="relative w-32 h-32">
                <svg width="128" height="128" viewBox="0 0 128 128">
                  {/* Track */}
                  <circle cx="64" cy="64" r="52" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
                  {/* Progress */}
                  <circle
                    cx="64" cy="64" r="52"
                    fill="none"
                    stroke={ringColor}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${strokeDash} ${circumference}`}
                    transform="rotate(-90 64 64)"
                    style={{ transition: 'stroke-dasharray 1s linear, stroke 0.5s' }}
                  />
                </svg>

                {/* Timer text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <motion.span
                    key={`${mm}:${ss}`}
                    className={`text-3xl font-black font-display tabular-nums ${timerColor}`}
                    animate={isUrgent ? { scale: [1, 1.08, 1] } : {}}
                    transition={{ repeat: Infinity, duration: 0.8 }}
                  >
                    {mm}:{ss}
                  </motion.span>
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                    Para confirmar
                  </span>
                </div>
              </div>

              {isUrgent && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-1.5 mt-2 text-destructive text-xs font-bold"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  ¡El tiempo se acaba!
                </motion.div>
              )}
            </div>

            {/* Info del pedido */}
            <div className="px-5 pb-4 space-y-3">
              {/* Recompensas */}
              <div className="flex gap-2 justify-center">
                <Chip color="success" variant="flat" size="lg" startContent={<DollarSign className="w-3 h-3" />} className="font-bold">
                  Bs {Number(order.delivery_fee).toFixed(2)}
                </Chip>
                {rewardPts > 0 && (
                  <Chip color="warning" variant="flat" size="lg" startContent={<Star className="w-3 h-3" />} className="font-bold">
                    +{rewardPts} pts
                  </Chip>
                )}
              </div>

              {/* Direcciones resumen */}
              <div className="glass-card p-3.5 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full bg-success flex-shrink-0" />
                  <p className="text-foreground truncate font-medium">{order.address_a || order.pickup}</p>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                  <p className="text-foreground truncate font-medium">{order.address_b || order.delivery}</p>
                </div>
              </div>

              {/* Advertencia de penalización */}
              <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/20 rounded-xl p-3">
                <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-xs text-destructive/90 leading-snug">
                  Si abortas esta carrera, <strong>se descontarán 5 puntos</strong> de tu cuenta.
                </p>
              </div>
            </div>

            {/* Botones */}
            <div className="px-5 pb-8 flex gap-3 safe-bottom">
              <Button
                variant="flat"
                color="danger"
                className="flex-1 h-13 font-bold"
                onClick={() => onAbort(order)}
                isLoading={isAbortLoading}
                isDisabled={isStartLoading}
              >
                Abortar Carrera
              </Button>
              <Button
                color="primary"
                className="flex-[1.8] h-13 font-bold shadow-lg shadow-primary/25"
                onClick={() => onStart(order)}
                isLoading={isStartLoading}
                isDisabled={isAbortLoading}
                endContent={!isStartLoading && <ChevronRight className="w-4 h-4" />}
              >
                Iniciar Carrera
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PreAssignModal;

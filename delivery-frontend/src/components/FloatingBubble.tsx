import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, useMotionValue, useSpring, PanInfo } from 'framer-motion';
import { Bike, Package, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Tipos ────────────────────────────────────────────────────────────────────
type BubbleMode = 'pre-assigned' | 'active';

interface Props {
  mode: BubbleMode;
  /** ISO string de cuando expira la reserva (solo modo pre-assigned) */
  expiresAt?: string | null;
  /** Duración estimada de la carrera en texto (ej: "25 min") */
  duration?: string | null;
  onClick: () => void;
  /** Fuerza la posición inicial (bottom-right por defecto) */
  initialSide?: 'left' | 'right';
}

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

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');
  return { formatted: `${mm}:${ss}`, seconds: remaining };
};

// ─── Componente ───────────────────────────────────────────────────────────────
export const FloatingBubble = ({
  mode,
  expiresAt,
  duration,
  onClick,
  initialSide = 'right',
}: Props) => {
  const BUBBLE_SIZE = 72;
  const EDGE_MARGIN = 16;

  const [dragging, setDragging] = useState(false);
  const constraintsRef = useRef<HTMLDivElement>(null);

  const { formatted: countdown, seconds } = useCountdown(expiresAt);

  // Color del anillo basado en el tiempo restante
  const getRingColor = () => {
    if (mode === 'pre-assigned') {
      if (seconds < 60) return 'hsl(0 72% 51%)'; // rojo urgente
      if (seconds < 120) return 'hsl(25 95% 53%)'; // naranja
      return 'hsl(217 91% 60%)'; // azul
    }
    return 'hsl(142 71% 45%)'; // verde para active
  };

  const ringColor = getRingColor();

  // Progreso del anillo (para modo pre-assigned)
  const totalSecs = 5 * 60; // 5 minutos
  const progress = mode === 'pre-assigned'
    ? (seconds / totalSecs) * 100
    : 100;

  const circumference = 2 * Math.PI * 30; // radio 30
  const strokeDash = (progress / 100) * circumference;

  return (
    <>
      {/* Overlay para limitar el drag */}
      <div ref={constraintsRef} className="fixed inset-0 pointer-events-none z-40" />

      <motion.div
        drag
        dragConstraints={constraintsRef}
        dragElastic={0.15}
        dragMomentum={false}
        onDragStart={() => setDragging(true)}
        onDragEnd={(_, info: PanInfo) => {
          setDragging(false);
          // Snap al borde más cercano
          const vw = window.innerWidth;
          const vh = window.innerHeight;
          const el = constraintsRef.current?.getBoundingClientRect();
          if (!el) return;
        }}
        initial={{
          x: initialSide === 'right'
            ? window.innerWidth - BUBBLE_SIZE - EDGE_MARGIN * 2
            : EDGE_MARGIN,
          y: window.innerHeight * 0.35,
        }}
        whileDrag={{ scale: 1.08 }}
        onClick={() => { if (!dragging) onClick(); }}
        style={{ position: 'fixed', zIndex: 50, cursor: 'grab', userSelect: 'none', touchAction: 'none' }}
      >
        {/* Anillo SVG de progreso */}
        <svg
          width={BUBBLE_SIZE + 8}
          height={BUBBLE_SIZE + 8}
          style={{ position: 'absolute', top: -4, left: -4 }}
          viewBox="0 0 76 76"
        >
          {/* Track */}
          <circle cx="38" cy="38" r="34" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
          {/* Progress */}
          <circle
            cx="38" cy="38" r="34"
            fill="none"
            stroke={ringColor}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={`${(progress / 100) * (2 * Math.PI * 34)} ${2 * Math.PI * 34}`}
            strokeDashoffset={0}
            transform="rotate(-90 38 38)"
            style={{ transition: 'stroke-dasharray 1s linear, stroke 0.5s ease' }}
          />
        </svg>

        {/* Bubble body */}
        <motion.div
          className={cn(
            'relative flex flex-col items-center justify-center rounded-full select-none',
            'border-2 border-white/20',
          )}
          style={{
            width: BUBBLE_SIZE,
            height: BUBBLE_SIZE,
            background: mode === 'pre-assigned'
              ? 'linear-gradient(135deg, hsl(217 91% 40%), hsl(250 80% 35%))'
              : 'linear-gradient(135deg, hsl(142 71% 30%), hsl(162 60% 25%))',
            boxShadow: `0 8px 32px ${ringColor}55, 0 2px 8px rgba(0,0,0,0.4)`,
          }}
          animate={{
            scale: [1, 1.04, 1],
            boxShadow: [
              `0 8px 32px ${ringColor}55`,
              `0 8px 40px ${ringColor}88`,
              `0 8px 32px ${ringColor}55`,
            ],
          }}
          transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
        >
          {/* Ícono */}
          {mode === 'pre-assigned' ? (
            <Bike className="w-6 h-6 text-white mb-0.5" />
          ) : (
            <div className="flex items-center gap-0.5">
              <Bike className="w-5 h-5 text-white" />
              <Package className="w-3.5 h-3.5 text-white/70" />
            </div>
          )}

          {/* Texto */}
          <span
            className="text-[11px] font-black text-white leading-none"
            style={{ letterSpacing: '0.02em' }}
          >
            {mode === 'pre-assigned' ? countdown : (duration ?? '—')}
          </span>
          {mode === 'pre-assigned' && seconds < 60 && (
            <span className="text-[8px] text-red-300 font-bold uppercase">¡Urgente!</span>
          )}
        </motion.div>

        {/* Pulse ring cuando queda poco tiempo */}
        {mode === 'pre-assigned' && seconds < 60 && (
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-red-400"
            animate={{ scale: [1, 1.4, 1], opacity: [1, 0, 1] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
          />
        )}
      </motion.div>
    </>
  );
};

export default FloatingBubble;

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, useMotionValue, PanInfo, animate } from 'framer-motion';
import { Bike, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Tipos ────────────────────────────────────────────────────────────────────
type BubbleMode = 'pre-assigned' | 'assigned';

interface Props {
  mode: BubbleMode;
  /** ISO string de cuando expira la reserva (modo pre-assigned o inicio de carrera) */
  expiresAt?: string | null;
  /** Duración estimada de la carrera (ej: "00:15:00" o "25 min") */
  duration?: string | null;
  onClick: () => void;
  /** Fuerza la posición inicial (bottom-right por defecto) */
  initialSide?: 'left' | 'right';
  /** Determina si es visible */
  visible?: boolean;
}

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
  return 15 * 60; // 15 minutes default fallback
};

// ─── Countdown hook ────────────────────────────────────────────────────────────
const useCountdown = (expiresAt: string | null | undefined) => {
  const [remaining, setRemaining] = useState<number>(0);

  useEffect(() => {
    if (!expiresAt) {
      setRemaining(0);
      return;
    }

    const update = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      setRemaining(Math.max(0, Math.floor(diff / 1000)));
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const hh = Math.floor(remaining / 3600);
  const mm = Math.floor((remaining % 3600) / 60);
  const ss = remaining % 60;

  const formatted = hh > 0
    ? `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
    : `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;

  return { formatted, seconds: remaining };
};

// ─── Componente ───────────────────────────────────────────────────────────────
export const FloatingBubble = ({
  mode,
  expiresAt,
  duration,
  onClick,
  initialSide = 'right',
  visible = true,
}: Props) => {
  if (!visible) return null;

  const BUBBLE_SIZE = 72;
  const EDGE_MARGIN = 16;

  const [dragging, setDragging] = useState(false);
  const constraintsRef = useRef<HTMLDivElement>(null);

  const { formatted: countdown, seconds } = useCountdown(expiresAt);

  // Position motion values for custom drag-to-edge animation with physics
  const x = useMotionValue(
    initialSide === 'right'
      ? window.innerWidth - BUBBLE_SIZE - EDGE_MARGIN
      : EDGE_MARGIN
  );
  const y = useMotionValue(window.innerHeight * 0.35);

  // Handle window resizing
  useEffect(() => {
    const handleResize = () => {
      const vw = window.innerWidth;
      const currentX = x.get();
      if (currentX > vw / 2) {
        x.set(vw - BUBBLE_SIZE - EDGE_MARGIN);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [x, BUBBLE_SIZE, EDGE_MARGIN]);

  // Color del anillo
  const getRingColor = () => {
    if (mode === 'pre-assigned') {
      if (seconds < 60) return 'hsl(0 72% 51%)'; // rojo urgente
      if (seconds < 120) return 'hsl(25 95% 53%)'; // naranja
      return 'hsl(217 91% 60%)'; // azul
    }
    return 'hsl(0 72% 51%)'; // Rojo para modo assigned (en curso)
  };

  const ringColor = getRingColor();

  // Progreso del anillo
  const totalSecs = mode === 'pre-assigned'
    ? 5 * 60
    : parseDurationToSeconds(duration);

  const progress = totalSecs > 0
    ? (seconds / totalSecs) * 100
    : 100;

  const circumference = 2 * Math.PI * 34; // radio 34

  return createPortal(
    <>
      {/* Overlay para limitar el drag */}
      <div ref={constraintsRef} className="fixed inset-0 pointer-events-none z-[9999]" />

      <motion.div
        drag
        dragConstraints={constraintsRef}
        dragElastic={0.15}
        dragMomentum={true}
        onDragStart={() => setDragging(true)}
        onDragEnd={(_, info: PanInfo) => {
          setDragging(false);
          const vw = window.innerWidth;
          const vh = window.innerHeight;

          const currentX = x.get();
          const currentY = y.get();

          // Snap al borde izquierdo o derecho basado en la posición + velocidad
          const targetX = currentX + info.velocity.x * 0.15 < vw / 2
            ? EDGE_MARGIN
            : vw - BUBBLE_SIZE - EDGE_MARGIN;

          // Limitar Y dentro del viewport
          const targetY = Math.max(
            EDGE_MARGIN,
            Math.min(vh - BUBBLE_SIZE - EDGE_MARGIN - 80, currentY + info.velocity.y * 0.15)
          );

          // Animar con física de resorte (bounce)
          animate(x, targetX, { type: 'spring', stiffness: 200, damping: 15 });
          animate(y, targetY, { type: 'spring', stiffness: 200, damping: 15 });
        }}
        onClick={() => {
          if (!dragging) onClick();
        }}
        style={{
          x,
          y,
          position: 'fixed',
          left: 0,
          top: 0,
          zIndex: 9999,
          cursor: dragging ? 'grabbing' : 'grab',
          userSelect: 'none',
          touchAction: 'none'
        }}
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
            cx="38"
            cy="38"
            r="34"
            fill="none"
            stroke={ringColor}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={`${(progress / 100) * circumference} ${circumference}`}
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
              : 'linear-gradient(135deg, hsl(0 72% 35%), hsl(340 80% 30%))',
            boxShadow: `0 8px 32px ${ringColor}55, 0 2px 8px rgba(0,0,0,0.4)`,
          }}
          animate={{
            scale: dragging ? 1.08 : [1, 1.04, 1],
            boxShadow: dragging
              ? `0 12px 40px ${ringColor}77`
              : [
                  `0 8px 32px ${ringColor}55`,
                  `0 8px 40px ${ringColor}88`,
                  `0 8px 32px ${ringColor}55`,
                ],
          }}
          transition={dragging ? { duration: 0.1 } : { repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
        >
          {/* Ícono */}
          {mode === 'pre-assigned' ? (
            <Bike className="w-6 h-6 text-white mb-0.5" />
          ) : (
            <div className="flex items-center gap-0.5 mb-0.5">
              <Bike className="w-5 h-5 text-white" />
              <Package className="w-3.5 h-3.5 text-white/80" />
            </div>
          )}

          {/* Texto */}
          <span
            className="text-[11px] font-black text-white leading-none"
            style={{ letterSpacing: '0.02em' }}
          >
            {countdown}
          </span>
          {mode === 'pre-assigned' && seconds < 60 && (
            <span className="text-[8px] text-red-300 font-bold uppercase mt-0.5">¡Urgente!</span>
          )}
        </motion.div>

        {/* Pulse ring cuando queda poco tiempo */}
        {seconds < 60 && (
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-red-400 pointer-events-none"
            animate={{ scale: [1, 1.4, 1], opacity: [1, 0, 1] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
          />
        )}
      </motion.div>
    </>,
    document.body
  );
};

export default FloatingBubble;

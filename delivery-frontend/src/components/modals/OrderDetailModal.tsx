import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ─── React Icons ─────────────────────────────────────────────────────────────
import { 
  FaBox, FaDollarSign, FaStar, FaExternalLinkAlt, FaLocationArrow
} from 'react-icons/fa';
import { 
  IoClose, IoTimeOutline, IoWarning, IoOpenOutline, IoNavigation
} from 'react-icons/io5';

import { Button, Chip, Modal, Surface } from '@heroui/react';
import { useOrderStore } from '@/stores/orderStore';
import { cn } from '@/lib/utils';

// ─── Leaflet Pin Customizer ───────────────────────────────────────────────────
const makeIcon = (color: string, label: string) =>
  L.divIcon({
    className: '',
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    html: `<div style="
      width:36px;height:36px;border-radius:50% 50% 50% 0;
      background:${color};transform:rotate(-45deg);
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 2px 8px rgba(0,0,0,0.3);border:2px solid white;">
      <span style="transform:rotate(45deg);font-size:10px;font-weight:900;color:white;display:inline-block;">${label}</span>
    </div>`,
  });

const pickupIcon = makeIcon('#ef4444', 'A'); // Red (Pickup)
const deliveryIcon = makeIcon('#3b82f6', 'B'); // Blue (Delivery)
const userIcon = makeIcon('#10b981', 'YO'); // Green (Current Location)

// ─── FitBounds Component ─────────────────────────────────────────────────────
const FitBounds = ({ positions }: { positions: [number, number][] }) => {
  const map = useMap();
  useEffect(() => {
    if (positions.length >= 2) {
      map.fitBounds(positions, { padding: [40, 40] });
    }
  }, [map, positions]);
  return null;
};

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
  return 15 * 60; // 15 mins default fallback
};

// ─── Countdown Hook ───────────────────────────────────────────────────────────
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

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  order: any | null;
  isOpen: boolean;
  onClose: () => void;
  onAccept?: (order: any) => void;
  onStart?: (order: any) => void;
  onAbort?: (order: any) => void;
  onUpdateStatus?: (orderId: string, status: string) => Promise<void>;
  onComplete?: (orderId: string) => Promise<void>;
  isLoading?: boolean;
  isStartLoading?: boolean;
  isAbortLoading?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────
export const OrderDetailModal = ({
  order,
  isOpen,
  onClose,
  onAccept,
  onStart,
  onAbort,
  onUpdateStatus,
  onComplete,
  isLoading = false,
  isStartLoading = false,
  isAbortLoading = false,
}: Props) => {
  const [mapReady, setMapReady] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [showNotDeliveredConfirm, setShowNotDeliveredConfirm] = useState(false);
  const [localActionLoading, setLocalActionLoading] = useState(false);

  const storeReservationExpiresAt = useOrderStore((state) => state.reservationExpiresAt);

  // Geolocation tracker for driver (YO)
  useEffect(() => {
    if (isOpen) {
      setMapReady(false);
      const t = setTimeout(() => setMapReady(true), 150);

      const geo = navigator.geolocation;
      if (geo) {
        const watchId = geo.watchPosition(
          (pos) => {
            setUserLocation([pos.coords.latitude, pos.coords.longitude]);
          },
          (err) => console.warn('Error tracking driver location:', err),
          { enableHighAccuracy: true }
        );
        return () => {
          clearTimeout(t);
          geo.clearWatch(watchId);
        };
      }
      return () => clearTimeout(t);
    } else {
      setUserLocation(null);
    }
  }, [isOpen]);

  // Calculate remaining time target for the countdown
  let expiresAt: string | null = null;
  const currentStatus = order?.status;
  if (order) {
    if (currentStatus === 'pre-assigned') {
      expiresAt = order.reservation_expires_at ?? storeReservationExpiresAt;
    } else if (['collected', 'running', 'arrived'].includes(currentStatus)) {
      const collectedAt = order.assignments?.[0]?.status_metadata?.collected_at;
      if (collectedAt) {
        const durationSec = parseDurationToSeconds(order.duration);
        const expiresAtMs = new Date(collectedAt).getTime() + durationSec * 1000;
        expiresAt = new Date(expiresAtMs).toISOString();
      }
    }
  }

  const { formatted: countdown, seconds: remainingSeconds } = useCountdown(expiresAt);

  if (!order) return null;

  // Parse Coordinates
  const parseCoords = (str: string): [number, number] | null => {
    const parts = str?.split(',').map(Number);
    if (parts?.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) return [parts[0], parts[1]];
    return null;
  };

  const pickupCoords = parseCoords(order.pickup) ?? parseCoords(order.address_metadata?.pickup ? `${order.address_metadata.pickup.lat},${order.address_metadata.pickup.lng}` : '') ?? null;
  const deliveryCoords = parseCoords(order.delivery) ?? parseCoords(order.address_metadata?.delivery ? `${order.address_metadata.delivery.lat},${order.address_metadata.delivery.lng}` : '') ?? null;

  const mapCenter: [number, number] = pickupCoords ?? [-17.9647, -67.1060];
  const positions: [number, number][] = [pickupCoords, deliveryCoords, userLocation].filter(Boolean) as [number, number][];
  const hasMap = !!(pickupCoords && deliveryCoords);

  const mapsUrl = deliveryCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${deliveryCoords[0]},${deliveryCoords[1]}`
    : '#';

  const rewardPts = order.reward_points ?? order.points ?? 0;

  // Calculate countdown circle progress
  const totalSecs = currentStatus === 'pre-assigned'
    ? 5 * 60
    : parseDurationToSeconds(order.duration);

  const progress = totalSecs > 0
    ? Math.max(0, Math.min(100, (remainingSeconds / totalSecs) * 100))
    : 100;

  const isExhausted = remainingSeconds <= 0;

  // Status transitions handlers
  const handleAcceptClick = () => {
    if (onAccept) onAccept(order);
  };

  const handleStartClick = () => {
    if (onStart) onStart(order);
  };

  const handleAbortClick = () => {
    if (onAbort) onAbort(order);
  };

  const handleArrivedClick = async () => {
    if (onUpdateStatus) {
      setLocalActionLoading(true);
      try {
        await onUpdateStatus(order.id, 'arrived');
      } finally {
        setLocalActionLoading(false);
      }
    }
  };

  const handleNotDeliveredClick = async () => {
    setShowNotDeliveredConfirm(false);
    if (onUpdateStatus) {
      setLocalActionLoading(true);
      try {
        await onUpdateStatus(order.id, 'not-delivered');
        onClose();
      } finally {
        setLocalActionLoading(false);
      }
    }
  };

  const handleCompleteClick = async () => {
    if (onComplete) {
      setLocalActionLoading(true);
      try {
        await onComplete(order.id);
        onClose();
      } finally {
        setLocalActionLoading(false);
      }
    }
  };

  return (
    <>
      <Modal isOpen={isOpen}>
        <Modal.Backdrop className="bg-black/80 backdrop-blur-md z-[99999] flex items-end sm:items-center justify-center">
          <Modal.Container className="z-[99999] w-full flex items-end sm:items-center justify-center p-0 sm:p-4">
            <Modal.Dialog className="w-full sm:max-w-lg bg-background rounded-t-[28px] sm:rounded-[28px] overflow-hidden max-h-[96dvh] flex flex-col border border-divider outline-none shadow-2xl">
              
              {/* Header con CloseTrigger */}
              <Modal.Header className="border-b border-divider flex flex-col p-5 gap-3 items-center relative shrink-0">
                <Modal.CloseTrigger onPress={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground z-50 p-1.5 hover:bg-default-100 rounded-full transition-colors" />
                
                {['pre-assigned', 'collected', 'running', 'arrived'].includes(currentStatus) && expiresAt ? (
                  <div className="flex flex-col gap-3 w-full mt-2">
                    <div className="flex items-center justify-between p-3.5 bg-default-50 border border-divider rounded-2xl shadow-sm w-full">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-2.5 rounded-xl text-white shrink-0 shadow-sm transition-all duration-300",
                          isExhausted 
                            ? "bg-danger shadow-danger/25" 
                            : "bg-success shadow-success/20"
                        )}>
                          <IoTimeOutline className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                          <p className="text-[10px] uppercase font-extrabold tracking-wider text-muted-foreground leading-none mb-1 font-display font-black">
                            {currentStatus === 'pre-assigned' ? 'Tiempo para aceptar' : 'Tiempo límite de entrega'}
                          </p>
                          <h2 className="text-sm font-bold text-foreground leading-none font-display">
                            Pedido #{String(order.id).slice(-6).toUpperCase()}
                          </h2>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <span className={cn(
                          "font-mono text-2xl font-black tracking-tight",
                          isExhausted 
                            ? "text-danger" 
                            : "text-success"
                        )}>
                          {countdown}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar (Lineal) */}
                    <div className="w-full h-2 bg-default-100 rounded-full overflow-hidden border border-divider">
                      <motion.div 
                        className={cn(
                          "h-full rounded-full",
                          isExhausted ? "bg-danger" : "bg-success"
                        )}
                        initial={{ width: '100%' }}
                        animate={{ width: `${progress}%` }}
                        style={{
                          boxShadow: isExhausted 
                            ? "0 0 8px rgba(239, 68, 68, 0.4)" 
                            : "0 0 6px rgba(16, 185, 129, 0.3)"
                        }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-row items-center gap-3.5 w-full mt-2 text-left">
                    <Modal.Icon className="rounded-2xl p-3 bg-primary/10 text-primary border border-primary/20 shrink-0">
                      <FaBox className="w-5 h-5" />
                    </Modal.Icon>
                    <div>
                      <Modal.Heading className="text-lg font-black uppercase tracking-tight font-display">Detalle del Pedido</Modal.Heading>
                      <p className="text-xs text-muted-foreground font-mono">#{String(order.id).slice(-6).toUpperCase()}</p>
                    </div>
                  </div>
                )}
              </Modal.Header>

              {/* Body del Modal */}
              <Modal.Body className="overflow-y-auto flex-1 p-5 space-y-5 custom-scrollbar">
                
                {/* 1. Earnings & Reward Card */}
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="flex items-center gap-3 p-3.5 bg-success/10 rounded-2xl border border-success/20 shadow-sm">
                    <div className="p-2 bg-success/20 rounded-xl text-success shadow-inner shrink-0">
                      <FaDollarSign className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] text-success/70 font-black uppercase tracking-wider block font-display">Ganancia</span>
                      <span className="text-base font-black text-success leading-tight font-display">
                        Bs {Number(order.delivery_fee).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  
                  {rewardPts > 0 ? (
                    <div className="flex items-center gap-3 p-3.5 bg-primary/10 rounded-2xl border border-primary/20 shadow-sm">
                      <div className="p-2 bg-primary/20 rounded-xl text-primary shadow-inner shrink-0">
                        <FaStar className="w-5 h-5 text-warning" />
                      </div>
                      <div>
                        <span className="text-[10px] text-primary/70 font-black uppercase tracking-wider block font-display">Recompensa</span>
                        <span className="text-base font-black text-primary leading-tight font-display">
                          +{rewardPts} pts
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-3.5 bg-default-100 rounded-2xl border border-divider">
                      <div className="p-2 bg-default-200 rounded-xl text-muted-foreground shrink-0">
                        <FaStar className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider block font-display">Recompensa</span>
                        <span className="text-sm font-bold text-muted-foreground leading-tight">
                          Sin puntos
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Timeline de Ruta (Recojo A -> Entrega B) */}
                <div className="p-4 bg-default-50 border border-divider rounded-2xl relative shadow-inner">
                  <div className="absolute left-[30px] top-[40px] bottom-[40px] w-0.5 border-l-2 border-dashed border-default-300 z-0" />
                  
                  <div className="relative z-10 flex flex-col gap-5">
                    {/* Recojo */}
                    <div className="flex gap-4 items-start">
                      <div className="w-8 h-8 rounded-full bg-danger/10 text-danger border border-danger/25 flex items-center justify-center font-black text-xs shrink-0 shadow-sm">
                        A
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[9px] text-danger/80 font-black uppercase tracking-widest block mb-0.5 font-display">Punto de Recojo</span>
                        <p className="text-sm font-semibold text-foreground leading-snug break-words">
                          {order.address_a || order.pickup}
                        </p>
                      </div>
                    </div>
                    
                    {/* Entrega */}
                    <div className="flex gap-4 items-start">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary border border-primary/25 flex items-center justify-center font-black text-xs shrink-0 shadow-sm">
                        B
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[9px] text-primary/80 font-black uppercase tracking-widest block mb-0.5 font-display">Punto de Entrega</span>
                        <p className="text-sm font-semibold text-foreground leading-snug break-words">
                          {order.address_b || order.delivery}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Acciones de GPS */}
                <div className="flex gap-3">
                  <a
                    href={`geo:${pickupCoords?.[0]},${pickupCoords?.[1]}`}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border border-divider bg-background hover:bg-default-100 transition-all text-xs font-bold text-foreground btn-premium shadow-sm"
                  >
                    <FaLocationArrow className="w-3.5 h-3.5 text-primary" />
                    Activar GPS
                  </a>
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border border-divider bg-background hover:bg-default-100 transition-all text-xs font-bold text-foreground btn-premium shadow-sm"
                  >
                    <FaExternalLinkAlt className="w-3.5 h-3.5 text-primary" />
                    Abrir Google Map
                  </a>
                </div>

                {/* 4. Leaflet Map */}
                {hasMap && mapReady && (
                  <div className="rounded-[20px] overflow-hidden border border-divider shadow-md relative" style={{ height: 200 }}>
                    <MapContainer center={mapCenter} zoom={14} style={{ height: '100%', width: '100%' }} zoomControl={false} attributionControl={false}>
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <FitBounds positions={positions} />
                      {pickupCoords && <Marker position={pickupCoords} icon={pickupIcon} />}
                      {deliveryCoords && <Marker position={deliveryCoords} icon={deliveryIcon} />}
                      {userLocation && <Marker position={userLocation} icon={userIcon} />}
                      {positions.length >= 2 && pickupCoords && deliveryCoords && (
                        <Polyline positions={[pickupCoords, deliveryCoords]} pathOptions={{ color: '#3b82f6', weight: 4, dashArray: '6 4' }} />
                      )}
                    </MapContainer>
                  </div>
                )}

                {/* 5. Detalles adicionales */}
                <div className="grid grid-cols-1 gap-3.5">
                  <Surface className="p-4 border border-divider rounded-2xl bg-default-50/50 flex gap-3.5 items-start shadow-sm">
                    <div className="p-2.5 bg-default-200/50 rounded-xl text-muted-foreground shrink-0 shadow-inner">
                      <IoTimeOutline className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider block mb-0.5 font-display">Tiempo Aprox. Entrega</span>
                      <p className="text-sm font-bold text-foreground font-display">
                        {order.address_metadata?.duration || order.duration || '—'}
                      </p>
                    </div>
                  </Surface>
                  
                  <Surface className="p-4 border border-divider rounded-2xl bg-default-50/50 flex gap-3.5 items-start shadow-sm">
                    <div className="p-2.5 bg-default-200/50 rounded-xl text-muted-foreground shrink-0 shadow-inner">
                      <FaBox className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider block mb-0.5 font-display">Descripción del Pedido</span>
                      <p className="text-sm text-foreground/95 leading-relaxed font-sans font-medium">
                        {order.description || 'Sin descripción disponible.'}
                      </p>
                    </div>
                  </Surface>
                </div>
              </Modal.Body>

              {/* Footer con Botones dinámicos */}
              <Modal.Footer className="p-5 border-t border-divider bg-default-50/70 flex flex-col gap-3 shrink-0">
                {currentStatus === 'active' && (
                  <div className="flex gap-3 w-full">
                    <Button
                      variant="flat"
                      className="flex-1 h-12 font-bold text-danger hover:bg-danger/10 rounded-xl text-sm"
                      onClick={onClose}
                      disabled={isLoading}
                    >
                      Cancelar
                    </Button>
                    <Button
                      color="primary"
                      className="flex-[2] h-12 font-black text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-md shadow-blue-500/20 btn-premium hover:from-blue-700 hover:to-indigo-700 text-sm"
                      onClick={handleAcceptClick}
                      isLoading={isLoading}
                    >
                      ACEPTAR CARRERA
                    </Button>
                  </div>
                )}

                {currentStatus === 'pre-assigned' && (
                  <div className="flex gap-3 w-full">
                    <Button
                      variant="flat"
                      color="danger"
                      className="flex-1 h-12 font-bold rounded-xl text-sm"
                      onClick={handleAbortClick}
                      isLoading={isAbortLoading}
                      disabled={isStartLoading}
                    >
                      Abortar Carrera
                    </Button>
                    <Button
                      color="primary"
                      className="flex-[2] h-12 font-black text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-md shadow-blue-500/20 btn-premium hover:from-blue-700 hover:to-indigo-700 text-sm"
                      onClick={handleStartClick}
                      isLoading={isStartLoading}
                      disabled={isAbortLoading}
                    >
                      INICIAR ENTREGA
                    </Button>
                  </div>
                )}

                {['collected', 'running'].includes(currentStatus) && (
                  <Button
                    color="primary"
                    className="w-full h-12 font-black text-sm text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-md shadow-blue-500/20 btn-premium hover:from-blue-700 hover:to-indigo-700"
                    onClick={handleArrivedClick}
                    isLoading={localActionLoading}
                  >
                    LLEGUÉ AL LUGAR DE ENTREGA
                  </Button>
                )}

                {currentStatus === 'arrived' && (
                  <div className="flex gap-3 w-full">
                    <Button
                      variant="flat"
                      color="danger"
                      className="flex-1 h-12 font-bold rounded-xl text-sm"
                      onClick={() => setShowNotDeliveredConfirm(true)}
                      disabled={localActionLoading}
                    >
                      No se pudo entregar
                    </Button>
                    <Button
                      color="success"
                      className="flex-[2] h-12 font-black text-white bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl shadow-md shadow-emerald-500/20 btn-premium hover:from-emerald-700 hover:to-teal-700 text-sm"
                      onClick={handleCompleteClick}
                      isLoading={localActionLoading}
                    >
                      ENTREGAR PEDIDO
                    </Button>
                  </div>
                )}
              </Modal.Footer>

            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {/* ─── Modal de confirmación: No entregado ───────────────────────────────── */}
      <AnimatePresence>
        {showNotDeliveredConfirm && createPortal(
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100000] flex items-end justify-center bg-black/70 backdrop-blur-[4px]"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28 }}
              className="w-full max-w-md bg-background rounded-t-3xl p-6 pb-10 border-t border-divider"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-full bg-danger/15 flex items-center justify-center shrink-0">
                  <IoWarning className="w-5 h-5 text-danger" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground font-display">¿No pudiste entregar el pedido?</h3>
                  <p className="text-sm text-muted-foreground">El pedido quedará registrado permanentemente como no entregado.</p>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button
                  variant="flat"
                  className="flex-1 font-bold rounded-xl text-sm"
                  onClick={() => setShowNotDeliveredConfirm(false)}
                >
                  Cancelar
                </Button>
                <Button
                  color="danger"
                  className="flex-1 font-bold rounded-xl text-sm btn-premium"
                  onClick={handleNotDeliveredClick}
                  isLoading={localActionLoading}
                >
                  Confirmar
                </Button>
              </div>
            </motion.div>
          </motion.div>,
          document.body
        )}
      </AnimatePresence>
    </>
  );
};

export default OrderDetailModal;

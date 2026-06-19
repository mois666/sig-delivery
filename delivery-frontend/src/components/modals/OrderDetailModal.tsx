import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  X, MapPin, Clock, Star, Package, Navigation, ExternalLink,
  DollarSign, CheckCircle, XCircle, AlertTriangle
} from 'lucide-react';
import { Button, Chip, Modal } from '@heroui/react';
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

  // Calculate remaining time target for the countdown (must be before conditional return for Hook stability)
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
        <Modal.Backdrop className="bg-black/60 backdrop-blur-[3px] z-[99999] flex items-end sm:items-center justify-center">
          <Modal.Container className="z-[99999] w-full flex items-end sm:items-center justify-center">
            <Modal.Dialog className="w-full sm:max-w-lg bg-background rounded-t-3xl sm:rounded-3xl overflow-hidden max-h-[96dvh] flex flex-col border border-divider outline-none">
              {/* Scrollable content containing all 9 rows */}
              <div className="overflow-y-auto flex-1 p-5 space-y-4">

                {/* FILA 0: Header (Standard title or large countdown for pre-assigned/assigned) */}
                <div className="flex items-center justify-between">
                  {['pre-assigned', 'collected', 'running', 'arrived'].includes(currentStatus) && expiresAt ? (
                    <div className="flex-1 text-center py-2 bg-muted/30 rounded-2xl border border-border/50">
                      <p className="text-[10px] uppercase font-black tracking-wider text-muted-foreground mb-0.5">
                        {currentStatus === 'pre-assigned' ? 'Tiempo restante para aceptar carrera' : 'Tiempo límite de entrega'}
                      </p>
                      <p className={cn(
                        "font-mono text-3xl font-black tracking-tight",
                        currentStatus === 'pre-assigned'
                          ? (remainingSeconds < 60 ? 'text-destructive animate-pulse' : 'text-primary')
                          : 'text-destructive'
                      )}>
                        {countdown}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide font-bold">Detalle del Pedido</p>
                      <h2 className="text-xl font-display font-bold text-foreground">#{String(order.id).slice(-6).toUpperCase()}</h2>
                    </div>
                  )}
                  <button
                    onClick={onClose}
                    className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-muted/80 transition-colors ml-4"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* FILA 1: Chips (Delivery fee in Green and Points in Blue with Star) */}
                <div className="flex gap-2.5">
                  <Chip
                    startContent={<DollarSign className="w-4 h-4 text-success-600" />}
                    color="success"
                    variant="flat"
                    size="lg"
                    className="font-bold text-base px-3 bg-success/15 text-success"
                  >
                    Bs {Number(order.delivery_fee).toFixed(2)}
                  </Chip>
                  {rewardPts > 0 && (
                    <Chip
                      startContent={<Star className="w-4 h-4 text-primary-600" />}
                      color="primary"
                      variant="flat"
                      size="lg"
                      className="font-bold text-base px-3 bg-primary/15 text-primary"
                    >
                      +{rewardPts} pts
                    </Chip>
                  )}
                </div>

                {/* FILA 2: Acciones GPS (Activar GPS / Abrir Google Maps) */}
                <div className="flex gap-2.5">
                  <a
                    href={`geo:${pickupCoords?.[0]},${pickupCoords?.[1]}`}
                    className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl border border-border/50 bg-background/50 hover:bg-muted/40 transition-colors text-xs font-bold text-muted-foreground"
                  >
                    <Navigation className="w-4 h-4" />
                    Activar GPS
                  </a>
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl border border-border/50 bg-background/50 hover:bg-muted/40 transition-colors text-xs font-bold text-muted-foreground"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Abrir Google Map
                  </a>
                </div>

                {/* FILA 3: Leaflet Map (Red=Pickup, Blue=Delivery, YO=Current location) */}
                {hasMap && mapReady && (
                  <div className="rounded-2xl overflow-hidden border border-border/30" style={{ height: 210 }}>
                    <MapContainer center={mapCenter} zoom={14} style={{ height: '100%', width: '100%' }} zoomControl={false} attributionControl={false}>
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <FitBounds positions={positions} />
                      {pickupCoords && <Marker position={pickupCoords} icon={pickupIcon} />}
                      {deliveryCoords && <Marker position={deliveryCoords} icon={deliveryIcon} />}
                      {userLocation && <Marker position={userLocation} icon={userIcon} />}
                      {positions.length >= 2 && pickupCoords && deliveryCoords && (
                        <Polyline positions={[pickupCoords, deliveryCoords]} pathOptions={{ color: '#3b82f6', weight: 3, dashArray: '6 4' }} />
                      )}
                    </MapContainer>
                  </div>
                )}

                {/* FILA 4: Recojo */}
                <div className="glass-card p-3 rounded-xl">
                  <p className="text-sm text-foreground leading-snug">
                    <strong className="text-muted-foreground uppercase text-[10px] block font-bold mb-0.5">Recojo:</strong>
                    {order.address_a || order.pickup}
                  </p>
                </div>

                {/* FILA 5: Entrega */}
                <div className="glass-card p-3 rounded-xl">
                  <p className="text-sm text-foreground leading-snug">
                    <strong className="text-muted-foreground uppercase text-[10px] block font-bold mb-0.5">Entrega:</strong>
                    {order.address_b || order.delivery}
                  </p>
                </div>

                {/* FILA 6: Tiempo Aprox. Entrega */}
                <div className="glass-card p-3 rounded-xl">
                  <p className="text-sm text-foreground">
                    <strong className="text-muted-foreground uppercase text-[10px] block font-bold mb-0.5">Tiempo Aprox. Entrega:</strong>
                    {order.address_metadata?.duration || order.duration || '—'}
                  </p>
                </div>

                {/* FILA 7: Detalle */}
                <div className="glass-card p-3 rounded-xl">
                  <p className="text-sm text-foreground leading-relaxed">
                    <strong className="text-muted-foreground uppercase text-[10px] block font-bold mb-0.5">Detalle:</strong>
                    {order.description || 'Sin descripción disponible.'}
                  </p>
                </div>

                {/* FILA 8: Botones dinámicos basados en status */}
                <div className="pt-2">
                  {currentStatus === 'active' && (
                    <div className="flex gap-3">
                      <Button
                        variant="flat"
                        color="default"
                        className="flex-1 h-13 font-bold text-destructive hover:bg-destructive/10"
                        onClick={onClose}
                        disabled={isLoading}
                      >
                        Cancelar
                      </Button>
                      <Button
                        color="primary"
                        className="flex-[2] h-13 font-bold shadow-lg shadow-primary/20"
                        onClick={handleAcceptClick}
                        isLoading={isLoading}
                      >
                        Aceptar
                      </Button>
                    </div>
                  )}

                  {currentStatus === 'pre-assigned' && (
                    <div className="flex gap-3">
                      <Button
                        variant="flat"
                        color="danger"
                        className="flex-1 h-13 font-bold"
                        onClick={handleAbortClick}
                        isLoading={isAbortLoading}
                        disabled={isStartLoading}
                      >
                        Abortar Carrera
                      </Button>
                      <Button
                        color="primary"
                        className="flex-[2] h-13 font-bold shadow-lg shadow-primary/20"
                        onClick={handleStartClick}
                        isLoading={isStartLoading}
                        disabled={isAbortLoading}
                      >
                        Iniciar Carrera
                      </Button>
                    </div>
                  )}

                  {['collected', 'running'].includes(currentStatus) && (
                    <Button
                      color="primary"
                      className="w-full h-13 font-bold text-base shadow-lg shadow-primary/20"
                      onClick={handleArrivedClick}
                      isLoading={localActionLoading}
                    >
                      Llegué al lugar
                    </Button>
                  )}

                  {currentStatus === 'arrived' && (
                    <div className="flex gap-3">
                      <Button
                        variant="flat"
                        color="danger"
                        className="flex-1 h-13 font-bold"
                        onClick={() => setShowNotDeliveredConfirm(true)}
                        disabled={localActionLoading}
                      >
                        No se pudo entregar
                      </Button>
                      <Button
                        color="success"
                        className="flex-[2] h-13 font-bold text-white shadow-lg shadow-success/20"
                        onClick={handleCompleteClick}
                        isLoading={localActionLoading}
                      >
                        Entregar
                      </Button>
                    </div>
                  )}
                </div>
              </div>
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
              className="w-full max-w-md bg-background rounded-t-3xl p-6 pb-10"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-full bg-danger/15 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-danger" />
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

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  X, MapPin, Clock, Star, Package, Navigation, ExternalLink,
  Calendar, Zap, DollarSign, ChevronRight,
} from 'lucide-react';
import { Button, Chip } from '@heroui/react';
import { IAddOrder } from '@/interfaces/orders-interface';
import { cn } from '@/lib/utils';

// ─── Iconos de Leaflet ─────────────────────────────────────────────────────────
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
      <span style="transform:rotate(45deg);font-size:10px;font-weight:900;color:white;">${label}</span>
    </div>`,
  });

const pickupIcon = makeIcon('#22c55e', 'A');
const deliveryIcon = makeIcon('#3b82f6', 'B');

// ─── FitBounds ────────────────────────────────────────────────────────────────
const FitBounds = ({ positions }: { positions: [number, number][] }) => {
  const map = useMap();
  useEffect(() => {
    if (positions.length >= 2) {
      map.fitBounds(positions, { padding: [40, 40] });
    }
  }, [map, positions]);
  return null;
};

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Props {
  order: IAddOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onAccept: (order: IAddOrder) => void;
  isLoading?: boolean;
}

// ─── Componente ───────────────────────────────────────────────────────────────
export const OrderDetailModal = ({ order, isOpen, onClose, onAccept, isLoading }: Props) => {
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (isOpen) setMapReady(false);
    const t = setTimeout(() => setMapReady(true), 120);
    return () => clearTimeout(t);
  }, [isOpen]);

  if (!order) return null;

  // Parsear coordenadas
  const parseCoords = (str: string): [number, number] | null => {
    const parts = str?.split(',').map(Number);
    if (parts?.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) return [parts[0], parts[1]];
    return null;
  };

  const pickupCoords = parseCoords(order.pickup) ?? parseCoords(order.address_metadata?.pickup ? `${order.address_metadata.pickup.lat},${order.address_metadata.pickup.lng}` : '') ?? null;
  const deliveryCoords = parseCoords(order.delivery) ?? parseCoords(order.address_metadata?.delivery ? `${order.address_metadata.delivery.lat},${order.address_metadata.delivery.lng}` : '') ?? null;

  const hasMap = !!(pickupCoords && deliveryCoords);
  const mapCenter: [number, number] = pickupCoords ?? [-17.9647, -67.1060];
  const positions: [number, number][] = [pickupCoords, deliveryCoords].filter(Boolean) as [number, number][];

  const mapsUrl = deliveryCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${deliveryCoords[0]},${deliveryCoords[1]}`
    : '#';

  const rewardPts = order.reward_points ?? 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="w-full sm:max-w-lg bg-background rounded-t-3xl sm:rounded-3xl overflow-hidden max-h-[92dvh] flex flex-col"
            style={{ boxShadow: '0 -8px 40px rgba(0,0,0,0.4)' }}
          >
            {/* Header */}
            <div className="px-5 pt-5 pb-3 flex items-center justify-between flex-shrink-0">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-bold">Detalle del Pedido</p>
                <h2 className="text-xl font-display font-bold text-foreground">#{String(order.id).slice(-6).toUpperCase()}</h2>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-muted/80 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Chips de recompensa */}
            <div className="px-5 pb-4 flex gap-2 flex-shrink-0">
              <Chip
                startContent={<DollarSign className="w-3 h-3" />}
                color="success"
                variant="flat"
                size="lg"
                className="font-bold text-base px-3"
              >
                Bs {Number(order.delivery_fee).toFixed(2)}
              </Chip>
              {rewardPts > 0 && (
                <Chip
                  startContent={<Star className="w-3 h-3" />}
                  color="warning"
                  variant="flat"
                  size="lg"
                  className="font-bold text-base px-3"
                >
                  +{rewardPts} pts
                </Chip>
              )}
              <Chip
                startContent={<Clock className="w-3 h-3" />}
                color="primary"
                variant="flat"
                size="sm"
                className="ml-auto text-xs"
              >
                {order.duration || '—'}
              </Chip>
            </div>

            {/* Scrollable content */}
            <div className="overflow-y-auto flex-1 px-5 pb-5 space-y-4">

              {/* Mapa */}
              {hasMap && mapReady && (
                <div className="rounded-2xl overflow-hidden border border-border/30" style={{ height: 200 }}>
                  <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false} attributionControl={false}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <FitBounds positions={positions} />
                    {pickupCoords && <Marker position={pickupCoords} icon={pickupIcon} />}
                    {deliveryCoords && <Marker position={deliveryCoords} icon={deliveryIcon} />}
                    {positions.length === 2 && (
                      <Polyline positions={positions} pathOptions={{ color: '#3b82f6', weight: 3, dashArray: '6 4' }} />
                    )}
                  </MapContainer>
                </div>
              )}

              {/* Acciones rápidas */}
              <div className="flex gap-2">
                <a
                  href={`geo:${pickupCoords?.[0]},${pickupCoords?.[1]}`}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-border/50 text-xs font-bold text-muted-foreground hover:bg-muted/40 transition-colors"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  GPS Recojo
                </a>
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-border/50 text-xs font-bold text-muted-foreground hover:bg-muted/40 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Google Maps
                </a>
              </div>

              {/* Direcciones */}
              <div className="glass-card p-4 space-y-3">
                <div className="flex gap-3">
                  <div className="flex flex-col items-center gap-1 mt-1">
                    <div className="w-3 h-3 rounded-full bg-success border-2 border-success/30" />
                    <div className="w-0.5 flex-1 bg-border min-h-[24px]" />
                    <div className="w-3 h-3 rounded-full bg-primary border-2 border-primary/30" />
                  </div>
                  <div className="flex-1 space-y-3">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold mb-0.5">Recoger en</p>
                      <p className="text-sm font-semibold text-foreground leading-snug">{order.address_a || order.pickup}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold mb-0.5">Entregar en</p>
                      <p className="text-sm font-semibold text-foreground leading-snug">{order.address_b || order.delivery}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Detalles de ruta */}
              {order.address_metadata && (
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Distancia', value: `${order.address_metadata.total_distance_km ?? '—'} km` },
                    { label: 'Tiempo', value: order.address_metadata.duration ?? order.duration ?? '—' },
                    { label: 'Zonas Esp.', value: String(order.address_metadata.zones?.length ?? 0) },
                  ].map(({ label, value }) => (
                    <div key={label} className="glass-card p-2.5 text-center rounded-xl">
                      <p className="text-[9px] text-muted-foreground uppercase font-black tracking-wide mb-0.5">{label}</p>
                      <p className="font-bold text-sm text-foreground">{value}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Descripción */}
              {order.description && (
                <div className="glass-card p-4 rounded-2xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="w-4 h-4 text-primary" />
                    <p className="text-xs font-bold uppercase text-muted-foreground">Descripción del pedido</p>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">{order.description}</p>
                </div>
              )}

              {/* Fecha */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>Entrega: <strong className="text-foreground">{order.delivery_time}</strong></span>
              </div>

              {/* Zonas especiales */}
              {(order.address_metadata?.zones?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {order.address_metadata!.zones.map((z, i) => (
                    <div key={i} className="flex items-center gap-1 text-[10px] font-bold bg-warning/10 text-warning px-2.5 py-1 rounded-full border border-warning/20">
                      <Zap className="w-2.5 h-2.5" />
                      {z.zone_name} (+{z.cost} Bs)
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer con botones */}
            <div className="px-5 pt-3 pb-6 flex gap-3 border-t border-border/30 flex-shrink-0 safe-bottom">
              <Button
                variant="flat"
                color="default"
                className="flex-1 h-13 font-bold"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button
                color="primary"
                className="flex-[2] h-13 font-bold shadow-lg shadow-primary/20"
                onClick={() => onAccept(order)}
                isLoading={isLoading}
                endContent={!isLoading && <ChevronRight className="w-4 h-4" />}
              >
                Aceptar Entrega
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OrderDetailModal;

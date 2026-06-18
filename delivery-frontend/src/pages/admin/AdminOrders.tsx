import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Package, MapPin, Star, Trash2, Clock, Info, ChevronDown, Navigation, Gauge, Edit, Play } from 'lucide-react';
import { Button } from '@heroui/react';
import { useOrderStore } from '@/stores/orderStore';
import { ChallengeModal } from '@/components/modals/ChallengeModal';
import { EditOrderModal } from '@/components/modals/EditOrderModal';

import { orderTypeConfig } from '@/interfaces/orders-interface';
import { getAddressFromCoords } from '@/lib/geoUtils';
import { cn } from '@/lib/utils';

// ─── Helpers de pricing_details ───────────────────────────────────────────────

/** Devuelve etiqueta y color según el extra_rate de una zona */
const getZoneBadge = (rate: number): { label: string; color: string; bg: string } => {
    if (rate >= 1.0) return { label: 'Normal', color: 'text-green-400', bg: 'bg-green-500/10' };
    if (rate >= 0.8) return { label: 'Fácil', color: 'text-lime-400', bg: 'bg-lime-500/10' };
    if (rate >= 0.6) return { label: 'Media', color: 'text-yellow-400', bg: 'bg-yellow-500/10' };
    if (rate >= 0.4) return { label: 'Difícil', color: 'text-orange-400', bg: 'bg-orange-500/10' };
    if (rate >= 0.2) return { label: 'Muy difícil', color: 'text-red-400', bg: 'bg-red-500/10' };
    return { label: 'Extremo', color: 'text-rose-500', bg: 'bg-rose-600/10' };
};

/** Formatea fecha/hora desde string o Date */
const formatTime = (val: any): string => {
    if (!val) return '—';
    try {
        const d = new Date(val);
        if (isNaN(d.getTime())) return String(val);
        return d.toLocaleString('es-BO', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch { return String(val); }
};

// ─── Sub-componente: Dirección desde coordenadas (lazy) ──────────────────────

const AddressText = ({ coords, fallback }: { coords: string; fallback?: string }) => {
    const [address, setAddress] = useState<string>(fallback || 'Cargando...');

    useEffect(() => {
        if (fallback) { setAddress(fallback); return; }
        getAddressFromCoords(coords).then(setAddress);
    }, [coords, fallback]);

    return <span>{address}</span>;
};

// ─── Sub-componente: Desglose de Pricing ─────────────────────────────────────

const PricingBreakdown = ({ pricing, currency }: { pricing: any; currency: string }) => {
    if (!pricing) return null;
    return (
        <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
        >
            <div className="mt-2 p-3 rounded-xl bg-muted/20 border border-border/50 space-y-1.5">
                {/* Tramo normal */}
                <div className="flex items-center justify-between text-[10px]">
                    <span className="flex items-center gap-1.5 text-muted-foreground font-bold">
                        <div className="w-2 h-2 rounded-full bg-emerald-400" />
                        Tramo normal ({pricing.normal_distance_km} km)
                    </span>
                    <span className="font-black text-foreground">{currency} {pricing.normal_cost}</span>
                </div>

                {/* Zonas especiales */}
                {pricing.zones?.map((z: any) => {
                    const badge = getZoneBadge(z.extra_rate);
                    return (
                        <div key={z.zone_id} className="flex items-center justify-between text-[10px]">
                            <span className={cn('flex items-center gap-1.5 font-bold', badge.color)}>
                                <Gauge className="w-2.5 h-2.5" />
                                {z.zone_name} ({z.distance_km} km · ÷{z.extra_rate})
                            </span>
                            <span className="font-black text-orange-400">{currency} {z.cost}</span>
                        </div>
                    );
                })}

                {/* Separador y total */}
                <div className="pt-1 border-t border-border/50 flex items-center justify-between text-[10px]">
                    <span className="font-black text-muted-foreground uppercase tracking-wider">Total</span>
                    <span className="font-black text-primary">{currency} {pricing.total_delivery_fee}</span>
                </div>
            </div>
        </motion.div>
    );
};

// ─── Página Principal ─────────────────────────────────────────────────────────

export const AdminOrders = () => {
    const { orders, fetchOrders, removeOrder, updateOrderStatus, isLoading } = useOrderStore();
    const [showModal, setShowModal] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingOrder, setEditingOrder] = useState<any>(null);
    const [expandedId, setExpandedId] = useState<number | null>(null);

    useEffect(() => {
        fetchOrders();
    }, []);

    const handleDelete = async (id: string) => {
        if (window.confirm('¿Deseas cancelar esta orden permanentemente?')) {
            await removeOrder(id);
        }
    };

    const handleActivate = async (id: string) => {
        if (window.confirm('¿Deseas activar esta orden?')) {
            await updateOrderStatus(id, 'active');
        }
    };

    const handleEdit = (order: any) => {
        setEditingOrder(order);
        setEditModalOpen(true);
    };

    const toggleExpand = (id: number) =>
        setExpandedId(prev => (prev === id ? null : id));

    return (
        <div className="min-h-screen bg-background pb-24 safe-top">
            {/* Header */}
            <div className="glass-card border-b border-border/50 px-4 py-6 mb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-display font-bold tracking-tight">Gestión de Órdenes</h1>
                        <p className="text-[10px] uppercase font-bold text-primary/60 tracking-widest mt-1">
                            {isLoading ? 'Sincronizando...' : `${orders.length} Pedidos en curso`}
                        </p>
                    </div>
                    <Button
                        onClick={() => setShowModal(true)}
                        className="bg-primary text-white font-bold rounded-xl h-11 shadow-lg shadow-primary/20"
                    >
                        <Plus className="w-4 h-4 mr-2" /> Nueva Carrera
                    </Button>
                </div>
            </div>

            {/* Lista de Órdenes */}
            <div className="px-4 space-y-4">
                {orders.map((order: any, index: number) => {
                    const config = orderTypeConfig[order.type] || orderTypeConfig.estandar;
                    const { icon: TypeIcon, label, color } = config;
                    const borderColor = order.type === 'programada' ? '#a855f7' : '#0070f0';

                    // Distancia: preferir pricing_details (ruta real OSRM) o address_metadata
                    const km = order.pricing_details?.route_distance_km
                        ?? order.pricing_details?.total_distance_km
                        ?? order.address_metadata?.route_distance_km
                        ?? order.address_metadata?.total_distance_km
                        ?? (() => {
                            try {
                                const [pLat, pLng] = order.pickup.split(',').map(Number);
                                const [dLat, dLng] = order.delivery.split(',').map(Number);
                                const R = 6371;
                                const dLt = (dLat - pLat) * Math.PI / 180;
                                const dLn = (dLng - pLng) * Math.PI / 180;
                                const a = Math.sin(dLt / 2) ** 2 + Math.cos(pLat * Math.PI / 180) * Math.cos(dLat * Math.PI / 180) * Math.sin(dLn / 2) ** 2;
                                return parseFloat((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2));
                            } catch { return 0; }
                        })();

                    // Dirección: preferir address_metadata o address_a/b
                    const pickupAddr = order.address_a || order.address_metadata?.address_a || null;
                    const deliveryAddr = order.address_b || order.address_metadata?.address_b || null;

                    const hasPricing = !!order.pricing_details;
                    const isExpanded = expandedId === order.id;

                    return (
                        <motion.div
                            key={order.id}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="glass-card p-5 flex flex-col gap-3 relative overflow-hidden border-l-4"
                            style={{ borderLeftColor: borderColor }}
                        >
                            {/* ── ETA badge (top right) ──────────────────────── */}
                            <div className="absolute top-4 right-12 flex items-center gap-1 bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                <Clock className="w-2.5 h-2.5" />
                                <span className="text-[9px] font-black">{formatTime(order.delivery_time)}</span>
                                {order.duration && (
                                    <span className="text-[9px] font-black opacity-70 ml-0.5">· {order.duration}</span>
                                )}
                            </div>

                            {/* ── Header: tipo + cliente ────────────────────── */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className={cn('p-2 rounded-xl bg-muted/50', color)}>
                                        <TypeIcon className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-sm leading-none text-foreground">{order.client_name}</h3>
                                        <div className="flex items-center gap-1 mt-1">
                                            <span className="text-[9px] font-black uppercase text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                                ID: #{order.id}
                                            </span>
                                            <span className={cn(
                                                'text-[9px] font-black uppercase px-1.5 py-0.5 rounded',
                                                order.type === 'programada' ? 'bg-primary/10 text-primary' : 'bg-success/10 text-success'
                                            )}>
                                                {label}
                                            </span>
                                            {/* Badge de estado */}
                                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                                {order.status}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    {order.status === 'pending' && (
                                        <Button
                                            variant="ghost" size="icon"
                                            className="text-success hover:text-success hover:bg-success/10 rounded-full cursor-pointer"
                                            onClick={() => handleActivate(order.id.toString())}
                                        >
                                            <Play className="w-4 h-4" />
                                        </Button>
                                    )}
                                    <Button
                                        variant="ghost" size="icon"
                                        className="text-primary hover:text-primary hover:bg-primary/10 rounded-full cursor-pointer"
                                        onClick={() => handleEdit(order)}
                                    >
                                        <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="ghost" size="icon"
                                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-full cursor-pointer"
                                        onClick={() => handleDelete(order.id)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>

                            {/* ── Ruta Visual ───────────────────────────────── */}
                            <div className="relative pl-6 space-y-3 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-[2px] before:bg-border">
                                <div className="relative">
                                    <div className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-success border-4 border-background shadow-sm" />
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter flex items-center gap-1">
                                        <Navigation className="w-2.5 h-2.5" /> Origen
                                    </p>
                                    <p className="text-xs font-bold text-foreground">
                                        <AddressText coords={order.pickup} fallback={pickupAddr} />
                                    </p>
                                </div>
                                <div className="relative">
                                    <div className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-destructive border-4 border-background shadow-sm" />
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter flex items-center gap-1">
                                        <MapPin className="w-2.5 h-2.5" /> Destino
                                    </p>
                                    <p className="text-xs font-bold text-foreground">
                                        <AddressText coords={order.delivery} fallback={deliveryAddr} />
                                    </p>
                                </div>
                            </div>

                            {/* ── Descripción / Nota ────────────────────────── */}
                            {order.description && (
                                <div className="bg-muted/30 p-2.5 rounded-xl border border-border/50 flex items-start gap-2">
                                    <Info className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                                    <p className="text-[11px] leading-tight text-muted-foreground">
                                        <span className="font-bold text-foreground/70 uppercase mr-1">Nota:</span>
                                        {order.description}
                                    </p>
                                </div>
                            )}

                            {/* ── Footer: stats ────────────────────────────── */}
                            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/50">
                                <div className="flex flex-col">
                                    <span className="text-[8px] uppercase font-black text-muted-foreground">Costo</span>
                                    <span className="text-sm font-black text-primary font-display">
                                        {order.currency} {order.delivery_fee}
                                    </span>
                                </div>
                                <div className="flex flex-col border-x border-border/50 px-2 text-center">
                                    <span className="text-[8px] uppercase font-black text-muted-foreground">Distancia</span>
                                    <span className="text-sm font-black text-foreground font-display flex items-center justify-center gap-1">
                                        <MapPin className="w-3 h-3 text-primary" /> {km} km
                                    </span>
                                </div>
                                <div className="flex flex-col text-right">
                                    <span className="text-[8px] uppercase font-black text-muted-foreground">Recompensa</span>
                                    <span className="text-sm font-black text-accent font-display flex items-center justify-end gap-1">
                                        <Star className="w-3 h-3 fill-accent" /> {order.reward_points ?? 0}
                                    </span>
                                </div>
                            </div>

                            {/* ── Toggle desglose de pricing ────────────────── */}
                            {hasPricing && (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => toggleExpand(order.id)}
                                        className="flex items-center justify-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-primary/60 hover:text-primary transition-colors w-full pt-1 border-t border-border/30"
                                    >
                                        <Gauge className="w-3 h-3" />
                                        {isExpanded ? 'Ocultar desglose' : 'Ver desglose de precio'}
                                        <motion.span animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                                            <ChevronDown className="w-3 h-3" />
                                        </motion.span>
                                    </button>
                                    <AnimatePresence>
                                        {isExpanded && (
                                            <PricingBreakdown
                                                pricing={order.pricing_details}
                                                currency={order.currency || 'BOB'}
                                            />
                                        )}
                                    </AnimatePresence>
                                </>
                            )}
                        </motion.div>
                    );
                })}

                {orders.length === 0 && !isLoading && (
                    <div className="text-center py-20">
                        <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground/20" />
                        <p className="text-muted-foreground font-bold tracking-tight">Sin pedidos activos</p>
                    </div>
                )}
            </div>

            <AnimatePresence>
                <ChallengeModal
                    isOpen={showModal}
                    onClose={() => setShowModal(false)}
                />
                <EditOrderModal
                    isOpen={editModalOpen}
                    onClose={() => {
                        setEditModalOpen(false);
                        setEditingOrder(null);
                    }}
                    order={editingOrder}
                />
            </AnimatePresence>
        </div>
    );
};
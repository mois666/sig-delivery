import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Package, MapPin, Star, Trash2, Clock, Zap, Info } from 'lucide-react';
import { Button } from '@heroui/react';
import { useOrderStore } from '@/stores/orderStore';
import { ChallengeModal } from '@/components/modals/ChallengeModal';

import { orderTypeConfig } from '@/interfaces/orders-interface';
import { calculateDistance, getAddressFromCoords } from '@/lib/geoUtils';
import { cn } from '@/lib/utils';

export const AdminOrders = () => {
    const { orders, fetchOrders, removeOrder, isLoading } = useOrderStore();
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        fetchOrders();
    }, []);

    const handleDelete = async (id: string) => {
        if (window.confirm('¿Deseas cancelar esta orden permanentemente?')) {
            await removeOrder(id);
        }
    };
    const AddressText = ({ coords }: { coords: string }) => {
        const [address, setAddress] = useState<string>("Cargando...");

        useEffect(() => {
            const fetchAddress = async () => {
                const result = await getAddressFromCoords(coords);
                setAddress(result);
            };
            fetchAddress();
        }, [coords]);

        return <span>{address}</span>;
    };

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
                    const { icon: TypeIcon, label, color } = config;                    // Cálculo de distancia dinámica
                    const [pLat, pLng] = order.pickup.split(',').map(Number);
                    const [dLat, dLng] = order.delivery.split(',').map(Number);
                    const km = calculateDistance(pLat, pLng, dLat, dLng);
                    const borderColor = order.type === 'programada' ? '#a855f7' : '#0070f0';

                    return (
                        <motion.div
                            key={order.id}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="glass-card p-5 flex flex-col gap-4 relative overflow-hidden border-l-4"
                            style={{ borderLeftColor: borderColor }}
                        >
                            {/* Top: Status y Tipo */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className={cn("p-2 rounded-xl bg-muted/50", color)}>
                                        <TypeIcon className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-sm leading-none text-foreground">{order.client_name}</h3>
                                        <div className="flex items-center gap-1 mt-1">
                                            <span className="text-[9px] font-black uppercase text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                                ID: #{order.id}
                                            </span>
                                            <span className={cn("text-[9px] font-black uppercase px-1.5 py-0.5 rounded",
                                                order.type === 'programada' ? 'bg-primary/10 text-primary' : 'bg-success/10 text-success'
                                            )}>
                                                {label}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost" size="icon"
                                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-full cursor-pointer"
                                    onClick={() => handleDelete(order.id)}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>

                            {/* Ruta Visual */}
                            <div className="relative pl-6 space-y-4 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-[2px] before:bg-border before:border-dashed">
                                <div className="relative">
                                    <div className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-success border-4 border-background shadow-sm" />
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Origen: </p>
                                    <p className="text-xs font-bold text-foreground">
                                        {order.address_a || <AddressText coords={order.pickup} />}
                                    </p>
                                </div>
                                <div className="relative">
                                    <div className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-destructive border-4 border-background shadow-sm" />
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Destino: </p>
                                    <p className="text-xs font-bold text-foreground">
                                        {order.address_b || <AddressText coords={order.delivery} />}
                                    </p>
                                </div>
                            </div>

                            {/* Descripción Especial */}
                            {order.description && (
                                <div className="bg-muted/30 p-2.5 rounded-xl border border-border/50 flex items-start gap-2">
                                    <Info className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                                    <p className="text-[11px] leading-tight text-muted-foreground">
                                        <span className="font-bold text-foreground/70 uppercase mr-1">Nota:</span>
                                        {order.description}
                                    </p>
                                </div>
                            )}

                            {/* Footer: Stats Financieros */}
                            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/50">
                                <div className="flex flex-col">
                                    <span className="text-[8px] uppercase font-black text-muted-foreground">Costo</span>
                                    <span className="text-sm font-black text-primary font-display">{order.currency} {order.delivery_fee}</span>
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
                                        <Star className="w-3 h-3 fill-accent" /> {order.points}
                                    </span>
                                </div>
                            </div>

                            {/* ETA / Scheduled Delivery Badge */}
                            <div className="absolute top-4 right-12 flex items-center gap-1 bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                <span className="text-[9px] font-black">Entrega: {order.delivery_time}</span>
                                <Clock className="w-2.5 h-2.5 ml-1" />
                                <span className="text-[9px] font-black">{order.duration}</span>
                            </div>
                        </motion.div>
                    );
                })}

                {orders.length === 0 && !isLoading && (
                    <div className="text-center py-20">
                        <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground/20" />
                        <p className="text-muted-foreground font-bold tracking-tight">Oruro sin pedidos activos</p>
                    </div>
                )}
            </div>

            <AnimatePresence>
            <ChallengeModal 
                isOpen={showModal} 
                onClose={() => setShowModal(false)} 
            />
            </AnimatePresence>

            
        </div>
    );
};
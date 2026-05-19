import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowLeft, Wallet as WalletIcon, Star,
    Phone, Calendar, Shield,
    TrendingUp, CreditCard, History,
    Zap
} from 'lucide-react';
import { Button } from '@heroui/react';

import { cn } from '@/lib/utils';
import { useDeliveryStore } from '@/stores/deliveryStore';
import { toast } from 'sonner';
import { useWalletStore } from '@/stores/walletStore';

export const AdminShowDelivery = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { delivery, wallet, showDelivery } = useDeliveryStore();
    const { createWallet } = useWalletStore();
    const [loading, setLoading] = useState(true);

    const fetchDeliveryDetail = async () => {
        try {
            await showDelivery(Number(id));
        } catch (error) {
            toast.error('Error al cargar repartidor');
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        fetchDeliveryDetail();
    }, [id]);

    if (loading) return <div className="min-h-screen flex items-center justify-center">Cargando perfil...</div>;
    if (!delivery) return <div className="min-h-screen flex items-center justify-center">Repartidor no encontrado</div>;

    const handleCreateWallet = async () => {
        try {
            await createWallet(Number(id));
            fetchDeliveryDetail();
            toast.success('Billetera creada');
        } catch (error) {
            toast.error('Error al crear billetera');
        }
    };

    return (
        <div className="min-h-screen bg-background pb-24 safe-top">
            {/* Header con botón atrás */}
            <div className="glass-card mx-4 mt-4 p-4 flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <h1 className="font-display font-bold text-lg">Perfil del Repartidor</h1>
            </div>

            <div className="px-4 mt-6 space-y-6">
                {/* Card Principal: Info Personal */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    className="glass-card p-6 flex flex-col items-center text-center relative overflow-hidden"
                >
                    <div className="w-24 h-24 rounded-3xl gradient-primary flex items-center justify-center mb-4 glow-primary">
                        <span className="text-3xl font-bold text-primary-foreground">
                            {delivery.name.charAt(0)}
                        </span>
                    </div>
                    <h2 className="text-2xl font-bold">{delivery.name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                        <span className={cn(
                            "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
                            delivery.status === 'active' ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'
                        )}>
                            {delivery.status}
                        </span>
                        <span className="text-muted-foreground text-sm">• {delivery.city}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 w-full mt-6 border-t border-border/50 pt-6">
                        <div className="flex flex-col items-center">
                            <Star className="w-5 h-5 text-accent mb-1" />
                            <span className="font-bold">{delivery.points}</span>
                            <span className="text-[10px] text-muted-foreground uppercase font-bold">Puntos Totales</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <TrendingUp className="w-5 h-5 text-primary mb-1" />
                            <span className="font-bold">Nivel {delivery.level || 1}</span>
                            <span className="text-[10px] text-muted-foreground uppercase font-bold">Rango Actual</span>
                        </div>
                    </div>
                </motion.div>

                {/* Card de Billetera */}
                {wallet ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                        className="glass-card p-6 bg-gradient-to-br from-secondary/50 to-background border-primary/20"
                    >
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <WalletIcon className="w-4 h-4 text-primary" />
                                </div>
                                <span className="font-bold">Billetera Digital</span>
                            </div>
                            <CreditCard className="w-5 h-5 text-muted-foreground/50" />
                        </div>

                        <div className="mt-2">
                            <p className="text-sm text-muted-foreground">Saldo Disponible</p>
                            <h3 className="text-3xl font-display font-bold text-foreground">
                                Bs. {delivery.wallet?.balance?.toFixed(2) || "0.00"}
                            </h3>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-6">
                            <Button variant="secondary" className="w-full gap-2 text-xs">
                                <History className="w-3 h-3" /> Ver Movimientos
                            </Button>
                            <Button className="w-full gap-2 text-xs gradient-primary">
                                <Zap className="w-3 h-3" /> Ajustar Saldo
                            </Button>
                        </div>
                    </motion.div>
                ) : (
                    <div className="glass-card p-4 space-y-4">
                        <div className="flex items-center gap-3">
                            {/* Boton para crear billetera */}
                            <Button className="w-full gap-2 text-xs gradient-primary" onClick={handleCreateWallet}>
                                <Zap className="w-3 h-3" /> Crear Billetera
                            </Button>
                        </div>
                    </div>
                )}

                {/* Detalles de contacto */}
                <div className="glass-card p-4 space-y-4">
                    <div className="flex items-center gap-3">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <div>
                            <p className="text-[10px] text-muted-foreground uppercase font-bold">Teléfono de contacto</p>
                            <p className="text-sm font-medium">{delivery.phone}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Shield className="w-4 h-4 text-muted-foreground" />
                        <div>
                            <p className="text-[10px] text-muted-foreground uppercase font-bold">Rol del sistema</p>
                            <p className="text-sm font-medium capitalize">{delivery.role}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <div>
                            <p className="text-[10px] text-muted-foreground uppercase font-bold">Miembro desde</p>
                            <p className="text-sm font-medium">
                                {new Date(delivery.created_at || '').toLocaleDateString('es-BO', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            
        </div>
    );
};
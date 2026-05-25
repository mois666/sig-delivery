import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Package, Bike, Trophy, MapPin, X, Star, RefreshCw, Clock, ArrowRight } from 'lucide-react';
import { Button } from '@heroui/react';
import { useOrderStore } from '@/stores/orderStore';
import { useRankingStore } from '@/stores/rankingStore';

import { cn } from '@/lib/utils';
import { ChallengeModal } from '@/components/modals/ChallengeModal';
import { orderTypeConfig } from '@/interfaces/orders-interface';
import { calculateDistance, getAddressFromCoords } from '@/lib/geoUtils';
import { toast } from 'sonner';
import { useUserStore } from '@/stores/userStore';

const AdminDashboard = () => {
  const { orders, removeOrder, fetchOrders, isLoading } = useOrderStore();
  const { rankings } = useRankingStore();
  const { activeDrivers: fetchActiveDrivers } = useUserStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeDrivers, setActiveDrivers] = useState(0);

  useEffect(() => {
    fetchOrders();
  }, []);
  /* userEffect for active drivers */
  useEffect(() => {
    const loadDrivers = async () => {
      const drivers = await fetchActiveDrivers();
      if (typeof drivers === 'number') {
        setActiveDrivers(drivers);
      }
    };
    loadDrivers();
  }, [fetchActiveDrivers]);

  const stats = [
    { label: 'Pedidos activos', value: orders.length, icon: Package, color: 'text-primary' },
    { label: 'Repartidores', value: activeDrivers, icon: Bike, color: 'text-success' },
    { label: 'Top hoy', value: rankings.daily[0]?.name.split(' ')[0] || '-', icon: Trophy, color: 'text-accent' },
  ];
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
  const handleDelete = (id: string) => {
    if (confirm('¿Estás seguro de eliminar este pedido?')) {
      removeOrder(id);
      fetchOrders();
      toast.success('Pedido eliminado');
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24 safe-top">
      {/* Header */}
      <div className="glass-card border-b border-border/50 px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-display font-bold text-foreground tracking-tight">Panel Admin</h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              {isLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : null}
              {isLoading ? 'Sincronizando...' : 'Gestiona entregas y repartidores'}
            </p>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-primary text-white font-bold h-10 px-4 rounded-xl shadow-lg shadow-primary/20"
          >
            <Plus className="w-4 h-4 mr-1" />
            Nuevo pedido
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glass-card p-3 text-center border-none bg-muted/30"
            >
              <stat.icon className={cn('w-5 h-5 mx-auto mb-1', stat.color)} />
              <p className="text-lg font-bold text-foreground leading-none">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground uppercase font-bold mt-1 tracking-tighter">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="px-4 py-6 space-y-8">
        {/* Active Orders Section */}
        <section>
          <div className="flex justify-between items-center mb-4 px-1">
            <h2 className="text-xs uppercase font-bold text-muted-foreground tracking-widest flex items-center gap-2">
              <Package className="w-3 h-3" /> Carreras activas
            </h2>
            <button
              onClick={() => fetchOrders()}
              disabled={isLoading}
              className="text-[10px] text-primary font-bold hover:underline disabled:opacity-50"
            >
              REFRESCAR
            </button>
          </div>

          <div className="space-y-4">
            {orders.map((order: any, index: number) => {
              const config = orderTypeConfig[order.type] || orderTypeConfig.estandar;
              const { icon: TypeIcon, label, color } = config;
              const borderColor = order.type === 'programada' ? '#a855f7' : '#0070f0';

              // Recalculo de distancia entre pickup y delivery (coordenadas backend)
              let displayDistance = '0 km';
              try {
                if (order.pickup && order.delivery) {
                  const [pLat, pLng] = order.pickup.split(',').map(Number);
                  const [dLat, dLng] = order.delivery.split(',').map(Number);
                  const km = calculateDistance(pLat, pLng, dLat, dLng);
                  displayDistance = `${km} km`;
                }
              } catch (e) {
                displayDistance = 'N/A';
              }

              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="glass-card p-4 relative overflow-hidden group border-l-4"
                  style={{ borderLeftColor: borderColor }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={cn("p-1.5 rounded-lg bg-muted", color)}>
                        <TypeIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-sm font-bold text-foreground block leading-none">{label}</span>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold">
                          {order.client_name} • ID: #{order.id}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider",
                        order.type === 'programada' ? 'bg-primary/10 text-primary' : 'bg-success/10 text-success'
                      )}>
                        {label}
                      </span>
                      <button
                        onClick={() => handleDelete(order.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors p-1 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Ruta simplificada Origen -> Destino */}
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

                  <div className="flex items-center justify-between pt-3 border-t border-border/50">
                    <div className="flex items-center gap-4">
                      {/* Precio */}
                      <div className="flex flex-col">
                        <span className="text-[8px] uppercase font-bold text-muted-foreground">Tarifa</span>
                        <span className="text-sm font-black text-foreground">{order.currency} {order.delivery_fee}</span>
                      </div>
                      {/* Puntos */}
                      <div className="flex flex-col border-x border-border/50 px-4">
                        <span className="text-[8px] uppercase font-bold text-muted-foreground">Puntos</span>
                        <div className="flex items-center gap-0.5 font-black text-accent">
                          <Star className="w-3 h-3 fill-accent" />
                          <span className="text-sm">{order.points}</span>
                        </div>
                      </div>
                      {/* Distancia */}
                      <div className="flex flex-col">
                        <span className="text-[8px] uppercase font-bold text-muted-foreground">Distancia</span>
                        <div className="flex items-center gap-1 text-sm font-black text-primary">
                          <MapPin className="w-3 h-3" />
                          {displayDistance}
                        </div>
                      </div>
                    </div>

                    {/* ETA Badge */}
                    <div className="bg-primary/5 px-2 py-1 rounded-lg flex items-center gap-1.5">
                      <span className="text-[9px] font-black text-muted-foreground">Entrega: {order.delivery_time}</span>
                      <Clock className="w-3 h-3 text-primary ml-1" />
                      <span className="text-[10px] font-bold text-primary">{order.duration}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {orders.length === 0 && !isLoading && (
              <div className="glass-card p-12 text-center border-dashed bg-muted/10">
                <Package className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground italic tracking-tight">No hay pedidos esperando repartidor...</p>
              </div>
            )}
          </div>
        </section>

        {/* Ranking Section */}
        <section>
          <div className="flex items-center gap-2 mb-4 px-1">
            <Trophy className="w-4 h-4 text-accent" />
            <h2 className="text-xs uppercase font-bold text-muted-foreground tracking-widest">Top repartidores hoy</h2>
          </div>

          <div className="space-y-2">
            {rankings.daily.slice(0, 5).map((driver, index) => (
              <motion.div
                key={driver.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + index * 0.05 }}
                className="glass-card p-3 flex items-center gap-3 border-none bg-muted/20"
              >
                <div className={cn(
                  'w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold shadow-sm',
                  index === 0 ? 'bg-accent text-accent-foreground' : 'bg-background text-muted-foreground'
                )}>
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-foreground leading-none">{driver.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-1 uppercase font-semibold">{driver.deliveries} entregas completadas</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-accent/10 rounded-lg">
                    <Star className="w-3 h-3 text-accent fill-accent" />
                    <span className="text-xs font-bold text-accent">{driver.points}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      </div>

      <AnimatePresence>
        {/* Modal para Nueva Carrera */}
        <ChallengeModal 
          isOpen={showCreateModal} 
          onClose={() => setShowCreateModal(false)} 
        />
      </AnimatePresence>

      
    </div>
  );
};

export default AdminDashboard;
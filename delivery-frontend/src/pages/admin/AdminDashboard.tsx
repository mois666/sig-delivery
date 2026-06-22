import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, MapPin, Star, RefreshCw, Clock, X } from 'lucide-react';
import { Button } from '@heroui/react';
import { useOrderStore } from '@/stores/orderStore';
import { useRankingStore } from '@/stores/rankingStore';
import { useUserStore } from '@/stores/userStore';
import { ChallengeModal } from '@/components/modals/ChallengeModal';
import { orderTypeConfig } from '@/interfaces/orders-interface';
import { calculateDistance, getAddressFromCoords } from '@/lib/geoUtils';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// react-icons
import { FiPackage, FiTruck, FiAward, FiZap } from 'react-icons/fi';
import { GiPodium } from 'react-icons/gi';
import { HiOutlineClipboardList, HiOutlineLightningBolt } from 'react-icons/hi';
import { MdDeliveryDining } from 'react-icons/md';

const formatTime = (val: any): string => {
  if (!val) return '—';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return d.toLocaleString('es-BO', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch { return String(val); }
};

const AddressText = ({ coords }: { coords: string }) => {
  const [address, setAddress] = useState<string>('Cargando...');
  useEffect(() => {
    getAddressFromCoords(coords).then(setAddress);
  }, [coords]);
  return <span>{address}</span>;
};

// ─── Card de orden ─────────────────────────────────────────────────────────────
const OrderCard = ({
  order,
  showDelete = false,
  onDelete,
}: {
  order: any;
  showDelete?: boolean;
  onDelete?: (id: string) => void;
}) => {
  const config = orderTypeConfig[order.type] || orderTypeConfig.estandar;
  const { icon: TypeIcon, label, color } = config;

  const routeKm =
    order.pricing_details?.route_distance_km ??
    order.pricing_details?.total_distance_km ??
    order.address_metadata?.route_distance_km ??
    order.address_metadata?.total_distance_km;

  let displayDistance = '0 km';
  if (routeKm !== undefined && routeKm !== null) {
    displayDistance = `${routeKm} km`;
  } else {
    try {
      if (order.pickup && order.delivery) {
        const [pLat, pLng] = order.pickup.split(',').map(Number);
        const [dLat, dLng] = order.delivery.split(',').map(Number);
        displayDistance = `${calculateDistance(pLat, pLng, dLat, dLng)} km`;
      }
    } catch { displayDistance = 'N/A'; }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="glass-card p-4 flex flex-col gap-3 relative overflow-hidden border-l-4 h-full"
      style={{ borderLeftColor: order.type === 'programada' ? '#a855f7' : '#0070f0' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={cn('p-1.5 rounded-lg bg-muted/50 shrink-0', color)}>
            <TypeIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground truncate">{order.client_name}</p>
            <p className="text-[10px] text-muted-foreground uppercase font-bold">
              #{order.id} · <span className={cn('px-1 rounded', order.type === 'programada' ? 'bg-primary/10 text-primary' : 'bg-success/10 text-success')}>{label}</span>
            </p>
          </div>
        </div>
        {showDelete && onDelete && (
          <button
            onClick={() => onDelete(order.id)}
            className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded-lg hover:bg-destructive/10 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Ruta */}
      <div className="relative pl-5 space-y-2 before:absolute before:left-[6px] before:top-2 before:bottom-2 before:w-[2px] before:bg-border">
        <div className="relative">
          <div className="absolute -left-[17px] top-1 w-2.5 h-2.5 rounded-full bg-success border-[3px] border-background" />
          <p className="text-[9px] text-muted-foreground uppercase font-bold">Origen</p>
          <p className="text-xs font-semibold text-foreground leading-tight">
            {order.address_a || <AddressText coords={order.pickup} />}
          </p>
        </div>
        <div className="relative">
          <div className="absolute -left-[17px] top-1 w-2.5 h-2.5 rounded-full bg-destructive border-[3px] border-background" />
          <p className="text-[9px] text-muted-foreground uppercase font-bold">Destino</p>
          <p className="text-xs font-semibold text-foreground leading-tight">
            {order.address_b || <AddressText coords={order.delivery} />}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-border/50 mt-auto">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-[8px] uppercase font-bold text-muted-foreground">Tarifa</span>
            <span className="text-sm font-black text-foreground">{order.currency} {order.delivery_fee}</span>
          </div>
          <div className="flex flex-col border-x border-border/50 px-3">
            <span className="text-[8px] uppercase font-bold text-muted-foreground">Pts</span>
            <div className="flex items-center gap-0.5 text-accent font-black">
              <Star className="w-3 h-3 fill-accent" />
              <span className="text-sm">{order.reward_points ?? 0}</span>
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-[8px] uppercase font-bold text-muted-foreground">Dist.</span>
            <div className="flex items-center gap-0.5 text-primary font-black text-sm">
              <MapPin className="w-3 h-3" />
              {displayDistance}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-primary/8 px-2 py-1 rounded-lg">
          <Clock className="w-3 h-3 text-primary" />
          <span className="text-[9px] font-black text-primary">{formatTime(order.delivery_time)}</span>
        </div>
      </div>
    </motion.div>
  );
};

// ─── Podio del top 3 ──────────────────────────────────────────────────────────
const PodiumItem = ({
  rank,
  name,
  points,
  deliveries,
  height,
  color,
  medal,
}: {
  rank: number;
  name: string;
  points: number;
  deliveries: number;
  height: string;
  color: string;
  medal: string;
}) => (
  <div className="flex flex-col items-center gap-2 flex-1">
    <div className="text-center">
      <p className="text-xs font-black text-foreground truncate w-20 text-center">{name.split(' ')[0]}</p>
      <div className="flex items-center justify-center gap-0.5 mt-0.5">
        <Star className="w-3 h-3 fill-accent text-accent" />
        <span className="text-xs font-black text-accent">{points}</span>
      </div>
    </div>
    <div
      className={cn('w-full rounded-t-xl flex flex-col items-center justify-start pt-3 relative', color, height)}
      style={{ minWidth: 60 }}
    >
      <span className="text-2xl">{medal}</span>
      <span className="text-[10px] font-black text-white/80 mt-1">{deliveries} entregas</span>
      <span className="absolute -top-5 text-xs font-black text-muted-foreground">#{rank}</span>
    </div>
  </div>
);

// ─── Dashboard Principal ───────────────────────────────────────────────────────
const AdminDashboard = () => {
  const { orders, removeOrder, fetchOrders, updateOrderStatus, isLoading } = useOrderStore();
  const { rankings, fetchRankings, isLoading: rankingLoading } = useRankingStore();
  const { activeDrivers: fetchActiveDrivers } = useUserStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeDrivers, setActiveDrivers] = useState(0);
  const [activeSection, setActiveSection] = useState<'panel' | 'assigned' | 'active' | 'top'>('panel');

  useEffect(() => {
    fetchOrders();
    fetchRankings('daily');
    fetchActiveDrivers().then((n) => {
      if (typeof n === 'number') setActiveDrivers(n);
    });
  }, []);

  const assignedOrders = useMemo(() => orders.filter((o: any) => o.status === 'assigned'), [orders]);
  const activeOrders = useMemo(() => orders.filter((o: any) => o.status === 'active'), [orders]);
  const topDrivers = rankings.daily;

  const handleRevertToActive = async (id: string) => {
    const order = orders.find((o: any) => o.id === id);
    if (!order) return;
    // Validar que la orden esté en estado 'active' y no en un sub-estado de entrega
    const assignment = order.assignments?.[0];
    if (assignment && ['running', 'collected', 'arrived', 'delivered'].includes(assignment.status)) {
      toast.error(`No se puede revertir: el repartidor está en estado "${assignment.status}"`);
      return;
    }
    if (window.confirm('¿Regresar esta carrera a estado pendiente?')) {
      await updateOrderStatus(id, 'pending');
      await fetchOrders();
      toast.success('Carrera devuelta a pendiente');
    }
  };

  const stats = [
    {
      label: 'Pedidos Activos',
      value: orders.filter((o: any) => ['pending', 'active', 'assigned'].includes(o.status)).length,
      icon: FiPackage,
      gradient: 'from-blue-500 to-blue-700',
      bg: 'bg-blue-500/10',
      text: 'text-blue-400',
    },
    {
      label: 'Repartidores',
      value: activeDrivers,
      icon: MdDeliveryDining,
      gradient: 'from-emerald-500 to-emerald-700',
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
    },
    {
      label: 'Top Hoy',
      value: topDrivers[0]?.name?.split(' ')[0] || '—',
      icon: FiAward,
      gradient: 'from-amber-500 to-amber-700',
      bg: 'bg-amber-500/10',
      text: 'text-amber-400',
    },
  ];

  const sections = [
    { id: 'panel', label: 'Panel', icon: FiZap },
    { id: 'assigned', label: 'Asignadas', icon: HiOutlineClipboardList, badge: assignedOrders.length },
    { id: 'active', label: 'Activas', icon: HiOutlineLightningBolt, badge: activeOrders.length },
    { id: 'top', label: 'Top Drivers', icon: GiPodium },
  ] as const;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-black text-foreground tracking-tight">Panel Admin</h1>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
            {isLoading && <RefreshCw className="w-3 h-3 animate-spin text-primary" />}
            {isLoading ? 'Sincronizando...' : 'Gestión de entregas en tiempo real'}
          </p>
        </div>
        <Button
          onPress={() => setShowCreateModal(true)}
          className="bg-primary text-white font-bold h-10 px-4 rounded-xl shadow-lg shadow-primary/20"
        >
          <Plus className="w-4 h-4 mr-1" />
          Nuevo pedido
        </Button>
      </div>

      {/* ── Tab Nav ── */}
      <div className="flex gap-2 bg-muted/40 p-1 rounded-2xl mb-6 border border-border/30">
        {sections.map((sec) => {
          const Icon = sec.icon;
          const isActive = activeSection === sec.id;
          return (
            <button
              key={sec.id}
              onClick={() => setActiveSection(sec.id as any)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 relative',
                isActive
                  ? 'bg-primary text-white shadow-md shadow-primary/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:block">{sec.label}</span>
              {'badge' in sec && sec.badge > 0 && (
                <span className={cn(
                  'absolute -top-1 -right-1 text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center',
                  isActive ? 'bg-white text-primary' : 'bg-primary text-white'
                )}>
                  {sec.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {/* ────────────── PANEL ADMIN ────────────── */}
        {activeSection === 'panel' && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Stats cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {stats.map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="glass-card p-5 relative overflow-hidden group"
                  >
                    <div className={cn('absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-20', stat.bg)} />
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[11px] uppercase font-bold text-muted-foreground tracking-widest">{stat.label}</p>
                        <p className={cn('text-3xl font-black mt-1 leading-none', stat.text)}>{stat.value}</p>
                      </div>
                      <div className={cn('p-3 rounded-xl', stat.bg)}>
                        <Icon className={cn('w-6 h-6', stat.text)} />
                      </div>
                    </div>
                    <div className={cn('absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r opacity-60', stat.gradient)} />
                  </motion.div>
                );
              })}
            </div>

            {/* Quick overview cards */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setActiveSection('assigned')}
                className="glass-card p-4 text-left hover:border-primary/50 transition-all group"
              >
                <div className="flex items-center gap-2 mb-2">
                  <HiOutlineClipboardList className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Asignadas</span>
                </div>
                <p className="text-2xl font-black text-foreground">{assignedOrders.length}</p>
                <p className="text-[10px] text-primary font-bold mt-1 group-hover:underline">Ver carreras →</p>
              </button>
              <button
                onClick={() => setActiveSection('active')}
                className="glass-card p-4 text-left hover:border-emerald-500/50 transition-all group"
              >
                <div className="flex items-center gap-2 mb-2">
                  <HiOutlineLightningBolt className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Activas</span>
                </div>
                <p className="text-2xl font-black text-foreground">{activeOrders.length}</p>
                <p className="text-[10px] text-emerald-400 font-bold mt-1 group-hover:underline">Ver carreras →</p>
              </button>
            </div>

            {/* Mini top 3 preview */}
            {topDrivers.length > 0 && (
              <div className="glass-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <GiPodium className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Top 3 hoy</span>
                  </div>
                  <button onClick={() => setActiveSection('top')} className="text-[10px] text-primary font-bold hover:underline">
                    Ver todos →
                  </button>
                </div>
                <div className="space-y-2">
                  {topDrivers.slice(0, 3).map((d, i) => (
                    <div key={d.id} className="flex items-center gap-3">
                      <div className={cn(
                        'w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0',
                        i === 0 ? 'bg-amber-500 text-white' : i === 1 ? 'bg-gray-400 text-white' : 'bg-amber-700 text-white'
                      )}>
                        {i + 1}
                      </div>
                      <p className="text-sm font-bold text-foreground flex-1">{d.name}</p>
                      <div className="flex items-center gap-1 bg-accent/10 px-2 py-0.5 rounded-full">
                        <Star className="w-3 h-3 fill-accent text-accent" />
                        <span className="text-xs font-black text-accent">{d.points}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ────────────── CARRERAS ASIGNADAS ────────────── */}
        {activeSection === 'assigned' && (
          <motion.div
            key="assigned"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <HiOutlineClipboardList className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-bold text-foreground">Carreras Asignadas</h2>
                <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-black">{assignedOrders.length}</span>
              </div>
              <button onClick={() => fetchOrders()} className="text-[10px] text-primary font-bold hover:underline flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> Refrescar
              </button>
            </div>
            {assignedOrders.length === 0 ? (
              <div className="glass-card p-12 text-center border-dashed">
                <HiOutlineClipboardList className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No hay carreras asignadas</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence>
                  {assignedOrders.map((order: any) => (
                    <OrderCard key={order.id} order={order} showDelete={false} />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        )}

        {/* ────────────── CARRERAS ACTIVAS ────────────── */}
        {activeSection === 'active' && (
          <motion.div
            key="active"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <HiOutlineLightningBolt className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-bold text-foreground">Carreras Activas</h2>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-black">{activeOrders.length}</span>
              </div>
              <button onClick={() => fetchOrders()} className="text-[10px] text-primary font-bold hover:underline flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> Refrescar
              </button>
            </div>
            {activeOrders.length === 0 ? (
              <div className="glass-card p-12 text-center border-dashed">
                <HiOutlineLightningBolt className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No hay carreras activas</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence>
                  {activeOrders.map((order: any) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      showDelete={true}
                      onDelete={handleRevertToActive}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        )}

        {/* ────────────── TOP REPARTIDORES ────────────── */}
        {activeSection === 'top' && (
          <motion.div
            key="top"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <GiPodium className="w-5 h-5 text-amber-400" />
                <h2 className="text-sm font-bold text-foreground">Top Repartidores Hoy</h2>
              </div>
              {rankingLoading && <RefreshCw className="w-4 h-4 animate-spin text-primary" />}
            </div>

            {topDrivers.length === 0 && !rankingLoading ? (
              <div className="glass-card p-12 text-center border-dashed">
                <GiPodium className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Sin datos de ranking hoy</p>
              </div>
            ) : (
              <>
                {/* Podio top 3 */}
                {topDrivers.length >= 3 && (
                  <div className="glass-card p-6 mb-6 overflow-hidden relative">
                    <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-amber-500/5 to-transparent" />
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest text-center mb-6">🏆 Podio del día</p>
                    <div className="flex items-end justify-center gap-3 h-40">
                      {/* 2do lugar */}
                      <PodiumItem
                        rank={2}
                        name={topDrivers[1]?.name || '—'}
                        points={topDrivers[1]?.points || 0}
                        deliveries={topDrivers[1]?.deliveries || 0}
                        height="h-24"
                        color="bg-gradient-to-b from-gray-400 to-gray-600"
                        medal="🥈"
                      />
                      {/* 1er lugar */}
                      <PodiumItem
                        rank={1}
                        name={topDrivers[0]?.name || '—'}
                        points={topDrivers[0]?.points || 0}
                        deliveries={topDrivers[0]?.deliveries || 0}
                        height="h-36"
                        color="bg-gradient-to-b from-amber-400 to-amber-600"
                        medal="🥇"
                      />
                      {/* 3er lugar */}
                      <PodiumItem
                        rank={3}
                        name={topDrivers[2]?.name || '—'}
                        points={topDrivers[2]?.points || 0}
                        deliveries={topDrivers[2]?.deliveries || 0}
                        height="h-20"
                        color="bg-gradient-to-b from-amber-700 to-amber-900"
                        medal="🥉"
                      />
                    </div>
                  </div>
                )}

                {/* Lista 4-10 */}
                {topDrivers.length > 3 && (
                  <div className="glass-card overflow-hidden">
                    <div className="px-4 py-3 border-b border-border/50 flex items-center gap-2">
                      <FiTruck className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Posiciones 4 – 10</span>
                    </div>
                    <div className="divide-y divide-border/30">
                      {topDrivers.slice(3).map((driver, index) => (
                        <motion.div
                          key={driver.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex items-center gap-3 p-3 hover:bg-muted/20 transition-colors"
                        >
                          <div className="w-8 h-8 rounded-xl bg-muted/50 flex items-center justify-center text-sm font-black text-muted-foreground">
                            {index + 4}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-foreground">{driver.name}</p>
                            <p className="text-[10px] text-muted-foreground">{driver.deliveries} entregas</p>
                          </div>
                          <div className="flex items-center gap-1 bg-accent/10 px-2 py-1 rounded-lg">
                            <Star className="w-3 h-3 fill-accent text-accent" />
                            <span className="text-xs font-black text-accent">{driver.points}</span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        <ChallengeModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
        />
      </AnimatePresence>
    </div>
  );
};

export default AdminDashboard;
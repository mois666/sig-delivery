import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet as WalletIcon, Star, TrendingUp, Users, X, Clock, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';
import { Button } from '@heroui/react';
import { useAdminWalletStore, DriverWallet } from '@/stores/adminWalletStore';
import { cn } from '@/lib/utils';

const formatDate = (val: any): string => {
  if (!val) return '—';
  try {
    const d = new Date(val);
    return d.toLocaleString('es-BO', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch { return String(val); }
};

const txTypeConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  earning: { label: 'Ganancia', color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: ArrowUpRight },
  bonus: { label: 'Bono', color: 'text-amber-400', bg: 'bg-amber-500/10', icon: Star },
  commission: { label: 'Comisión', color: 'text-red-400', bg: 'bg-red-500/10', icon: ArrowDownRight },
  withdrawal: { label: 'Retiro', color: 'text-blue-400', bg: 'bg-blue-500/10', icon: ArrowUpRight },
  points: { label: 'Puntos', color: 'text-purple-400', bg: 'bg-purple-500/10', icon: Star },
};

// ─── Modal de Transacciones ────────────────────────────────────────────────────
const TransactionsModal = ({
  driver,
  onClose,
}: {
  driver: DriverWallet;
  onClose: () => void;
}) => {
  const { transactions, fetchDriverTransactions, isLoadingTx } = useAdminWalletStore();

  useEffect(() => {
    fetchDriverTransactions(driver.id);
  }, [driver.id]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-background border border-border/50 rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-5 border-b border-border/50 flex items-center justify-between">
            <div>
              <h2 className="font-black text-foreground">{driver.name}</h2>
              <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-wide">Historial de Billetera</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Balance</p>
                <p className="text-lg font-black text-foreground">Bs {driver.balance.toFixed(2)}</p>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-xl bg-muted/50 flex items-center justify-center hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Lista de transacciones */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {isLoadingTx ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-12">
                <WalletIcon className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Sin transacciones registradas</p>
              </div>
            ) : (
              transactions.map((tx: any) => {
                const conf = txTypeConfig[tx.type] || txTypeConfig.earning;
                const TxIcon = conf.icon;
                const isPositive = tx.amount >= 0;
                return (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 border border-border/30 hover:bg-muted/30 transition-colors"
                  >
                    <div className={cn('p-2 rounded-xl', conf.bg)}>
                      <TxIcon className={cn('w-4 h-4', conf.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{tx.reference || conf.label}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={cn('text-[9px] font-black uppercase px-1.5 py-0.5 rounded', conf.bg, conf.color)}>{conf.label}</span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" /> {formatDate(tx.created_at)}
                        </span>
                      </div>
                    </div>
                    <span className={cn('text-sm font-black', isPositive ? 'text-emerald-400' : 'text-red-400')}>
                      {isPositive ? '+' : ''}Bs {tx.amount}
                    </span>
                  </motion.div>
                );
              })
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ─── Tarjeta de conductor ──────────────────────────────────────────────────────
const DriverCard = ({
  driver,
  index,
  onViewMore,
}: {
  driver: DriverWallet;
  index: number;
  onViewMore: (d: DriverWallet) => void;
}) => {
  const statusColors: Record<string, string> = {
    active: 'bg-emerald-500/10 text-emerald-400',
    inactive: 'bg-muted text-muted-foreground',
    suspended: 'bg-red-500/10 text-red-400',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="glass-card p-5 flex flex-col gap-4 relative overflow-hidden group"
    >
      <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* Top: Avatar + nombre */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center font-black text-primary text-lg">
          {driver.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-black text-foreground truncate">{driver.name}</p>
          <p className="text-[10px] text-muted-foreground font-bold">{driver.phone}</p>
        </div>
        <span className={cn('text-[9px] font-black uppercase px-2 py-1 rounded-full', statusColors[driver.status] || statusColors.inactive)}>
          {driver.status}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-muted/30 rounded-xl p-2.5 text-center">
          <p className="text-[9px] uppercase font-bold text-muted-foreground mb-0.5">Balance</p>
          <p className="text-sm font-black text-foreground">Bs {driver.balance.toFixed(2)}</p>
        </div>
        <div className="bg-amber-500/10 rounded-xl p-2.5 text-center">
          <p className="text-[9px] uppercase font-bold text-muted-foreground mb-0.5">Puntos</p>
          <div className="flex items-center justify-center gap-0.5">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <p className="text-sm font-black text-amber-400">{driver.points}</p>
          </div>
        </div>
        <div className="bg-primary/10 rounded-xl p-2.5 text-center">
          <p className="text-[9px] uppercase font-bold text-muted-foreground mb-0.5">Nivel</p>
          <p className="text-sm font-black text-primary">Nv. {driver.level}</p>
        </div>
      </div>

      <Button
        onPress={() => onViewMore(driver)}
        variant="bordered"
        className="w-full h-9 text-xs font-black border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all"
      >
        Ver más...
      </Button>
    </motion.div>
  );
};

// ─── Página Principal ──────────────────────────────────────────────────────────
const AdminWallets = () => {
  const { drivers, fetchDriverWallets, selectDriver, selectedDriver, isLoading } = useAdminWalletStore();

  useEffect(() => {
    fetchDriverWallets();
  }, []);

  const totalBalance = drivers.reduce((s, d) => s + d.balance, 0);
  const totalPoints = drivers.reduce((s, d) => s + d.points, 0);
  const activeCount = drivers.filter((d) => d.status === 'active').length;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-black text-foreground tracking-tight">Billeteras</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Gestiona fondos y puntos de conductores</p>
        </div>
        <Button
          onPress={() => fetchDriverWallets()}
          isIconOnly
          variant="bordered"
          className="border-border/50"
          isLoading={isLoading}
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Balance Total', value: `Bs ${totalBalance.toFixed(2)}`, icon: WalletIcon, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'Puntos Totales', value: totalPoints.toLocaleString(), icon: Star, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { label: 'Conductores Activos', value: activeCount, icon: Users, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="glass-card p-5 flex items-center gap-4"
            >
              <div className={cn('p-3 rounded-xl', s.bg)}>
                <Icon className={cn('w-5 h-5', s.color)} />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{s.label}</p>
                <p className={cn('text-xl font-black', s.color)}>{s.value}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Grid de conductores */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : drivers.length === 0 ? (
        <div className="glass-card p-12 text-center border-dashed">
          <Users className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-muted-foreground">No hay conductores registrados</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {drivers.map((driver, i) => (
            <DriverCard
              key={driver.id}
              driver={driver}
              index={i}
              onViewMore={(d) => selectDriver(d)}
            />
          ))}
        </div>
      )}

      {/* Modal de transacciones */}
      {selectedDriver && (
        <TransactionsModal
          driver={selectedDriver}
          onClose={() => selectDriver(null)}
        />
      )}
    </div>
  );
};

export default AdminWallets;

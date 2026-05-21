import { useState } from 'react';
import { motion } from 'framer-motion';
import { Wallet as WalletIcon, Star, ArrowUpRight, Clock, Filter } from 'lucide-react';
import { useWalletStore, TransactionType } from '@/stores/walletStore';
import TransactionItem from '@/components/TransactionItem';

import { Button } from '@heroui/react';
import { cn } from '@/lib/utils';

type FilterType = 'all' | TransactionType;

const filterLabels: Record<FilterType, string> = {
  all: 'Todo',
  earning: 'Ganancias',
  bonus: 'Bonos',
  commission: 'Comisiones',
  withdrawal: 'Retiros',
  points: 'Puntos',
};

const Wallet = () => {
  const { balance, pendingBalance, totalPoints, transactions } = useWalletStore();
  const [filter, setFilter] = useState<FilterType>('all');

  const filteredTransactions = filter === 'all'
    ? transactions
    : transactions.filter((t) => t.type === filter);

  const moneyTransactions = transactions.filter((t) => t.type !== 'points');
  const pointsTransactions = transactions.filter((t) => t.type === 'points');

  return (
    <div className="min-h-screen bg-background pb-24 safe-top">
      {/* Balance Cards */}
      <div className="px-4 py-6 space-y-4">
        {/* Money Balance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary opacity-10 rounded-full blur-3xl" />
          
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Balance disponible</p>
              <h2 className="text-4xl font-display font-bold text-foreground">
                Bs {balance}
              </h2>
            </div>
            <div className="w-12 h-12 rounded-full bg-primary/20 text-primary flex items-center justify-center shadow-inner">
              <WalletIcon className="w-6 h-6 text-primary" />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-warning" />
              <span className="text-sm text-muted-foreground">
                Pendiente: <span className="text-warning font-medium">Bs {pendingBalance}</span>
              </span>
            </div>
          </div>

          <Button color="primary" className="w-full mt-4 h-12 font-semibold touch-target">
            <ArrowUpRight className="w-4 h-4 mr-2" />
            Retirar fondos
          </Button>
        </motion.div>

        {/* Points Balance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-4 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-warning opacity-10 rounded-full blur-3xl" />
          
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Puntos acumulados</p>
              <div className="flex items-center gap-2">
                <Star className="w-6 h-6 text-accent" />
                <span className="text-2xl font-display font-bold text-foreground">
                  {totalPoints.toLocaleString()}
                </span>
              </div>
            </div>
            <Button variant="outline" className="border-accent text-accent hover:bg-accent/10">
              Canjear
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="px-4 pb-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Filtrar por</span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {(Object.keys(filterLabels) as FilterType[]).map((filterType) => (
            <button
              key={filterType}
              onClick={() => setFilter(filterType)}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all touch-target',
                filter === filterType
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {filterLabels[filterType]}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions List */}
      <div className="px-4">
        <h3 className="text-sm font-medium text-muted-foreground mb-4">Historial de transacciones</h3>
        
        {filteredTransactions.length > 0 ? (
          <div className="glass-card p-4">
            {filteredTransactions.map((transaction) => (
              <TransactionItem key={transaction.id} transaction={transaction} />
            ))}
          </div>
        ) : (
          <div className="glass-card p-8 text-center">
            <WalletIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No hay transacciones</p>
          </div>
        )}
      </div>

      
    </div>
  );
};

export default Wallet;

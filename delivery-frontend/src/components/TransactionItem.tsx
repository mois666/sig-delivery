import { cn } from '@/lib/utils';
import { TransactionType, Transaction } from '@/stores/walletStore';
import { ArrowDownLeft, ArrowUpRight, Gift, Percent, Star, Wallet } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface TransactionItemProps {
  transaction: Transaction;
}

const typeConfig: Record<TransactionType, { icon: typeof ArrowUpRight; color: string; bgColor: string }> = {
  earning: { icon: ArrowDownLeft, color: 'text-success', bgColor: 'bg-success/20' },
  bonus: { icon: Gift, color: 'text-accent', bgColor: 'bg-accent/20' },
  commission: { icon: Percent, color: 'text-destructive', bgColor: 'bg-destructive/20' },
  withdrawal: { icon: Wallet, color: 'text-warning', bgColor: 'bg-warning/20' },
  points: { icon: Star, color: 'text-primary', bgColor: 'bg-primary/20' },
};

const TransactionItem = ({ transaction }: TransactionItemProps) => {
  const { icon: Icon, color, bgColor } = typeConfig[transaction.type];
  const isPositive = transaction.amount > 0;
  const isPoints = transaction.type === 'points';

  return (
    <div className="flex items-center gap-4 py-3 border-b border-border/50 last:border-0">
      <div className={cn('w-10 h-10 rounded-full flex items-center justify-center', bgColor)}>
        <Icon className={cn('w-5 h-5', color)} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate">{transaction.description}</p>
        <p className="text-xs text-muted-foreground">
          {format(transaction.createdAt, "d MMM, HH:mm", { locale: es })}
        </p>
      </div>

      <div className="text-right">
        <p className={cn(
          'font-bold text-lg',
          isPoints ? 'text-primary' : (isPositive ? 'text-success' : 'text-destructive')
        )}>
          {isPositive ? '+' : ''}{isPoints ? '' : 'Bs '}{Math.abs(transaction.amount)}
          {isPoints && ' pts'}
        </p>
      </div>
    </div>
  );
};

export default TransactionItem;

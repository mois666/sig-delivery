import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { RankingEntry } from '@/stores/rankingStore';
import { TrendingUp, TrendingDown, Minus, Trophy, Star } from 'lucide-react';

interface RankingCardProps {
  entry: RankingEntry;
  isCurrentUser: boolean;
  animationDelay?: number;
}

const trendIcons = {
  up: TrendingUp,
  down: TrendingDown,
  same: Minus,
};

const trendColors = {
  up: 'text-success',
  down: 'text-destructive',
  same: 'text-muted-foreground',
};

const RankingCard = ({ entry, isCurrentUser, animationDelay = 0 }: RankingCardProps) => {
  const TrendIcon = trendIcons[entry.trend];
  
  const getRankBadge = () => {
    if (entry.rank === 1) return { className: 'gradient-gold', icon: Trophy };
    if (entry.rank === 2) return { className: 'bg-gray-400', icon: Trophy };
    if (entry.rank === 3) return { className: 'bg-amber-700', icon: Trophy };
    return null;
  };

  const rankBadge = getRankBadge();

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: animationDelay, duration: 0.3 }}
      className={cn(
        'glass-card p-4 flex items-center gap-4',
        isCurrentUser && 'ring-2 ring-primary glow-primary'
      )}
    >
      {/* Rank */}
      <div className="relative">
        {rankBadge ? (
          <div className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center',
            rankBadge.className
          )}>
            <rankBadge.icon className="w-5 h-5 text-primary-foreground" />
          </div>
        ) : (
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
            <span className="text-lg font-bold text-secondary-foreground">#{entry.rank}</span>
          </div>
        )}
      </div>

      {/* Avatar & Name */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <span className="text-sm font-bold text-primary-foreground">
              {entry.name.charAt(0)}
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={cn(
                'font-semibold truncate',
                isCurrentUser ? 'text-primary' : 'text-foreground'
              )}>
                {entry.name}
              </span>
              {isCurrentUser && (
                <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
                  TÚ
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Nivel {entry.level}</span>
              <span>•</span>
              <span>{entry.deliveries} entregas</span>
            </div>
          </div>
        </div>
      </div>

      {/* Points & Trend */}
      <div className="text-right">
        <div className="flex items-center gap-1 justify-end">
          <Star className="w-4 h-4 text-accent" />
          <span className="font-bold text-lg text-foreground">{entry.points.toLocaleString()}</span>
        </div>
        <div className={cn('flex items-center gap-1 justify-end text-xs', trendColors[entry.trend])}>
          <TrendIcon className="w-3 h-3" />
          <span className="capitalize">{entry.trend === 'same' ? 'Igual' : entry.trend === 'up' ? 'Subió' : 'Bajó'}</span>
        </div>
      </div>
    </motion.div>
  );
};

export default RankingCard;

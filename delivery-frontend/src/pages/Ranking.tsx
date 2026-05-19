import { useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Star, Target, Gift } from 'lucide-react';
import { useRankingStore, RankingPeriod } from '@/stores/rankingStore';
import { useAuthStore } from '@/stores/authStore';
import RankingCard from '@/components/RankingCard';

import { cn } from '@/lib/utils';

const periodLabels: Record<RankingPeriod, string> = {
  daily: 'Hoy',
  weekly: 'Semana',
  monthly: 'Mes',
};

const Ranking = () => {
  const { rankings, currentPeriod, setPeriod, nextRewardAt } = useRankingStore();
  const { user } = useAuthStore();
  const currentRankings = rankings[currentPeriod];

  // Find current user in rankings
  const currentUserRank = currentRankings.find((r) => r.id === user?.id);
  const userPoints = currentUserRank?.points || 0;
  const progressToReward = (userPoints / nextRewardAt) * 100;

  return (
    <div className="min-h-screen bg-background pb-24 safe-top">
      {/* Header */}
      <div className="glass-card border-b border-border/50 px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full gradient-gold flex items-center justify-center glow-gold">
            <Trophy className="w-6 h-6 text-accent-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold text-foreground">Ranking</h1>
            <p className="text-sm text-muted-foreground">Compite y gana recompensas</p>
          </div>
        </div>

        {/* Period Tabs */}
        <div className="flex gap-2 bg-muted/50 p-1 rounded-xl">
          {(Object.keys(periodLabels) as RankingPeriod[]).map((period) => (
            <button
              key={period}
              onClick={() => setPeriod(period)}
              className={cn(
                'flex-1 py-2.5 rounded-lg text-sm font-medium transition-all touch-target',
                currentPeriod === period
                  ? 'gradient-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {periodLabels[period]}
            </button>
          ))}
        </div>
      </div>

      {/* Progress to Next Reward */}
      <div className="px-4 py-4">
        <div className="glass-card p-4">
          <div className="flex items-center gap-3 mb-3">
            <Gift className="w-5 h-5 text-accent" />
            <span className="text-sm font-medium text-foreground">Próxima recompensa</span>
            <span className="ml-auto text-sm text-muted-foreground">
              {userPoints} / {nextRewardAt} pts
            </span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full gradient-gold rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(progressToReward, 100)}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Te faltan {nextRewardAt - userPoints} puntos para tu próximo bono
          </p>
        </div>
      </div>

      {/* Your Position */}
      {currentUserRank && (
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-muted-foreground">Tu posición</span>
          </div>
          <RankingCard entry={currentUserRank} isCurrentUser={true} />
        </div>
      )}

      {/* Leaderboard */}
      <div className="px-4">
        <div className="flex items-center gap-2 mb-4">
          <Star className="w-4 h-4 text-accent" />
          <span className="text-sm font-medium text-muted-foreground">Top repartidores</span>
        </div>

        <div className="space-y-3">
          {currentRankings.map((entry, index) => (
            <RankingCard
              key={entry.id}
              entry={entry}
              isCurrentUser={entry.id === user?.id}
              animationDelay={index * 0.05}
            />
          ))}
        </div>
      </div>

      
    </div>
  );
};

export default Ranking;

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Star, Target, Gift, RefreshCw } from 'lucide-react';
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
  const { rankings, currentPeriod, setPeriod, nextRewardAt, fetchRankings, isLoading } = useRankingStore();
  const { user } = useAuthStore();
  const isDriver = user?.role === 'driver';
  const currentRankings = rankings[currentPeriod];

  useEffect(() => {
    fetchRankings(currentPeriod);
  }, []);

  // Find current user in rankings
  const currentUserRank = currentRankings.find((r) => r.id === String(user?.id));
  const userPoints = currentUserRank?.points || 0;
  const progressToReward = (userPoints / nextRewardAt) * 100;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center shadow-inner">
          <Trophy className="w-6 h-6 text-amber-400" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-display font-black text-foreground">Ranking</h1>
          <p className="text-sm text-muted-foreground">Compite y gana recompensas</p>
        </div>
        {isLoading && <RefreshCw className="w-5 h-5 animate-spin text-primary" />}
      </div>

      {/* Period Tabs */}
      <div className="flex gap-2 bg-muted/40 p-1 rounded-2xl mb-6 border border-border/30">
        {(Object.keys(periodLabels) as RankingPeriod[]).map((period) => (
          <button
            key={period}
            onClick={() => setPeriod(period)}
            className={cn(
              'flex-1 py-2.5 rounded-xl text-sm font-bold transition-all',
              currentPeriod === period
                ? 'bg-primary text-white shadow-md shadow-primary/30'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            )}
          >
            {periodLabels[period]}
          </button>
        ))}
      </div>

      {/* Progress to Next Reward — solo para drivers */}
      {isDriver && (
        <div className="mb-6">
          <div className="glass-card p-4">
            <div className="flex items-center gap-3 mb-3">
              <Gift className="w-5 h-5 text-accent" />
              <span className="text-sm font-bold text-foreground">Próxima recompensa</span>
              <span className="ml-auto text-sm text-muted-foreground">
                {userPoints} / {nextRewardAt} pts
              </span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(progressToReward, 100)}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Te faltan {Math.max(0, nextRewardAt - userPoints)} puntos para tu próximo bono
            </p>
          </div>
        </div>
      )}

      {/* Your Position — solo si está en el ranking */}
      {isDriver && currentUserRank && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold text-muted-foreground">Tu posición</span>
          </div>
          <RankingCard entry={currentUserRank} isCurrentUser={true} />
        </div>
      )}

      {/* Leaderboard */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-accent" />
            <span className="text-sm font-bold text-muted-foreground">Top repartidores</span>
          </div>
          <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full font-bold">
            {currentRankings.length} conductores
          </span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : currentRankings.length === 0 ? (
          <div className="glass-card p-12 text-center border-dashed">
            <Trophy className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Sin datos para este período</p>
          </div>
        ) : (
          <div className="space-y-3">
            {currentRankings.map((entry, index) => (
              <RankingCard
                key={entry.id}
                entry={entry}
                isCurrentUser={entry.id === String(user?.id)}
                animationDelay={index * 0.05}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Ranking;

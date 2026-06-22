import { create } from 'zustand';
import { appDB } from '@/api/appDB';
import axios from 'axios';
import { toast } from 'sonner';

export interface RankingEntry {
  id: string;
  name: string;
  avatar?: string;
  points: number;
  deliveries: number;
  level: number;
  rank: number;
  balance?: number;
  trend: 'up' | 'down' | 'same';
}

export type RankingPeriod = 'daily' | 'weekly' | 'monthly';

// Mapeo entre el nombre interno y el query param del backend
const periodMap: Record<RankingPeriod, string> = {
  daily: 'today',
  weekly: 'week',
  monthly: 'month',
};

interface RankingState {
  rankings: Record<RankingPeriod, RankingEntry[]>;
  currentPeriod: RankingPeriod;
  currentUserRank: number;
  nextRewardAt: number;
  isLoading: boolean;
  setPeriod: (period: RankingPeriod) => void;
  updateRankings: (period: RankingPeriod, rankings: RankingEntry[]) => void;
  fetchRankings: (period?: RankingPeriod) => Promise<void>;
}

export const useRankingStore = create<RankingState>((set, get) => ({
  rankings: {
    daily: [],
    weekly: [],
    monthly: [],
  },
  currentPeriod: 'daily',
  currentUserRank: 0,
  nextRewardAt: 500,
  isLoading: false,

  setPeriod: (period) => {
    set({ currentPeriod: period });
    get().fetchRankings(period);
  },

  updateRankings: (period, rankings) =>
    set((state) => ({
      rankings: { ...state.rankings, [period]: rankings },
    })),

  fetchRankings: async (period?: RankingPeriod) => {
    const p = period ?? get().currentPeriod;
    set({ isLoading: true });
    try {
      const { data } = await appDB.get(`/users/ranking?period=${periodMap[p]}`);
      set((state) => ({
        rankings: { ...state.rankings, [p]: data },
        isLoading: false,
      }));
    } catch (error) {
      set({ isLoading: false });
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || 'Error al cargar ranking');
      }
    }
  },
}));

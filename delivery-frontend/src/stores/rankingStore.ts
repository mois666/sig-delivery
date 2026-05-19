import { create } from 'zustand';

export interface RankingEntry {
  id: string;
  name: string;
  avatar?: string;
  points: number;
  deliveries: number;
  level: number;
  rank: number;
  trend: 'up' | 'down' | 'same';
}

export type RankingPeriod = 'daily' | 'weekly' | 'monthly';

interface RankingState {
  rankings: Record<RankingPeriod, RankingEntry[]>;
  currentPeriod: RankingPeriod;
  currentUserRank: number;
  nextRewardAt: number;
  setPeriod: (period: RankingPeriod) => void;
  updateRankings: (period: RankingPeriod, rankings: RankingEntry[]) => void;
}

// Mock data
const mockDailyRankings: RankingEntry[] = [
  { id: '5', name: 'Miguel Quispe', points: 320, deliveries: 12, level: 18, rank: 1, trend: 'up' },
  { id: '6', name: 'Pedro Choque', points: 285, deliveries: 10, level: 15, rank: 2, trend: 'same' },
  { id: '1', name: 'Carlos Mamani', points: 240, deliveries: 9, level: 12, rank: 3, trend: 'up' },
  { id: '7', name: 'Luis Condori', points: 195, deliveries: 7, level: 11, rank: 4, trend: 'down' },
  { id: '8', name: 'Roberto Flores', points: 150, deliveries: 6, level: 9, rank: 5, trend: 'same' },
  { id: '9', name: 'Jorge Apaza', points: 120, deliveries: 5, level: 8, rank: 6, trend: 'up' },
  { id: '10', name: 'Diego Vargas', points: 95, deliveries: 4, level: 6, rank: 7, trend: 'down' },
];

const mockWeeklyRankings: RankingEntry[] = [
  { id: '1', name: 'Carlos Mamani', points: 1850, deliveries: 68, level: 12, rank: 1, trend: 'up' },
  { id: '5', name: 'Miguel Quispe', points: 1720, deliveries: 62, level: 18, rank: 2, trend: 'down' },
  { id: '6', name: 'Pedro Choque', points: 1540, deliveries: 55, level: 15, rank: 3, trend: 'same' },
  { id: '7', name: 'Luis Condori', points: 1320, deliveries: 48, level: 11, rank: 4, trend: 'up' },
  { id: '8', name: 'Roberto Flores', points: 980, deliveries: 35, level: 9, rank: 5, trend: 'down' },
];

const mockMonthlyRankings: RankingEntry[] = [
  { id: '5', name: 'Miguel Quispe', points: 7850, deliveries: 285, level: 18, rank: 1, trend: 'same' },
  { id: '1', name: 'Carlos Mamani', points: 7200, deliveries: 260, level: 12, rank: 2, trend: 'up' },
  { id: '6', name: 'Pedro Choque', points: 6540, deliveries: 238, level: 15, rank: 3, trend: 'down' },
  { id: '7', name: 'Luis Condori', points: 5890, deliveries: 215, level: 11, rank: 4, trend: 'same' },
  { id: '8', name: 'Roberto Flores', points: 4320, deliveries: 158, level: 9, rank: 5, trend: 'up' },
];

export const useRankingStore = create<RankingState>((set) => ({
  rankings: {
    daily: mockDailyRankings,
    weekly: mockWeeklyRankings,
    monthly: mockMonthlyRankings,
  },
  currentPeriod: 'daily',
  currentUserRank: 3,
  nextRewardAt: 500,

  setPeriod: (period) => set({ currentPeriod: period }),

  updateRankings: (period, rankings) =>
    set((state) => ({
      rankings: { ...state.rankings, [period]: rankings },
    })),
}));

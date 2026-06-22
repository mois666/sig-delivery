import { create } from 'zustand';
import { appDB } from '@/api/appDB';
import axios from 'axios';
import { toast } from 'sonner';

export interface DriverWallet {
  id: number;
  name: string;
  phone: string;
  points: number;
  level: number;
  status: string;
  balance: number;
  wallet_id: number | null;
}

export interface DriverTransaction {
  id: number;
  wallet_id: number;
  type: string;
  amount: number;
  description: string;
  created_at: string;
}

interface AdminWalletState {
  drivers: DriverWallet[];
  selectedDriver: DriverWallet | null;
  transactions: DriverTransaction[];
  isLoading: boolean;
  isLoadingTx: boolean;
  fetchDriverWallets: () => Promise<void>;
  fetchDriverTransactions: (driverId: number) => Promise<void>;
  selectDriver: (driver: DriverWallet | null) => void;
}

export const useAdminWalletStore = create<AdminWalletState>((set) => ({
  drivers: [],
  selectedDriver: null,
  transactions: [],
  isLoading: false,
  isLoadingTx: false,

  fetchDriverWallets: async () => {
    set({ isLoading: true });
    try {
      const { data } = await appDB.get('/users/wallets');
      set({ drivers: data, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || 'Error al cargar billeteras');
      }
    }
  },

  fetchDriverTransactions: async (driverId: number) => {
    set({ isLoadingTx: true, transactions: [] });
    try {
      const { data } = await appDB.get(`/users/${driverId}/transactions`);
      set({ transactions: data.transactions || [], isLoadingTx: false });
    } catch (error) {
      set({ isLoadingTx: false });
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || 'Error al cargar transacciones');
      }
    }
  },

  selectDriver: (driver) => set({ selectedDriver: driver, transactions: [] }),
}));

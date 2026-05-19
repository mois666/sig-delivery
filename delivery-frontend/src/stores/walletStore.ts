import { appDB } from '@/api/appDB';
import axios from 'axios';
import { toast } from 'sonner';
import { create } from 'zustand';

export type TransactionType = 'earning' | 'bonus' | 'commission' | 'withdrawal' | 'points';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  orderId?: string;
  createdAt: Date;
}

interface WalletState {
  balance: number;
  pendingBalance: number;
  totalPoints: number;
  transactions: Transaction[];
  createWallet: (id: number) => void;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt'>) => void;
  updateBalance: (amount: number) => void;
  updatePoints: (points: number) => void;
}

// Mock transactions
const mockTransactions: Transaction[] = [
  {
    id: '1',
    type: 'earning',
    amount: 15,
    description: 'Entrega completada - Centro',
    orderId: 'ORD-001',
    createdAt: new Date(Date.now() - 3600000),
  },
  {
    id: '2',
    type: 'bonus',
    amount: 10,
    description: 'Bono por 5 entregas consecutivas',
    createdAt: new Date(Date.now() - 7200000),
  },
  {
    id: '3',
    type: 'earning',
    amount: 20,
    description: 'Entrega nocturna - Sur',
    orderId: 'ORD-002',
    createdAt: new Date(Date.now() - 10800000),
  },
  {
    id: '4',
    type: 'commission',
    amount: -5,
    description: 'Comisión semanal',
    createdAt: new Date(Date.now() - 86400000),
  },
  {
    id: '5',
    type: 'points',
    amount: 50,
    description: 'Puntos por entrega rápida',
    orderId: 'ORD-001',
    createdAt: new Date(Date.now() - 3600000),
  },
  {
    id: '6',
    type: 'earning',
    amount: 25,
    description: 'Combo doble - Norte',
    orderId: 'ORD-003',
    createdAt: new Date(Date.now() - 172800000),
  },
  {
    id: '7',
    type: 'withdrawal',
    amount: -100,
    description: 'Retiro a cuenta bancaria',
    createdAt: new Date(Date.now() - 259200000),
  },
];

export const useWalletStore = create<WalletState>((set) => ({
  balance: 245,
  pendingBalance: 35,
  totalPoints: 2450,
  transactions: mockTransactions,
  createWallet: async (id: number) => {
    try {
      const { data } = await appDB.post('/wallets', { user_id: id });
      return true;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message);
      } else {
        toast.error('Error al crear billetera');
      }
      return false;
    }
  },

  addTransaction: (transactionData) => {
    const newTransaction: Transaction = {
      ...transactionData,
      id: Date.now().toString(),
      createdAt: new Date(),
    };

    set((state) => ({
      transactions: [newTransaction, ...state.transactions],
      balance: transactionData.type !== 'points'
        ? state.balance + transactionData.amount
        : state.balance,
      totalPoints: transactionData.type === 'points'
        ? state.totalPoints + transactionData.amount
        : state.totalPoints,
    }));
  },

  updateBalance: (amount) => {
    set((state) => ({ balance: state.balance + amount }));
  },

  updatePoints: (points) => {
    set((state) => ({ totalPoints: state.totalPoints + points }));
  },
}));

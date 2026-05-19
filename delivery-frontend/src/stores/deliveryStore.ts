import { create } from 'zustand';
import { appDB } from '@/api/appDB';
import { IUser } from '@/interfaces/users-interface';
import { toast } from 'sonner';
import axios from 'axios';

interface DeliveryState {
  deliveries: IUser[];
  delivery: IUser | null;
  wallet: {};
  isLoading: boolean;
  fetchDeliveries: () => Promise<void>;
  addDelivery: (user: Partial<IUser>) => Promise<boolean>;
  showDelivery: (id: number) => void;
  updateDelivery: (id: number, user: Partial<IUser>) => Promise<boolean>;
  deleteDelivery: (id: number) => Promise<boolean>;
  /* Drivers active */
  activeDrivers: () => Promise<number>;
}

export const useDeliveryStore = create<DeliveryState>((set, get) => ({
  deliveries: [],
  delivery: null,
  wallet: {},
  isLoading: false,

  fetchDeliveries: async () => {
    set({ isLoading: true });
    try {
      const { data } = await appDB.get('/users');
      // Filtramos solo los drivers para esta vista si es necesario
      set({ deliveries: data.filter((u: IUser) => u.role === 'driver'), isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message);
      } else {
        toast.error('Error al cargar repartidores');
      }
    }
  },

  addDelivery: async (user) => {
    try {
      const { data } = await appDB.post('/users', user);
      set({ deliveries: [data.user, ...get().deliveries] });
      return true;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message);
      } else {
        toast.error('Error al agregar repartidor');
      }
      return false;
    }
  },
  showDelivery: async (id) => {
    set({ isLoading: true });
    try {
      const { data } = await appDB.get(`/users/${id}`);
      set({ delivery: data.user, wallet: data.wallet, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message);
      } else {
        toast.error('Error al cargar repartidores');
      }
    }
  },

  updateDelivery: async (id, user) => {
    try {
      const { data } = await appDB.put(`/users/${id}`, user);
      set({
        deliveries: get().deliveries.map((d) => (d.id === id ? data.user : d)),
      });
      return true;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message);
      } else {
        toast.error('Error al actualizar repartidor');
      }
      return false;
    }
  },

  deleteDelivery: async (id) => {
    try {
      await appDB.delete(`/users/${id}`);
      set({ deliveries: get().deliveries.filter((d) => d.id !== id) });
      toast.success('Repartidor eliminado');
      return true;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message);
      } else {
        toast.error('Error al eliminar repartidor');
      }
      return false;
    }
  },
  activeDrivers: async () => {
    set({ isLoading: true });
    try {
      const response = await appDB.get('/drivers-active');
      set({ isLoading: false });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message);
      } else {
        toast.error('Error al cargar repartidores');
      }
      return false;
    }
  },
}
));
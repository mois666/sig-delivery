import { create } from 'zustand';
import { appDB } from '@/api/appDB';
import { IUser } from '@/interfaces/users-interface';
import { toast } from 'sonner';
import axios from 'axios';

interface UserState {
    users: IUser[];
    user: IUser | null;
    wallet: {};
    isLoading: boolean;
    fetchUsers: () => Promise<void>;
    addUser: (user: Partial<IUser>) => Promise<boolean>;
    showUser: (id: number) => void;
    updateUser: (id: number, user: Partial<IUser>) => Promise<boolean>;
    deleteUser: (id: number) => Promise<boolean>;
}

export const useUserStore = create<UserState>((set, get) => ({
    users: [],
    user: null,
    wallet: {},
    isLoading: false,

    fetchUsers: async () => {
        set({ isLoading: true });
        try {
            const { data } = await appDB.get('/users');
            // Filtramos solo los drivers para esta vista si es necesario
            set({ users: data.filter((u: IUser) => u.role === 'driver'), isLoading: false });
        } catch (error) {
            set({ isLoading: false });
            if (axios.isAxiosError(error)) {
                toast.error(error.response?.data?.message);
            } else {
                toast.error('Error al cargar repartidores');
            }
        }
    },

    addUser: async (user) => {
        try {
            const { data } = await appDB.post('/users', user);
            set({ users: [data.user, ...get().users] });
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
    showUser: async (id) => {
        set({ isLoading: true });
        try {
            const { data } = await appDB.get(`/users/${id}`);
            set({ user: data.user, wallet: data.wallet, isLoading: false });
        } catch (error) {
            set({ isLoading: false });
            if (axios.isAxiosError(error)) {
                toast.error(error.response?.data?.message);
            } else {
                toast.error('Error al cargar repartidores');
            }
        }
    },

    updateUser: async (id, user) => {
        try {
            const { data } = await appDB.put(`/users/${id}`, user);
            set({
                users: get().users.map((d) => (d.id === id ? data.user : d)),
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

    deleteUser: async (id) => {
        try {
            await appDB.delete(`/users/${id}`);
            set({ users: get().users.filter((d) => d.id !== id) });
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
}));
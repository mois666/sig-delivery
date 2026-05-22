import { create } from 'zustand';
import { appDB } from '@/api/appDB';
import { IUser } from '@/interfaces/users-interface';
import { toast } from 'sonner';
import axios from 'axios';

interface UserState {
    users: IUser[];
    user: IUser | null;
    wallet: any;
    isLoading: boolean;
    fetchUsers: () => Promise<void>;
    addUser: (user: Partial<IUser>) => Promise<boolean>;
    showUser: (id: number) => Promise<void>;
    updateUser: (id: number, user: Partial<IUser>) => Promise<boolean>;
    deleteUser: (id: number) => Promise<boolean>;
    activeDrivers: () => Promise<number>;
}

export const useUserStore = create<UserState>((set, get) => ({
    users: [],
    user: null,
    wallet: null,
    isLoading: false,

    fetchUsers: async () => {
        set({ isLoading: true });
        try {
            const { data } = await appDB.get('/users');
            set({ users: data, isLoading: false });
        } catch (error) {
            set({ isLoading: false });
            if (axios.isAxiosError(error)) {
                toast.error(error.response?.data?.message || 'Error al cargar usuarios');
            } else {
                toast.error('Error al cargar usuarios');
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
                toast.error(error.response?.data?.message || 'Error al agregar usuario');
            } else {
                toast.error('Error al agregar usuario');
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
                toast.error(error.response?.data?.message || 'Error al cargar detalle del usuario');
            } else {
                toast.error('Error al cargar detalle del usuario');
            }
        }
    },

    updateUser: async (id, user) => {
        try {
            const { data } = await appDB.put(`/users/${id}`, user);
            set({
                users: get().users.map((u) => (u.id === id ? data.user : u)),
                user: get().user?.id === id ? data.user : get().user
            });
            return true;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                toast.error(error.response?.data?.message || 'Error al actualizar usuario');
            } else {
                toast.error('Error al actualizar usuario');
            }
            return false;
        }
    },

    deleteUser: async (id) => {
        try {
            await appDB.delete(`/users/${id}`);
            set({ users: get().users.filter((u) => u.id !== id) });
            return true;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                toast.error(error.response?.data?.message || 'Error al eliminar usuario');
            } else {
                toast.error('Error al eliminar usuario');
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
            set({ isLoading: false });
            if (axios.isAxiosError(error)) {
                toast.error(error.response?.data?.message || 'Error al cargar repartidores activos');
            } else {
                toast.error('Error al cargar repartidores activos');
            }
            return 0;
        }
    },
}));
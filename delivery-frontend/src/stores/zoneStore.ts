import { create } from 'zustand';
import { appDB } from '@/api/appDB';
import { Zone } from '@/interfaces/zones-interface';
import { toast } from 'sonner';
import axios from 'axios';

interface ZoneState {
    zones: Zone[];
    isLoading: boolean;
    fetchZones: () => Promise<void>;
    saveZone: (zone: Zone) => Promise<boolean>;
    deleteZone: (id: number) => Promise<boolean>;
    expandUrl: (url: string) => Promise<string>;
}

export const useZoneStore = create<ZoneState>((set, get) => ({
    zones: [],
    isLoading: false,

    fetchZones: async () => {
        set({ isLoading: true });
        try {
            const { data } = await appDB.get('/zones');
            set({ zones: data, isLoading: false });
        } catch (error) {
            if (axios.isAxiosError(error)) {
                toast.error(error.response?.data.message);
            }
        }
    },

    saveZone: async (zone) => {
        try {
            if (zone.id) {
                await appDB.put(`/zones/${zone.id}`, zone);
                toast.success('Zona actualizada');
            } else {
                await appDB.post('/zones', zone);
                toast.success('Zona creada');
            }
            get().fetchZones();
            return true;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                toast.error(error.response?.data.message);
            }
        }
    },

    deleteZone: async (id) => {
        try {
            await appDB.delete(`/zones/${id}`);
            set({ zones: get().zones.filter((z) => z.id !== id) });
            toast.success('Zona eliminada');
            return true;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                toast.error(error.response?.data.message);
            }
        }
    },

    expandUrl: async (url) => {
        try {
            const { data } = await appDB.post('/maps/expand-url', { url });
            return data.longUrl;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                toast.error(error.response?.data.message);
            }
        }
    },
}));
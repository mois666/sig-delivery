import { create } from 'zustand';
import { appDB } from '@/api/appDB';
import { Zone } from '@/interfaces/zones-interface';
import { toast } from 'sonner';
import axios from 'axios';

interface ZoneState {
    zones: Zone[];
    isLoading: boolean;
    fetchZones: (cityId: number) => Promise<void>;
    saveZone: (cityId: number, zone: Zone) => Promise<boolean>;
    deleteZone: (cityId: number, id: number) => Promise<boolean>;
    expandUrl: (url: string) => Promise<string>;
}

export const useZoneStore = create<ZoneState>((set, get) => ({
    zones: [],
    isLoading: false,

    fetchZones: async (cityId) => {
        set({ isLoading: true });
        try {
            const { data } = await appDB.get(`/cities/${cityId}/zones`);
            set({ zones: data, isLoading: false });
        } catch (error) {
            set({ isLoading: false });
            if (axios.isAxiosError(error)) {
                toast.error(error.response?.data.message);
            }
        }
    },

    saveZone: async (cityId, zone) => {
        try {
            if (zone.id) {
                await appDB.put(`/cities/${cityId}/zones/${zone.id}`, zone);
                toast.success('Zona actualizada');
            } else {
                await appDB.post(`/cities/${cityId}/zones`, zone);
                toast.success('Zona creada');
            }
            get().fetchZones(cityId);
            return true;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                toast.error(error.response?.data.message);
            }
            return false;
        }
    },

    deleteZone: async (cityId, id) => {
        try {
            await appDB.delete(`/cities/${cityId}/zones/${id}`);
            set({ zones: get().zones.filter((z) => z.id !== id) });
            toast.success('Zona eliminada');
            return true;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                toast.error(error.response?.data.message);
            }
            return false;
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
            return url;
        }
    },
}));
import { create } from 'zustand';
import { appDB } from '@/api/appDB';
import { ICity } from '@/interfaces/city-interface';

interface CityState {
  cities:    ICity[];
  isLoading: boolean;
  fetchCities: () => Promise<void>;
}

export const useCityStore = create<CityState>((set) => ({
  cities:    [],
  isLoading: false,

  fetchCities: async () => {
    set({ isLoading: true });
    try {
      // GET /cities es público (no requiere auth)
      const { data } = await appDB.get<ICity[]>('/cities');
      set({ cities: data, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
    }
  },
}));

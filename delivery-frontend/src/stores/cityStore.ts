import { create } from 'zustand';
import { appDB } from '@/api/appDB';
import { ICity } from '@/interfaces/city-interface';
import { toast } from 'sonner';

interface CityState {
  cities:    ICity[];
  isLoading: boolean;
  fetchCities: (all?: boolean) => Promise<void>;
  saveCity: (cityData: Partial<ICity>) => Promise<boolean>;
  deleteCity: (id: number) => Promise<boolean>;
}

export const useCityStore = create<CityState>((set, get) => ({
  cities:    [],
  isLoading: false,

  fetchCities: async (all = false) => {
    set({ isLoading: true });
    try {
      const endpoint = all ? '/cities?all=true' : '/cities';
      const { data } = await appDB.get<ICity[]>(endpoint);
      set({ cities: data, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      toast.error('Error al cargar la lista de ciudades');
    }
  },

  saveCity: async (cityData: Partial<ICity>) => {
    set({ isLoading: true });
    try {
      if (cityData.id) {
        // Update
        const { data } = await appDB.put<{ message: string; city: ICity }>(`/cities/${cityData.id}`, cityData);
        set((state) => ({
          cities: state.cities.map((c) => (c.id === cityData.id ? data.city : c)),
          isLoading: false,
        }));
        toast.success(data.message || 'Ciudad actualizada exitosamente');
      } else {
        // Create
        const { data } = await appDB.post<{ message: string; city: ICity }>('/cities', cityData);
        set((state) => ({
          cities: [...state.cities, data.city],
          isLoading: false,
        }));
        toast.success(data.message || 'Ciudad creada exitosamente');
      }
      return true;
    } catch (error: any) {
      set({ isLoading: false });
      const msg = error.response?.data?.message || 'Error al guardar la ciudad';
      toast.error(msg);
      return false;
    }
  },

  deleteCity: async (id: number) => {
    set({ isLoading: true });
    try {
      const { data } = await appDB.delete<{ message: string }>(`/cities/${id}`);
      set((state) => ({
        cities: state.cities.filter((c) => c.id !== id),
        isLoading: false,
      }));
      toast.success(data.message || 'Ciudad eliminada permanentemente');
      return true;
    } catch (error: any) {
      set({ isLoading: false });
      const msg = error.response?.data?.message || 'Error al eliminar la ciudad';
      toast.error(msg);
      return false;
    }
  },
}));

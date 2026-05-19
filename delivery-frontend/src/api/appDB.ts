import axios from "axios";
import { useAuthStore } from "@/stores/authStore";

export const appDB = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    withCredentials: true,
});

appDB.interceptors.request.use((config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

appDB.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // --- EVITAR CICLO INFINITO ---
        // Si el error es 401 pero la ruta es login o refresh, NO REINTENTAR
        if (
            error.response?.status === 401 && 
            (originalRequest.url?.includes('/auth/login') || 
             originalRequest.url?.includes('/auth/refresh'))
        ) {
            return Promise.reject(error);
        }

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                // Usar axios limpio (sin interceptores) para el refresh
                const { data } = await axios.post(
                    `${import.meta.env.VITE_API_URL}/auth/refresh`, 
                    {}, 
                    { withCredentials: true }
                );

                useAuthStore.getState().setAuth(data.user, data.accessToken, data.city);
                originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
                return appDB(originalRequest);
            } catch (refreshError) {
                // Si el refresh falla, limpiar el store y redirigir
                useAuthStore.getState().logout();
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
);
// geoUtils.ts
import { appDB } from "@/api/appDB"; // Importamos la instancia de conexión al backend
import axios from "axios";
import { logger } from "@/lib/logger";

/**
 * Calcula la distancia entre dos puntos geográficos usando la fórmula de Haversine.
 */
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(2));
};

/**
 * Calcula la distancia entre dos coordenadas utilizando la fórmula de Haversine.
 * @param lat1 Latitud del punto origen
 * @param lon1 Longitud del punto origen
 * @param lat2 Latitud del punto destino
 * @param lon2 Longitud del punto destino
 * @returns Distancia en kilómetros redondeada a 1 decimal.
 */
export const calculateDistanceFromCoords = (
    deliveryCoords: string,
    pickupCoords: string
): number => {
    const [lat1, lon1] = pickupCoords.split(',').map(Number);
    const [lat2, lon2] = deliveryCoords.split(',').map(Number);
    const R = 6371; // Radio de la Tierra en kilómetros
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    // Retorna la distancia con un decimal (ej: 2.5 km)
    return parseFloat(distance.toFixed(1));
};
/**
 * Extrae latitud y longitud de diversos formatos de URL de Google Maps.
 * Soporta enlaces estándar, de búsqueda (query) y de lugar (place).
 */
export const extractCoords = (url: string): string | null => {
    if (!url) return null;
    const cleanUrl = url.trim();

    // 1. Caso Estándar: @lat,lng
    const regexStandard = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
    const matchStandard = cleanUrl.match(regexStandard);
    if (matchStandard) return `${matchStandard[1]},${matchStandard[2]}`;

    // 2. Caso Query o Place: q=lat,lng o /place/lat,lng
    const regexQueryPlace = /(?:q=|place\/)(-?\d+\.\d+),(-?\d+\.\d+)/;
    const matchQueryPlace = cleanUrl.match(regexQueryPlace);
    if (matchQueryPlace) return `${matchQueryPlace[1]},${matchQueryPlace[2]}`;

    // 3. Caso Parámetros Internos (!3dLAT!4dLong) - Muy común en enlaces nuevos
    // !3d indica latitud, !4d indica longitud
    const regexInternal = /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/;
    const matchInternal = cleanUrl.match(regexInternal);
    if (matchInternal) return `${matchInternal[1]},${matchInternal[2]}`;
    // https://www.google.com/maps/search/-17.995549,+-67.062355?entry=tts&g_ep=EgoyMDI1MTIwOS4wIPu8ASoASAFQAw%3D%3D&skid=b813d495-73a8-449a-bb36-ca23e95c88a6
    const regex = /\/search\/(-?\d+\.\d+),(-?\d+\.\d+)/;
    const match = cleanUrl.match(regex);

    if (match) {
        return `${match[1]},${match[2]}`;
    }

    return null;
};

/**
 * Obtiene el recargo de zona consultando al backend.
 * El backend utiliza la base de datos de polígonos para determinar el costo extra.
 */
export const getExtraRateFromBackend = async (lat: number, lng: number): Promise<number> => {
    //console.log("lat, lng", lat, lng);
    try {
        // Consultamos al endpoint de Laravel que maneja la lógica de polígonos
        const { data } = await appDB.get(`/zones/check-rate`, {
            params: { lat, lng }
        });
        return data.extra_rate || 0;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            logger.error("Error al verificar tarifa de la zona:", error.response?.data);
        }
        return 0; // Fallback seguro
    }
};

/**
 * Convierte coordenadas en una dirección legible (Geocoding Inverso).
 */
export const getAddressFromCoords = async (coords: string): Promise<string> => {
    if (!coords) return "";

    const [lat, lng] = coords.split(',').map(c => c.trim());

    try {
        const response = await fetch(
            `https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lng}&key=${import.meta.env.VITE_API_KEY_GEOCODING}&language=es&no_annotations=1`
        );

        if (!response.ok) throw new Error("Error en la petición");

        const data = await response.json();
        const result = data.results[0];

        if (!result) return "Dirección no encontrada";

        // Extraemos componentes específicos para una dirección de "delivery" más limpia
        const { road, house_number, suburb, city } = result.components;

        if (road) {
            return `${city}, ${road}${house_number ? ' #' + house_number : ''}${suburb ? ', ' + suburb : ''}`;
        }

        return result.formatted || "Dirección no encontrada";

    } catch (error) {
        logger.error("Error en geocodificación:", error);
        return "Error al obtener dirección";
    }
};

/**
 * Algoritmo Ray-casting para verificar si un punto está dentro de un polígono.
 * Útil para validaciones rápidas en cliente, aunque la fuente oficial es el backend.
 */
export const isPointInPolygon = (lat: number, lng: number, polygon: number[][]) => {
    if (!polygon || polygon.length < 3) return false;
    let isInside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const [xi, yi] = polygon[i];
        const [xj, yj] = polygon[j];
        const intersect = ((yi > lng) !== (yj > lng)) &&
            (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
        if (intersect) isInside = !isInside;
    }
    return isInside;
};
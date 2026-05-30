export interface Zone {
    id?: number;
    name: string;
    coordinates?: [number, number][]; // Array de puntos [lat, lng] (uso interno Leaflet)
    polygon?: {                        // GeoJSON devuelto por el backend (PostGIS)
        type: 'Polygon' | 'MultiPolygon';
        coordinates: number[][][];
    };
    extra_rate: number;  // Factor de accesibilidad: 1.0 (normal) → 0.1 (extremo)
    color: string;
    is_active: boolean;
    city_id?: number;
    created_at?: string;
    updated_at?: string;
}
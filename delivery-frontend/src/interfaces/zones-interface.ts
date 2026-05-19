export interface Zone {
    id?: number;
    name: string;
    coordinates: [number, number][]; // Array de puntos [lat, lng]
    extra_rate: number;
    color: string;
    is_active: boolean;
    created_at?: string;
}
import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polygon, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getAddressFromCoords } from '@/lib/geoUtils';
import { useZoneStore } from '@/stores/zoneStore';

// Configuración de iconos para evitar errores en React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface MapPickerProps {
    initialCoords?: string;
    onLocationSelect: (coords: string, address: string) => void;
}

export const MapPicker = ({ initialCoords, onLocationSelect }: MapPickerProps) => {
    // Obtenemos las zonas para dibujarlas como referencia en el selector
    const { zones } = useZoneStore();

    // Parseo inicial de coordenadas
    const parseCoords = (coords?: string): [number, number] => {
        if (!coords) return [-17.9647, -67.1060]; // Centro de Oruro
        const split = coords.split(',').map(Number);
        return [split[0], split[1]];
    };

    const [position, setPosition] = useState<[number, number]>(parseCoords(initialCoords));

    // Sincronizar posición si initialCoords cambia desde fuera (ej. pegar link)
    useEffect(() => {
        if (initialCoords) {
            setPosition(parseCoords(initialCoords));
        }
    }, [initialCoords]);

    const MapEvents = () => {
        const map = useMapEvents({
            click: async (e) => {
                const newCoords = `${e.latlng.lat},${e.latlng.lng}`;
                setPosition([e.latlng.lat, e.latlng.lng]);

                // Centrar suavemente al hacer click
                map.flyTo(e.latlng, map.getZoom());

                const address = await getAddressFromCoords(newCoords);
                onLocationSelect(newCoords, address);
            },
        });

        return <Marker position={position} />;
    };

    return (
        <div className="h-64 w-full rounded-2xl overflow-hidden border border-border mt-2 shadow-inner relative">
            <MapContainer
                center={position}
                zoom={15}
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                {/* Visualización de zonas existentes como referencia */}
                {zones.map((zone) => (
                    <Polygon
                        key={zone.id}
                        positions={zone.coordinates}
                        pathOptions={{
                            color: zone.color,
                            fillColor: zone.color,
                            fillOpacity: 0.1,
                            weight: 1,
                            dashArray: '5, 5'
                        }}
                    />
                ))}

                <MapEvents />
            </MapContainer>

            {/* Pequeño indicador visual del modo selección */}
            <div className="absolute top-2 right-2 z-[500] pointer-events-none">
                <div className="bg-background/90 backdrop-blur px-2 py-1 rounded-md border border-border text-[9px] font-bold uppercase shadow-sm">
                    Toca para marcar punto
                </div>
            </div>
        </div>
    );
};
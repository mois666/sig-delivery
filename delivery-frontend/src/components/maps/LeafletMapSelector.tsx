import { MapContainer, TileLayer, Marker, useMapEvents, Polygon, useMap } from 'react-leaflet';
import { GeoSearchControl, OpenStreetMapProvider } from 'leaflet-geosearch';
import { useEffect, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-geosearch/dist/geosearch.css';

// Corregir iconos de Leaflet en React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import { HIGH_COST_ZONES } from '@/api/zones';
let DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

const SearchField = ({ handler }: { handler: (lat: number, lng: number, label: string) => void }) => {
    const map = useMap();
    useEffect(() => {
        const provider = new OpenStreetMapProvider();
        const searchControl = new (GeoSearchControl as any)({
            provider,
            style: 'bar',
            showMarker: false,
            autoClose: true,
        });
        map.addControl(searchControl);
        map.on('geosearch/showlocation', (result: any) => {
            handler(result.location.y, result.location.x, result.label);
        });
        return () => { map.removeControl(searchControl); };
    }, [map]);
    return null;
};

export const LeafletMapSelector = ({ onSelect }: { onSelect: (coords: string, addr: string) => void }) => {
    const [pos, setPos] = useState<[number, number]>([-17.9647, -67.1060]);

    const MapEvents = () => {
        useMapEvents({
            click(e) {
                setPos([e.latlng.lat, e.latlng.lng]);
                onSelect(`${e.latlng.lat},${e.latlng.lng}`, "Ubicación seleccionada en mapa");
            },
        });
        return null;
    };

    return (
        <div className="h-64 w-full rounded-2xl overflow-hidden border">
            <MapContainer center={pos} zoom={14} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <SearchField handler={(lat, lng, label) => {
                    setPos([lat, lng]);
                    onSelect(`${lat},${lng}`, label);
                }} />
                <MapEvents />
                <Marker position={pos} />
                {/* Visualización de zonas de alto costo */}
                {HIGH_COST_ZONES.map((zone, idx) => (
                    <Polygon
                        key={idx}
                        positions={zone.polygon as any}
                        pathOptions={{ color: 'red', fillColor: 'red', fillOpacity: 0.2 }}
                    />
                ))}
            </MapContainer>
        </div>
    );
};
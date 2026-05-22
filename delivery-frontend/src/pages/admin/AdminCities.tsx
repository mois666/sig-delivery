import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polygon, Popup, Marker } from 'react-leaflet';
import { Plus, Globe, Trash2, Edit2, Info, Check, X, Shield, RefreshCw } from 'lucide-react';
import { Button, cn } from '@heroui/react';
import { useCityStore } from '@/stores/cityStore';
import { CityModal } from '@/components/modals/CityModal';
import { ICity } from '@/interfaces/city-interface';
import { AnimatePresence, motion } from 'framer-motion';
import L from 'leaflet';

import 'leaflet/dist/leaflet.css';

// Fix for Leaflet default icons
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Helper to assign vibrant colors dynamically to cities on the global map
const CITY_COLORS = [
  '#0070F0', // Primary Blue
  '#17C964', // Success Green
  '#F5A524', // Warning Yellow
  '#F31260', // Danger Red
  '#7828C8', // Purple
  '#00B7FE', // Light Blue
  '#FF4E00', // Orange
  '#4E9F3D', // Lime Green
];

export const AdminCities = () => {
  const { cities, fetchCities, saveCity, deleteCity, isLoading } = useCityStore();
  const [showModal, setShowModal] = useState(false);
  const [selectedCity, setSelectedCity] = useState<ICity | null>(null);

  useEffect(() => {
    // Fetch all cities including inactive ones
    fetchCities(true);
  }, []);

  const handleEdit = (city: ICity) => {
    setSelectedCity(city);
    setShowModal(true);
  };

  const handleToggleActive = async (city: ICity) => {
    const updated = {
      ...city,
      is_active: !city.is_active,
    };
    await saveCity(updated);
  };

  // Convert postgis coordinates to Leaflet points array for rendering
  const getLeafletPoints = (city: ICity): [number, number][] => {
    if (city.coordinates && city.coordinates.coordinates) {
      const coords = city.coordinates.coordinates[0];
      return coords.slice(0, -1).map((pt: any) => [pt[1], pt[0]] as [number, number]);
    }
    return [];
  };

  return (
    <div className="min-h-screen bg-background pb-24 safe-top text-white">
      {/* Header */}
      <div className="glass-card border-b border-white/10 px-6 py-6 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Globe className="w-5 h-5 text-primary" />
              <h1 className="text-2xl font-display font-bold text-white tracking-tight">Ciudades Operativas</h1>
            </div>
            <p className="text-xs text-white/50 font-medium">Define y delimita áreas de cobertura con geocercas PostGIS</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => fetchCities(true)}
              variant="flat"
              className="bg-white/5 text-white font-bold rounded-xl border border-white/10"
            >
              <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            </Button>
            <Button
              onClick={() => {
                setSelectedCity(null);
                setShowModal(true);
              }}
              className="bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20"
            >
              <Plus className="w-4 h-4 mr-2" /> Nueva Ciudad
            </Button>
          </div>
        </div>
      </div>

      {/* Global Interactive Map */}
      <div className="px-6 mb-8">
        <div className="glass-card overflow-hidden border border-white/10 h-[350px] md:h-[450px] relative rounded-3xl shadow-2xl">
          <MapContainer
            center={[-17.9647, -67.1060]}
            zoom={6}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
            {cities
              .filter(city => city.is_active)
              .map((city, index) => {
                const points = getLeafletPoints(city);
                const color = CITY_COLORS[index % CITY_COLORS.length];
                
                return points.length > 0 ? (
                  <Polygon
                    key={city.id}
                    positions={points}
                    pathOptions={{
                      color: color,
                      fillColor: color,
                      fillOpacity: 0.2,
                      weight: 3,
                    }}
                  >
                    <Popup>
                      <div className="p-2 text-black bg-white rounded-lg">
                        <p className="font-bold text-sm text-primary mb-0.5">{city.name}</p>
                        <p className="text-[10px] text-gray-500 font-medium mb-1.5">{city.country} • {city.currency}</p>
                        <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded">
                          <span className="w-1.5 h-1.5 rounded-full bg-success" />
                          <span className="text-[9px] font-black uppercase text-success">Operativa</span>
                        </div>
                      </div>
                    </Popup>
                  </Polygon>
                ) : null;
              })}

            {/* City Markers for quickly finding them on map */}
            {cities.map((city) => (
              <Marker 
                key={`marker-${city.id}`} 
                position={[city.center_lat, city.center_lng]}
              >
                <Popup>
                  <div className="p-1 text-black font-semibold text-xs">
                    {city.name} (Centro)
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {/* Floating Indicator */}
          <div className="absolute top-4 right-4 z-[500] bg-black/80 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/10 flex items-center gap-2 shadow-xl">
            <Info className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/80">Vista Operativa Nacional</span>
          </div>
        </div>
      </div>

      {/* Cities Dashboard Grid */}
      <div className="px-6 space-y-4">
        <h2 className="text-xs uppercase font-bold text-white/40 ml-1 tracking-widest">Listado de Coberturas</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cities.map((city, index) => {
            const hasGeofence = city.coordinates && city.coordinates.coordinates;
            const pointsCount = hasGeofence ? city.coordinates.coordinates[0].length - 1 : 0;
            const color = CITY_COLORS[index % CITY_COLORS.length];

            return (
              <motion.div
                key={city.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "glass-card p-5 border border-white/10 hover:border-white/20 transition-all rounded-3xl relative overflow-hidden shadow-md flex flex-col justify-between h-[180px]",
                  !city.is_active && "opacity-60"
                )}
              >
                {/* Visual indicator stripe */}
                <div 
                  className="absolute top-0 left-0 right-0 h-1.5" 
                  style={{ backgroundColor: city.is_active ? color : '#3F3F46' }}
                />

                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-lg text-white leading-tight">{city.name}</h3>
                    <p className="text-xs text-white/40 font-semibold">{city.country} • Moneda: {city.currency}</p>
                  </div>
                  
                  <span className={cn(
                    "px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border",
                    city.is_active 
                      ? "bg-success/20 text-success border-success/30" 
                      : "bg-danger/20 text-danger border-danger/30"
                  )}>
                    {city.is_active ? 'Activa' : 'Inactiva'}
                  </span>
                </div>

                <div className="flex items-center gap-4 py-2 border-t border-b border-white/5 my-2">
                  <div className="flex-1">
                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Geocerca</p>
                    <p className="text-xs font-semibold text-white/80">
                      {pointsCount > 0 ? `${pointsCount} vértices trazados` : 'Sin geocerca'}
                    </p>
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Huso Horario</p>
                    <p className="text-xs font-semibold text-white/80 truncate">{city.timezone}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 mt-1">
                  <Button
                    size="sm"
                    variant="flat"
                    onClick={() => handleToggleActive(city)}
                    className={cn(
                      "rounded-xl text-[10px] font-black uppercase h-8 px-3 flex-1 border",
                      city.is_active 
                        ? "bg-danger/10 hover:bg-danger/20 text-danger border-danger/20" 
                        : "bg-success/10 hover:bg-success/20 text-success border-success/20"
                    )}
                  >
                    {city.is_active ? 'Desactivar' : 'Activar'}
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="flat"
                    onClick={() => handleEdit(city)}
                    className="bg-white/5 hover:bg-white/10 text-white rounded-xl text-[10px] font-black uppercase h-8 px-4 flex-1 border border-white/10"
                  >
                    <Edit2 className="w-3 h-3 mr-1 text-primary" /> Editar
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {cities.length === 0 && !isLoading && (
          <div className="text-center py-20 glass-card bg-white/5 border border-dashed border-white/15 rounded-3xl">
            <Globe className="w-14 h-14 mx-auto mb-4 text-white/15 animate-pulse" />
            <p className="text-sm text-white/60 font-semibold">No hay ciudades configuradas en el sistema</p>
          </div>
        )}
      </div>

      {/* Edit/Create Modal */}
      <AnimatePresence>
        {showModal && (
          <CityModal
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            initialData={selectedCity}
            onSubmit={saveCity}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polygon, Popup, Marker } from 'react-leaflet';
import { Plus, Globe, Trash2, Edit2, Info, RefreshCw } from 'lucide-react';
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

  return (
    <div className="min-h-screen bg-background pb-24 safe-top text-foreground">
      {/* Header */}
      <div className="glass-card border-b border-divider px-6 py-6 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Globe className="w-5 h-5 text-primary" />
              <h1 className="text-2xl font-display font-bold tracking-tight">Ciudades Operativas</h1>
            </div>
            <p className="text-xs text-muted-foreground font-medium">Define y delimita áreas de cobertura con geocercas JSON</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => fetchCities(true)}
              variant="flat"
              className="bg-default-100 hover:bg-default-200 text-foreground font-bold rounded-xl border border-divider"
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
        <div className="glass-card overflow-hidden border border-divider h-[350px] md:h-[450px] relative rounded-3xl shadow-2xl">
          <MapContainer
            center={[-17.9647, -67.1060]}
            zoom={6}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {cities
              .filter(city => city.is_active && Array.isArray(city.coordinates) && city.coordinates.length > 0)
              .map((city, index) => {
                const color = CITY_COLORS[index % CITY_COLORS.length];
                
                return (
                  <Polygon
                    key={city.id}
                    positions={city.coordinates}
                    pathOptions={{
                      color: color,
                      fillColor: color,
                      fillOpacity: 0.25,
                      weight: 3,
                    }}
                  >
                    <Popup>
                      <div className="p-2 text-foreground bg-background rounded-lg">
                        <p className="font-bold text-sm text-primary mb-0.5">{city.name}</p>
                        <p className="text-[10px] text-muted-foreground font-medium mb-1.5">{city.country} • {city.currency}</p>
                        <div className="flex items-center gap-1.5 bg-default-50 px-2 py-1 rounded">
                          <span className="w-1.5 h-1.5 rounded-full bg-success" />
                          <span className="text-[9px] font-black uppercase text-success">Operativa</span>
                        </div>
                      </div>
                    </Popup>
                  </Polygon>
                );
              })}

            {/* City Markers for quickly finding them on map */}
            {cities
              .filter(city => Array.isArray(city.coordinates) && city.coordinates.length > 0)
              .map((city) => (
                <Marker 
                  key={`marker-${city.id}`} 
                  position={city.coordinates[0]}
                >
                  <Popup>
                    <div className="p-1 text-foreground font-semibold text-xs">
                      {city.name}
                    </div>
                  </Popup>
                </Marker>
              ))}
          </MapContainer>

          {/* Floating Indicator */}
          <div className="absolute top-4 right-4 z-[500] bg-background/80 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-divider flex items-center gap-2 shadow-xl">
            <Info className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/80">Vista Operativa Nacional</span>
          </div>
        </div>
      </div>

      {/* Cities Dashboard Grid */}
      <div className="px-6 space-y-4">
        <h2 className="text-xs uppercase font-bold text-muted-foreground ml-1 tracking-widest">Listado de Coberturas</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cities.map((city, index) => {
            const pointsCount = Array.isArray(city.coordinates) ? city.coordinates.length : 0;
            const color = CITY_COLORS[index % CITY_COLORS.length];

            return (
              <motion.div
                key={city.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "glass-card p-5 border border-divider hover:border-default-300 transition-all rounded-3xl relative overflow-hidden shadow-md flex flex-col justify-between h-[180px]",
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
                    <h3 className="font-bold text-lg leading-tight">{city.name}</h3>
                    <p className="text-xs text-muted-foreground font-semibold">{city.country} • Moneda: {city.currency}</p>
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

                <div className="flex items-center gap-4 py-2 border-t border-b border-divider my-2">
                  <div className="flex-1">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Geocerca</p>
                    <p className="text-xs font-semibold text-foreground/80">
                      {pointsCount > 0 ? `${pointsCount} puntos trazados` : 'Sin geocerca'}
                    </p>
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Huso Horario</p>
                    <p className="text-xs font-semibold text-foreground/80 truncate">{city.timezone}</p>
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
                    className="bg-default-100 hover:bg-default-200 text-foreground rounded-xl text-[10px] font-black uppercase h-8 px-4 flex-1 border border-divider"
                  >
                    <Edit2 className="w-3 h-3 mr-1 text-primary" /> Editar
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {cities.length === 0 && !isLoading && (
          <div className="text-center py-20 glass-card bg-default-50 border border-dashed border-divider rounded-3xl">
            <Globe className="w-14 h-14 mx-auto mb-4 text-default-300 animate-pulse" />
            <p className="text-sm text-muted-foreground font-semibold">No hay ciudades configuradas en el sistema</p>
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

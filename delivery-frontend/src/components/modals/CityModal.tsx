import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, useMapEvents, useMap } from 'react-leaflet';
import { Modal, Button, Input } from '@heroui/react';
import { ICity } from '@/interfaces/city-interface';
import { Save, X, Trash2, MapPin, Compass, Globe } from 'lucide-react';
import L from 'leaflet';

// Fix for default Leaflet marker icons in Vite
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

interface CityModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: ICity | null;
  onSubmit: (data: Partial<ICity>) => Promise<boolean>;
}

// Map helper to handle map clicks for drawing and double-clicks
function MapDrawEvents({ onMapClick, isDrawing }: { onMapClick: (latlng: L.LatLng) => void; isDrawing: boolean }) {
  useMapEvents({
    click(e) {
      if (isDrawing) {
        onMapClick(e.latlng);
      }
    },
  });
  return null;
}

// Controller to fly the map to a specific center
function ChangeView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

export const CityModal = ({ isOpen, onClose, initialData, onSubmit }: CityModalProps) => {
  const [name, setName] = useState('');
  const [country, setCountry] = useState('Bolivia');
  const [currency, setCurrency] = useState('BOB');
  const [timezone, setTimezone] = useState('America/La_Paz');
  const [centerLat, setCenterLat] = useState(-17.9647);
  const [centerLng, setCenterLng] = useState(-67.1060);
  
  // Coordinates stores Leaflet [lat, lng] points for easy drawing
  const [points, setPoints] = useState<[number, number][]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [zoom] = useState(13);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name);
        setCountry(initialData.country);
        setCurrency(initialData.currency);
        setTimezone(initialData.timezone);
        setCenterLat(initialData.center_lat);
        setCenterLng(initialData.center_lng);
        setIsDrawing(false);

        // Convert PostGIS GeoJSON ([lng, lat]) back to Leaflet ([lat, lng])
        if (initialData.coordinates && initialData.coordinates.coordinates) {
          const coords = initialData.coordinates.coordinates[0];
          // GeoJSON polygons are closed (first & last points match). Remove last one for interactive list.
          const leafletPoints = coords.slice(0, -1).map((pt: any) => [pt[1], pt[0]] as [number, number]);
          setPoints(leafletPoints);
        } else {
          setPoints([]);
        }
      } else {
        setName('');
        setCountry('Bolivia');
        setCurrency('BOB');
        setTimezone('America/La_Paz');
        setCenterLat(-17.9647);
        setCenterLng(-67.1060);
        setPoints([]);
        setIsDrawing(true);
      }
    }
  }, [isOpen, initialData]);

  const handleMapClick = (latlng: L.LatLng) => {
    setPoints((prev) => [...prev, [latlng.lat, latlng.lng]]);
  };

  const handleRemovePoint = (indexToRemove: number) => {
    setPoints((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleClearPoints = () => {
    setPoints([]);
  };

  const handleRecenter = () => {
    if (points.length > 0) {
      const lats = points.map(p => p[0]);
      const lngs = points.map(p => p[1]);
      const avgLat = lats.reduce((sum, val) => sum + val, 0) / points.length;
      const avgLng = lngs.reduce((sum, val) => sum + val, 0) / points.length;
      setCenterLat(parseFloat(avgLat.toFixed(6)));
      setCenterLng(parseFloat(avgLng.toFixed(6)));
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    if (points.length < 3) {
      alert('Se requieren al menos 3 puntos para delimitar un área de geocerca.');
      return;
    }

    setIsSaving(true);

    const geojsonCoordinates = [
      ...points.map(pt => [pt[1], pt[0]]),
      [points[0][1], points[0][0]]
    ];

    const geojson = {
      type: 'Polygon',
      coordinates: [geojsonCoordinates]
    };

    const payload: Partial<ICity> = {
      id: initialData?.id,
      name,
      country,
      currency,
      timezone,
      center_lat: parseFloat(centerLat.toString()),
      center_lng: parseFloat(centerLng.toString()),
      coordinates: geojson,
      is_active: initialData ? initialData.is_active : true,
    };

    const success = await onSubmit(payload);
    setIsSaving(false);
    if (success) {
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen}>
      <Modal.Backdrop className="bg-black/80 backdrop-blur-sm">
        <Modal.Container>
          <Modal.Dialog className="w-full max-w-5xl bg-background border border-divider rounded-[24px] overflow-hidden flex flex-col text-white">
            <Modal.CloseTrigger onPress={onClose} className="top-4 right-4 text-muted-foreground hover:text-foreground" />

            <Modal.Header className="p-6 border-b border-divider flex items-center gap-4">
              <div className="w-9 h-9 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                <Globe className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold font-display tracking-tight text-white uppercase">
                  {initialData ? 'Editar Ciudad Operativa' : 'Nueva Ciudad'}
                </h2>
                <p className="text-xs text-muted-foreground">Define los límites geográficos de cobertura</p>
              </div>
            </Modal.Header>

            <Modal.Body className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto max-h-[70vh]">
              {/* Formulario Izquierda */}
              <div className="lg:col-span-4 space-y-4">
                <h3 className="text-xs font-bold text-primary uppercase tracking-widest">Información Básica</h3>
                
                <div className="space-y-3.5">
                  <Input
                    label="Nombre"
                    placeholder="Ej. Oruro"
                    value={name}
                    onValueChange={setName}
                    variant="bordered"
                    classNames={{
                      label: "text-white/60 text-xs font-bold",
                      input: "text-white font-semibold text-sm",
                      inputWrapper: "border-white/10 hover:border-white/20 focus-within:!border-primary rounded-xl h-12 bg-white/5",
                    }}
                  />
                  
                  <Input
                    label="País"
                    placeholder="Ej. Bolivia"
                    value={country}
                    onValueChange={setCountry}
                    variant="bordered"
                    classNames={{
                      label: "text-white/60 text-xs font-bold",
                      input: "text-white font-semibold text-sm",
                      inputWrapper: "border-white/10 hover:border-white/20 focus-within:!border-primary rounded-xl h-12 bg-white/5",
                    }}
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Moneda"
                      placeholder="Ej. BOB"
                      maxLength={3}
                      value={currency}
                      onValueChange={setCurrency}
                      variant="bordered"
                      classNames={{
                        label: "text-white/60 text-xs font-bold",
                        input: "text-white font-semibold text-sm",
                        inputWrapper: "border-white/10 hover:border-white/20 focus-within:!border-primary rounded-xl h-12 bg-white/5",
                      }}
                    />

                    <Input
                      label="Timezone"
                      placeholder="Ej. America/La_Paz"
                      value={timezone}
                      onValueChange={setTimezone}
                      variant="bordered"
                      classNames={{
                        label: "text-white/60 text-xs font-bold",
                        input: "text-white font-semibold text-sm",
                        inputWrapper: "border-white/10 hover:border-white/20 focus-within:!border-primary rounded-xl h-12 bg-white/5",
                      }}
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-white/10">
                  <h3 className="text-xs font-bold text-primary uppercase tracking-widest mb-3">Centro del Mapa</h3>
                  <div className="grid grid-cols-2 gap-3 mb-2">
                    <Input
                      label="Latitud"
                      type="number"
                      step="0.0001"
                      value={centerLat}
                      onChange={(e) => setCenterLat(parseFloat(e.target.value) || 0)}
                      variant="bordered"
                      classNames={{
                        label: "text-white/60 text-xs font-bold",
                        input: "text-white font-semibold text-sm",
                        inputWrapper: "border-white/10 hover:border-white/20 focus-within:!border-primary rounded-xl h-12 bg-white/5",
                      }}
                    />
                    <Input
                      label="Longitud"
                      type="number"
                      step="0.0001"
                      value={centerLng}
                      onChange={(e) => setCenterLng(parseFloat(e.target.value) || 0)}
                      variant="bordered"
                      classNames={{
                        label: "text-white/60 text-xs font-bold",
                        input: "text-white font-semibold text-sm",
                        inputWrapper: "border-white/10 hover:border-white/20 focus-within:!border-primary rounded-xl h-12 bg-white/5",
                      }}
                    />
                  </div>
                  <Button
                    size="sm"
                    fullWidth
                    variant="flat"
                    onClick={handleRecenter}
                    disabled={points.length === 0}
                    className="bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-bold"
                  >
                    <Compass className="w-3.5 h-3.5 mr-1" /> Usar centro del polígono
                  </Button>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                  <p className="text-xs font-bold text-white/80">Guía del Mapa:</p>
                  <ul className="text-[11px] text-muted-foreground space-y-1 list-disc pl-4 leading-relaxed font-medium">
                    <li>Activa <b>Modo Dibujo</b> y haz clic para trazar límites.</li>
                    <li>Mínimo de 3 puntos para geocercar.</li>
                    <li>Haz clic sobre un marcador azul para eliminar ese punto específico.</li>
                  </ul>
                </div>
              </div>

              {/* Mapa Derecha */}
              <div className="lg:col-span-8 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white/60 uppercase tracking-wider">Editor Visual</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${points.length >= 3 ? 'bg-success/20 text-success border-success/30' : 'bg-warning/20 text-warning border-warning/30'}`}>
                      {points.length} puntos trazados
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="flat"
                      onClick={() => setIsDrawing(!isDrawing)}
                      className={`rounded-xl text-xs font-bold px-3 ${isDrawing ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white/10 text-white'}`}
                    >
                      <MapPin className="w-3.5 h-3.5 mr-1" />
                      {isDrawing ? 'Dibujo: ON' : 'Activar Dibujo'}
                    </Button>
                    <Button
                      size="sm"
                      variant="flat"
                      onClick={handleClearPoints}
                      className="bg-danger/20 hover:bg-danger/30 text-danger border border-danger/30 rounded-xl text-xs font-bold px-3"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Limpiar Todo
                    </Button>
                  </div>
                </div>

                <div className="h-[350px] md:h-[420px] rounded-2xl overflow-hidden border border-white/10 relative shadow-2xl">
                  <MapContainer
                    center={[centerLat, centerLng]}
                    zoom={13}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                    <ChangeView center={[centerLat, centerLng]} zoom={zoom} />
                    <MapDrawEvents onMapClick={handleMapClick} isDrawing={isDrawing} />

                    {points.length > 0 && (
                      <Polygon
                        positions={points}
                        pathOptions={{
                          color: '#0070F0',
                          fillColor: '#0070F0',
                          fillOpacity: 0.2,
                          weight: 3,
                        }}
                      />
                    )}

                    {points.map((point, index) => (
                      <Marker
                        key={index}
                        position={point}
                        eventHandlers={{
                          click: () => handleRemovePoint(index)
                        }}
                      />
                    ))}
                  </MapContainer>

                  {isDrawing && (
                    <div className="absolute top-4 left-4 z-[1000] bg-black/85 border border-white/10 backdrop-blur px-3 py-1.5 rounded-xl text-[10px] text-white/80 font-bold flex items-center gap-1.5 shadow-xl">
                      <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      Haz clic en el mapa para delimitar la ciudad
                    </div>
                  )}
                </div>
              </div>
            </Modal.Body>

            <Modal.Footer className="p-6 bg-default-50 border-t border-divider flex items-center justify-between">
              <p className="text-xs text-muted-foreground font-medium">
                * Los límites serán almacenados en formato espacial SRID 4326 PostGIS.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="flat"
                  onClick={onClose}
                  className="bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold"
                >
                  <X className="w-4 h-4 mr-1.5" /> Cancelar
                </Button>
                <Button
                  onClick={handleSave}
                  isLoading={isSaving}
                  disabled={!name.trim() || points.length < 3}
                  className="bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/25"
                >
                  <Save className="w-4 h-4 mr-1.5" /> Guardar Ciudad
                </Button>
              </div>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};

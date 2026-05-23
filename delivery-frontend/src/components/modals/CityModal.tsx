import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, useMapEvents, useMap } from 'react-leaflet';
import {
  Button,
  FieldError,
  Fieldset,
  Form,
  Input,
  Label,
  Modal,
  TextField,
} from '@heroui/react';
import { ICity } from '@/interfaces/city-interface';
import { Save, X, Trash2, MapPin, Globe, DollarSign } from 'lucide-react';
import L from 'leaflet';

import 'leaflet/dist/leaflet.css';

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

const LATAM_CURRENCIES = [
  { id: 'BOB', label: 'Boliviano (Bolivia)' },
  { id: 'ARS', label: 'Peso Argentino (Argentina)' },
  { id: 'CLP', label: 'Peso Chileno (Chile)' },
  { id: 'COP', label: 'Peso Colombiano (Colombia)' },
  { id: 'PEN', label: 'Sol Peruano (Perú)' },
  { id: 'BRL', label: 'Real Brasileño (Brasil)' },
  { id: 'MXN', label: 'Peso Mexicano (México)' },
  { id: 'PYG', label: 'Guaraní (Paraguay)' },
  { id: 'UYU', label: 'Peso Uruguayo (Uruguay)' },
];

const getCentroid = (points: [number, number][]): [number, number] => {
  if (!points || points.length === 0) return [-17.9647, -67.1060];
  let latSum = 0;
  let lngSum = 0;
  points.forEach(([lat, lng]) => {
    latSum += lat;
    lngSum += lng;
  });
  return [latSum / points.length, lngSum / points.length];
};

const getCoordsFromCoverageArea = (coverageArea: any): [number, number][] => {
  if (!coverageArea || !coverageArea.coordinates || !coverageArea.coordinates[0]) return [];
  
  let list = coverageArea.coordinates[0];
  // Handle MultiPolygon depth if nested inside polygon list
  if (coverageArea.type === 'MultiPolygon') {
    list = coverageArea.coordinates[0][0];
  }
  
  if (!Array.isArray(list)) return [];
  // Return list mapped to [lat, lng] while removing the duplicated closing coordinate of GeoJSON
  return list.slice(0, -1).map((pt: any) => [pt[1], pt[0]] as [number, number]);
};

// Map helper to handle map clicks for drawing
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
  const [form, setForm] = useState<Partial<ICity>>({
    name: '',
    country: 'Bolivia',
    currency: 'BOB',
    base_delivery_fee: 10.00,
    center_lat_lng: '',
  });
  const [coordinates, setCoordinates] = useState<[number, number][]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setForm({
          name: initialData.name,
          country: initialData.country,
          currency: initialData.currency,
          base_delivery_fee: initialData.base_delivery_fee,
          center_lat_lng: initialData.center_lat_lng,
        });
        setCoordinates(getCoordsFromCoverageArea(initialData.coverage_area));
        setIsDrawing(false);
      } else {
        setForm({
          name: '',
          country: 'Bolivia',
          currency: 'BOB',
          base_delivery_fee: 10.00,
          center_lat_lng: '',
        });
        setCoordinates([]);
        setIsDrawing(true);
      }
    }
  }, [isOpen, initialData]);

  // Reactive Centroid Nominatim autofill
  useEffect(() => {
    const fetchGeoData = async () => {
      if (coordinates.length >= 3) {
        const [lat, lng] = getCentroid(coordinates);
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
            { headers: { 'User-Agent': 'DepedidosDeliveryApp/1.0 (acolque@depedidos.com)' } }
          );
          if (response.ok) {
            const data = await response.json();
            const cityName = data.address?.city || data.address?.town || data.address?.village || '';
            const countryName = data.address?.country || 'Bolivia';
            
            setForm(prev => ({
              ...prev,
              name: prev.name ? prev.name : cityName, // don't overwrite if manual typing exists
              country: countryName,
              center_lat_lng: `${lat.toFixed(6)},${lng.toFixed(6)}`
            }));
          }
        } catch (error) {
          console.error('Nominatim lookup error:', error);
        }
      }
    };
    
    const delayDebounceFn = setTimeout(() => {
      fetchGeoData();
    }, 800);
    
    return () => clearTimeout(delayDebounceFn);
  }, [coordinates]);

  const handleMapClick = (latlng: L.LatLng) => {
    setCoordinates((prev) => [...prev, [latlng.lat, latlng.lng]]);
  };

  const handleRemovePoint = (indexToRemove: number) => {
    setCoordinates((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleClearPoints = () => {
    setCoordinates([]);
  };

  const handleAction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSaving) return;

    const formData = new FormData(e.currentTarget);
    const nameVal = formData.get('name') as string;
    const countryVal = formData.get('country') as string;
    const currencyVal = formData.get('currency') as string;
    const baseFeeVal = formData.get('base_delivery_fee') as string;

    if (!nameVal.trim()) return;

    if (coordinates.length < 3) {
      alert('Se requieren al menos 3 puntos para delimitar un área de geocerca.');
      return;
    }

    setIsSaving(true);

    const [lat, lng] = getCentroid(coordinates);
    const centerLatLng = `${lat.toFixed(6)},${lng.toFixed(6)}`;

    // Convert drawn points [lat, lng] to MultiPolygon coordinates [lng, lat] closed list
    const geojsonCoords = [
      [
        [...coordinates.map(pt => [pt[1], pt[0]]), [coordinates[0][1], coordinates[0][0]]]
      ]
    ];

    const geojson = {
      type: 'MultiPolygon',
      coordinates: geojsonCoords
    };

    const payload: Partial<ICity> = {
      id: initialData?.id,
      name: nameVal,
      country: countryVal,
      currency: currencyVal,
      base_delivery_fee: parseFloat(baseFeeVal),
      center_lat_lng: centerLatLng,
      coverage_area: geojson,
      is_active: initialData ? initialData.is_active : true,
    };

    const success = await onSubmit(payload);
    setIsSaving(false);
    if (success) {
      onClose();
    }
  };

  const mapCenter = coordinates.length > 0 ? coordinates[0] : [-17.9647, -67.1060];

  return (
    <Modal isOpen={isOpen}>
      <Modal.Backdrop className="bg-black/80 backdrop-blur-sm">
        <Modal.Container>
          <Modal.Dialog className="w-full max-w-5xl bg-background border border-divider rounded-[24px] overflow-hidden flex flex-col text-foreground">
            <Modal.CloseTrigger onPress={onClose} className="top-4 right-4 text-muted-foreground hover:text-foreground" />

            <Modal.Header className="border-b border-divider flex flex-row items-center gap-4">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center">
                <Globe className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold font-display tracking-tight text-foreground uppercase">
                  {initialData ? 'Editar Ciudad Operativa' : 'Nueva Ciudad'}
                </h2>
                <p className="text-xs text-muted-foreground">Define los límites geográficos de cobertura con geocercas PostGIS</p>
              </div>
            </Modal.Header>

            <Form onSubmit={handleAction} className="flex flex-col flex-1 overflow-hidden">
              <Modal.Body className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto max-h-[70vh]">
                {/* Formulario Izquierda */}
                <div className="lg:col-span-4 space-y-4">
                  <h3 className="text-xs font-bold text-primary uppercase tracking-widest">Información Básica</h3>
                  
                  <div className="space-y-3.5">
                    <TextField
                      isRequired
                      name="name"
                      value={form.name || ''}
                      onChange={(val) => setForm(prev => ({ ...prev, name: val }))}
                      validate={(value) => {
                        if (!value || value.length < 3) return 'Mínimo 3 caracteres';
                        return null;
                      }}
                    >
                      <Label>Nombre</Label>
                      <Input placeholder="Ej. Oruro" variant="flat" />
                      <FieldError />
                    </TextField>
                    
                    <TextField
                      isRequired
                      name="country"
                      value={form.country || 'Bolivia'}
                      onChange={(val) => setForm(prev => ({ ...prev, country: val }))}
                    >
                      <Label>País</Label>
                      <Input placeholder="Ej. Bolivia" variant="flat" />
                      <FieldError />
                    </TextField>

                    <div className="flex flex-col gap-1 w-full">
                      <label className="text-foreground text-xs font-bold uppercase tracking-wide">Moneda</label>
                      <select
                        name="currency"
                        value={form.currency || 'BOB'}
                        onChange={(e) => setForm(prev => ({ ...prev, currency: e.target.value }))}
                        className="w-full h-10 px-3 rounded-xl bg-transparent border border-divider text-foreground text-sm font-semibold hover:border-foreground/50 focus:border-foreground outline-none transition-all cursor-pointer"
                      >
                        {LATAM_CURRENCIES.map(item => (
                          <option key={item.id} value={item.id} className="bg-background text-foreground font-semibold">
                            {item.id} - {item.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <TextField
                      isRequired
                      name="base_delivery_fee"
                      value={form.base_delivery_fee !== undefined ? String(form.base_delivery_fee) : '10'}
                      onChange={(val) => setForm(prev => ({ ...prev, base_delivery_fee: parseFloat(val) || 0 }))}
                    >
                      <Label>Tarifa Base de Envío</Label>
                      <Input type="number" step="0.01" placeholder="Ej. 10.00" startContent={<DollarSign className="w-4 h-4 text-muted-foreground mr-1" />} variant="flat" />
                      <FieldError />
                    </TextField>

                    <TextField
                      name="center_lat_lng"
                      value={form.center_lat_lng || ''}
                      onChange={(val) => setForm(prev => ({ ...prev, center_lat_lng: val }))}
                      isReadOnly
                    >
                      <Label>Centroide GPS (Autocalculado)</Label>
                      <Input placeholder="Trazando puntos..." variant="flat" />
                    </TextField>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-default-50 border border-divider space-y-2">
                     <p className="text-xs font-bold text-foreground/80">Guía del Mapa:</p>
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
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Editor Visual</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${coordinates.length >= 3 ? 'bg-success/20 text-success border-success/30' : 'bg-warning/20 text-warning border-warning/30'}`}>
                        {coordinates.length} puntos trazados
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="flat"
                        type="button"
                        onClick={() => setIsDrawing(!isDrawing)}
                        className={`rounded-xl text-xs font-bold px-3 cursor-pointer ${isDrawing ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-default-100 text-foreground hover:bg-default-200'}`}
                      >
                        <MapPin className="w-3.5 h-3.5 mr-1" />
                        {isDrawing ? 'Dibujo: ON' : 'Activar Dibujo'}
                      </Button>
                      <Button
                        size="sm"
                        variant="flat"
                        type="button"
                        onClick={handleClearPoints}
                        className="bg-danger/20 hover:bg-danger/30 text-danger border border-danger/30 rounded-xl text-xs font-bold px-3 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" /> Limpiar Todo
                      </Button>
                    </div>
                  </div>

                  <div className="h-[350px] md:h-[420px] rounded-2xl overflow-hidden border border-divider relative shadow-2xl">
                    <MapContainer
                      center={mapCenter}
                      zoom={13}
                      style={{ height: '100%', width: '100%' }}
                    >
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <ChangeView center={mapCenter} zoom={13} />
                      <MapDrawEvents onMapClick={handleMapClick} isDrawing={isDrawing} />

                      {coordinates.length > 0 && (
                        <Polygon
                          positions={coordinates}
                          pathOptions={{
                            color: '#0070F0',
                            fillColor: '#0070F0',
                            fillOpacity: 0.2,
                            weight: 3,
                          }}
                        />
                      )}

                      {coordinates.map((point, index) => (
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
                      <div className="absolute top-4 left-4 z-[1000] bg-background/85 border border-divider backdrop-blur px-3 py-1.5 rounded-xl text-[10px] text-foreground/80 font-bold flex items-center gap-1.5 shadow-xl">
                        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        Haz clic en el mapa para delimitar la ciudad
                      </div>
                    )}
                  </div>
                </div>
              </Modal.Body>

              <Modal.Footer className="p-6 bg-default-50 border-t border-divider flex items-center justify-between flex-shrink-0">
                <p className="text-xs text-muted-foreground font-medium">
                  * Los límites serán almacenados en formato espacial MultiPolygon (PostGIS).
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="flat"
                    type="button"
                    onClick={onClose}
                    className="bg-default-100 hover:bg-default-200 text-foreground rounded-xl font-bold cursor-pointer"
                  >
                    <X className="w-4 h-4 mr-1.5" /> Cancelar
                  </Button>
                  <Button
                    type="submit"
                    isLoading={isSaving}
                    disabled={coordinates.length < 3}
                    className="bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/25 cursor-pointer"
                  >
                    <Save className="w-4 h-4 mr-1.5" /> Guardar Ciudad
                  </Button>
                </div>
              </Modal.Footer>
            </Form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};

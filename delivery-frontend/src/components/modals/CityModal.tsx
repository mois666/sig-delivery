import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, useMapEvents, useMap } from 'react-leaflet';
import {
  Button,
  Description,
  FieldError,
  Fieldset,
  Form,
  Input,
  Label,
  Modal,
  TextField,
} from '@heroui/react';
import { ICity } from '@/interfaces/city-interface';
import { Save, X, Trash2, MapPin, Globe } from 'lucide-react';
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
    timezone: 'America/La_Paz',
    coordinates: [],
  });
  const [isDrawing, setIsDrawing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm(initialData || {
        name: '',
        country: 'Bolivia',
        currency: 'BOB',
        timezone: 'America/La_Paz',
        coordinates: [],
      });
      setIsDrawing(!initialData);
    }
  }, [isOpen, initialData]);

  const handleMapClick = (latlng: L.LatLng) => {
    setForm((prev) => ({
      ...prev,
      coordinates: [...(prev.coordinates || []), [latlng.lat, latlng.lng]]
    }));
  };

  const handleRemovePoint = (indexToRemove: number) => {
    setForm((prev) => ({
      ...prev,
      coordinates: (prev.coordinates || []).filter((_, idx) => idx !== indexToRemove)
    }));
  };

  const handleClearPoints = () => {
    setForm((prev) => ({ ...prev, coordinates: [] }));
  };

  const handleAction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSaving) return;

    const formData = new FormData(e.currentTarget);
    const nameVal = formData.get('name') as string;
    const countryVal = formData.get('country') as string;
    const currencyVal = formData.get('currency') as string;
    const timezoneVal = formData.get('timezone') as string;

    if (!nameVal.trim()) return;

    const points = form.coordinates || [];
    if (points.length < 3) {
      alert('Se requieren al menos 3 puntos para delimitar un área de geocerca.');
      return;
    }

    setIsSaving(true);

    const payload: Partial<ICity> = {
      id: initialData?.id,
      name: nameVal,
      country: countryVal,
      currency: currencyVal,
      timezone: timezoneVal,
      coordinates: points,
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
                <p className="text-xs text-muted-foreground">Define los límites geográficos de cobertura</p>
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
                      defaultValue={form.name || ''}
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
                      defaultValue={form.country || 'Bolivia'}
                    >
                      <Label>País</Label>
                      <Input placeholder="Ej. Bolivia" variant="flat" />
                      <FieldError />
                    </TextField>

                    <div className="grid grid-cols-2 gap-3">
                      <TextField
                        isRequired
                        name="currency"
                        defaultValue={form.currency || 'BOB'}
                        validate={(value) => {
                          if (!value || value.length !== 3) return '3 caracteres';
                          return null;
                        }}
                      >
                        <Label>Moneda</Label>
                        <Input placeholder="BOB" maxLength={3} variant="flat" />
                        <FieldError />
                      </TextField>

                      <TextField
                        isRequired
                        name="timezone"
                        defaultValue={form.timezone || 'America/La_Paz'}
                      >
                        <Label>Timezone</Label>
                        <Input placeholder="America/La_Paz" variant="flat" />
                        <FieldError />
                      </TextField>
                    </div>
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
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${(form.coordinates || []).length >= 3 ? 'bg-success/20 text-success border-success/30' : 'bg-warning/20 text-warning border-warning/30'}`}>
                        {(form.coordinates || []).length} puntos trazados
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="flat"
                        type="button"
                        onClick={() => setIsDrawing(!isDrawing)}
                        className={`rounded-xl text-xs font-bold px-3 ${isDrawing ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-default-100 text-foreground hover:bg-default-200'}`}
                      >
                        <MapPin className="w-3.5 h-3.5 mr-1" />
                        {isDrawing ? 'Dibujo: ON' : 'Activar Dibujo'}
                      </Button>
                      <Button
                        size="sm"
                        variant="flat"
                        type="button"
                        onClick={handleClearPoints}
                        className="bg-danger/20 hover:bg-danger/30 text-danger border border-danger/30 rounded-xl text-xs font-bold px-3"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" /> Limpiar Todo
                      </Button>
                    </div>
                  </div>

                  <div className="h-[350px] md:h-[420px] rounded-2xl overflow-hidden border border-divider relative shadow-2xl">
                    <MapContainer
                      center={(form.coordinates || []).length > 0 ? (form.coordinates || [])[0] : [-17.9647, -67.1060]}
                      zoom={13}
                      style={{ height: '100%', width: '100%' }}
                    >
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <ChangeView center={(form.coordinates || []).length > 0 ? (form.coordinates || [])[0] : [-17.9647, -67.1060]} zoom={13} />
                      <MapDrawEvents onMapClick={handleMapClick} isDrawing={isDrawing} />

                      {(form.coordinates || []).length > 0 && (
                        <Polygon
                          positions={form.coordinates || []}
                          pathOptions={{
                            color: '#0070F0',
                            fillColor: '#0070F0',
                            fillOpacity: 0.2,
                            weight: 3,
                          }}
                        />
                      )}

                      {(form.coordinates || []).map((point, index) => (
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
                  * Los límites serán almacenados en formato JSON en la base de datos.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="flat"
                    type="button"
                    onClick={onClose}
                    className="bg-default-100 hover:bg-default-200 text-foreground rounded-xl font-bold"
                  >
                    <X className="w-4 h-4 mr-1.5" /> Cancelar
                  </Button>
                  <Button
                    type="submit"
                    isLoading={isSaving}
                    disabled={!(form.coordinates && form.coordinates.length >= 3)}
                    className="bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/25"
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

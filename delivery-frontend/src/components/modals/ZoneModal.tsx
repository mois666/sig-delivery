import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polygon, useMapEvents } from 'react-leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Save, Map as MapIcon, Palette, DollarSign, CheckCircle2, MousePointerClick } from 'lucide-react';
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
import { Zone } from '@/interfaces/zones-interface';
import { useZoneStore } from '@/stores/zoneStore';
import 'leaflet/dist/leaflet.css';

interface ZoneModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (zone: Zone) => void;
    initialData?: Zone | null;
    cityCenter?: [number, number];
    city?: any;
}

const PRESET_COLORS = [
    '#3b82f6', // blue
    '#f97316', // orange (primary)
    '#22c55e', // green
    '#a855f7', // purple
    '#ef4444', // red
    '#eab308', // yellow
    '#06b6d4', // cyan
    '#ec4899', // pink
];

const getCoordsFromPolygon = (polygon: any): [number, number][] => {
    if (!polygon || !polygon.coordinates || !polygon.coordinates[0]) return [];
    return polygon.coordinates[0].slice(0, -1).map((pt: any) => [pt[1], pt[0]] as [number, number]);
};

const getZoneLeafletPositions = (polygonObj: any): L.LatLngExpression[] => {
    if (!polygonObj || !polygonObj.coordinates || !polygonObj.coordinates[0]) return [];
    return polygonObj.coordinates[0].map((pt: any) => [pt[1], pt[0]] as L.LatLngExpression);
};

const getCityPositions = (coverageArea: any): L.LatLngExpression[][] | L.LatLngExpression[] => {
    if (!coverageArea || !coverageArea.coordinates) return [];
    if (coverageArea.type === 'MultiPolygon') {
        return coverageArea.coordinates.map((poly: any) =>
            poly[0].map((pt: any) => [pt[1], pt[0]] as L.LatLngExpression)
        );
    } else if (coverageArea.type === 'Polygon') {
        return coverageArea.coordinates[0].map((pt: any) => [pt[1], pt[0]] as L.LatLngExpression);
    }
    return [];
};

export const ZoneModal = ({ isOpen, onClose, onSubmit, initialData, cityCenter, city }: ZoneModalProps) => {
    const { zones } = useZoneStore();

    const [form, setForm] = useState<Partial<Zone>>({
        name: '',
        extra_rate: 0,
        color: '#f97316',
        is_active: true,
    });
    const [coordinates, setCoordinates] = useState<[number, number][]>([]);

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setForm({
                    id: initialData.id,
                    name: initialData.name,
                    extra_rate: initialData.extra_rate,
                    color: initialData.color || '#f97316',
                    is_active: initialData.is_active !== undefined ? initialData.is_active : true,
                });
                setCoordinates(getCoordsFromPolygon(initialData.polygon));
            } else {
                setForm({
                    name: '',
                    extra_rate: 0,
                    color: '#f97316',
                    is_active: true,
                });
                setCoordinates([]);
            }
        }
    }, [isOpen, initialData]);

    const MapEvents = () => {
        useMapEvents({
            click(e) {
                const newPoint: [number, number] = [e.latlng.lat, e.latlng.lng];
                setCoordinates((prev) => [...prev, newPoint]);
            },
        });
        return null;
    };

    const clearPoints = () => setCoordinates([]);

    const removeLastPoint = () => setCoordinates((prev) => prev.slice(0, -1));

    const handleAction = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (coordinates.length < 3) {
            alert('Se requieren al menos 3 puntos para delimitar una zona.');
            return;
        }

        const formData = new FormData(e.currentTarget);
        
        // Convert coords to GeoJSON Polygon format [lng, lat] closed loop
        const geojsonCoords = [
            [...coordinates.map(pt => [pt[1], pt[0]]), [coordinates[0][1], coordinates[0][0]]]
        ];

        const geojson = {
            type: 'Polygon',
            coordinates: geojsonCoords
        };

        const payload: any = {
            ...form,
            name: formData.get('name') as string,
            extra_rate: Number(formData.get('extra_rate')),
            polygon: geojson,
        };

        onSubmit(payload);
    };

    const pointsNeeded = Math.max(0, 3 - coordinates.length);
    const isReady = coordinates.length >= 3;
    const mapCenter = coordinates.length > 0 ? coordinates[0] : (cityCenter || [-17.9647, -67.106]);

    return (
        <Modal isOpen={isOpen}>
            <Modal.Backdrop className="bg-black/80 backdrop-blur-sm">
                <Modal.Container>
                    <Modal.Dialog className="w-full max-w-4xl bg-background border border-divider rounded-[24px] overflow-hidden flex flex-col max-h-[95vh] text-foreground">
                        <Modal.CloseTrigger onPress={onClose} className="top-4 right-4 text-muted-foreground hover:text-foreground" />

                        {/* Header */}
                        <Modal.Header className="border-b border-divider flex gap-4">
                            <div>
                                <Modal.Heading className="text-xl font-black text-foreground uppercase tracking-tight">
                                    {initialData ? 'Editar Zona' : 'Dibujar Zona'}
                                </Modal.Heading>
                                <p className="text-xs text-muted-foreground font-medium">
                                    {initialData ? 'Modifica los límites y propiedades' : 'Haz clic en el mapa para agregar puntos'}
                                </p>
                            </div>
                        </Modal.Header>

                        <Form onSubmit={handleAction} className="flex flex-col flex-1 overflow-hidden">
                            <Modal.Body className="p-0 overflow-y-auto flex-1 flex flex-col custom-scrollbar">

                                {/* ── Mapa Interactivo ────────────────────────────────────── */}
                                <div className="h-[45vh] w-full relative border-b border-divider flex-shrink-0">
                                    <MapContainer
                                        center={mapCenter}
                                        key={`${mapCenter[0]}-${mapCenter[1]}`}
                                        zoom={13}
                                        style={{ height: '100%', width: '100%' }}
                                    >
                                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                        <MapEvents />

                                        {/* Cobertura de la Ciudad (Referencia en Amarillo) */}
                                        {city && city.coverage_area && (
                                            <Polygon
                                                positions={getCityPositions(city.coverage_area)}
                                                pathOptions={{
                                                    color: '#eab308', // Amarillo
                                                    fillColor: '#eab308',
                                                    fillOpacity: 0.15,
                                                    weight: 3,
                                                    dashArray: '5, 5'
                                                }}
                                            />
                                        )}

                                        {/* Zonas existentes (referencia) */}
                                        {zones.map((zone) => {
                                            if (zone.id === initialData?.id || !zone.polygon) return null;
                                            const positions = getZoneLeafletPositions(zone.polygon);
                                            if (positions.length === 0) return null;
                                            return (
                                                <Polygon
                                                    key={zone.id}
                                                    positions={positions}
                                                    pathOptions={{
                                                        color: zone.color,
                                                        fillColor: zone.color,
                                                        fillOpacity: 0.1,
                                                        dashArray: '5, 10',
                                                        weight: 1.5,
                                                    }}
                                                />
                                            );
                                        })}

                                        {/* Marcadores de puntos actuales */}
                                        {coordinates.map((p, i) => (
                                            <Marker key={i} position={p} />
                                        ))}

                                        {/* Polígono en progreso */}
                                        {coordinates.length > 2 && (
                                            <Polygon
                                                positions={coordinates}
                                                pathOptions={{
                                                    color: form.color,
                                                    fillColor: form.color,
                                                    fillOpacity: 0.35,
                                                    weight: 3,
                                                }}
                                            />
                                        )}
                                    </MapContainer>

                                    {/* HUD de estado del mapa */}
                                    <div className="absolute bottom-4 left-4 z-[500] pointer-events-none flex flex-col gap-2">
                                        {/* Indicador de progreso */}
                                        <AnimatePresence mode="wait">
                                            <motion.div
                                                key={isReady ? 'ready' : 'drawing'}
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -8 }}
                                                transition={{ duration: 0.25 }}
                                                className={`px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-widest shadow-xl flex gap-2 items-center backdrop-blur ${isReady
                                                    ? 'bg-green-500/20 border-green-500/40 text-green-400'
                                                    : 'bg-black/80 border-white/10 text-white'
                                                    }`}
                                            >
                                                {isReady ? (
                                                    <CheckCircle2 className="w-3 h-3 animate-pulse" />
                                                ) : (
                                                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                                )}
                                                {isReady ? '¡Área lista para guardar!' : `Dibuja ${pointsNeeded} punto${pointsNeeded !== 1 ? 's' : ''} más`}
                                            </motion.div>
                                        </AnimatePresence>

                                        {/* Puntos colocados */}
                                        {coordinates.length > 0 && (
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="px-3 py-1.5 rounded-full border bg-black/70 border-white/10 text-[10px] font-bold text-white backdrop-blur flex gap-1.5 items-center"
                                            >
                                                <MousePointerClick className="w-3 h-3 text-primary" />
                                                {coordinates.length} punto{coordinates.length !== 1 ? 's' : ''} marcado{coordinates.length !== 1 ? 's' : ''}
                                            </motion.div>
                                        )}
                                    </div>

                                    {/* Botón deshacer último punto */}
                                    {coordinates.length > 0 && (
                                        <div className="absolute top-4 right-4 z-[500]">
                                            <button
                                                type="button"
                                                onClick={removeLastPoint}
                                                className="bg-black/70 border border-white/10 backdrop-blur text-white text-[10px] font-bold px-3 py-1.5 rounded-full hover:bg-danger/30 hover:border-danger/40 hover:text-danger transition-all cursor-pointer"
                                            >
                                                ↩ Deshacer punto
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* ── Configuración de la Zona ────────────────────────────── */}
                                <div className="p-6">
                                    <Fieldset className="w-full">
                                        <Fieldset.Legend>Propiedades de la Zona</Fieldset.Legend>
                                        <Description>Define el nombre, recargo adicional y color de identificación.</Description>

                                        <Fieldset.Group>
                                            {/* Nombre */}
                                            <TextField
                                                isRequired
                                                name="name"
                                                defaultValue={form.name || ''}
                                                validate={(value) => {
                                                    if (!value || value.length < 3) return 'Mínimo 3 caracteres';
                                                    return null;
                                                }}
                                            >
                                                <Label>Nombre de la Zona</Label>
                                                <Input placeholder="Ej: Mercado Campero, Centro Histórico..." variant="flat" />
                                                <FieldError />
                                            </TextField>

                                            {/* Recargo */}
                                            <TextField
                                                isRequired
                                                name="extra_rate"
                                                defaultValue={(form.extra_rate ?? 0).toString()}
                                                validate={(value) => {
                                                    if (isNaN(Number(value)) || Number(value) < 0)
                                                        return 'Debe ser un número válido (≥ 0)';
                                                    return null;
                                                }}
                                            >
                                                <Label>Recargo Adicional</Label>
                                                <Input
                                                    type="number"
                                                    step="0.5"
                                                    min="0"
                                                    placeholder="0.00"
                                                    variant="flat"
                                                    startContent={<DollarSign className="w-4 h-4 text-muted-foreground mr-1" />}
                                                />
                                                <Description>Costo extra que se suma al precio base por zona</Description>
                                                <FieldError />
                                            </TextField>

                                            {/* Color */}
                                            <div className="flex flex-col gap-2">
                                                <Label>Color de Identificación</Label>
                                                <div className="flex items-center gap-3">
                                                    {/* Selector de color personalizado */}
                                                    <div className="relative w-12 h-10 flex-shrink-0">
                                                        <input
                                                            type="color"
                                                            value={form.color}
                                                            onChange={(e) => setForm((prev) => ({ ...prev, color: e.target.value }))}
                                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                        />
                                                        <div
                                                            className="w-full h-full rounded-xl border-2 border-divider shadow-inner cursor-pointer flex items-center justify-center"
                                                            style={{ backgroundColor: form.color }}
                                                        >
                                                            <Palette className="w-4 h-4 text-white drop-shadow" />
                                                        </div>
                                                    </div>

                                                    {/* Colores predefinidos */}
                                                    <div className="flex flex-wrap gap-2">
                                                        {PRESET_COLORS.map((c) => (
                                                            <motion.button
                                                                key={c}
                                                                type="button"
                                                                onClick={() => setForm((prev) => ({ ...prev, color: c }))}
                                                                whileTap={{ scale: 0.85 }}
                                                                whileHover={{ scale: 1.15 }}
                                                                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                                                                className="w-8 h-8 rounded-xl border-2 transition-all cursor-pointer"
                                                                style={{
                                                                    backgroundColor: c,
                                                                    borderColor: form.color === c ? 'white' : 'transparent',
                                                                    boxShadow: form.color === c ? `0 0 0 2px ${c}` : 'none',
                                                                }}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Preview de zona */}
                                                <div
                                                    className="mt-1 px-4 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all"
                                                    style={{
                                                        backgroundColor: `${form.color}18`,
                                                        borderColor: `${form.color}50`,
                                                        color: form.color,
                                                    }}
                                                >
                                                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: form.color }} />
                                                    Vista previa del color de zona en el mapa
                                                </div>
                                            </div>

                                        </Fieldset.Group>

                                        {/* ── Acciones ────────────────────────────────────────── */}
                                        <Fieldset.Actions>
                                            <Button
                                                type="submit"
                                                isDisabled={coordinates.length < 3}
                                                size="lg"
                                                className="flex-[2] h-12 font-black text-white rounded-xl shadow-lg bg-primary shadow-primary/20 cursor-pointer"
                                            >
                                                <Save className="w-4 h-4 mr-1" />
                                                {initialData ? 'Guardar Cambios' : 'Crear Zona'}
                                            </Button>
                                            <Button
                                                type="button"
                                                onPress={clearPoints}
                                                variant="flat"
                                                size="lg"
                                                className="flex-1 h-12 font-bold rounded-xl bg-danger/20 hover:bg-danger/30 text-danger border border-danger/30 cursor-pointer"
                                            >
                                                <Trash2 className="w-4 h-4 mr-1" />
                                                Limpiar
                                            </Button>
                                        </Fieldset.Actions>
                                    </Fieldset>
                                </div>

                            </Modal.Body>
                        </Form>
                    </Modal.Dialog>
                </Modal.Container>
            </Modal.Backdrop>
        </Modal>
    );
};

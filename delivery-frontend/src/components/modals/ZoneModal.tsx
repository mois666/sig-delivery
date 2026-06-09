import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Polygon, useMapEvents, Polyline } from 'react-leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Trash2, Save, Palette, CheckCircle2, MousePointerClick,
    Gauge, Undo2, PenLine, Eye
} from 'lucide-react';
import { Button, Fieldset, Form, Input, Label, Modal, TextField } from '@heroui/react';
import { Zone } from '@/interfaces/zones-interface';
import { useZoneStore } from '@/stores/zoneStore';
import 'leaflet/dist/leaflet.css';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ZoneModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (zone: Zone) => void;
    initialData?: Zone | null;
    cityCenter?: [number, number];
    city?: any;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const EXTRA_RATE_OPTIONS = [
    { value: 1.0, label: 'Normal', desc: 'Sin recargo', color: '#22c55e', tw: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' },
    { value: 0.9, label: 'Fácil', desc: 'Acceso sencillo', color: '#84cc16', tw: 'text-lime-400', bg: 'bg-lime-500/10', border: 'border-lime-500/30' },
    { value: 0.7, label: 'Media', desc: 'Dificultad moderada', color: '#eab308', tw: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
    { value: 0.5, label: 'Difícil', desc: 'Acceso complicado', color: '#f97316', tw: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
    { value: 0.3, label: 'Muy Difícil', desc: 'Zona de difícil acceso', color: '#ef4444', tw: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' },
    { value: 0.1, label: 'Extremo', desc: 'Acceso crítico', color: '#dc2626', tw: 'text-rose-500', bg: 'bg-rose-600/10', border: 'border-rose-600/30' },
] as const;

const PRESET_COLORS = ['#3b82f6', '#f97316', '#22c55e', '#a855f7', '#ef4444', '#eab308', '#06b6d4', '#ec4899'];

const DEFAULT_CENTER: [number, number] = [-17.9647, -67.106];

// ─── Helpers de geometría ─────────────────────────────────────────────────────

const coordsFromPolygon = (polygon: any): [number, number][] => {
    if (!polygon?.coordinates?.[0]) return [];
    // Soporta tanto Polygon como MultiPolygon
    const ring = polygon.type === 'MultiPolygon'
        ? polygon.coordinates[0][0]
        : polygon.coordinates[0];
    return ring.slice(0, -1).map((pt: number[]) => [pt[1], pt[0]] as [number, number]);
};

const leafletPositions = (polygon: any): L.LatLngExpression[] => {
    if (!polygon?.coordinates?.[0]) return [];
    const ring = polygon.type === 'MultiPolygon'
        ? polygon.coordinates[0][0]
        : polygon.coordinates[0];
    return ring.map((pt: number[]) => [pt[1], pt[0]] as L.LatLngExpression);
};

const cityPositions = (coverage: any): L.LatLngExpression[] | L.LatLngExpression[][] => {
    if (!coverage?.coordinates) return [];
    if (coverage.type === 'MultiPolygon')
        return coverage.coordinates.map((p: number[][][]) => p[0].map((pt) => [pt[1], pt[0]] as L.LatLngExpression));
    return coverage.coordinates[0].map((pt: number[]) => [pt[1], pt[0]] as L.LatLngExpression);
};

// ─── Componente Map Events ────────────────────────────────────────────────────

const MapClickHandler = ({ onAdd }: { onAdd: (pt: [number, number]) => void }) => {
    useMapEvents({ click: (e) => onAdd([e.latlng.lat, e.latlng.lng]) });
    return null;
};

// ─── Componente Principal ─────────────────────────────────────────────────────

export const ZoneModal = ({ isOpen, onClose, onSubmit, initialData, cityCenter, city }: ZoneModalProps) => {
    const { zones } = useZoneStore();

    const [name, setName] = useState('');
    const [extraRate, setExtraRate] = useState<number>(1.0);
    const [color, setColor] = useState('#f97316');
    const [coords, setCoords] = useState<[number, number][]>([]);
    const [previewMode, setPreviewMode] = useState(false);

    // Resetear al abrir
    useEffect(() => {
        if (!isOpen) return;
        if (initialData) {
            setName(initialData.name ?? '');
            setExtraRate(initialData.extra_rate ?? 1.0);
            setColor(initialData.color ?? '#f97316');
            setCoords(coordsFromPolygon(initialData.polygon));
            setPreviewMode(false);
        } else {
            setName('');
            setExtraRate(1.0);
            setColor('#f97316');
            setCoords([]);
            setPreviewMode(false);
        }
    }, [isOpen, initialData]);

    const addPoint = useCallback((pt: [number, number]) => !previewMode && setCoords(p => [...p, pt]), [previewMode]);
    const undoPoint = () => setCoords(p => p.slice(0, -1));
    const clearPoints = () => setCoords([]);

    const isReady = coords.length >= 3;
    const mapCenter = coords[0] ?? cityCenter ?? DEFAULT_CENTER;
    const activeOpt = EXTRA_RATE_OPTIONS.find(o => o.value === extraRate) ?? EXTRA_RATE_OPTIONS[0];

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!isReady) return;
        const closed = [...coords.map(pt => [pt[1], pt[0]]), [coords[0][1], coords[0][0]]];
        onSubmit({
            ...(initialData ?? {}),
            name,
            extra_rate: extraRate,
            color,
            is_active: true,
            polygon: { type: 'Polygon', coordinates: [closed] },
        } as Zone);
    };

    // Línea de preview mientras se dibuja (conecta el último punto con el primero)
    const closingLine: [number, number][] =
        coords.length >= 2 ? [coords[coords.length - 1], coords[0]] : [];

    return (
        <Modal isOpen={isOpen}>
            <Modal.Backdrop className="bg-black/80 backdrop-blur-sm">
                <Modal.Container>
                    <Modal.Dialog className="w-full max-w-4xl bg-background border border-divider rounded-[24px] overflow-hidden flex flex-col max-h-[95vh] text-foreground">
                        <Modal.CloseTrigger onPress={onClose} className="top-4 right-4 text-muted-foreground hover:text-foreground z-50" />

                        {/* ── Header ────────────────────────────────────────── */}
                        <Modal.Header className="border-b border-divider px-4 py-2 flex flex-wrap items-start justify-between">
                            <div>
                                <Modal.Heading className="text-xl font-black text-foreground uppercase tracking-tight">
                                    {initialData ? 'Editar Zona' : 'Dibujar Zona'}
                                </Modal.Heading>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {previewMode
                                        ? 'Modo vista previa — haz clic en el lápiz para continuar editando'
                                        : 'Haz clic en el mapa para agregar puntos · mínimo 3'}
                                </p>
                            </div>

                            {/* Toggle dibujar / previsualizar */}
                            <button
                                type="button"
                                onClick={() => setPreviewMode(v => !v)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${previewMode
                                    ? 'bg-primary/10 border-primary/30 text-primary'
                                    : 'bg-default-100 border-divider text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                {previewMode ? <Eye className="w-3.5 h-3.5" /> : <PenLine className="w-3.5 h-3.5" />}
                                {previewMode ? 'Vista previa' : 'Dibujando'}
                            </button>
                        </Modal.Header>

                        <Form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                            <Modal.Body className="p-0 overflow-y-auto flex-1 flex flex-col custom-scrollbar">

                                {/* ── Mapa ──────────────────────────────────────── */}
                                <div className="h-[45vh] w-full relative border-b border-divider flex-shrink-0">
                                    <MapContainer
                                        key={`${mapCenter[0]}-${mapCenter[1]}`}
                                        center={mapCenter}
                                        zoom={13}
                                        style={{ height: '100%', width: '100%' }}
                                        className={previewMode ? '' : 'cursor-crosshair'}
                                    >
                                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                        {!previewMode && <MapClickHandler onAdd={addPoint} />}

                                        {/* Cobertura de ciudad */}
                                        {city?.coverage_area && (
                                            <Polygon
                                                positions={cityPositions(city.coverage_area)}
                                                pathOptions={{ color: '#eab308', fillColor: '#eab308', fillOpacity: 0.08, weight: 2, dashArray: '6,6' }}
                                            />
                                        )}

                                        {/* Zonas existentes (semitransparentes) */}
                                        {zones.map(z => {
                                            if (z.id === initialData?.id || !z.polygon) return null;
                                            const pos = leafletPositions(z.polygon);
                                            if (!pos.length) return null;
                                            return (
                                                <Polygon
                                                    key={z.id}
                                                    positions={pos}
                                                    pathOptions={{ color: z.color, fillColor: z.color, fillOpacity: 0.08, dashArray: '4,8', weight: 1 }}
                                                />
                                            );
                                        })}

                                        {/* Polígono activo */}
                                        {isReady && (
                                            <Polygon
                                                positions={coords}
                                                pathOptions={{ color, fillColor: color, fillOpacity: previewMode ? 0.4 : 0.25, weight: 2.5 }}
                                            />
                                        )}

                                        {/* Línea de cierre mientras dibuja */}
                                        {!previewMode && !isReady && closingLine.length === 2 && (
                                            <Polyline
                                                positions={closingLine}
                                                pathOptions={{ color, weight: 1.5, dashArray: '4,6', opacity: 0.5 }}
                                            />
                                        )}

                                        {/* Marcadores */}
                                        {!previewMode && coords.map((p, i) => (
                                            <Marker key={i} position={p} />
                                        ))}
                                    </MapContainer>

                                    {/* HUD inferior izquierdo */}
                                    <div className="absolute bottom-4 left-4 z-[500] pointer-events-none flex flex-col gap-2">
                                        <AnimatePresence mode="wait">
                                            <motion.div
                                                key={isReady ? 'ok' : 'drawing'}
                                                initial={{ opacity: 0, y: 6 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -6 }}
                                                className={`px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest backdrop-blur flex gap-2 items-center shadow-xl ${isReady
                                                    ? 'bg-green-500/20 border-green-500/40 text-green-400'
                                                    : 'bg-black/70 border-white/10 text-white'
                                                    }`}
                                            >
                                                {isReady
                                                    ? <><CheckCircle2 className="w-3 h-3 animate-pulse" /> Área lista</>
                                                    : <><div className="w-2 h-2 rounded-full bg-primary animate-pulse" /> {Math.max(0, 3 - coords.length)} punto{Math.max(0, 3 - coords.length) !== 1 ? 's' : ''} más</>
                                                }
                                            </motion.div>
                                        </AnimatePresence>

                                        {coords.length > 0 && (
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="px-3 py-1 rounded-full border bg-black/70 border-white/10 text-[10px] font-bold text-white backdrop-blur flex gap-1.5 items-center"
                                            >
                                                <MousePointerClick className="w-3 h-3 text-primary" />
                                                {coords.length} punto{coords.length !== 1 ? 's' : ''}
                                            </motion.div>
                                        )}
                                    </div>

                                    {/* Controles de edición (superior derecho del mapa) */}
                                    {!previewMode && coords.length > 0 && (
                                        <div className="absolute top-4 right-4 z-[500] flex gap-2">
                                            <button
                                                type="button"
                                                onClick={undoPoint}
                                                className="bg-black/70 border border-white/10 backdrop-blur text-white text-[10px] font-bold px-3 py-1.5 rounded-full hover:bg-yellow-500/20 hover:border-yellow-500/40 hover:text-yellow-300 transition-all cursor-pointer flex items-center gap-1.5"
                                            >
                                                <Undo2 className="w-3 h-3" /> Deshacer
                                            </button>
                                            <button
                                                type="button"
                                                onClick={clearPoints}
                                                className="bg-black/70 border border-white/10 backdrop-blur text-white text-[10px] font-bold px-3 py-1.5 rounded-full hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-300 transition-all cursor-pointer flex items-center gap-1.5"
                                            >
                                                <Trash2 className="w-3 h-3" /> Limpiar
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* ── Formulario ────────────────────────────────── */}
                                <div className="p-6 space-y-6">

                                    {/* Nombre */}
                                    <TextField
                                        isRequired
                                        name="name"
                                        value={name}
                                        onChange={setName}
                                        validate={v => (!v || v.length < 3) ? 'Mínimo 3 caracteres' : null}
                                    >
                                        <Label>Nombre de la Zona</Label>
                                        <Input placeholder="Ej: Mercado Campero, Cerro Pie de Gallo..." variant="flat" />
                                    </TextField>

                                    {/* Factor de accesibilidad */}
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <Gauge className="w-4 h-4 text-muted-foreground" />
                                            <Label className="text-sm font-bold">Factor de Accesibilidad</Label>
                                        </div>
                                        <p className="text-[11px] text-muted-foreground -mt-1">
                                            Un factor menor eleva el costo en esta zona (precio ÷ factor).
                                        </p>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                            {EXTRA_RATE_OPTIONS.map(opt => {
                                                const active = extraRate === opt.value;
                                                return (
                                                    <motion.button
                                                        key={opt.value}
                                                        type="button"
                                                        onClick={() => setExtraRate(opt.value)}
                                                        whileTap={{ scale: 0.95 }}
                                                        className={`relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 transition-all duration-150 cursor-pointer text-left ${active ? `${opt.bg} ${opt.border}` : 'border-divider bg-default-50 hover:bg-default-100'
                                                            }`}
                                                    >
                                                        <div
                                                            className="w-2.5 h-2.5 rounded-full flex-shrink-0 border-2 transition-all"
                                                            style={{
                                                                borderColor: opt.color,
                                                                backgroundColor: active ? opt.color : 'transparent',
                                                            }}
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-baseline justify-between gap-1">
                                                                <span className={`text-[11px] font-black uppercase tracking-wide ${active ? opt.tw : 'text-foreground'}`}>
                                                                    {opt.label}
                                                                </span>
                                                                <span className={`text-[10px] font-mono font-bold ${active ? opt.tw : 'text-muted-foreground'}`}>
                                                                    ×{opt.value}
                                                                </span>
                                                            </div>
                                                            <p className="text-[9px] text-muted-foreground mt-0.5 truncate">{opt.desc}</p>
                                                        </div>
                                                        {active && (
                                                            <motion.div
                                                                initial={{ scale: 0 }} animate={{ scale: 1 }}
                                                                className="absolute top-1 right-1"
                                                            >
                                                                <CheckCircle2 className={`w-3 h-3 ${opt.tw}`} />
                                                            </motion.div>
                                                        )}
                                                    </motion.button>
                                                );
                                            })}
                                        </div>

                                        {/* Banner de impacto */}
                                        <motion.div
                                            layout
                                            key={extraRate}
                                            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                                            className={`px-4 py-2.5 rounded-xl border text-[11px] font-bold flex items-center gap-2 ${activeOpt.bg} ${activeOpt.border}`}
                                        >
                                            <Gauge className={`w-3.5 h-3.5 flex-shrink-0 ${activeOpt.tw}`} />
                                            <span className={activeOpt.tw}>
                                                Factor ×{extraRate} — cada km en esta zona cuesta {(1 / extraRate).toFixed(1)}× el precio base
                                            </span>
                                        </motion.div>
                                    </div>

                                    {/* Color */}
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2">
                                            <Palette className="w-4 h-4 text-muted-foreground" />
                                            Color de identificación
                                        </Label>
                                        <div className="flex items-center gap-3">
                                            {/* Selector nativo */}
                                            <div className="relative w-10 h-10 flex-shrink-0">
                                                <input
                                                    type="color"
                                                    value={color}
                                                    onChange={e => setColor(e.target.value)}
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                />
                                                <div
                                                    className="w-10 h-10 rounded-xl border-2 border-divider cursor-pointer shadow-inner"
                                                    style={{ backgroundColor: color }}
                                                />
                                            </div>
                                            {/* Paleta rápida */}
                                            <div className="flex flex-wrap gap-2">
                                                {PRESET_COLORS.map(c => (
                                                    <motion.button
                                                        key={c}
                                                        type="button"
                                                        onClick={() => setColor(c)}
                                                        whileTap={{ scale: 0.85 }}
                                                        whileHover={{ scale: 1.15 }}
                                                        className="w-7 h-7 rounded-lg border-2 cursor-pointer transition-all"
                                                        style={{
                                                            backgroundColor: c,
                                                            borderColor: color === c ? 'white' : 'transparent',
                                                            boxShadow: color === c ? `0 0 0 2px ${c}` : 'none',
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                        {/* Preview de zona */}
                                        <div
                                            className="px-4 py-2 rounded-xl border text-xs font-bold flex items-center gap-2"
                                            style={{ backgroundColor: `${color}14`, borderColor: `${color}40`, color }}
                                        >
                                            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
                                            Vista previa en el mapa
                                        </div>
                                    </div>
                                </div>
                            </Modal.Body>

                            {/* ── Footer / Acciones ───────────────────────────── */}
                            <div className="px-6 py-4 border-t border-divider flex gap-3">
                                <Button
                                    type="submit"
                                    isDisabled={!isReady || name.length < 3}
                                    size="lg"
                                    className="flex-[2] h-12 font-black text-white rounded-xl shadow-lg bg-primary shadow-primary/20 cursor-pointer"
                                >
                                    <Save className="w-4 h-4 mr-1.5" />
                                    {initialData ? 'Guardar Cambios' : 'Crear Zona'}
                                </Button>
                                <Button
                                    type="button"
                                    onPress={onClose}
                                    variant="flat"
                                    size="lg"
                                    className="flex-1 h-12 font-bold rounded-xl cursor-pointer"
                                >
                                    Cancelar
                                </Button>
                            </div>
                        </Form>
                    </Modal.Dialog>
                </Modal.Container>
            </Modal.Backdrop>
        </Modal>
    );
};

import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Polygon, Popup } from 'react-leaflet';
import { Plus, Map as MapIcon, Trash2, Edit2, ArrowLeft, Gauge } from 'lucide-react';
import { Button } from '@heroui/react';
import { motion, AnimatePresence } from 'framer-motion';
import L from 'leaflet';

import { useZoneStore } from '@/stores/zoneStore';
import { useCityStore } from '@/stores/cityStore';
import { ZoneModal } from '@/components/modals/ZoneModal';
import { Zone } from '@/interfaces/zones-interface';
import 'leaflet/dist/leaflet.css';

// ─── Constantes de accesibilidad (espejadas del ZoneModal) ────────────────────

const RATE_CONFIG: Record<number, { label: string; color: string; tw: string; bg: string }> = {
    1.0: { label: 'Normal',       color: '#22c55e', tw: 'text-green-400',  bg: 'bg-green-500/10'  },
    0.9: { label: 'Fácil',        color: '#84cc16', tw: 'text-lime-400',   bg: 'bg-lime-500/10'   },
    0.7: { label: 'Media',        color: '#eab308', tw: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    0.5: { label: 'Difícil',      color: '#f97316', tw: 'text-orange-400', bg: 'bg-orange-500/10' },
    0.3: { label: 'Muy Difícil',  color: '#ef4444', tw: 'text-red-400',    bg: 'bg-red-500/10'    },
    0.1: { label: 'Extremo',      color: '#dc2626', tw: 'text-rose-500',   bg: 'bg-rose-600/10'   },
};

const getRateInfo = (rate: number) =>
    RATE_CONFIG[rate] ?? { label: `×${rate}`, color: '#888', tw: 'text-muted-foreground', bg: 'bg-muted/30' };

// ─── Helper de geometría ──────────────────────────────────────────────────────

const leafletPositions = (polygon: any): L.LatLngExpression[] => {
    if (!polygon?.coordinates?.[0]) return [];
    const ring = polygon.type === 'MultiPolygon'
        ? polygon.coordinates[0][0]
        : polygon.coordinates[0];
    return ring.map((pt: number[]) => [pt[1], pt[0]] as L.LatLngExpression);
};

// ─── Página ───────────────────────────────────────────────────────────────────

export const AdminZone = () => {
    const navigate        = useNavigate();
    const [searchParams]  = useSearchParams();
    const cityId          = parseInt(searchParams.get('cityId') ?? '1');

    const { zones, fetchZones, saveZone, deleteZone, isLoading } = useZoneStore();
    const { cities, fetchCities }                                 = useCityStore();
    const [showModal,     setShowModal]     = useState(false);
    const [selectedZone,  setSelectedZone]  = useState<Zone | null>(null);

    useEffect(() => {
        if (cities.length === 0) fetchCities(true);
        fetchZones(cityId);
    }, [cityId]);

    const currentCity = cities.find(c => c.id === cityId);
    const mapCenter: L.LatLngExpression = currentCity?.center_lat_lng
        ? (currentCity.center_lat_lng.split(',').map(Number) as L.LatLngExpression)
        : [-17.9647, -67.106];

    const openCreate = () => { setSelectedZone(null); setShowModal(true); };
    const openEdit   = (zone: Zone) => { setSelectedZone(zone); setShowModal(true); };

    return (
        <div className="min-h-screen bg-background pb-24 safe-top text-foreground">

            {/* ── Header ──────────────────────────────────────────────── */}
            <div className="glass-card border-b border-divider px-4 py-5 mb-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                        <Button
                            isIconOnly variant="flat"
                            onClick={() => navigate('/cities')}
                            className="bg-default-100 hover:bg-default-200 rounded-xl border border-divider h-10 w-10 min-w-[40px] cursor-pointer"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                        <div>
                            <h1 className="text-xl font-display font-bold">
                                Zonas de <span className="text-primary">{currentCity?.name ?? '...'}</span>
                            </h1>
                            <p className="text-xs text-muted-foreground">
                                {zones.length} zona{zones.length !== 1 ? 's' : ''} geocercada{zones.length !== 1 ? 's' : ''}
                            </p>
                        </div>
                    </div>
                    <Button
                        onClick={openCreate}
                        className="bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20"
                    >
                        <Plus className="w-4 h-4 mr-2" /> Nueva Zona
                    </Button>
                </div>
            </div>

            {/* ── Mapa de cobertura ────────────────────────────────────── */}
            <div className="px-4 mb-5">
                <div className="glass-card overflow-hidden border border-divider rounded-3xl shadow-xl" style={{ height: 340 }}>
                    <MapContainer
                        key={`${mapCenter[0]}-${mapCenter[1]}`}
                        center={mapCenter}
                        zoom={13}
                        style={{ height: '100%', width: '100%' }}
                    >
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                        {zones.map(zone => {
                            const pos = leafletPositions(zone.polygon);
                            if (!pos.length) return null;
                            const info = getRateInfo(zone.extra_rate);
                            return (
                                <Polygon
                                    key={zone.id}
                                    positions={pos}
                                    pathOptions={{ color: zone.color, fillColor: zone.color, fillOpacity: 0.35, weight: 2 }}
                                >
                                    <Popup>
                                        <div className="p-1 min-w-[120px]">
                                            <p className="font-bold text-sm mb-1">{zone.name}</p>
                                            <span
                                                className="inline-flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-full"
                                                style={{ color: info.color, backgroundColor: `${info.color}18` }}
                                            >
                                                <Gauge className="w-3 h-3" />
                                                {info.label} · ×{zone.extra_rate}
                                            </span>
                                        </div>
                                    </Popup>
                                </Polygon>
                            );
                        })}
                    </MapContainer>
                </div>
            </div>

            {/* ── Lista de zonas ────────────────────────────────────────── */}
            <div className="px-4 space-y-2">
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest ml-1 mb-3">
                    Áreas configuradas
                </p>

                <AnimatePresence>
                    {zones.map((zone, i) => {
                        const info        = getRateInfo(zone.extra_rate);
                        const pointCount  = zone.polygon?.coordinates?.[0]?.length
                            ? zone.polygon.coordinates[0].length - 1  // cerrado → excluir punto de cierre
                            : 0;

                        return (
                            <motion.div
                                key={zone.id}
                                initial={{ opacity: 0, x: -16 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 16 }}
                                transition={{ delay: i * 0.04 }}
                                className="glass-card p-4 flex items-center justify-between border-l-4 border border-divider rounded-2xl"
                                style={{ borderLeftColor: zone.color }}
                            >
                                {/* Info */}
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    {/* Indicador de color */}
                                    <div
                                        className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center"
                                        style={{ backgroundColor: `${zone.color}20`, border: `2px solid ${zone.color}40` }}
                                    >
                                        <Gauge className="w-4 h-4" style={{ color: info.color }} />
                                    </div>

                                    <div className="min-w-0">
                                        <h3 className="font-bold text-sm text-foreground truncate">{zone.name}</h3>
                                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                            {/* Badge de nivel */}
                                            <span
                                                className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${info.tw} ${info.bg}`}
                                            >
                                                {info.label} · ×{zone.extra_rate}
                                            </span>
                                            {pointCount > 0 && (
                                                <span className="text-[10px] text-muted-foreground">
                                                    {pointCount} puntos
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Acciones */}
                                <div className="flex gap-2 flex-shrink-0 ml-2">
                                    <Button
                                        isIconOnly variant="flat"
                                        onClick={() => openEdit(zone)}
                                        className="bg-default-100 hover:bg-primary/10 border border-divider h-8 w-8 min-w-[32px] rounded-lg cursor-pointer"
                                        title="Editar zona"
                                    >
                                        <Edit2 className="w-3.5 h-3.5 text-primary" />
                                    </Button>
                                    <Button
                                        isIconOnly variant="flat"
                                        onClick={() => deleteZone(cityId, zone.id!)}
                                        className="bg-danger/10 hover:bg-danger/20 border border-danger/20 h-8 w-8 min-w-[32px] rounded-lg cursor-pointer"
                                        title="Eliminar zona"
                                    >
                                        <Trash2 className="w-3.5 h-3.5 text-danger" />
                                    </Button>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>

                {/* Estado vacío */}
                {zones.length === 0 && !isLoading && (
                    <div className="text-center py-16 glass-card border border-dashed border-divider rounded-3xl">
                        <MapIcon className="w-12 h-12 mx-auto mb-3 opacity-10" />
                        <p className="text-sm text-muted-foreground font-medium">
                            No hay zonas configuradas para {currentCity?.name ?? 'esta ciudad'}
                        </p>
                        <Button
                            onClick={openCreate}
                            size="sm"
                            className="mt-4 bg-primary text-white font-bold rounded-xl"
                        >
                            <Plus className="w-3.5 h-3.5 mr-1.5" /> Crear primera zona
                        </Button>
                    </div>
                )}

                {isLoading && (
                    <div className="text-center py-10 text-muted-foreground text-sm">
                        Cargando zonas...
                    </div>
                )}
            </div>

            {/* ── Modal ────────────────────────────────────────────────── */}
            <AnimatePresence>
                {showModal && (
                    <ZoneModal
                        isOpen={showModal}
                        onClose={() => setShowModal(false)}
                        initialData={selectedZone}
                        city={currentCity}
                        cityCenter={mapCenter as [number, number]}
                        onSubmit={async (data) => {
                            const ok = await saveZone(cityId, data);
                            if (ok) setShowModal(false);
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminZone;
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Polygon, Popup } from 'react-leaflet';
import { Plus, Map as MapIcon, Trash2, Edit2, Info, ArrowLeft } from 'lucide-react';
import { Button } from '@heroui/react';
import { useZoneStore } from '@/stores/zoneStore';
import { useCityStore } from '@/stores/cityStore';
import { ZoneModal } from '@/components/modals/ZoneModal';
import { Zone } from '@/interfaces/zones-interface';
import { AnimatePresence, motion } from 'framer-motion';
import L from 'leaflet';

import 'leaflet/dist/leaflet.css';

const getZoneLeafletPositions = (polygonObj: any): L.LatLngExpression[] => {
    if (!polygonObj || !polygonObj.coordinates || !polygonObj.coordinates[0]) return [];
    return polygonObj.coordinates[0].map((pt: any) => [pt[1], pt[0]] as L.LatLngExpression);
};

export const AdminZone = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const cityIdStr = searchParams.get('cityId');
    const cityId = cityIdStr ? parseInt(cityIdStr) : 1;

    const { zones, fetchZones, saveZone, deleteZone, isLoading } = useZoneStore();
    const { cities, fetchCities } = useCityStore();
    const [showModal, setShowModal] = useState(false);
    const [selectedZone, setSelectedZone] = useState<Zone | null>(null);

    useEffect(() => {
        if (cities.length === 0) {
            fetchCities(true);
        }
        fetchZones(cityId);
    }, [cityId]);

    const handleEdit = (zone: Zone) => {
        setSelectedZone(zone);
        setShowModal(true);
    };

    const currentCity = cities.find(c => c.id === cityId);
    const mapCenter: L.LatLngExpression = currentCity && currentCity.center_lat_lng
        ? currentCity.center_lat_lng.split(',').map(Number) as L.LatLngExpression
        : [-17.9647, -67.1060];

    const cityName = currentCity ? currentCity.name : 'Cargando...';

    return (
        <div className="min-h-screen bg-background pb-24 safe-top text-foreground">
            {/* Header */}
            <div className="glass-card border-b border-divider px-4 py-6 mb-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                        <Button 
                            isIconOnly
                            variant="flat"
                            onClick={() => navigate('/cities')}
                            className="bg-default-100 hover:bg-default-200 text-foreground rounded-xl border border-divider h-10 w-10 min-w-[40px] flex items-center justify-center cursor-pointer"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div>
                            <h1 className="text-xl font-display font-bold">Zonas de Recargo: <span className="text-primary">{cityName}</span></h1>
                            <p className="text-sm text-muted-foreground">Gestión de áreas y tarifas especiales de cobertura</p>
                        </div>
                    </div>
                    <Button 
                        onClick={() => { setSelectedZone(null); setShowModal(true); }} 
                        className="bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20"
                    >
                        <Plus className="w-4 h-4 mr-2" /> Nueva Zona
                    </Button>
                </div>
            </div>

            {/* Gran Mapa de Visualización */}
            <div className="px-4 mb-6">
                <div className="glass-card overflow-hidden border border-divider h-[300px] md:h-[400px] relative rounded-3xl shadow-xl">
                    <MapContainer
                        center={mapCenter}
                        key={`${mapCenter[0]}-${mapCenter[1]}`}
                        zoom={13}
                        style={{ height: '100%', width: '100%' }}
                    >
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        {zones.map((zone) => {
                            const positions = getZoneLeafletPositions(zone.polygon);
                            if (positions.length === 0) return null;
                            return (
                                <Polygon
                                    key={zone.id}
                                    positions={positions}
                                    pathOptions={{
                                        color: zone.color,
                                        fillColor: zone.color,
                                        fillOpacity: 0.4,
                                        weight: 2
                                    }}
                                >
                                    <Popup>
                                        <div className="p-1">
                                            <p className="font-bold text-sm mb-1">{zone.name}</p>
                                            <p className="text-xs text-primary">Recargo: {currentCity?.currency} {zone.extra_rate}</p>
                                        </div>
                                    </Popup>
                                </Polygon>
                            );
                        })}
                    </MapContainer>

                    {/* Indicador Flotante sobre el mapa */}
                    <div className="absolute top-4 right-4 z-[500] bg-background/90 backdrop-blur px-3 py-1.5 rounded-xl border border-divider flex items-center gap-2 shadow-xl">
                        <Info className="w-3 h-3 text-primary" />
                        <span className="text-[10px] font-bold uppercase tracking-tighter">Vista Local de Cobertura ({cityName})</span>
                    </div>
                </div>
            </div>

            {/* Lista de Zonas */}
            <div className="px-4 space-y-3">
                <h2 className="text-[10px] uppercase font-bold text-muted-foreground ml-1 tracking-widest mb-2">Detalle de Áreas</h2>
                {zones.map((zone) => {
                    const pointsCount = zone.polygon?.coordinates?.[0]?.length || 0;
                    return (
                        <motion.div
                            key={zone.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="glass-card p-4 flex items-center justify-between border-l-4 shadow-sm border border-divider rounded-2xl"
                            style={{ borderLeftColor: zone.color }}
                        >
                            <div className="flex-1">
                                <h3 className="font-bold text-foreground text-sm">{zone.name}</h3>
                                <div className="flex items-center gap-3 mt-1">
                                    <span className="text-xs font-semibold text-primary">{currentCity?.currency} {zone.extra_rate}</span>
                                    <span className="text-[10px] text-muted-foreground">• {pointsCount} puntos trazados</span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button 
                                    isIconOnly
                                    variant="flat" 
                                    onClick={() => handleEdit(zone)} 
                                    className="bg-default-100 hover:bg-default-200 text-primary border border-divider h-8 w-8 min-w-[32px] rounded-lg flex items-center justify-center cursor-pointer"
                                    title="Editar Zona"
                                >
                                    <Edit2 className="w-3.5 h-3.5 text-primary" />
                                </Button>
                                <Button 
                                    isIconOnly
                                    variant="flat" 
                                    onClick={() => deleteZone(cityId, zone.id!)} 
                                    className="bg-danger/10 hover:bg-danger/20 text-danger border border-danger/20 h-8 w-8 min-w-[32px] rounded-lg flex items-center justify-center cursor-pointer"
                                    title="Eliminar Zona"
                                >
                                    <Trash2 className="w-3.5 h-3.5 text-danger" />
                                </Button>
                            </div>
                        </motion.div>
                    );
                })}

                {zones.length === 0 && !isLoading && (
                    <div className="text-center py-16 glass-card bg-default-50 border border-dashed border-divider rounded-3xl">
                        <MapIcon className="w-12 h-12 mx-auto mb-4 opacity-10" />
                        <p className="text-sm text-muted-foreground">No hay zonas geocercadas activas para {cityName}</p>
                    </div>
                )}
            </div>

            {/* Modales */}
            <AnimatePresence>
                {showModal && (
                    <ZoneModal
                        isOpen={showModal}
                        onClose={() => setShowModal(false)}
                        initialData={selectedZone}
                        city={currentCity}
                        cityCenter={mapCenter as [number, number]}
                        onSubmit={async (data) => {
                            const success = await saveZone(cityId, data);
                            if (success) setShowModal(false);
                        }}
                    />
                )}
            </AnimatePresence>
            
        </div>
    );
};

export default AdminZone;
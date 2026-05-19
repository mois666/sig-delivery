import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polygon, Popup } from 'react-leaflet';
import { Plus, Map as MapIcon, Trash2, Edit2, Info } from 'lucide-react';
import { Button } from '@heroui/react';
import { useZoneStore } from '@/stores/zoneStore';
import { ZoneModal } from '@/components/modals/ZoneModal';
import { Zone } from '@/interfaces/zones-interface';
import { AnimatePresence, motion } from 'framer-motion';

import 'leaflet/dist/leaflet.css';

const AdminZone = () => {
    const { zones, fetchZones, saveZone, deleteZone, isLoading } = useZoneStore();
    const [showModal, setShowModal] = useState(false);
    const [selectedZone, setSelectedZone] = useState<Zone | null>(null);

    useEffect(() => { fetchZones(); }, []);

    const handleEdit = (zone: Zone) => {
        setSelectedZone(zone);
        setShowModal(true);
    };

    return (
        <div className="min-h-screen bg-background pb-24 safe-top">
            {/* Header */}
            <div className="glass-card border-b border-border/50 px-4 py-6 mb-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-display font-bold text-foreground">Zonas de Recargo</h1>
                        <p className="text-sm text-muted-foreground">Gestión de áreas y tarifas especiales</p>
                    </div>
                    <Button onClick={() => { setSelectedZone(null); setShowModal(true); }} className="bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20">
                        <Plus className="w-4 h-4 mr-2" /> Nueva Zona
                    </Button>
                </div>
            </div>

            {/* Gran Mapa de Visualización */}
            <div className="px-4 mb-6">
                <div className="glass-card overflow-hidden border border-border/50 h-[300px] md:h-[400px] relative">
                    <MapContainer
                        center={[-17.9647, -67.1060]}
                        zoom={13}
                        style={{ height: '100%', width: '100%' }}
                    >
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        {zones.map((zone) => (
                            <Polygon
                                key={zone.id}
                                positions={zone.coordinates}
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
                                        <p className="text-xs text-primary">Recargo: Bs. {zone.extra_rate}</p>
                                    </div>
                                </Popup>
                            </Polygon>
                        ))}
                    </MapContainer>

                    {/* Indicador Flotante sobre el mapa */}
                    <div className="absolute top-4 right-4 z-[500] bg-background/90 backdrop-blur px-3 py-1.5 rounded-xl border border-border flex items-center gap-2 shadow-xl">
                        <Info className="w-3 h-3 text-primary" />
                        <span className="text-[10px] font-bold uppercase tracking-tighter">Vista Global de Cobertura</span>
                    </div>
                </div>
            </div>

            {/* Lista de Zonas */}
            <div className="px-4 space-y-3">
                <h2 className="text-[10px] uppercase font-bold text-muted-foreground ml-1 tracking-widest mb-2">Detalle de Áreas</h2>
                {zones.map((zone) => (
                    <motion.div
                        key={zone.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="glass-card p-4 flex items-center justify-between border-l-4 shadow-sm"
                        style={{ borderLeftColor: zone.color }}
                    >
                        <div className="flex-1">
                            <h3 className="font-bold text-foreground text-sm">{zone.name}</h3>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="text-xs font-semibold text-primary">Bs. {zone.extra_rate}</span>
                                <span className="text-[10px] text-muted-foreground">• {zone.coordinates.length} puntos trazados</span>
                            </div>
                        </div>
                        <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(zone)} className="hover:bg-primary/10">
                                <Edit2 className="w-4 h-4 text-primary" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => deleteZone(zone.id!)} className="hover:bg-destructive/10">
                                <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                        </div>
                    </motion.div>
                ))}

                {zones.length === 0 && !isLoading && (
                    <div className="text-center py-16 glass-card bg-muted/20 border-dashed">
                        <MapIcon className="w-12 h-12 mx-auto mb-4 opacity-10" />
                        <p className="text-sm text-muted-foreground">No hay zonas geocercadas activas</p>
                    </div>
                )}
            </div>

            {/* Modales */}
            <AnimatePresence>
            <ZoneModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                initialData={selectedZone}
                onSubmit={async (data) => {
                    const success = await saveZone(data);
                    if (success) setShowModal(false);
                }}
            />
            </AnimatePresence>
            
        </div>
    );
};

export default AdminZone;
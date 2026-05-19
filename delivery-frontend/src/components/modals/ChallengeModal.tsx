import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Clock, MapPin, Loader2, Rocket, Package, Map as MapIcon, Save, X } from 'lucide-react';
import {
  Button,
  Description,
  FieldError,
  Fieldset,
  Form,
  Input,
  Label,
  Modal,
  TextArea,
  TextField,
} from '@heroui/react';
import { useOrderStore } from '@/stores/orderStore';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { calculateDistance, extractCoords, getAddressFromCoords, getExtraRateFromBackend } from '@/lib/geoUtils';
import { MapPicker } from '../maps/MapPicker';
import { appDB } from '@/api/appDB';

const GLOBAL_RATE = 5;

// ─── Tipo de Servicio ────────────────────────────────────────────────────────
const SERVICE_TYPES = [
  {
    id: 'estandar',
    label: 'Estándar',
    icon: Package,
    description: 'Entrega regular',
    color: 'from-blue-500/20 to-blue-600/10',
    borderActive: 'border-blue-500',
    textActive: 'text-blue-400',
    iconBg: 'bg-blue-500/20',
    points: 10,
  },
  {
    id: 'express',
    label: 'Express',
    icon: Zap,
    description: 'Máxima velocidad',
    color: 'from-danger/20 to-danger/10',
    borderActive: 'border-danger',
    textActive: 'text-danger',
    iconBg: 'bg-danger/20',
    points: 20,
  },
  {
    id: 'programada',
    label: 'Programada',
    icon: Clock,
    description: 'Hora acordada',
    color: 'from-purple-500/20 to-purple-600/10',
    borderActive: 'border-purple-500',
    textActive: 'text-purple-400',
    iconBg: 'bg-purple-500/20',
    points: 5,
  },
] as const;

// ─── Urgencia ────────────────────────────────────────────────────────────────
const URGENCY_OPTIONS = [
  {
    id: 'baja',
    label: 'Baja',
    icon: '🟢',
    description: 'Sin apuro',
    color: 'from-green-500/20 to-emerald-500/10',
    borderActive: 'border-green-500',
    textActive: 'text-green-400',
    badge: 'bg-green-500/20 text-green-400',
  },
  {
    id: 'media',
    label: 'Media',
    icon: '🟡',
    description: 'Normal',
    color: 'from-yellow-500/20 to-amber-500/10',
    borderActive: 'border-yellow-500',
    textActive: 'text-yellow-400',
    badge: 'bg-yellow-500/20 text-yellow-400',
  },
  {
    id: 'alta',
    label: 'Alta',
    icon: '🔴',
    description: '¡Urgente!',
    color: 'from-red-500/20 to-rose-500/10',
    borderActive: 'border-red-500',
    textActive: 'text-red-400',
    badge: 'bg-red-500/20 text-red-400',
  },
] as const;

export const ChallengeModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { addOrder } = useOrderStore();
  const [loading, setLoading] = useState(false);
  const [loadingGeo, setLoadingGeo] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [showMap, setShowMap] = useState<'pickup' | 'delivery' | null>(null);

  const [form, setForm] = useState({
    type: 'estandar' as 'estandar' | 'express' | 'programada',
    client_name: '',
    description: '',
    pickup: '',
    delivery: '',
    pickupUrl: '',
    deliveryUrl: '',
    address: '',
    delivery_fee: 0,
    urgency: 'media' as 'baja' | 'media' | 'alta',
    currency: 'Bs',
    status: 'pendiente',
    duration: '0 min',
    points: 0,
  });

  useEffect(() => {
    const updateCalculations = async () => {
      if (form.pickup && form.delivery) {
        setCalculating(true);
        const [lat1, lon1] = form.pickup.split(',').map(Number);
        const [lat2, lon2] = form.delivery.split(',').map(Number);
        const distance = calculateDistance(lat1, lon1, lat2, lon2);
        const extraCharge = (await getExtraRateFromBackend(lat2, lon2)) || 0;
        const validDistance = isNaN(distance) ? 0 : distance;
        const estimatedMinutes = Math.round((validDistance / 30) * 60) + 5;
        const typePoints = { estandar: 10, express: 20, programada: 5 };
        const basePoints = typePoints[form.type];
        const distancePoints = Math.floor(validDistance * 2);

        setForm(prev => ({
          ...prev,
          delivery_fee: parseFloat((distance * GLOBAL_RATE + extraCharge).toFixed(1)),
          duration: `${estimatedMinutes} minutos`,
          points: basePoints + distancePoints,
        }));
        setCalculating(false);
      }
    };
    updateCalculations();
  }, [form.pickup, form.delivery, form.type]);

  const handleMapSelection = async (type: 'pickup' | 'delivery', coords: string, address: string) => {
    setForm(prev => ({
      ...prev,
      [type]: coords,
      address: type === 'delivery' ? address : prev.address,
    }));
    setShowMap(null);
  };

  const handleUrlPaste = async (type: 'pickup' | 'delivery', url: string) => {
    const cleanUrl = url.trim();
    if (!cleanUrl) return;

    let coords = '';
    const isShortLink =
      cleanUrl.includes('googleusercontent.com') ||
      cleanUrl.includes('goo.gl') ||
      cleanUrl.includes('maps.app');

    if (isShortLink) {
      setLoadingGeo(true);
      try {
        const { data } = await appDB.post('/maps/expand-url', { url: cleanUrl });
        if (data.success) coords = data.longUrl.replace('+', '');
      } catch {
        toast.error('No se pudo procesar el enlace corto');
      }
    } else {
      coords = extractCoords(cleanUrl);
    }

    if (!coords) {
      toast.error('No se encontraron coordenadas en el enlace');
      setLoadingGeo(false);
      return;
    }

    const updates: any = { [type]: coords, [`${type}Url`]: cleanUrl };

    if (type === 'delivery') {
      setLoadingGeo(true);
      try {
        updates.address = await getAddressFromCoords(coords);
      } catch {
        toast.error('No se pudo obtener la dirección');
      }
    }

    setForm(prev => ({ ...prev, ...updates }));
    setLoadingGeo(false);
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.pickup || !form.delivery || calculating) return;
    const formData = new FormData(e.currentTarget);
    const name = formData.get('client_name') as string;
    const description = formData.get('description') as string;
    if (!name || name.length < 3) return;

    setLoading(true);
    await addOrder({ ...form, client_name: name, description: description || '' });
    onClose();
    toast.success('¡Carrera creada exitosamente!');
    setLoading(false);
  };

  const isFormValid = form.pickup && form.delivery && !calculating;

  return (
    <Modal isOpen={isOpen}>
      <Modal.Backdrop className="bg-black/80 backdrop-blur-sm">
        <Modal.Container>
          <Modal.Dialog className="w-full max-w-2xl bg-background border border-divider rounded-[24px] overflow-hidden flex flex-col max-h-[95vh]">
            <Modal.CloseTrigger onPress={onClose} className="top-4 right-4 text-muted-foreground hover:text-foreground" />

            {/* Header */}
            <Modal.Header className="border-b border-divider flex items-center gap-4">
              <div>
                <Modal.Heading className="text-xl font-black text-foreground uppercase tracking-tight">
                  Nueva Carrera
                </Modal.Heading>
                <p className="text-xs text-muted-foreground font-medium">Completa los datos del pedido</p>
              </div>
            </Modal.Header>

            {/* Form */}
            <Form onSubmit={handleCreate} className="flex flex-col flex-1 overflow-hidden">
              <Modal.Body className="overflow-y-auto custom-scrollbar">
                <Fieldset className="w-full">
                  <Fieldset.Group>

                    {/* ── Tipo de Servicio ──────────────────────────────── */}
                    <div>
                      <Label>Tipo de Servicio</Label>
                      <div className="grid grid-cols-3 gap-3 mt-2">
                        {SERVICE_TYPES.map((t) => {
                          const Icon = t.icon;
                          const isActive = form.type === t.id;
                          return (
                            <motion.button
                              key={t.id}
                              type="button"
                              onClick={() => setForm({ ...form, type: t.id as any })}
                              whileTap={{ scale: 0.96 }}
                              whileHover={{ scale: 1.02 }}
                              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                              className={cn(
                                'relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-300 cursor-pointer overflow-hidden text-left',
                                isActive
                                  ? `bg-gradient-to-b ${t.color} ${t.borderActive}`
                                  : 'border-divider bg-default-50 hover:bg-default-100'
                              )}
                            >
                              <AnimatePresence>
                                {isActive && (
                                  <motion.div
                                    key="glow"
                                    className="absolute inset-0 pointer-events-none"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    style={{
                                      background: `radial-gradient(ellipse at 50% 0%, var(--color-primary-500, #ff8a00)18, transparent 70%)`,
                                      opacity: 0.15,
                                    }}
                                  />
                                )}
                              </AnimatePresence>
                              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center transition-all', isActive ? t.iconBg : 'bg-default-200')}>
                                <Icon className={cn('w-5 h-5 transition-colors', isActive ? t.textActive : 'text-muted-foreground')} />
                              </div>
                              <div className="text-center">
                                <p className={cn('text-xs font-black uppercase tracking-wider', isActive ? t.textActive : 'text-muted-foreground')}>
                                  {t.label}
                                </p>
                                <p className="text-[10px] text-muted-foreground font-medium mt-0.5">{t.description}</p>
                              </div>
                              <AnimatePresence>
                                {isActive && (
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.5 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.5 }}
                                    className={cn('absolute top-2 right-2 text-[9px] font-black px-1.5 py-0.5 rounded-full', t.iconBg, t.textActive)}
                                  >
                                    +{t.points}pts
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>

                    {/* ── Datos del Cliente ─────────────────────────────── */}
                    <TextField
                      isRequired
                      name="client_name"
                      validate={(value) => {
                        if (!value || value.length < 3) return 'Mínimo 3 caracteres';
                        return null;
                      }}
                    >
                      <Label>Nombre del Cliente</Label>
                      <Input placeholder="Ej: Juan Pérez" variant="flat" />
                      <FieldError />
                    </TextField>

                    <TextField name="description">
                      <Label>Descripción del Pedido</Label>
                      <TextArea
                        placeholder="Ej: Recoger paquete de 2kg, frágil..."
                        variant="flat"
                        minRows={3}
                      />
                      <Description>Detalles adicionales del encargo</Description>
                    </TextField>

                    {/* ── Ubicaciones ───────────────────────────────────── */}
                    <div className="grid grid-cols-1 gap-4">
                      {(['pickup', 'delivery'] as const).map((key) => (
                        <div key={key} className="p-4 bg-default-50 rounded-2xl border border-divider space-y-3">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <div className={cn('w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black text-white', key === 'pickup' ? 'bg-blue-500' : 'bg-primary')}>
                                {key === 'pickup' ? 'A' : 'B'}
                              </div>
                              <span className="text-xs font-bold text-foreground uppercase tracking-wide">
                                {key === 'pickup' ? 'Punto de Recogida' : 'Punto de Entrega'}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowMap(showMap === key ? null : key)}
                              className="text-[10px] text-primary font-bold flex items-center gap-1 hover:underline outline-none"
                            >
                              <MapIcon className="w-3 h-3" />
                              {showMap === key ? 'Ocultar Mapa' : 'Abrir Mapa'}
                            </button>
                          </div>

                          <AnimatePresence mode="wait">
                            {showMap === key && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden rounded-xl"
                              >
                                <MapPicker
                                  initialCoords={form[key]}
                                  onLocationSelect={(coords, address) => handleMapSelection(key, coords, address)}
                                />
                              </motion.div>
                            )}
                          </AnimatePresence>

                          <Input
                            placeholder="Pegar link de Google Maps..."
                            onValueChange={(val) => handleUrlPaste(key, val)}
                            value={form[`${key}Url` as keyof typeof form] as string}
                            variant="flat"
                            size="sm"
                            startContent={<MapPin className="w-3.5 h-3.5 text-muted-foreground" />}
                          />

                          <AnimatePresence>
                            {form[key] && (
                              <motion.div
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -4 }}
                                className="px-3 py-2 bg-primary/10 rounded-xl flex items-center gap-2 border border-primary/20"
                              >
                                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                <span className="text-[10px] font-mono text-primary font-bold">GPS: {form[key]}</span>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))}
                    </div>

                    {/* ── Dirección Manual ──────────────────────────────── */}
                    <TextField name="address">
                      <Label>Dirección Manual / Referencia</Label>
                      <Input
                        placeholder="Calle Ficticia 123, Puerta Azul"
                        value={form.address}
                        onValueChange={(val) => setForm({ ...form, address: val })}
                        variant="flat"
                      />
                    </TextField>

                    {/* ── Urgencia ──────────────────────────────────────── */}
                    <div>
                      <Label>Urgencia del Pedido</Label>
                      <div className="grid grid-cols-3 gap-3 mt-2">
                        {URGENCY_OPTIONS.map((u) => {
                          const isActive = form.urgency === u.id;
                          return (
                            <motion.button
                              key={u.id}
                              type="button"
                              onClick={() => setForm({ ...form, urgency: u.id as any })}
                              whileTap={{ scale: 0.95 }}
                              whileHover={{ scale: 1.02 }}
                              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                              className={cn(
                                'relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-300 cursor-pointer overflow-hidden',
                                isActive
                                  ? `bg-gradient-to-b ${u.color} ${u.borderActive}`
                                  : 'border-divider bg-default-50 hover:bg-default-100'
                              )}
                            >
                              <motion.span
                                className="text-2xl"
                                animate={isActive ? { scale: [1, 1.25, 1] } : { scale: 1 }}
                                transition={{ duration: 0.4, ease: 'easeOut' }}
                              >
                                {u.icon}
                              </motion.span>
                              <div className="text-center">
                                <p className={cn('text-xs font-black uppercase tracking-wider', isActive ? u.textActive : 'text-muted-foreground')}>
                                  {u.label}
                                </p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">{u.description}</p>
                              </div>
                              <AnimatePresence>
                                {isActive && (
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0 }}
                                    className={cn('absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full', u.badge.split(' ')[0])}
                                  />
                                )}
                              </AnimatePresence>
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>

                    {/* ── Resumen de Costos ─────────────────────────────── */}
                    <motion.div
                      layout
                      className="p-5 bg-primary/5 rounded-2xl border border-primary/10 relative overflow-hidden"
                    >
                      <AnimatePresence>
                        {calculating && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-background/70 backdrop-blur-[2px] z-10 flex items-center justify-center gap-2 rounded-2xl"
                          >
                            <Loader2 className="w-5 h-5 animate-spin text-primary" />
                            <span className="text-xs font-bold text-primary uppercase tracking-widest">Calculando...</span>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="flex justify-between items-end">
                        <div className="space-y-0.5">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Costo de Carrera</span>
                          <div className="text-3xl font-display font-black text-foreground">
                            Bs. <span className="text-primary">{form.delivery_fee}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground">{form.duration}</span>
                        </div>
                        <div className="text-right space-y-0.5">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Recompensa</span>
                          <div className="text-3xl font-display font-black text-primary">{form.points}</div>
                          <span className="text-[10px] text-muted-foreground">puntos</span>
                        </div>
                      </div>
                    </motion.div>

                  </Fieldset.Group>

                  {/* ── Footer Actions ────────────────────────────────── */}
                  <Fieldset.Actions className="mt-0">
                    <Button
                      type="submit"
                      isDisabled={!isFormValid || loading}
                      isLoading={loading}
                      size="lg"
                      className={cn(
                        'w-full h-14 font-black rounded-xl text-lg transition-all',
                        !isFormValid
                          ? 'bg-default-100 text-default-400 cursor-not-allowed'
                          : 'bg-primary text-white shadow-lg shadow-primary/20'
                      )}
                    >
                      {loading ? 'PROCESANDO...' : calculating ? 'ESPERE...' : 'CREAR CARRERA'}
                    </Button>
                    <Button
                      type="button"
                      variant="flat"
                      onPress={onClose}
                      size="lg"
                      className="w-full h-12 rounded-xl font-bold text-muted-foreground"
                    >
                      Cancelar
                    </Button>
                  </Fieldset.Actions>
                </Fieldset>
              </Modal.Body>
            </Form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};
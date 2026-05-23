import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, ChevronRight, Bike, ShieldCheck, MapPin } from 'lucide-react';
import { Button, Card, Input, Select, Label, ListBox, Form, Fieldset, TextField, FieldError } from '@heroui/react';
import { useAuthStore } from '@/stores/authStore';
import { useCityStore } from '@/stores/cityStore';

const countryCodes = [
  { label: '🇧🇴 +591', id: '+591' },
  { label: '🇵🇪 +51', id: '+51' },
  { label: '🇦🇷 +54', id: '+54' },
  { label: '🇨🇱 +56', id: '+56' },
];

/** Extrae el primer valor de cualquier tipo de selección de HeroUI */
const getValueFromSet = (value: any): string => {
  if (!value) return '';
  if (value instanceof Set) {
    const arr = Array.from(value);
    return arr[0] ? String(arr[0]) : '';
  }
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && typeof value[Symbol.iterator] === 'function') {
    const arr = Array.from(value);
    return arr.length > 0 ? String(arr[0]) : '';
  }
  return String(value);
};

export const Login = () => {
  const navigate = useNavigate();
  const { login, isLoading, error, clearError, isAuthenticated } = useAuthStore();
  const { cities, fetchCities } = useCityStore();

  // Estado de selección: guardamos el id de la ciudad como string para el Set
  const [selectedCityId, setSelectedCityId] = useState(new Set<string>(['1']));
  const [countryCode, setCountryCode] = useState(new Set(['+591']));
  const [pin, setPin] = useState(['', '', '', '']);

  const pinRefs = useRef<Array<HTMLInputElement | null>>([]);

  // Cargar ciudades al montar (endpoint público)
  useEffect(() => {
    fetchCities();
  }, []);

  // Seleccionar la primera ciudad disponible una vez cargadas
  useEffect(() => {
    if (cities.length > 0) {
      setSelectedCityId(new Set([String(cities[0].id)]));
    }
  }, [cities]);

  useEffect(() => {
    if (isAuthenticated) navigate('/home', { replace: true });
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    clearError?.();
  }, [clearError]);

  const handlePinChange = (value: string, index: number) => {
    const lastChar = value.slice(-1);
    if (!/^\d?$/.test(lastChar)) return;
    const newPin = [...pin];
    newPin[index] = lastChar;
    setPin(newPin);
    if (lastChar && index < 3) pinRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      const newPin = [...pin];
      newPin[index - 1] = '';
      setPin(newPin);
      pinRefs.current[index - 1]?.focus();
    }
  };

  // Helper to resolve city name for dynamic trigger
  const getCityLabel = (idSet: Set<string>) => {
    const val = getValueFromSet(idSet);
    const found = cities.find((c) => String(c.id) === val);
    return found ? found.name : 'Seleccionar ciudad';
  };

  // Helper to resolve country label for dynamic trigger
  const getCountryLabel = (codeSet: Set<string>) => {
    const val = getValueFromSet(codeSet);
    const found = countryCodes.find((c) => c.id === val);
    return found ? found.label : 'País';
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const extractedPhone = formData.get('phone') as string;

    if (!extractedPhone || extractedPhone.length < 8) return;
    const isPinValid = pin.every((digit) => digit !== '');
    if (!isPinValid) return;

    const countryCodeValue = getValueFromSet(countryCode);
    const cityIdStr = getValueFromSet(selectedCityId);
    const city_id = parseInt(cityIdStr);
    const fullPhone = `${countryCodeValue}${extractedPhone}`;
    const pinCode = pin.join('');

    await login({ phone: fullPhone, pin: pinCode, city_id });
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md px-6"
      >
        <Card className="border border-divider bg-transparent shadow-xl rounded-[24px]">
          <Card.Content className="p-8 md:p-10 space-y-8">
            {/* Header */}
            <div className="text-center space-y-4">
              <motion.div
                initial={{ scale: 0.8, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                className="inline-flex w-16 h-16 rounded-2xl border-2 border-foreground bg-transparent items-center justify-center mx-auto"
              >
                <Bike className="w-8 h-8 text-foreground" />
              </motion.div>
              <div className="space-y-1">
                <h1 className="text-3xl font-black font-display text-foreground tracking-tighter uppercase">
                  {import.meta.env.VITE_NAME_APP || 'Depedidos'}
                </h1>
                <p className="text-muted-foreground text-sm font-medium">Panel de Acceso</p>
              </div>
            </div>

            <Form onSubmit={handleLogin} className="w-full space-y-6">
              <div className="space-y-4">
                {/* Ciudad — cargada dinámicamente desde la API */}
                <div className="w-full">
                  <Select
                    selectedKeys={selectedCityId}
                    onSelectionChange={(keys) => {
                      const val = getValueFromSet(keys);
                      setSelectedCityId(new Set([val]));
                    }}
                    className="w-full"
                    placeholder={cities.length === 0 ? 'Cargando ciudades...' : 'Seleccionar ciudad'}
                    isDisabled={cities.length === 0}
                  >
                    <Label className="text-foreground font-medium text-xs mb-1 block">Ciudad de Operación</Label>
                    <Select.Trigger className="bg-transparent border border-divider rounded-xl h-12 px-4 flex items-center gap-3 hover:border-foreground/50 focus:border-foreground transition-all w-full">
                      <MapPin className="w-4 h-4 text-foreground" />
                      <Select.Value className="text-foreground font-medium">
                        {cities.length === 0 ? 'Cargando ciudades...' : getCityLabel(selectedCityId)}
                      </Select.Value>
                      <Select.Indicator className="ml-auto text-muted-foreground" />
                    </Select.Trigger>
                    <Select.Popover className="min-w-[240px] bg-background border border-divider rounded-2xl shadow-2xl">
                      <ListBox
                        selectedKeys={selectedCityId}
                        onSelectionChange={(keys) => { const val = getValueFromSet(keys); setSelectedCityId(new Set([val])); }}
                        selectionMode="single"
                      >
                        {cities.map((city) => (
                          <ListBox.Item key={String(city.id)} id={String(city.id)} textValue={city.name} className="rounded-xl m-1 hover:bg-foreground/10 transition-colors">
                            {city.name}
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                </div>

                {/* Teléfono + código de país */}
                <div className="flex gap-3">
                  <div className="w-32">
                    <Select
                      selectedKeys={countryCode}
                      onSelectionChange={(keys) => { const val = getValueFromSet(keys); setCountryCode(new Set([val])); }}
                      className="w-full"
                      placeholder="País"
                    >
                      <Label className="text-foreground font-medium text-xs mb-1 block">País</Label>
                      <Select.Trigger className="bg-transparent border border-divider rounded-xl h-12 px-3 flex items-center gap-2 hover:border-foreground/50 focus:border-foreground transition-all w-full">
                        <Select.Value className="text-foreground font-bold">
                          {getCountryLabel(countryCode)}
                        </Select.Value>
                        <Select.Indicator className="ml-auto text-muted-foreground" />
                      </Select.Trigger>
                      <Select.Popover className="bg-background border border-divider rounded-2xl shadow-2xl">
                        <ListBox selectedKeys={countryCode} onSelectionChange={(keys) => { const val = getValueFromSet(keys); setCountryCode(new Set([val])); }} selectionMode="single">
                          {countryCodes.map((item) => (
                            <ListBox.Item key={item.id} id={item.id} textValue={item.label} className="rounded-xl m-1 hover:bg-foreground/10 transition-colors">
                              {item.label}
                              <ListBox.ItemIndicator />
                            </ListBox.Item>
                          ))}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  </div>

                  <TextField
                    isRequired
                    name="phone"
                    validate={(value) => {
                      if (!value || value.length < 8) return 'Número inválido';
                      return null;
                    }}
                    className="flex-1"
                  >
                    <Label className="text-foreground font-medium text-xs mb-1 block">Número de celular</Label>
                    <Input
                      type="number"
                      placeholder="70000000"
                      startContent={
                        <div className="bg-transparent">
                          <Phone className="w-4 h-4 text-foreground" />
                        </div>
                      }
                      className="bg-transparent border border-divider rounded-xl h-12 w-full px-3 text-foreground hover:border-foreground/50 focus:border-foreground outline-none transition-all"
                    />
                    <FieldError className="text-xs mt-1 block" />
                  </TextField>
                </div>

                {/* PIN */}
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground text-xs font-bold uppercase tracking-widest">
                    <ShieldCheck className="w-3 h-3 text-foreground" />
                    PIN de Seguridad
                  </div>
                  <div className="flex justify-center gap-3">
                    {pin.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => (pinRefs.current[index] = el)}
                        type="password"
                        maxLength={1}
                        inputMode="numeric"
                        value={digit}
                        onKeyDown={(e) => handleKeyDown(e, index)}
                        onChange={(e) => handlePinChange(e.target.value, index)}
                        className="w-12 h-14 text-center text-2xl font-bold bg-transparent border border-divider rounded-xl text-foreground focus:border-foreground outline-none transition-all"
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="border border-divider text-foreground text-xs font-bold p-3 rounded-xl text-center bg-transparent">
                      {error}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="w-full mt-6">
                <Button
                  type="submit"
                  size="lg"
                  isLoading={isLoading}
                  isDisabled={pin.some((d) => d === '') || isLoading || cities.length === 0}
                  className="w-full h-14 bg-transparent border border-foreground text-foreground font-black text-lg rounded-xl hover:bg-foreground hover:text-background transition-all"
                  endContent={!isLoading && <ChevronRight className="w-5 h-5 text-foreground" />}
                >
                  {isLoading ? 'VERIFICANDO...' : 'ENTRAR'}
                </Button>
              </div>
            </Form>

            <p className="text-center text-muted-foreground text-[10px] font-bold uppercase tracking-[0.2em]">
              © {new Date().getFullYear()} {import.meta.env.VITE_NAME_APP || 'Depedidos'} v4.0
            </p>
          </Card.Content>
        </Card>
      </motion.div>
    </div>
  );
};

export default Login;
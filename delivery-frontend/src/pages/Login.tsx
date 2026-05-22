import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, ChevronRight, Bike, Loader2, ShieldCheck, MapPin } from 'lucide-react';
import { Button, Card, Input, Select, Label, ListBox, Form, Fieldset, TextField, FieldError } from '@heroui/react';
import { useAuthStore } from '@/stores/authStore';

const cities = [
  { label: 'Oruro', id: 'Oruro' },
  { label: 'La Paz', id: 'La Paz' },
  { label: 'Cochabamba', id: 'Cochabamba' },
  { label: 'Santa Cruz', id: 'Santa Cruz' },
  { label: 'Beni', id: 'Beni' },
  { label: 'Potosí', id: 'Potosí' },
  { label: 'Sucre', id: 'Sucre' },
  { label: 'Tarija', id: 'Tarija' },
];

const countryCodes = [
  { label: '🇧🇴 +591', id: '+591' },
  { label: '🇵🇪 +51', id: '+51' },
  { label: '🇦🇷 +54', id: '+54' },
  { label: '🇨🇱 +56', id: '+56' },
];

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

  const [city, setCity] = useState(new Set(['Oruro']));
  const [countryCode, setCountryCode] = useState(new Set(['+591']));
  const [pin, setPin] = useState(['', '', '', '']);

  const pinRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/home', { replace: true });
    }
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

    if (lastChar && index < 3) {
      pinRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Backspace') {
      if (!pin[index] && index > 0) {
        const newPin = [...pin];
        newPin[index - 1] = '';
        setPin(newPin);
        pinRefs.current[index - 1]?.focus();
      }
    }
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const extractedPhone = formData.get('phone') as string;

    if (!extractedPhone || extractedPhone.length < 8) return;
    const isPinValid = pin.every((digit) => digit !== '');
    if (!isPinValid) return;

    const countryCodeValue = getValueFromSet(countryCode);
    const cityValue = getValueFromSet(city);
    const fullPhone = `${countryCodeValue}${extractedPhone}`;
    const pinCode = pin.join('');
    await login({ city: cityValue, phone: fullPhone, pin: pinCode });
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md px-6"
      >
        <Card className="border-divider bg-content1 shadow-xl rounded-[24px]">
          <Card.Content className="p-8 md:p-10 space-y-8">
            {/* Header */}
            <div className="text-center space-y-4">
              <motion.div
                initial={{ scale: 0.8, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                className="inline-flex w-16 h-16 rounded-2xl bg-primary items-center justify-center shadow-lg shadow-primary/20 mx-auto"
              >
                <Bike className="w-8 h-8 text-white" />
              </motion.div>
              <div className="space-y-1">
                <h1 className="text-3xl font-black font-display text-foreground tracking-tighter uppercase">DRIVECORE</h1>
                <p className="text-muted-foreground text-sm font-medium">Panel de Acceso</p>
              </div>
            </div>

            <Form onSubmit={handleLogin} className="w-full">
              <Fieldset className="w-full">
                <Fieldset.Group>
                  {/* Ciudad */}
                  <div className="w-full">
                    <Select
                      selectedKeys={city}
                      onSelectionChange={(keys) => {
                        const val = getValueFromSet(keys);
                        setCity(new Set([val]));
                      }}
                      className="w-full"
                      label="Ciudad de Operación"
                      labelPlacement="outside"
                    >
                      <Select.Trigger className="bg-default-100 rounded-xl px-4 flex items-center gap-3 border-transparent hover:bg-default-200 transition-all">
                        <MapPin className="w-4 h-4 text-primary" />
                        <Select.Value className="text-foreground font-medium" />
                        <Select.Indicator className="ml-auto text-muted-foreground" />
                      </Select.Trigger>
                      <Select.Popover className="min-w-[240px] bg-content1 border border-divider rounded-2xl shadow-2xl">
                        <ListBox selectedKeys={city} onSelectionChange={(keys) => { const val = getValueFromSet(keys); setCity(new Set([val])); }} selectionMode="single">
                          {cities.map((item) => (
                            <ListBox.Item key={item.id} id={item.id} textValue={item.label} className="rounded-xl m-1 hover:bg-primary/10 transition-colors">
                              {item.label}
                              <ListBox.ItemIndicator />
                            </ListBox.Item>
                          ))}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  </div>

                  {/* Teléfono */}
                  <div className="flex gap-3">
                    <Select
                      selectedKeys={countryCode}
                      onSelectionChange={(keys) => {
                        const val = getValueFromSet(keys);
                        setCountryCode(new Set([val]));
                      }}
                      className="w-36"
                      label="País"
                      labelPlacement="outside"
                    >
                      <Select.Trigger className="bg-default-100 rounded-xl px-3 flex items-center gap-2 border-transparent hover:bg-default-200 transition-all">
                        <Select.Value className="text-foreground font-bold" />
                        <Select.Indicator className="ml-auto text-muted-foreground" />
                      </Select.Trigger>
                      <Select.Popover className="bg-content1 border border-divider rounded-2xl shadow-2xl">
                        <ListBox selectedKeys={countryCode} onSelectionChange={(keys) => { const val = getValueFromSet(keys); setCountryCode(new Set([val])); }} selectionMode="single">
                          {countryCodes.map((item) => (
                            <ListBox.Item key={item.id} id={item.id} textValue={item.label} className="rounded-xl m-1 hover:bg-primary/10 transition-colors">
                              {item.label}
                              <ListBox.ItemIndicator />
                            </ListBox.Item>
                          ))}
                        </ListBox>
                      </Select.Popover>
                    </Select>

                    <TextField
                      isRequired
                      name="phone"
                      validate={(value) => {
                        if (!value || value.length < 8) return "Número inválido";
                        return null;
                      }}
                      className="flex-1"
                    >
                      <Label>Número de celular</Label>
                      <Input
                        type="tel"
                        placeholder="70000000"
                        startContent={<Phone className="w-4 h-4 text-primary" />}
                        variant="flat"
                      />
                      <FieldError />
                    </TextField>
                  </div>

                  {/* PIN Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-center gap-2 text-muted-foreground text-xs font-bold uppercase tracking-widest">
                      <ShieldCheck className="w-3 h-3" />
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
                          className="w-12 h-14 text-center text-2xl font-bold bg-default-100 border-2 border-transparent rounded-xl text-foreground focus:border-primary focus:bg-primary/5 outline-none transition-all"
                        />
                      ))}
                    </div>
                  </div>
                </Fieldset.Group>
              </Fieldset>

              {/* Error Message */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-danger/10 border border-danger/20 text-danger text-xs font-bold p-3 rounded-xl text-center">
                      {error}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <Fieldset.Actions className="w-full mt-6">
                <Button
                  type="submit"
                  size="lg"
                  isLoading={isLoading}
                  isDisabled={pin.some(d => d === '') || isLoading}
                  className="w-full h-14 bg-primary text-white font-black text-lg rounded-xl shadow-lg shadow-primary/20 hover:opacity-90 transition-all"
                  endContent={!isLoading && <ChevronRight className="w-5 h-5" />}
                >
                  {isLoading ? 'VERIFICANDO...' : 'ENTRAR'}
                </Button>
              </Fieldset.Actions>
          </Form>

          <p className="text-center text-muted-foreground text-[10px] font-bold uppercase tracking-[0.2em]">
            © {new Date().getFullYear()} DRIVECORE v4.0
          </p>
        </Card.Content>
      </Card>
    </motion.div>
  </div >
  );
};

export default Login;
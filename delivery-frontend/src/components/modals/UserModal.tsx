import { useState, useEffect } from 'react';
import { UserPlus, Edit3 } from 'lucide-react';
import { Button, Modal, Input, Select, Label, ListBox, Form, Fieldset, TextField, FieldError } from '@heroui/react';
import { IUser } from '@/interfaces/users-interface';
import { useCityStore } from '@/stores/cityStore';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface UserModalProps {
  isOpen:    boolean;
  onClose:   () => void;
  onSubmit:  (data: any) => void;
  user?:     IUser | null;
}

const STATUS_OPTIONS = [
  { id: 'active',    label: 'Activo'      },
  { id: 'inactive',  label: 'Inactivo'    },
  { id: 'suspended', label: 'Suspendido'  },
];

const ROLE_OPTIONS = [
  { id: 'admin',  label: 'Administrador' },
  { id: 'driver', label: 'Repartidor'    },
  { id: 'client', label: 'Cliente'       },
];

const TRANSPORT_OPTIONS = [
  { id: 'on_foot',    label: '🚶 A Pie'       },
  { id: 'bike',       label: '🚲 Bicicleta'   },
  { id: 'motorcycle', label: '🏍️ Moto'        },
  { id: 'car',        label: '🚗 Automóvil'   },
];

const COUNTRY_CODES = [
  { id: '+591', label: '🇧🇴 +591' },
  { id: '+54',  label: '🇦🇷 +54'  },
  { id: '+56',  label: '🇨🇱 +56'  },
  { id: '+51',  label: '🇵🇪 +51'  },
];

/** Extrae el primer valor de cualquier tipo de selección de HeroUI de forma segura */
const getValueFromSelection = (value: any): string => {
  if (!value) return '';
  if (value instanceof Set) {
    const arr = Array.from(value);
    return arr[0] ? String(arr[0]) : '';
  }
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    if (typeof value[Symbol.iterator] === 'function') {
      const arr = Array.from(value);
      if (arr.length > 0) return String(arr[0]);
    } else if ('anchorKey' in value) {
      return String((value as any).anchorKey);
    }
  }
  return String(value);
};

export const UserModal = ({ isOpen, onClose, onSubmit, user }: UserModalProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { cities, fetchCities }   = useCityStore();

  const [form, setForm] = useState({
    countryCode:    new Set(['+591']),
    city_id:        new Set(['1']),
    status:         new Set(['active'])     as any,
    role:           new Set(['driver'])     as any,
    transport_type: new Set(['motorcycle']) as any,
  });

  // Cargar ciudades si no están cargadas
  useEffect(() => {
    if (cities.length === 0) fetchCities();
  }, []);

  // Cuando se abre el modal o cambia el usuario, sincronizar form
  useEffect(() => {
    if (user) {
      setForm({
        countryCode:    new Set(['+591']),
        city_id:        new Set([String(user.city_id || 1)]),
        status:         new Set([user.status]),
        role:           new Set([user.role || 'driver']),
        transport_type: new Set([user.transport_type || 'motorcycle']),
      });
    } else {
      const firstCityId = cities.length > 0 ? String(cities[0].id) : '1';
      setForm({
        countryCode:    new Set(['+591']),
        city_id:        new Set([firstCityId]),
        status:         new Set(['active']),
        role:           new Set(['driver']),
        transport_type: new Set(['motorcycle']),
      });
    }
  }, [user, isOpen, cities]);

  /** Actualiza un campo del form garantizando un Set<string> limpio */
  const updateFieldSelection = (field: string, keys: any) => {
    let nextSet: Set<string>;
    if (keys instanceof Set) {
      nextSet = keys as Set<string>;
    } else if (typeof keys === 'string') {
      nextSet = new Set([keys]);
    } else if (keys && typeof keys === 'object') {
      if (typeof keys[Symbol.iterator] === 'function') {
        nextSet = new Set(Array.from(keys) as string[]);
      } else if ('anchorKey' in keys) {
        nextSet = new Set([String(keys.anchorKey)]);
      } else {
        nextSet = new Set([String(keys)]);
      }
    } else {
      nextSet = new Set([String(keys)]);
    }
    setForm(prev => ({ ...prev, [field]: nextSet }));
  };

  const handleAction = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const data: Record<string, string> = {};
    formData.forEach((value, key) => { data[key] = value.toString(); });

    const phoneRegex = /^\d{8,12}$/;
    if (!data.name || !data.phone || !data.email || (!user && !data.pin) || !phoneRegex.test(data.phone)) {
      setIsLoading(false);
      return toast.error('Completa los campos obligatorios correctamente');
    }

    const payload = {
      name:           data.name,
      email:          data.email,
      pin:            data.pin || undefined,
      role:           getValueFromSelection(form.role),
      city_id:        parseInt(getValueFromSelection(form.city_id)),
      transport_type: getValueFromSelection(form.transport_type),
      status:         getValueFromSelection(form.status),
      phone:          `${getValueFromSelection(form.countryCode)}${data.phone}`,
    };

    onSubmit(payload);
    setIsLoading(false);
  };

  return (
    <Modal isOpen={isOpen}>
      <Modal.Backdrop className="bg-black/80 backdrop-blur-sm">
        <Modal.Container>
          <Modal.Dialog className="w-full max-w-lg bg-background border border-divider rounded-[24px] overflow-hidden flex flex-col">
            <Modal.CloseTrigger onPress={onClose} className="top-4 right-4 text-muted-foreground hover:text-foreground" />

            <Modal.Header className="p-6 border-b border-divider flex items-center gap-4">
              <Modal.Icon className="bg-primary/20 text-primary rounded-xl p-2.5">
                {user ? <Edit3 className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
              </Modal.Icon>
              <Modal.Heading className="text-xl font-black text-white uppercase tracking-tight">
                {user ? 'Editar Usuario' : 'Nuevo Usuario'}
              </Modal.Heading>
            </Modal.Header>

            <Form onSubmit={handleAction} className="w-full flex flex-col flex-1">
              <Modal.Body className="p-6">
                <Fieldset className="w-full">
                  <Fieldset.Group>
                    {/* Nombre */}
                    <TextField
                      isRequired
                      name="name"
                      defaultValue={user?.name || ''}
                      validate={(value) => {
                        if (!value || value.length < 3) return 'Mínimo 3 caracteres';
                        return null;
                      }}
                    >
                      <Label>Nombre Completo</Label>
                      <Input placeholder="Ej. Juan Perez" variant="flat" />
                      <FieldError />
                    </TextField>

                    {/* Email */}
                    <TextField
                      isRequired
                      name="email"
                      type="email"
                      defaultValue={user?.email || ''}
                      validate={(value) => {
                        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                        if (!value || !emailRegex.test(value)) return 'Correo electrónico inválido';
                        return null;
                      }}
                    >
                      <Label>Correo Electrónico</Label>
                      <Input placeholder="Ej. juan@correo.com" variant="secondary" />
                      <FieldError />
                    </TextField>

                    {/* Teléfono */}
                    <div className="flex gap-4">
                      <Select
                        selectedKeys={form.countryCode}
                        onSelectionChange={(keys) => updateFieldSelection('countryCode', keys)}
                        className="w-32"
                        placeholder="País"
                      >
                        <Label>País</Label>
                        <Select.Trigger className="bg-default-100 rounded-xl px-3 flex items-center gap-2 border-transparent hover:bg-default-200 transition-all">
                          <Select.Value className="text-foreground font-bold" />
                          <Select.Indicator className="ml-auto text-muted-foreground" />
                        </Select.Trigger>
                        <Select.Popover className="bg-content1 border border-divider rounded-2xl shadow-2xl">
                          <ListBox selectedKeys={form.countryCode} onSelectionChange={(keys) => updateFieldSelection('countryCode', keys)} selectionMode="single">
                            {COUNTRY_CODES.map((item) => (
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
                        defaultValue={user ? user.phone.replace(/^\+(591|54|56|51)/, '') : ''}
                        validate={(value) => {
                          const phoneRegex = /^\d{8,12}$/;
                          if (!phoneRegex.test(value)) return 'Número inválido';
                          return null;
                        }}
                        className="flex-1"
                      >
                        <Label>Teléfono</Label>
                        <Input placeholder="70000000" variant="flat" />
                        <FieldError />
                      </TextField>
                    </div>

                    {/* PIN + Ciudad */}
                    <div className="grid grid-cols-2 gap-4">
                      <TextField
                        isRequired={!user}
                        name="pin"
                        validate={(value) => {
                          if (!user && value.length !== 4) return 'PIN de 4 dígitos';
                          return null;
                        }}
                      >
                        <Label>{user ? 'Nuevo PIN (Opcional)' : 'PIN Inicial'}</Label>
                        <Input type="password" maxLength={4} placeholder="****" variant="flat" />
                        <FieldError />
                      </TextField>

                      {/* Ciudad — cargada dinámicamente */}
                      <Select
                        selectedKeys={form.city_id}
                        onSelectionChange={(keys) => updateFieldSelection('city_id', keys)}
                        className="flex-1"
                        placeholder="Ciudad"
                        isDisabled={cities.length === 0}
                      >
                        <Label>Ciudad</Label>
                        <Select.Trigger className="bg-default-100 rounded-xl px-3 flex items-center gap-2 border-transparent hover:bg-default-200 transition-all">
                          <Select.Value className="text-foreground font-medium" />
                          <Select.Indicator className="ml-auto text-muted-foreground" />
                        </Select.Trigger>
                        <Select.Popover className="min-w-[200px] bg-content1 border border-divider rounded-2xl shadow-2xl">
                          <ListBox selectedKeys={form.city_id} onSelectionChange={(keys) => updateFieldSelection('city_id', keys)} selectionMode="single">
                            {cities.map((city) => (
                              <ListBox.Item key={String(city.id)} id={String(city.id)} textValue={city.name} className="rounded-xl m-1 hover:bg-primary/10 transition-colors">
                                {city.name}
                                <ListBox.ItemIndicator />
                              </ListBox.Item>
                            ))}
                          </ListBox>
                        </Select.Popover>
                      </Select>
                    </div>

                    {/* Transporte + Rol */}
                    <div className="grid grid-cols-2 gap-4">
                      <Select
                        selectedKeys={form.transport_type}
                        onSelectionChange={(keys) => updateFieldSelection('transport_type', keys)}
                        className="flex-1"
                        placeholder="Tipo de transporte"
                      >
                        <Label>Transporte</Label>
                        <Select.Trigger className="bg-default-100 rounded-xl px-3 flex items-center gap-2 border-transparent hover:bg-default-200 transition-all">
                          <Select.Value className="text-foreground font-medium" />
                          <Select.Indicator className="ml-auto text-muted-foreground" />
                        </Select.Trigger>
                        <Select.Popover className="min-w-[200px] bg-content1 border border-divider rounded-2xl shadow-2xl">
                          <ListBox selectedKeys={form.transport_type} onSelectionChange={(keys) => updateFieldSelection('transport_type', keys)} selectionMode="single">
                            {TRANSPORT_OPTIONS.map((item) => (
                              <ListBox.Item key={item.id} id={item.id} textValue={item.label} className="rounded-xl m-1 hover:bg-primary/10 transition-colors">
                                {item.label}
                                <ListBox.ItemIndicator />
                              </ListBox.Item>
                            ))}
                          </ListBox>
                        </Select.Popover>
                      </Select>

                      <Select
                        selectedKeys={form.role}
                        onSelectionChange={(keys) => updateFieldSelection('role', keys)}
                        className="flex-1"
                        placeholder="Seleccionar rol"
                      >
                        <Label>Rol de Usuario</Label>
                        <Select.Trigger className="bg-default-100 rounded-xl px-3 flex items-center gap-2 border-transparent hover:bg-default-200 transition-all">
                          <Select.Value className="text-foreground font-medium" />
                          <Select.Indicator className="ml-auto text-muted-foreground" />
                        </Select.Trigger>
                        <Select.Popover className="min-w-[200px] bg-content1 border border-divider rounded-2xl shadow-2xl">
                          <ListBox selectedKeys={form.role} onSelectionChange={(keys) => updateFieldSelection('role', keys)} selectionMode="single">
                            {ROLE_OPTIONS.map((item) => (
                              <ListBox.Item key={item.id} id={item.id} textValue={item.label} className="rounded-xl m-1 hover:bg-primary/10 transition-colors">
                                {item.label}
                                <ListBox.ItemIndicator />
                              </ListBox.Item>
                            ))}
                          </ListBox>
                        </Select.Popover>
                      </Select>
                    </div>

                    {/* Estado */}
                    <Select
                      selectedKeys={form.status}
                      onSelectionChange={(keys) => updateFieldSelection('status', keys)}
                      className="w-full"
                      placeholder="Seleccionar estado"
                    >
                      <Label>Estado</Label>
                      <Select.Trigger className="bg-default-100 rounded-xl px-3 flex items-center gap-2 border-transparent hover:bg-default-200 transition-all">
                        <Select.Value className="text-foreground font-medium" />
                        <Select.Indicator className="ml-auto text-muted-foreground" />
                      </Select.Trigger>
                      <Select.Popover className="min-w-[200px] bg-content1 border border-divider rounded-2xl shadow-2xl">
                        <ListBox selectedKeys={form.status} onSelectionChange={(keys) => updateFieldSelection('status', keys)} selectionMode="single">
                          {STATUS_OPTIONS.map((item) => (
                            <ListBox.Item
                              key={item.id} id={item.id} textValue={item.label}
                              className={cn('rounded-xl m-1 hover:bg-primary/10 transition-colors',
                                item.id === 'active'    ? 'text-success' :
                                item.id === 'suspended' ? 'text-danger'  : 'text-foreground'
                              )}
                            >
                              {item.label}
                              <ListBox.ItemIndicator />
                            </ListBox.Item>
                          ))}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  </Fieldset.Group>
                </Fieldset>
              </Modal.Body>

              <Modal.Footer className="p-6 bg-default-50 border-t border-divider">
                <Fieldset.Actions className="w-full">
                  <Button
                    type="submit"
                    isDisabled={isLoading}
                    size="lg"
                    className="w-full h-14 bg-primary text-white font-black rounded-xl text-lg shadow-lg shadow-primary/20"
                  >
                    {isLoading ? 'PROCESANDO...' : (user ? 'GUARDAR CAMBIOS' : 'REGISTRAR USUARIO')}
                  </Button>
                </Fieldset.Actions>
              </Modal.Footer>
            </Form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, X, UserPlus, Edit3 } from 'lucide-react';
import { Button, Modal, Input, Select, Label, ListBox, Form, Fieldset, TextField, FieldError } from '@heroui/react';
import { IUser } from '@/interfaces/users-interface';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface DeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  delivery?: IUser | null;
}

const STATUS_OPTIONS = [
  { id: 'active', label: 'Activo' },
  { id: 'inactive', label: 'Inactivo' },
  { id: 'suspended', label: 'Suspendido' },
];

const CITIES = ["Oruro", "La Paz", "Cochabamba", "Santa Cruz", "Potosí", "Sucre", "Tarija", "Beni", "Pando"].map(c => ({ label: c, id: c }));

const COUNTRY_CODES = [
  { id: "+591", label: "🇧🇴 +591" },
  { id: "+54", label: "🇦🇷 +54" },
  { id: "+56", label: "🇨🇱 +56" },
  { id: "+51", label: "🇵🇪 +51" },
];

export const DeliveryModal = ({ isOpen, onClose, onSubmit, delivery }: DeliveryModalProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    countryCode: new Set(['+591']),
    city: new Set(['Oruro']),
    status: new Set(['active']) as any
  });

  useEffect(() => {
    if (delivery) {
      setForm({
        countryCode: new Set(['+591']),
        city: new Set([delivery.city]),
        status: new Set([delivery.status])
      });
    }
  }, [delivery]);

  const handleAction = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const data: Record<string, string> = {};
    formData.forEach((value, key) => {
      data[key] = value.toString();
    });

    const phoneRegex = /^\d{8,12}$/;
    if (!data.name || !data.phone || (!delivery && !data.pin) || !phoneRegex.test(data.phone)) {
      setIsLoading(false);
      return toast.error('Completa los campos obligatorios');
    }

    const payload = {
      name: data.name,
      pin: data.pin,
      role: 'driver',
      countryCode: Array.from(form.countryCode)[0],
      city: Array.from(form.city)[0],
      status: Array.from(form.status)[0],
      phone: `${Array.from(form.countryCode)[0]}${data.phone}`
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
                {delivery ? <Edit3 className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
              </Modal.Icon>
              <Modal.Heading className="text-xl font-black text-white uppercase tracking-tight">
                {delivery ? 'Editar Repartidor' : 'Nuevo Repartidor'}
              </Modal.Heading>
            </Modal.Header>

            <Form onSubmit={handleAction} className="w-full flex flex-col flex-1">
              <Modal.Body className="p-6">
                <Fieldset className="w-full">
                  <Fieldset.Group>
                    <TextField
                      isRequired
                      name="name"
                      defaultValue={delivery?.name || ''}
                      validate={(value) => {
                        if (!value || value.length < 3) return "Mínimo 3 caracteres";
                        return null;
                      }}
                    >
                      <Label>Nombre Completo</Label>
                      <Input placeholder="Ej. Juan Perez" variant="flat" />
                      <FieldError />
                    </TextField>

                    <div className="flex gap-4">
                      <Select
                        selectedKeys={form.countryCode}
                        onSelectionChange={(keys) => setForm({ ...form, countryCode: keys as Set<string> })}
                        className="w-32"
                        label="País"
                        labelPlacement="outside"
                      >
                        <Select.Trigger className="bg-default-100 rounded-xl px-3 flex items-center gap-2 border-transparent hover:bg-default-200 transition-all">
                          <Select.Value className="text-foreground font-bold" />
                          <Select.Indicator className="ml-auto text-muted-foreground" />
                        </Select.Trigger>
                        <Select.Popover className="bg-content1 border border-divider rounded-2xl shadow-2xl">
                          <ListBox selectedKeys={form.countryCode} onSelectionChange={(keys) => setForm({ ...form, countryCode: keys as Set<string> })} selectionMode="single">
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
                        defaultValue={delivery ? delivery.phone.replace(/^\+591/, '') : ''}
                        validate={(value) => {
                          const phoneRegex = /^\d{8,12}$/;
                          if (!phoneRegex.test(value)) return "Número inválido";
                          return null;
                        }}
                        className="flex-1"
                      >
                        <Label>Teléfono</Label>
                        <Input placeholder="70000000" variant="flat" />
                        <FieldError />
                      </TextField>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <TextField
                        isRequired={!delivery}
                        name="pin"
                        validate={(value) => {
                          if (!delivery && value.length !== 4) return "PIN de 4 dígitos";
                          return null;
                        }}
                      >
                        <Label>{delivery ? "Nuevo PIN (Opcional)" : "PIN Inicial"}</Label>
                        <Input type="password" maxLength={4} placeholder="****" variant="flat" />
                        <FieldError />
                      </TextField>

                      <Select
                        selectedKeys={form.city}
                        onSelectionChange={(keys) => setForm({ ...form, city: keys as Set<string> })}
                        className="flex-1"
                        label="Ciudad"
                        labelPlacement="outside"
                      >
                        <Select.Trigger className="bg-default-100 rounded-xl px-3 flex items-center gap-2 border-transparent hover:bg-default-200 transition-all">
                          <Select.Value className="text-foreground font-medium" />
                          <Select.Indicator className="ml-auto text-muted-foreground" />
                        </Select.Trigger>
                        <Select.Popover className="min-w-[200px] bg-content1 border border-divider rounded-2xl shadow-2xl">
                          <ListBox selectedKeys={form.city} onSelectionChange={(keys) => setForm({ ...form, city: keys as Set<string> })} selectionMode="single">
                            {CITIES.map((item) => (
                              <ListBox.Item key={item.id} id={item.id} textValue={item.label} className="rounded-xl m-1 hover:bg-primary/10 transition-colors">
                                {item.label}
                                <ListBox.ItemIndicator />
                              </ListBox.Item>
                            ))}
                          </ListBox>
                        </Select.Popover>
                      </Select>
                    </div>

                    <Select
                      selectedKeys={form.status}
                      onSelectionChange={(keys) => setForm({ ...form, status: keys as Set<string> })}
                      className="w-full"
                      label="Estado de Cuenta"
                      labelPlacement="outside"
                    >
                      <Select.Trigger className="bg-default-100 rounded-xl px-3 flex items-center gap-2 border-transparent hover:bg-default-200 transition-all">
                        <Select.Value className="text-foreground font-medium" />
                        <Select.Indicator className="ml-auto text-muted-foreground" />
                      </Select.Trigger>
                      <Select.Popover className="w-full bg-content1 border border-divider rounded-2xl shadow-2xl">
                        <ListBox selectedKeys={form.status} onSelectionChange={(keys) => setForm({ ...form, status: keys as Set<string> })} selectionMode="single">
                          {STATUS_OPTIONS.map((item) => (
                            <ListBox.Item key={item.id} id={item.id} textValue={item.label} className={cn("rounded-xl m-1 hover:bg-primary/10 transition-colors", item.id === 'active' ? 'text-success' : item.id === 'suspended' ? 'text-danger' : 'text-foreground')}>
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
                    {isLoading ? "PROCESANDO..." : (delivery ? 'GUARDAR CAMBIOS' : 'REGISTRAR REPARTIDOR')}
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
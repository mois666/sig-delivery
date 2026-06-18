import { useState, useEffect } from 'react';
import { Modal, Form, Fieldset, TextField, Label, Input, TextArea, Button, FieldError } from '@heroui/react';
import { useOrderStore } from '@/stores/orderStore';

export const EditOrderModal = ({ isOpen, onClose, order }: { isOpen: boolean; onClose: () => void; order: any }) => {
  const { editOrder } = useOrderStore();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    client_name: '',
    description: '',
    delivery_fee: '',
    status: '',
  });

  useEffect(() => {
    if (order && isOpen) {
      setForm({
        client_name: order.client_name || '',
        description: order.description || '',
        delivery_fee: order.delivery_fee?.toString() || '',
        status: order.status || '',
      });
    }
  }, [order, isOpen]);

  const handleEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!order) return;
    setLoading(true);
    
    const payload = {
      client_name: form.client_name,
      description: form.description,
      delivery_fee: Number(form.delivery_fee),
      status: form.status,
    };
    
    const success = await editOrder(order.id.toString(), payload);
    if (success) onClose();
    setLoading(false);
  };

  if (!order) return null;

  return (
    <Modal isOpen={isOpen}>
      <Modal.Backdrop className="bg-black/80 backdrop-blur-sm">
        <Modal.Container>
          <Modal.Dialog className="w-full max-w-md bg-background border border-divider rounded-[24px] overflow-hidden flex flex-col">
            <Modal.CloseTrigger onPress={onClose} className="top-4 right-4 text-muted-foreground hover:text-foreground" />
            <Modal.Header className="border-b border-divider flex items-center gap-4">
              <div>
                <Modal.Heading className="text-xl font-black text-foreground uppercase tracking-tight">
                  Editar Pedido #{order.id}
                </Modal.Heading>
                <p className="text-xs text-muted-foreground font-medium">Modifica los detalles del pedido</p>
              </div>
            </Modal.Header>
            <Form onSubmit={handleEdit} className="flex flex-col flex-1 overflow-hidden">
              <Modal.Body className="overflow-y-auto custom-scrollbar p-6 space-y-4">
                <Fieldset className="w-full">
                  <Fieldset.Group>
                    <TextField isRequired name="client_name">
                      <Label>Nombre del Cliente</Label>
                      <Input 
                        value={form.client_name} 
                        onValueChange={(val) => setForm({ ...form, client_name: val })} 
                        placeholder="Ej: Juan Pérez" 
                        variant="flat" 
                      />
                      <FieldError />
                    </TextField>

                    <TextField name="description">
                      <Label>Descripción del Pedido</Label>
                      <TextArea
                        value={form.description}
                        onValueChange={(val) => setForm({ ...form, description: val })}
                        placeholder="Ej: Recoger paquete de 2kg, frágil..."
                        variant="flat"
                        minRows={3}
                      />
                    </TextField>

                    <TextField name="delivery_fee" isRequired>
                      <Label>Costo de Envío</Label>
                      <Input 
                        type="number"
                        value={form.delivery_fee} 
                        onValueChange={(val) => setForm({ ...form, delivery_fee: val })} 
                        placeholder="10" 
                        variant="flat" 
                      />
                    </TextField>

                    <div className="flex flex-col gap-1.5">
                      <Label>Estado de la orden</Label>
                      <select
                        className="flex h-10 w-full items-center justify-between rounded-xl border border-divider bg-default-100 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        value={form.status}
                        onChange={(e) => setForm({ ...form, status: e.target.value })}
                      >
                        <option value="pending">Pendiente</option>
                        <option value="active">Activo</option>
                        <option value="pre-assigned">Pre-asignado</option>
                        <option value="assigned">Asignado</option>
                        <option value="canceled">Cancelado</option>
                      </select>
                    </div>

                  </Fieldset.Group>
                  <Fieldset.Actions className="mt-6">
                    <Button
                      type="submit"
                      isDisabled={loading}
                      isLoading={loading}
                      size="lg"
                      color="primary"
                      className="w-full h-12 font-black rounded-xl text-lg transition-all shadow-lg cursor-pointer"
                    >
                      {loading ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
                    </Button>
                    <Button
                      type="button"
                      variant="flat"
                      onPress={onClose}
                      size="lg"
                      className="w-full h-12 rounded-xl font-bold text-muted-foreground cursor-pointer mt-2"
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

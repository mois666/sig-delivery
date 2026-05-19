import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, User, Star, MoreVertical, Trash2, Edit, PencilIcon } from 'lucide-react';
import { Button } from '@heroui/react';
import { useDeliveryStore } from '@/stores/deliveryStore';
import { DeliveryModal } from '@/components/modals/DeliveryModal';

import { IUser } from '@/interfaces/users-interface';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

const AdminDelivery = () => {
  const { deliveries, fetchDeliveries, addDelivery, updateDelivery, deleteDelivery, isLoading } = useDeliveryStore();
  const [showModal, setShowModal] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<IUser | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDeliveries();
  }, []);

  const handleOpenModal = (delivery: IUser | null = null) => {
    setSelectedDelivery(delivery);
    setShowModal(true);
  };

  const handleSubmit = async (data: any) => {
    let success = false;

    if (selectedDelivery) {
      // Modo Edición
      success = await updateDelivery(selectedDelivery.id, data);
      if (success) toast.success('Repartidor actualizado');
    } else {
      // Modo Creación
      success = await addDelivery(data);
      if (success) toast.success('Repartidor registrado');
    }

    if (success) setShowModal(false);
  };

  const handleDelete = async (id: number) => {
    const confirm = window.confirm('¿Estás seguro de eliminar este repartidor?');
    if (!confirm) return;
    const success = await deleteDelivery(id);
    if (success) toast.success('Repartidor eliminado');
  };

  return (
    <div className="min-h-screen bg-background pb-24 safe-top">
      <div className="glass-card border-b border-border/50 px-4 py-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-display font-bold">Panel de Repartidores</h1>
          </div>
          <Button onClick={() => handleOpenModal()} className="bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4 mr-2" /> Nuevo
          </Button>
        </div>
      </div>

      <div className="px-4 space-y-3">
        {deliveries.map((driver) => (
          <motion.div
            key={driver.id}
            className="glass-card p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/delivery/${driver.id}`)}>
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                <User className="text-primary w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold">{driver.name}</h3>
                <p className="text-xs text-muted-foreground">{driver.phone} • {driver.city}</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <div className="flex items-center gap-1 text-accent">
                <Star className="w-3 h-3 fill-current" />
                <span className="font-bold text-sm">{driver.points}</span>
              </div>
              <span className={cn(
                "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider",
                driver.status === 'active' ? 'bg-success/20 text-success' :
                  driver.status === 'suspended' ? 'bg-destructive/20 text-destructive' :
                    'bg-muted text-muted-foreground'
              )}>
                {driver.status}
              </span>
              {/* Edit */}
              <Button
                variant="ghost" size="icon" className="text-primary"
                onClick={() => handleOpenModal(driver)}
              >
                <PencilIcon className="w-4 h-4" />
              </Button>
              {/* Delete */}
              <Button
                variant="ghost" size="icon" className="text-destructive"
                onClick={() => handleDelete(driver.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        <DeliveryModal
          isOpen={showModal}
          delivery={selectedDelivery}
          onClose={() => setShowModal(false)}
          onSubmit={async (data) => {
            const success = await handleSaveDelivery(data);
            if (success) setShowModal(false);
          }}
        />
      </AnimatePresence>
      
    </div>
  );
};

export default AdminDelivery;
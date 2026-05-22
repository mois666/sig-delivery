import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, User, Star, MoreVertical, Trash2, Edit, PencilIcon, Users } from 'lucide-react';
import { Button } from '@heroui/react';
import { useUserStore } from '@/stores/userStore';
import { UserModal } from '@/components/modals/UserModal';

import { IUser } from '@/interfaces/users-interface';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

const AdminUsers = () => {
  const { users, fetchUsers, addUser, updateUser, deleteUser, isLoading } = useUserStore();
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<IUser | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpenModal = (user: IUser | null = null) => {
    setSelectedUser(user);
    setShowModal(true);
  };

  const handleSubmit = async (data: any) => {
    let success = false;

    if (selectedUser) {
      // Modo Edición
      success = await updateUser(selectedUser.id, data);
      if (success) toast.success('Usuario actualizado');
    } else {
      // Modo Creación
      success = await addUser(data);
      if (success) toast.success('Usuario registrado');
    }

    if (success) setShowModal(false);
  };

  const handleDelete = async (id: number) => {
    const confirm = window.confirm('¿Estás seguro de eliminar este usuario?');
    if (!confirm) return;
    const success = await deleteUser(id);
    if (success) toast.success('Usuario eliminado');
  };

  return (
    <div className="min-h-screen bg-background pb-24 safe-top">
      <div className="glass-card border-b border-border/50 px-4 py-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold">Panel de Usuarios</h1>
              <p className="text-xs text-muted-foreground">Administra cuentas, conductores y clientes</p>
            </div>
          </div>
          <Button onClick={() => handleOpenModal()} className="bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4 mr-2" /> Nuevo Usuario
          </Button>
        </div>
      </div>

      <div className="px-4 space-y-3">
        {users.map((item) => (
          <motion.div
            key={item.id}
            className="glass-card p-4 flex items-center justify-between hover:bg-default-50 transition-colors"
          >
            <div className="flex items-center gap-3 cursor-pointer flex-1 min-w-0" onClick={() => navigate(`/users/${item.id}`)}>
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                <User className="text-primary w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold truncate">{item.name}</h3>
                <p className="text-xs text-muted-foreground truncate">{item.email} • {item.phone} • {item.city}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={cn(
                "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider",
                item.role === 'admin' || item.role === 'super_admin' ? 'bg-primary/20 text-primary' :
                  item.role === 'driver' ? 'bg-warning/20 text-warning' :
                    'bg-success/20 text-success'
              )}>
                {item.role}
              </span>
              <span className={cn(
                "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider",
                item.status === 'active' ? 'bg-success/20 text-success' :
                  item.status === 'suspended' ? 'bg-destructive/20 text-destructive' :
                    'bg-muted text-muted-foreground'
              )}>
                {item.status}
              </span>
              {/* Edit */}
              <Button
                variant="ghost" size="icon" className="text-primary rounded-xl"
                onClick={() => handleOpenModal(item)}
              >
                <PencilIcon className="w-4 h-4" />
              </Button>
              {/* Delete */}
              <Button
                variant="ghost" size="icon" className="text-destructive rounded-xl"
                onClick={() => handleDelete(item.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        ))}

        {users.length === 0 && !isLoading && (
          <div className="glass-card p-12 text-center border-dashed bg-muted/10">
            <Users className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground italic">No se encontraron usuarios en la plataforma...</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <UserModal
            isOpen={showModal}
            user={selectedUser}
            onClose={() => setShowModal(false)}
            onSubmit={handleSubmit}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminUsers;

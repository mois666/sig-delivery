import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Clock, User, Phone, ChevronRight, CheckCircle, Star } from 'lucide-react';
import { Button } from '@heroui/react';
import { useOrderStore, OrderStatus } from '@/stores/orderStore';
import { useWalletStore } from '@/stores/walletStore';
import { useAuthStore } from '@/stores/authStore';
import StatusTimeline from '@/components/StatusTimeline';

import { toast } from 'sonner';

const statusMessages: Record<OrderStatus, string> = {
  available: 'Disponible',
  accepted: 'Prepara la entrega',
  on_the_way: 'En camino al destino',
  delivered: 'Entrega completada',
  cancelled: 'Cancelado',
};

const ActiveDelivery = () => {
  const navigate = useNavigate();
  const { activeOrder, updateOrderStatus, completeOrder } = useOrderStore();
  const { addTransaction, updateBalance, updatePoints } = useWalletStore();
  const { updateUser, user } = useAuthStore();
  const [isCompleting, setIsCompleting] = useState(false);

  if (!activeOrder) {
    navigate('/home');
    return null;
  }

  const handleUpdateStatus = () => {
    if (activeOrder.status === 'accepted') {
      updateOrderStatus(activeOrder.id, 'on_the_way');
      toast.success('¡En camino!', { description: 'El cliente ha sido notificado' });
    } else if (activeOrder.status === 'on_the_way') {
      handleComplete();
    }
  };

  const handleComplete = () => {
    setIsCompleting(true);
    
    // Simulate completion
    setTimeout(() => {
      completeOrder(activeOrder.id);
      
      // Add transactions
      addTransaction({
        type: 'earning',
        amount: activeOrder.fee,
        description: `Entrega completada - ${activeOrder.zone}`,
        orderId: activeOrder.id,
      });

      const totalPoints = activeOrder.points + activeOrder.bonusPoints;
      addTransaction({
        type: 'points',
        amount: totalPoints,
        description: `Puntos por entrega ${activeOrder.type}`,
        orderId: activeOrder.id,
      });

      // Update user points
      if (user) {
        updateUser({ totalPoints: user.totalPoints + totalPoints });
      }

      toast.success('🎉 ¡Entrega completada!', {
        description: `+Bs ${activeOrder.fee} y +${totalPoints} puntos`,
      });

      navigate('/home');
    }, 1500);
  };

  const getButtonText = () => {
    if (isCompleting) return 'Completando...';
    if (activeOrder.status === 'accepted') return 'Iniciar Entrega';
    if (activeOrder.status === 'on_the_way') return 'Marcar como Entregado';
    return 'Continuar';
  };

  return (
    <div className="min-h-screen bg-background pb-24 safe-top">
      {/* Header */}
      <div className="glass-card border-b border-border/50 px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-muted-foreground">Entrega activa</p>
            <h2 className="text-xl font-display font-bold text-foreground">
              #{activeOrder.id.slice(0, 8).toUpperCase()}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="flex items-center gap-1 text-accent">
                <span className="font-bold text-lg">Bs {activeOrder.fee}</span>
              </div>
              <div className="flex items-center gap-1 text-sm text-primary">
                <Star className="w-3 h-3" />
                <span>+{activeOrder.points + activeOrder.bonusPoints} pts</span>
              </div>
            </div>
          </div>
        </div>

        {/* Status */}
        <motion.div
          key={activeOrder.status}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-3 rounded-xl bg-primary/10 border border-primary/20"
        >
          <p className="text-primary font-semibold">{statusMessages[activeOrder.status]}</p>
        </motion.div>
      </div>

      {/* Timeline */}
      <div className="px-4 py-6">
        <StatusTimeline currentStatus={activeOrder.status} />
      </div>

      {/* Delivery Details */}
      <div className="px-4 space-y-4">
        {/* Customer */}
        <div className="glass-card p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">{activeOrder.customerName}</p>
              <p className="text-sm text-muted-foreground">{activeOrder.zone}</p>
            </div>
            <Button variant="outline" size="icon" className="ml-auto rounded-full">
              <Phone className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Locations */}
        <div className="glass-card p-4 space-y-4">
          <div className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="w-3 h-3 rounded-full bg-success" />
              <div className="w-0.5 h-12 bg-border" />
              <div className="w-3 h-3 rounded-full bg-primary" />
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase mb-1">Recoger en</p>
                <p className="font-medium text-foreground">{activeOrder.pickupAddress}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase mb-1">Entregar en</p>
                <p className="font-medium text-foreground">{activeOrder.deliveryAddress}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 pt-2 border-t border-border/50">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span className="text-sm">{activeOrder.distance}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span className="text-sm">~15 min</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="fixed bottom-20 left-4 right-4 z-30">
        <Button
          onClick={handleUpdateStatus}
          disabled={isCompleting || activeOrder.status === 'delivered'}
          className={`w-full h-14 text-lg font-bold rounded-xl touch-target ${
            activeOrder.status === 'on_the_way'
              ? 'gradient-gold text-accent-foreground glow-gold'
              : 'gradient-primary text-primary-foreground glow-primary'
          }`}
        >
          {activeOrder.status === 'on_the_way' ? (
            <CheckCircle className="w-5 h-5 mr-2" />
          ) : (
            <ChevronRight className="w-5 h-5 mr-2" />
          )}
          <span>{getButtonText()}</span>
        </Button>
      </div>

      
    </div>
  );
};

export default ActiveDelivery;

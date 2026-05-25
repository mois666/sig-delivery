import { motion } from 'framer-motion';
import { Zap, Moon, Package, Star, Clock, MapPin, ChevronRight, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@heroui/react';
import { Chip as Badge } from '@heroui/react';
import { IAddOrder, IOrderType } from '@/interfaces/orders-interface';

interface ChallengeCardProps {
  order: IAddOrder;
  onAccept: (orderId: string) => void;
}

const orderTypeConfig: Record<IOrderType, { icon: typeof Package; label: string; className: string }> = {
  estandar: { icon: Package, label: 'Estándar', className: 'bg-success/20 text-success border-success/30' },
  programada: { icon: Calendar, label: 'Programada', className: 'bg-primary/20 text-primary border-primary/30' },
};

const ChallengeCard = ({ order, onAccept }: ChallengeCardProps) => {
  const { icon: TypeIcon, label: typeLabel, className: typeClassName } = orderTypeConfig[order.type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="glass-card p-4 relative overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-full border', typeClassName)}>
            <TypeIcon className="w-4 h-4" />
            <span className="text-xs font-semibold">{typeLabel}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span className="text-sm font-medium">{order.duration}</span>
        </div>
      </div>

      {/* Addresses */}
      <div className="space-y-1 mb-4 text-xs text-muted-foreground">
        {order.address_a && (
          <div className="flex items-center gap-1.5 truncate">
            <span className="w-3.5 h-3.5 rounded bg-blue-500/10 text-blue-400 flex items-center justify-center text-[8px] font-black">A</span>
            <span className="truncate text-foreground font-medium">{order.address_a}</span>
          </div>
        )}
        {order.address_b && (
          <div className="flex items-center gap-1.5 truncate">
            <span className="w-3.5 h-3.5 rounded bg-primary/10 text-primary flex items-center justify-center text-[8px] font-black">B</span>
            <span className="truncate text-foreground font-medium">{order.address_b}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 mt-2 font-bold text-foreground">
          <Calendar className="w-3.5 h-3.5 text-primary" />
          <span>Entrega: {order.delivery_time}</span>
        </div>
      </div>

      {/* Rewards */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <span className="text-xs font-bold text-primary-foreground">Bs</span>
          </div>
          <div>
            <div className="text-lg font-bold text-foreground">{order.delivery_fee}</div>
            <div className="text-[10px] text-muted-foreground uppercase">Pago</div>
          </div>
        </div>

        <div className="w-px h-8 bg-border" />

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-warning flex items-center justify-center">
            <Star className="w-4 h-4 text-warning-foreground" />
          </div>
          <div>
            <div className="text-lg font-bold text-foreground">
              {order.points}
              {order.points > 0 && (
                <span className="text-accent text-sm ml-1">+{order.points}</span>
              )}
            </div>
            <div className="text-[10px] text-muted-foreground uppercase">Puntos</div>
          </div>
        </div>
      </div>

      {/* Accept Button */}
      <Button
        onClick={() => onAccept(order.id)}
        color="primary"
        className="w-full font-bold h-12 touch-target shadow-lg shadow-primary/20 cursor-pointer"
      >
        <span>Aceptar Entrega</span>
        <ChevronRight className="w-5 h-5 ml-2" />
      </Button>
    </motion.div>
  );
};

export default ChallengeCard;

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

const orderTypeConfig: Record<IOrderType, { icon: typeof Zap; label: string; className: string }> = {
  express: { icon: Zap, label: 'Express', className: 'bg-warning/20 text-warning border-warning/30' },
  estandar: { icon: Package, label: 'Estándar', className: 'bg-success/20 text-success border-success/30' },
  programada: { icon: Calendar, label: 'Programada', className: 'bg-primary/20 text-primary border-primary/30' },
};

const urgencyConfig = {
  alta: { label: 'URGENTE', className: 'bg-destructive text-destructive-foreground animate-pulse' },
  media: { label: 'MODERADO', className: 'bg-warning text-warning-foreground' },
  baja: { label: 'FLEXIBLE', className: 'bg-muted text-muted-foreground' },
};

const ChallengeCard = ({ order, onAccept }: ChallengeCardProps) => {
  const { icon: TypeIcon, label: typeLabel, className: typeClassName } = orderTypeConfig[order.type];
  const { label: urgencyLabel, className: urgencyClassName } = urgencyConfig[order.urgency];

  //const timeRemaining = Math.max(0, Math.floor((order.expiresAt.getTime() - Date.now()) / 60000));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="glass-card p-4 relative overflow-hidden"
    >
      {/* Glow effect for urgent orders */}
      {order.urgency === 'alta' && (
        <div className="absolute inset-0 bg-destructive/5 animate-pulse" />
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-full border', typeClassName)}>
            <TypeIcon className="w-4 h-4" />
            <span className="text-xs font-semibold">{typeLabel}</span>
          </div>
          <Badge className={cn('text-[10px] font-bold', urgencyClassName)}>
            {urgencyLabel}
          </Badge>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span className="text-sm font-medium">{order.duration}</span>
        </div>
      </div>

      {/* Zone & Distance */}
      <div className="flex items-center gap-2 mb-3">
        <MapPin className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium text-foreground">{"order.zone"}</span>
        <span className="text-muted-foreground">•</span>
        <span className="text-sm text-muted-foreground">{"order.distance"}</span>
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
        className="w-full font-bold h-12 touch-target shadow-lg shadow-primary/20"
      >
        <span>Aceptar Entrega</span>
        <ChevronRight className="w-5 h-5 ml-2" />
      </Button>
    </motion.div>
  );
};

export default ChallengeCard;

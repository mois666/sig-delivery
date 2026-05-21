import { motion } from 'framer-motion';
import { CheckCircle2, Circle, Package, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OrderStatus } from '@/stores/orderStore';

interface StatusTimelineProps {
  currentStatus: OrderStatus;
}

const steps = [
  { status: 'accepted', label: 'Aceptado', icon: CheckCircle2 },
  { status: 'on_the_way', label: 'En camino', icon: Truck },
  { status: 'delivered', label: 'Entregado', icon: Package },
];

const statusOrder: OrderStatus[] = ['accepted', 'on_the_way', 'delivered'];

const StatusTimeline = ({ currentStatus }: StatusTimelineProps) => {
  const currentIndex = statusOrder.indexOf(currentStatus);

  return (
    <div className="relative flex items-center justify-between px-4">
      {/* Progress line */}
      <div className="absolute left-[10%] right-[10%] top-5 h-1 bg-secondary rounded-full">
        <motion.div
          className="h-full bg-primary rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${(currentIndex / (steps.length - 1)) * 100}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>

      {steps.map((step, index) => {
        const isCompleted = index <= currentIndex;
        const isCurrent = index === currentIndex;
        const Icon = step.icon;

        return (
          <div key={step.status} className="relative flex flex-col items-center z-10">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: isCurrent ? 1.1 : 1 }}
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-300',
                isCompleted ? 'bg-primary shadow-lg shadow-primary/20' : 'bg-secondary',
                isCurrent && 'ring-4 ring-primary/30'
              )}
            >
              {isCompleted ? (
                <Icon className="w-5 h-5 text-primary-foreground" />
              ) : (
                <Circle className="w-5 h-5 text-muted-foreground" />
              )}
            </motion.div>
            <span className={cn(
              'mt-2 text-xs font-medium text-center',
              isCompleted ? 'text-primary' : 'text-muted-foreground'
            )}>
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default StatusTimeline;

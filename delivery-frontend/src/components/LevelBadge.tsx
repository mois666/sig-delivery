import { motion } from 'framer-motion';
import { Star, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LevelBadgeProps {
  level: number;
  totalPoints: number;
  size?: 'sm' | 'md' | 'lg';
}

const sizeConfig = {
  sm: { container: 'w-12 h-12', star: 'w-5 h-5', text: 'text-xs' },
  md: { container: 'w-16 h-16', star: 'w-6 h-6', text: 'text-sm' },
  lg: { container: 'w-20 h-20', star: 'w-8 h-8', text: 'text-base' },
};

const LevelBadge = ({ level, totalPoints, size = 'md' }: LevelBadgeProps) => {
  const { container, star, text } = sizeConfig[size];
  const pointsToNextLevel = 500 - (totalPoints % 500);
  const progressPercent = ((500 - pointsToNextLevel) / 500) * 100;

  return (
    <div className="flex flex-col items-center gap-2">
      <motion.div
        initial={{ scale: 0.8, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        className="relative"
      >
        {/* Outer glow ring */}
        <div className={cn(
          container,
          'rounded-full bg-warning flex items-center justify-center relative shadow-lg shadow-warning/20'
        )}>
          {/* Progress ring */}
          <svg className="absolute inset-0 w-full h-full -rotate-90">
            <circle
              cx="50%"
              cy="50%"
              r="45%"
              fill="none"
              stroke="hsl(var(--background))"
              strokeWidth="3"
            />
            <motion.circle
              cx="50%"
              cy="50%"
              r="45%"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${progressPercent * 2.83} 283`}
              initial={{ strokeDashoffset: 283 }}
              animate={{ strokeDashoffset: 0 }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </svg>
          
          {/* Inner content */}
          <div className="flex flex-col items-center">
            <Star className={cn(star, 'text-warning-foreground')} fill="currentColor" />
            <span className={cn(text, 'font-bold text-warning-foreground')}>{level}</span>
          </div>
        </div>

        {/* Level up indicator */}
        <motion.div
          initial={{ y: 5, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-success flex items-center justify-center"
        >
          <ChevronUp className="w-4 h-4 text-success-foreground" />
        </motion.div>
      </motion.div>

      <div className="text-center">
        <p className="text-xs text-muted-foreground">
          {pointsToNextLevel} pts para nivel {level + 1}
        </p>
      </div>
    </div>
  );
};

export default LevelBadge;

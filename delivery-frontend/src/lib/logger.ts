import { toast } from 'sonner';

/**
 * Utility logger that outputs to both the developer console
 * and as interactive Sonner toast notifications in their respective colors.
 */
export const logger = {
  success: (message: string, ...args: any[]) => {
    console.log(`%c[SUCCESS] ${message}`, 'color: #17C964; font-weight: bold;', ...args);
    toast.success(message, {
      description: args.length > 0 ? args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') : undefined
    });
  },

  warning: (message: string, ...args: any[]) => {
    console.warn(`[WARNING] ${message}`, ...args);
    toast.warning(message, {
      description: args.length > 0 ? args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') : undefined
    });
  },

  error: (message: string, ...args: any[]) => {
    console.error(`[ERROR] ${message}`, ...args);
    toast.error(message, {
      description: args.length > 0 ? args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') : undefined
    });
  },

  info: (message: string, ...args: any[]) => {
    console.log(`[INFO] ${message}`, ...args);
    toast(message, {
      description: args.length > 0 ? args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') : undefined
    });
  }
};

import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    phone: z.string().min(1, 'El teléfono es requerido'),
    pin: z.string().min(1, 'El PIN es requerido'),
  }),
});

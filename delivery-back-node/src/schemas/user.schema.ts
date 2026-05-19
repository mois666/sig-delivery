import { z } from 'zod';

export const userStoreSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'El nombre es requerido'),
    phone: z.string().min(8, 'El teléfono debe tener al menos 8 caracteres'),
    pin: z.string().min(4, 'El PIN debe tener al menos 4 caracteres'),
    email: z.string().email('El correo electrónico no es válido').optional().nullable(),
    city: z.string().optional(),
    role: z.enum(['admin', 'driver']).optional(),
    status: z.enum(['active', 'inactive', 'suspended']).optional(),
  }),
});

export const userUpdateSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
    pin: z.string().optional(),
    email: z.string().email().optional().nullable(),
    city: z.string().optional(),
    role: z.enum(['admin', 'driver']).optional(),
    status: z.enum(['active', 'inactive', 'suspended']).optional(),
  }),
});

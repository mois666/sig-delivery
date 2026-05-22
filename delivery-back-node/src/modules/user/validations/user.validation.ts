import { z } from 'zod';

const transportTypes = ['on_foot', 'bike', 'motorcycle', 'car'] as const;
const roles          = ['super_admin', 'admin', 'driver', 'client'] as const;
const statuses       = ['active', 'inactive', 'suspended'] as const;

export const userStoreSchema = z.object({
  body: z.object({
    name:           z.string().min(1, 'El nombre es requerido'),
    phone:          z.string().min(8, 'El teléfono debe tener al menos 8 caracteres'),
    pin:            z.string().min(4, 'El PIN debe tener al menos 4 caracteres'),
    email:          z.string().email('El correo electrónico no es válido'),
    transport_type: z.enum(transportTypes).optional(),
    role:           z.enum(roles).optional(),
    status:         z.enum(statuses).optional(),
  }),
});

export const userUpdateSchema = z.object({
  body: z.object({
    name:           z.string().optional(),
    phone:          z.string().optional(),
    pin:            z.string().optional(),
    email:          z.string().email().optional(),
    transport_type: z.enum(transportTypes).optional(),
    role:           z.enum(roles).optional(),
    status:         z.enum(statuses).optional(),
  }),
});

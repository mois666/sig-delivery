import { z } from 'zod';

export const orderStoreSchema = z.object({
  body: z.object({
    type: z.string().min(1, 'El tipo de pedido es requerido'),
    client_name: z.string().min(1, 'El nombre del cliente es requerido'),
    pickup: z.string().min(1, 'La dirección de recogida es requerida'),
    delivery: z.string().min(1, 'La dirección de entrega es requerida'),
    address: z.string().optional().nullable(),
    delivery_fee: z.number().nonnegative(),
    urgency: z.enum(['baja', 'media', 'alta']).default('baja'),
    description: z.string().optional().nullable(),
    currency: z.string().optional().default('BOB'),
    status: z.string().optional(),
    duration: z.string().optional().nullable(),
    points: z.number().optional().default(0),
  }),
});

export const orderUpdateSchema = z.object({
  body: z.object({
    type: z.string().optional(),
    client_name: z.string().optional(),
    pickup: z.string().optional(),
    delivery: z.string().optional(),
    address: z.string().optional().nullable(),
    delivery_fee: z.number().optional(),
    urgency: z.enum(['baja', 'media', 'alta']).optional(),
    description: z.string().optional().nullable(),
    status: z.string().optional(),
  }),
});

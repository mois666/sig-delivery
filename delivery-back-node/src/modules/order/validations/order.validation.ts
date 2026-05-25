import { z } from 'zod';

export const orderStoreSchema = z.object({
  body: z.object({
    type:          z.string().min(1, 'El tipo de pedido es requerido'),
    client_name:   z.string().min(1, 'El nombre del cliente es requerido'),
    pickup:        z.string().min(1, 'La dirección de recogida es requerida'),
    delivery:      z.string().min(1, 'La dirección de entrega es requerida'),
    address_a:     z.string().optional().nullable(),
    address_b:     z.string().optional().nullable(),
    delivery_time: z.coerce.date().optional(),
    delivery_fee:  z.coerce.number().nonnegative(),
    description:   z.string().optional().nullable(),
    currency:      z.string().optional().default('BOB'),
    status:        z.string().optional().default('pending'),
    duration:      z.string().optional().nullable(),
    points:        z.coerce.number().optional().default(0),
    city_id:       z.coerce.number().int().positive('La ciudad es requerida'),
  }),
});

export const orderUpdateSchema = z.object({
  body: z.object({
    type:          z.string().optional(),
    client_name:   z.string().optional(),
    pickup:        z.string().optional(),
    delivery:      z.string().optional(),
    address_a:     z.string().optional().nullable(),
    address_b:     z.string().optional().nullable(),
    delivery_time: z.coerce.date().optional(),
    delivery_fee:  z.coerce.number().optional(),
    description:   z.string().optional().nullable(),
    status:        z.string().optional(),
    city_id:       z.coerce.number().int().positive().optional(),
  }),
});

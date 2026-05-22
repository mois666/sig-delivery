import { z } from 'zod';

export const cityStoreSchema = z.object({
  body: z.object({
    name:        z.string().min(1, 'El nombre es requerido'),
    country:     z.string().optional().default('Bolivia'),
    currency:    z.string().length(3, 'La moneda debe tener 3 caracteres').optional().default('BOB'),
    timezone:    z.string().optional().default('America/La_Paz'),
    center_lat:  z.number(),
    center_lng:  z.number(),
    coordinates: z.any().optional().nullable(),
    metadata:    z.any().optional().default({}),
  }),
});

export const cityUpdateSchema = z.object({
  body: z.object({
    name:        z.string().optional(),
    country:     z.string().optional(),
    currency:    z.string().length(3).optional(),
    timezone:    z.string().optional(),
    center_lat:  z.number().optional(),
    center_lng:  z.number().optional(),
    coordinates: z.any().optional().nullable(),
    is_active:   z.boolean().optional(),
    metadata:    z.any().optional(),
  }),
});

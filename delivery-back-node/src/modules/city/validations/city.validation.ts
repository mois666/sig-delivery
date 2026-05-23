import { z } from 'zod';

export const cityStoreSchema = z.object({
  body: z.object({
    name:              z.string().min(1, 'El nombre es requerido'),
    country:           z.string().optional().default('Bolivia'),
    currency:          z.string().length(3, 'La moneda debe tener 3 caracteres').optional().default('BOB'),
    base_delivery_fee: z.union([z.number(), z.string()]).transform(Number),
    center_lat_lng:    z.string().optional().nullable(),
    coverage_area:     z.any().optional().nullable(),
  }),
});

export const cityUpdateSchema = z.object({
  body: z.object({
    name:              z.string().optional(),
    country:           z.string().optional(),
    currency:          z.string().length(3).optional(),
    base_delivery_fee: z.union([z.number(), z.string()]).transform(Number).optional(),
    center_lat_lng:    z.string().optional().nullable(),
    coverage_area:     z.any().optional().nullable(),
    is_active:         z.boolean().optional(),
  }),
});

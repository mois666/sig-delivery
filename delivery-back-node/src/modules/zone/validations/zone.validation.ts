import { z } from 'zod';

export const zoneSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'El nombre de la zona es requerido'),
    polygon: z.any().optional().nullable(),
    coordinates: z.any().optional().nullable(),
    extra_rate: z.union([z.number(), z.string()]).transform(Number),
    color: z.string().startsWith('#').optional().default('#ff0000'),
    is_active: z.boolean().optional().default(true),
  }),
});

export const checkRateSchema = z.object({
  query: z.object({
    lat: z.string().transform(val => parseFloat(val)).refine(val => !isNaN(val), 'Latitud inválida'),
    lng: z.string().transform(val => parseFloat(val)).refine(val => !isNaN(val), 'Longitud inválida'),
  }),
});

import { z } from 'zod';

export const zoneSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'El nombre de la zona es requerido'),
    coordinates: z.array(z.array(z.number())).min(3, 'Se requieren al menos 3 puntos para un polígono'),
    extra_rate: z.number().nonnegative(),
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

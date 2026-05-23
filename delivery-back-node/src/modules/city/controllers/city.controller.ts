import { Request, Response } from 'express';
import prisma from '../../../lib/prisma';

export class CityController {
  /** GET /cities — obtiene las ciudades */
  static async index(req: Request, res: Response) {
    try {
      const onlyActive = req.query.onlyActive === 'true' || !req.query.all; // default only active for login/dropdowns
      const cities = await prisma.city.findMany({
        where: onlyActive ? { is_active: true } : {},
        orderBy: { name: 'asc' },
      });
      return res.json(cities);
    } catch (error) {
      console.error('Error en index:', error);
      return res.status(500).json({ message: 'Error al obtener ciudades' });
    }
  }

  /** GET /cities/:id */
  static async show(req: Request, res: Response) {
    const id = parseInt(req.params.id as string);
    try {
      const city = await prisma.city.findUnique({
        where: { id },
      });
      if (!city) {
        return res.status(404).json({ message: 'Ciudad no encontrada' });
      }
      return res.json(city);
    } catch (error) {
      console.error('Error en show:', error);
      return res.status(500).json({ message: 'Error al obtener ciudad' });
    }
  }

  /** POST /cities — solo admin/super_admin */
  static async store(req: Request, res: Response) {
    const { name, country, currency, timezone, coordinates } = req.body;
    try {
      const exists = await prisma.city.findUnique({ where: { name } });
      if (exists) {
        return res.status(409).json({ message: 'Ya existe una ciudad con ese nombre' });
      }
      
      const city = await prisma.city.create({
        data: {
          name,
          country,
          currency,
          timezone,
          coordinates: coordinates || [],
          is_active: true,
        },
      });

      return res.status(201).json({
        message: 'Ciudad creada',
        city,
      });
    } catch (error) {
      console.error('Error en store:', error);
      return res.status(500).json({ message: 'Error al crear ciudad' });
    }
  }

  /** PUT /cities/:id — solo admin/super_admin */
  static async update(req: Request, res: Response) {
    const id = parseInt(req.params.id as string);
    const { name, country, currency, timezone, coordinates, is_active } = req.body;
    try {
      const cityExists = await prisma.city.findUnique({ where: { id } });
      if (!cityExists) {
        return res.status(404).json({ message: 'Ciudad no encontrada' });
      }
      
      const city = await prisma.city.update({
        where: { id },
        data: {
          name: name ?? undefined,
          country: country ?? undefined,
          currency: currency ?? undefined,
          timezone: timezone ?? undefined,
          coordinates: coordinates ?? undefined,
          is_active: is_active !== undefined ? is_active : undefined,
        },
      });
      
      return res.json({
        message: 'Ciudad actualizada',
        city,
      });
    } catch (error) {
      console.error('Error en update:', error);
      return res.status(500).json({ message: 'Error al actualizar ciudad' });
    }
  }

  /** DELETE /cities/:id — solo admin/super_admin (soft delete) */
  static async destroy(req: Request, res: Response) {
    const id = parseInt(req.params.id as string);
    try {
      await prisma.city.update({ where: { id }, data: { is_active: false } });
      return res.json({ message: 'Ciudad desactivada' });
    } catch (error) {
      console.error('Error en destroy:', error);
      return res.status(500).json({ message: 'Error al eliminar ciudad' });
    }
  }
}

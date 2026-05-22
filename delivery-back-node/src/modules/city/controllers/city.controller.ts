import { Request, Response } from 'express';
import prisma from '../../../lib/prisma';

export class CityController {
  /** GET /cities — público, para que el login pueda listar las ciudades */
  static async index(req: Request, res: Response) {
    try {
      const cities = await prisma.city.findMany({
        where: { is_active: true },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, country: true, currency: true, coordinates: true },
      });
      return res.json(cities);
    } catch (error) {
      return res.status(500).json({ message: 'Error al obtener ciudades' });
    }
  }

  /** GET /cities/:id */
  static async show(req: Request, res: Response) {
    const id = parseInt(req.params.id as string);
    try {
      const city = await prisma.city.findUnique({ where: { id } });
      if (!city) return res.status(404).json({ message: 'Ciudad no encontrada' });
      return res.json(city);
    } catch (error) {
      return res.status(500).json({ message: 'Error al obtener ciudad' });
    }
  }

  /** POST /cities — solo admin/super_admin */
  static async store(req: Request, res: Response) {
    const { name, country, currency, coordinates } = req.body;
    try {
      const city = await prisma.city.create({
        data: { name, country, currency, coordinates },
      });
      return res.status(201).json({ message: 'Ciudad creada', city });
    } catch (error: any) {
      if (error.code === 'P2002') {
        return res.status(409).json({ message: 'Ya existe una ciudad con ese nombre' });
      }
      return res.status(500).json({ message: 'Error al crear ciudad' });
    }
  }

  /** PUT /cities/:id — solo admin/super_admin */
  static async update(req: Request, res: Response) {
    const id = parseInt(req.params.id as string);
    const { name, country, currency, coordinates, is_active } = req.body;
    try {
      const city = await prisma.city.update({
        where: { id },
        data: { name, country, currency, coordinates, is_active },
      });
      return res.json({ message: 'Ciudad actualizada', city });
    } catch (error) {
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
      return res.status(500).json({ message: 'Error al eliminar ciudad' });
    }
  }
}

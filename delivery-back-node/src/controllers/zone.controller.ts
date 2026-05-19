import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { GeoService } from '../services/geo.service';
import axios from 'axios';

export class ZoneController {
  static async index(req: Request, res: Response) {
    try {
      const zones = await prisma.zone.findMany();
      return res.json(zones);
    } catch (error) {
      return res.status(500).json({ message: 'Error al obtener las zonas' });
    }
  }

  static async store(req: Request, res: Response) {
    const { name, coordinates, extra_rate, color, is_active } = req.body;

    try {
      const zone = await prisma.zone.create({
        data: {
          name,
          coordinates,
          extra_rate,
          color,
          is_active,
        },
      });

      return res.status(201).json({
        message: 'Zona creada con éxito',
        zone,
      });
    } catch (error) {
      return res.status(500).json({ message: 'Error al crear la zona' });
    }
  }

  static async show(req: Request, res: Response) {
    const id = parseInt(req.params.id as string);

    try {
      const zone = await prisma.zone.findUnique({ where: { id } });

      if (!zone) {
        return res.status(404).json({ message: 'Zona no encontrada' });
      }

      return res.json(zone);
    } catch (error) {
      return res.status(500).json({ message: 'Error al obtener la zona' });
    }
  }

  static async update(req: Request, res: Response) {
    const id = parseInt(req.params.id as string);
    const data = req.body;

    try {
      const zone = await prisma.zone.update({
        where: { id },
        data,
      });

      return res.json({
        message: 'Zona actualizada correctamente',
        zone,
      });
    } catch (error) {
      return res.status(500).json({ message: 'Error al actualizar la zona' });
    }
  }

  static async destroy(req: Request, res: Response) {
    const id = parseInt(req.params.id as string);

    try {
      await prisma.zone.delete({ where: { id } });
      return res.json({ message: 'Zona eliminada' });
    } catch (error) {
      return res.status(500).json({ message: 'Error al eliminar la zona' });
    }
  }

  static async activeZones(req: Request, res: Response) {
    try {
      const activeZones = await prisma.zone.findMany({
        where: { is_active: true },
      });
      return res.json(activeZones);
    } catch (error) {
      return res.status(500).json({ message: 'Error al obtener las zonas activas' });
    }
  }

  static async checkRate(req: Request, res: Response) {
    const { lat, lng } = req.query as any;

    try {
      const extraRate = await GeoService.calculateExtraRate(lat, lng);

      return res.json({
        extra_rate: extraRate,
        is_special_zone: extraRate > 0,
      });
    } catch (error) {
      return res.status(500).json({ message: 'Error al calcular el recargo de la zona' });
    }
  }

  static async expandUrl(req: Request, res: Response) {
    const { url } = req.body;

    try {
      // Realizamos una petición HEAD para obtener la URL real sin descargar todo el contenido
      const response = await axios.get(url, {
        maxRedirects: 5,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });

      const expandedUrl = response.config.url || url;

      // Intentamos extraer las coordenadas de la URL expandida
      // Ejemplo: https://www.google.com/maps/search/-17.995549,+-67.062355
      const regex = /search\/([-+]?[\d\.]+),\+?([-+]?[\d\.]+)/;
      const match = expandedUrl.match(regex);

      if (match) {
        return res.json({
          success: true,
          longUrl: `${match[1]},${match[2]}`,
        });
      }

      return res.json({
        success: true,
        longUrl: expandedUrl,
      });
    } catch (error) {
      return res.status(422).json({
        success: false,
        message: 'Error al expandir la URL corta de Google Maps',
      });
    }
  }
}

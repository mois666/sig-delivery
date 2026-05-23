import { Request, Response } from 'express';
import prisma from '../../../lib/prisma';
import { GeoService } from '../services/geo.service';
import axios from 'axios';

export class ZoneController {
  static async index(req: Request, res: Response) {
    try {
      const zones: any[] = await prisma.$queryRawUnsafe(`
        SELECT id, name, extra_rate::text as extra_rate, color, is_active, city_id, ST_AsGeoJSON(polygon) as polygon, created_at, updated_at
        FROM zones
      `);
      const formatted = zones.map((z: any) => ({
        ...z,
        extra_rate: Number(z.extra_rate),
        polygon: z.polygon ? JSON.parse(z.polygon) : null
      }));
      return res.json(formatted);
    } catch (error) {
      return res.status(500).json({ message: 'Error al obtener las zonas' });
    }
  }

  static async byCity(req: Request, res: Response) {
    const cityId = parseInt(req.params.cityId as string);
    try {
      const zones: any[] = await prisma.$queryRawUnsafe(`
        SELECT id, name, extra_rate::text as extra_rate, color, is_active, city_id, ST_AsGeoJSON(polygon) as polygon, created_at, updated_at
        FROM zones
        WHERE city_id = $1
      `, cityId);
      const formatted = zones.map((z: any) => ({
        ...z,
        extra_rate: Number(z.extra_rate),
        polygon: z.polygon ? JSON.parse(z.polygon) : null
      }));
      return res.json(formatted);
    } catch (error) {
      return res.status(500).json({ message: 'Error al obtener las zonas de la ciudad' });
    }
  }

  static async store(req: Request, res: Response) {
    const cityId = parseInt(req.params.cityId as string);
    const { name, polygon, extra_rate, color, is_active } = req.body;

    try {
      let geojson = polygon;
      if (typeof geojson === 'string') {
        geojson = JSON.parse(geojson);
      }
      const geojsonStr = JSON.stringify(geojson);

      await prisma.$executeRawUnsafe(`
        INSERT INTO zones (name, extra_rate, color, is_active, city_id, polygon, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, ST_GeomFromGeoJSON($6), NOW(), NOW())
      `, name, Number(extra_rate), color ?? '#ff0000', is_active ?? true, cityId, geojsonStr);

      const created: any[] = await prisma.$queryRawUnsafe(`
        SELECT id, name, extra_rate::text as extra_rate, color, is_active, city_id, ST_AsGeoJSON(polygon) as polygon, created_at, updated_at
        FROM zones
        WHERE name = $1 AND city_id = $2
        ORDER BY id DESC LIMIT 1
      `, name, cityId);

      return res.status(201).json({
        message: 'Zona creada con éxito',
        zone: {
          ...created[0],
          extra_rate: Number(created[0].extra_rate),
          polygon: created[0].polygon ? JSON.parse(created[0].polygon) : null
        },
      });
    } catch (error) {
      console.error('Error en zone store:', error);
      return res.status(500).json({ message: 'Error al crear la zona' });
    }
  }

  static async show(req: Request, res: Response) {
    const id = parseInt(req.params.id as string);

    try {
      const zones: any[] = await prisma.$queryRawUnsafe(`
        SELECT id, name, extra_rate::text as extra_rate, color, is_active, city_id, ST_AsGeoJSON(polygon) as polygon, created_at, updated_at
        FROM zones
        WHERE id = $1
      `, id);

      if (zones.length === 0) {
        return res.status(404).json({ message: 'Zona no encontrada' });
      }

      const z = zones[0];
      return res.json({
        ...z,
        extra_rate: Number(z.extra_rate),
        polygon: z.polygon ? JSON.parse(z.polygon) : null
      });
    } catch (error) {
      return res.status(500).json({ message: 'Error al obtener la zona' });
    }
  }

  static async update(req: Request, res: Response) {
    const cityId = parseInt(req.params.cityId as string);
    const id = parseInt(req.params.id as string);
    const { name, polygon, extra_rate, color, is_active } = req.body;

    try {
      // Fetch current values as fallback
      const currentZones: any[] = await prisma.$queryRawUnsafe(`
        SELECT id, name, extra_rate::text as extra_rate, color, is_active, city_id, ST_AsGeoJSON(polygon) as polygon
        FROM zones
        WHERE id = $1 AND city_id = $2
      `, id, cityId);
      
      if (currentZones.length === 0) {
        return res.status(404).json({ message: 'Zona no encontrada' });
      }
      const current = currentZones[0];

      const newName = name !== undefined ? name : current.name;
      const newRate = extra_rate !== undefined ? Number(extra_rate) : Number(current.extra_rate);
      const newColor = color !== undefined ? color : current.color;
      const newActive = is_active !== undefined ? is_active : current.is_active;

      let geojsonStr: string;
      if (polygon !== undefined && polygon !== null) {
        let geojson = polygon;
        if (typeof geojson === 'string') {
          geojson = JSON.parse(geojson);
        }
        geojsonStr = JSON.stringify(geojson);
      } else {
        geojsonStr = current.polygon;
      }

      await prisma.$executeRawUnsafe(`
        UPDATE zones
        SET name = $1, extra_rate = $2, color = $3, is_active = $4, polygon = ST_GeomFromGeoJSON($5), updated_at = NOW()
        WHERE id = $6 AND city_id = $7
      `, newName, newRate, newColor, newActive, geojsonStr, id, cityId);

      const updated: any[] = await prisma.$queryRawUnsafe(`
        SELECT id, name, extra_rate::text as extra_rate, color, is_active, city_id, ST_AsGeoJSON(polygon) as polygon, created_at, updated_at
        FROM zones
        WHERE id = $1 AND city_id = $2
      `, id, cityId);

      return res.json({
        message: 'Zona actualizada correctamente',
        zone: {
          ...updated[0],
          extra_rate: Number(updated[0].extra_rate),
          polygon: updated[0].polygon ? JSON.parse(updated[0].polygon) : null
        },
      });
    } catch (error) {
      console.error('Error en zone update:', error);
      return res.status(500).json({ message: 'Error al actualizar la zona' });
    }
  }

  static async destroy(req: Request, res: Response) {
    const cityId = parseInt(req.params.cityId as string);
    const id = parseInt(req.params.id as string);

    try {
      await prisma.$executeRawUnsafe(`
        DELETE FROM zones WHERE id = $1 AND city_id = $2
      `, id, cityId);
      return res.json({ message: 'Zona eliminada' });
    } catch (error) {
      return res.status(500).json({ message: 'Error al eliminar la zona' });
    }
  }

  static async activeZones(req: Request, res: Response) {
    try {
      const activeZones: any[] = await prisma.$queryRawUnsafe(`
        SELECT id, name, extra_rate::text as extra_rate, color, is_active, city_id, ST_AsGeoJSON(polygon) as polygon, created_at, updated_at
        FROM zones
        WHERE is_active = true
      `);
      const formatted = activeZones.map((z: any) => ({
        ...z,
        extra_rate: Number(z.extra_rate),
        polygon: z.polygon ? JSON.parse(z.polygon) : null
      }));
      return res.json(formatted);
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
      console.error('Error en checkRate:', error);
      return res.status(500).json({ message: 'Error al calcular el recargo de la zona' });
    }
  }

  static async expandUrl(req: Request, res: Response) {
    const { url } = req.body;

    try {
      const response = await axios.get(url, {
        maxRedirects: 5,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });

      const expandedUrl = response.config.url || url;
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

import { Request, Response } from 'express';
import prisma from '../../../lib/prisma';

export class CityController {
  /** GET /cities — obtiene las ciudades */
  static async index(req: Request, res: Response) {
    try {
      const onlyActive = req.query.onlyActive === 'true' || !req.query.all; // default only active for login/dropdowns
      const cities = await prisma.$queryRaw<any[]>`
        SELECT 
          id, 
          name, 
          country, 
          currency, 
          timezone, 
          is_active, 
          center_lat, 
          center_lng, 
          ST_AsGeoJSON(coordinates) as coordinates, 
          created_at, 
          updated_at
        FROM cities
        WHERE (${onlyActive} = FALSE OR is_active = TRUE)
        ORDER BY name ASC
      `;
      
      // Parse coordinates from string GeoJSON to object
      const parsedCities = cities.map(city => ({
        ...city,
        coordinates: city.coordinates ? JSON.parse(city.coordinates) : null
      }));
      
      return res.json(parsedCities);
    } catch (error) {
      console.error('Error en index:', error);
      return res.status(500).json({ message: 'Error al obtener ciudades' });
    }
  }

  /** GET /cities/:id */
  static async show(req: Request, res: Response) {
    const id = parseInt(req.params.id as string);
    try {
      const cities = await prisma.$queryRaw<any[]>`
        SELECT 
          id, 
          name, 
          country, 
          currency, 
          timezone, 
          is_active, 
          center_lat, 
          center_lng, 
          ST_AsGeoJSON(coordinates) as coordinates, 
          created_at, 
          updated_at
        FROM cities
        WHERE id = ${id}
      `;
      
      if (cities.length === 0) {
        return res.status(404).json({ message: 'Ciudad no encontrada' });
      }
      
      const city = cities[0];
      return res.json({
        ...city,
        coordinates: city.coordinates ? JSON.parse(city.coordinates) : null
      });
    } catch (error) {
      console.error('Error en show:', error);
      return res.status(500).json({ message: 'Error al obtener ciudad' });
    }
  }

  /** POST /cities — solo admin/super_admin */
  static async store(req: Request, res: Response) {
    const { name, country, currency, timezone, center_lat, center_lng, coordinates } = req.body;
    try {
      const exists = await prisma.city.findUnique({ where: { name } });
      if (exists) {
        return res.status(409).json({ message: 'Ya existe una ciudad con ese nombre' });
      }
      
      if (coordinates) {
        const geojsonStr = JSON.stringify(coordinates);
        await prisma.$executeRaw`
          INSERT INTO cities (name, country, currency, timezone, is_active, center_lat, center_lng, coordinates, created_at, updated_at)
          VALUES (${name}, ${country}, ${currency}, ${timezone}, TRUE, ${center_lat}, ${center_lng}, ST_GeomFromGeoJSON(${geojsonStr}), NOW(), NOW())
        `;
      } else {
        await prisma.$executeRaw`
          INSERT INTO cities (name, country, currency, timezone, is_active, center_lat, center_lng, coordinates, created_at, updated_at)
          VALUES (${name}, ${country}, ${currency}, ${timezone}, TRUE, ${center_lat}, ${center_lng}, NULL, NOW(), NOW())
        `;
      }
      
      const cities = await prisma.$queryRaw<any[]>`
        SELECT id, name, country, currency, timezone, is_active, center_lat, center_lng, ST_AsGeoJSON(coordinates) as coordinates, created_at, updated_at
        FROM cities
        WHERE name = ${name}
      `;
      
      const city = cities[0];
      return res.status(201).json({
        message: 'Ciudad creada',
        city: {
          ...city,
          coordinates: city.coordinates ? JSON.parse(city.coordinates) : null
        }
      });
    } catch (error) {
      console.error('Error en store:', error);
      return res.status(500).json({ message: 'Error al crear ciudad' });
    }
  }

  /** PUT /cities/:id — solo admin/super_admin */
  static async update(req: Request, res: Response) {
    const id = parseInt(req.params.id as string);
    const { name, country, currency, timezone, center_lat, center_lng, coordinates, is_active } = req.body;
    try {
      const cityExists = await prisma.city.findUnique({ where: { id } });
      if (!cityExists) {
        return res.status(404).json({ message: 'Ciudad no encontrada' });
      }
      
      if (coordinates) {
        const geojsonStr = JSON.stringify(coordinates);
        await prisma.$executeRaw`
          UPDATE cities
          SET 
            name = ${name ?? cityExists.name},
            country = ${country ?? cityExists.country},
            currency = ${currency ?? cityExists.currency},
            timezone = ${timezone ?? cityExists.timezone},
            is_active = ${is_active !== undefined ? is_active : cityExists.is_active},
            center_lat = ${center_lat ?? cityExists.center_lat},
            center_lng = ${center_lng ?? cityExists.center_lng},
            coordinates = ST_GeomFromGeoJSON(${geojsonStr}),
            updated_at = NOW()
          WHERE id = ${id}
        `;
      } else {
        await prisma.$executeRaw`
          UPDATE cities
          SET 
            name = ${name ?? cityExists.name},
            country = ${country ?? cityExists.country},
            currency = ${currency ?? cityExists.currency},
            timezone = ${timezone ?? cityExists.timezone},
            is_active = ${is_active !== undefined ? is_active : cityExists.is_active},
            center_lat = ${center_lat ?? cityExists.center_lat},
            center_lng = ${center_lng ?? cityExists.center_lng},
            updated_at = NOW()
          WHERE id = ${id}
        `;
      }
      
      const cities = await prisma.$queryRaw<any[]>`
        SELECT id, name, country, currency, timezone, is_active, center_lat, center_lng, ST_AsGeoJSON(coordinates) as coordinates, created_at, updated_at
        FROM cities
        WHERE id = ${id}
      `;
      
      const city = cities[0];
      return res.json({
        message: 'Ciudad actualizada',
        city: {
          ...city,
          coordinates: city.coordinates ? JSON.parse(city.coordinates) : null
        }
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

import { Request, Response } from 'express';
import prisma from '../../../lib/prisma';

export class CityController {
  /** GET /cities — obtiene las ciudades */
  static async index(req: Request, res: Response) {
    try {
      const onlyActive = req.query.onlyActive === 'true' || !req.query.all; // default only active for login/dropdowns
      const cities: any[] = await prisma.$queryRawUnsafe(`
        SELECT id, name, country, currency, is_active, base_delivery_fee::text as base_delivery_fee, center_lat_lng, ST_AsGeoJSON(coverage_area) as coverage_area, created_at, updated_at
        FROM cities
        WHERE ($1 = false OR is_active = true)
        ORDER BY name ASC
      `, onlyActive);

      const formatted = cities.map((c: any) => ({
        ...c,
        base_delivery_fee: Number(c.base_delivery_fee),
        coverage_area: c.coverage_area ? JSON.parse(c.coverage_area) : null,
      }));

      return res.json(formatted);
    } catch (error) {
      console.error('Error en index:', error);
      return res.status(500).json({ message: 'Error al obtener ciudades' });
    }
  }

  /** GET /cities/:id */
  static async show(req: Request, res: Response) {
    const id = parseInt(req.params.id as string);
    try {
      const cities: any[] = await prisma.$queryRawUnsafe(`
        SELECT id, name, country, currency, is_active, base_delivery_fee::text as base_delivery_fee, center_lat_lng, ST_AsGeoJSON(coverage_area) as coverage_area, created_at, updated_at
        FROM cities
        WHERE id = $1
      `, id);

      if (cities.length === 0) {
        return res.status(404).json({ message: 'Ciudad no encontrada' });
      }

      const c = cities[0];
      return res.json({
        ...c,
        base_delivery_fee: Number(c.base_delivery_fee),
        coverage_area: c.coverage_area ? JSON.parse(c.coverage_area) : null,
      });
    } catch (error) {
      console.error('Error en show:', error);
      return res.status(500).json({ message: 'Error al obtener ciudad' });
    }
  }

  /** POST /cities — solo admin/super_admin */
  static async store(req: Request, res: Response) {
    const { name, country, currency, base_delivery_fee, center_lat_lng, coverage_area } = req.body;
    try {
      const exists = await prisma.city.findUnique({ where: { name } });
      if (exists) {
        return res.status(409).json({ message: 'Ya existe una ciudad con ese nombre' });
      }

      let geojson = coverage_area;
      if (typeof geojson === 'string') {
        geojson = JSON.parse(geojson);
      }
      // Ensure MultiPolygon structure for DB constraint
      if (geojson && geojson.type === 'Polygon') {
        geojson = {
          type: 'MultiPolygon',
          coordinates: [geojson.coordinates]
        };
      }
      const geojsonStr = JSON.stringify(geojson);

      await prisma.$executeRawUnsafe(`
        INSERT INTO cities (name, country, currency, is_active, base_delivery_fee, center_lat_lng, coverage_area, created_at, updated_at)
        VALUES ($1, $2, $3, true, $4, $5, ST_GeomFromGeoJSON($6), NOW(), NOW())
      `, name, country, currency, Number(base_delivery_fee), center_lat_lng, geojsonStr);

      const created: any[] = await prisma.$queryRawUnsafe(`
        SELECT id, name, country, currency, is_active, base_delivery_fee::text as base_delivery_fee, center_lat_lng, ST_AsGeoJSON(coverage_area) as coverage_area, created_at, updated_at
        FROM cities
        WHERE name = $1
        LIMIT 1
      `, name);

      return res.status(201).json({
        message: 'Ciudad creada',
        city: {
          ...created[0],
          base_delivery_fee: Number(created[0].base_delivery_fee),
          coverage_area: created[0].coverage_area ? JSON.parse(created[0].coverage_area) : null,
        },
      });
    } catch (error) {
      console.error('Error en store:', error);
      return res.status(500).json({ message: 'Error al crear ciudad' });
    }
  }

  /** PUT /cities/:id — solo admin/super_admin */
  static async update(req: Request, res: Response) {
    const id = parseInt(req.params.id as string);
    const { name, country, currency, base_delivery_fee, center_lat_lng, coverage_area, is_active } = req.body;
    try {
      const cityExists = await prisma.city.findUnique({ where: { id } });
      if (!cityExists) {
        return res.status(404).json({ message: 'Ciudad no encontrada' });
      }

      // Fetch current values as fallback
      const currentCities: any[] = await prisma.$queryRawUnsafe(`
        SELECT id, name, country, currency, is_active, base_delivery_fee::text as base_delivery_fee, center_lat_lng, ST_AsGeoJSON(coverage_area) as coverage_area
        FROM cities
        WHERE id = $1
      `, id);
      const current = currentCities[0];

      const newName = name !== undefined ? name : current.name;
      const newCountry = country !== undefined ? country : current.country;
      const newCurrency = currency !== undefined ? currency : current.currency;
      const newFee = base_delivery_fee !== undefined ? Number(base_delivery_fee) : Number(current.base_delivery_fee);
      const newCenter = center_lat_lng !== undefined ? center_lat_lng : current.center_lat_lng;
      const newActive = is_active !== undefined ? is_active : current.is_active;

      let geojsonStr: string;
      if (coverage_area !== undefined && coverage_area !== null) {
        let geojson = coverage_area;
        if (typeof geojson === 'string') {
          geojson = JSON.parse(geojson);
        }
        if (geojson && geojson.type === 'Polygon') {
          geojson = {
            type: 'MultiPolygon',
            coordinates: [geojson.coordinates]
          };
        }
        geojsonStr = JSON.stringify(geojson);
      } else {
        geojsonStr = current.coverage_area;
      }

      await prisma.$executeRawUnsafe(`
        UPDATE cities
        SET name = $1, country = $2, currency = $3, base_delivery_fee = $4, center_lat_lng = $5, is_active = $6, coverage_area = ST_GeomFromGeoJSON($7), updated_at = NOW()
        WHERE id = $8
      `, newName, newCountry, newCurrency, newFee, newCenter, newActive, geojsonStr, id);

      const updated: any[] = await prisma.$queryRawUnsafe(`
        SELECT id, name, country, currency, is_active, base_delivery_fee::text as base_delivery_fee, center_lat_lng, ST_AsGeoJSON(coverage_area) as coverage_area, created_at, updated_at
        FROM cities
        WHERE id = $1
        LIMIT 1
      `, id);

      return res.json({
        message: 'Ciudad actualizada',
        city: {
          ...updated[0],
          base_delivery_fee: Number(updated[0].base_delivery_fee),
          coverage_area: updated[0].coverage_area ? JSON.parse(updated[0].coverage_area) : null,
        },
      });
    } catch (error) {
      console.error('Error en update:', error);
      return res.status(500).json({ message: 'Error al actualizar ciudad' });
    }
  }

  /** DELETE /cities/:id — solo admin/super_admin (hard delete) */
  static async destroy(req: Request, res: Response) {
    const id = parseInt(req.params.id as string);
    try {
      await prisma.city.delete({ where: { id } });
      return res.json({ message: 'Ciudad eliminada permanentemente' });
    } catch (error) {
      console.error('Error en destroy:', error);
      return res.status(500).json({ message: 'Error al eliminar ciudad físicamente' });
    }
  }
}

import prisma from '../../../lib/prisma';

export class GeoService {
  /**
   * Busca en la BD y retorna el recargo total acumulado de todas las zonas que contienen el punto.
   * Utiliza la potencia nativa de PostGIS spatial index con ST_Contains.
   */
  static async calculateExtraRate(lat: number, lng: number): Promise<number> {
    try {
      const results: any[] = await prisma.$queryRawUnsafe(`
        SELECT COALESCE(SUM(extra_rate), 0)::text as total_extra
        FROM zones
        WHERE is_active = true
          AND ST_Contains(polygon, ST_SetSRID(ST_MakePoint($1, $2), 4326))
      `, Number(lng), Number(lat));

      return Number(results[0]?.total_extra || 0);
    } catch (error) {
      console.error('Error en GeoService.calculateExtraRate:', error);
      return 0;
    }
  }
}

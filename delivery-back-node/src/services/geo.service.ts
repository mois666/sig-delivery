import prisma from '../lib/prisma';

export class GeoService {
  /**
   * Verifica si un punto está dentro de un polígono (Algoritmo Ray-casting)
   * @param lat Latitud del punto
   * @param lng Longitud del punto
   * @param polygon Array de puntos [[lat, lng], [lat, lng]...]
   */
  static isPointInPolygon(lat: number, lng: number, polygon: any[]): boolean {
    if (!Array.isArray(polygon) || polygon.length < 3) {
      return false;
    }

    let inside = false;
    const count = polygon.length;
    let j = count - 1;

    for (let i = 0; i < count; i++) {
      const xi = polygon[i][0];
      const yi = polygon[i][1];
      const xj = polygon[j][0];
      const yj = polygon[j][1];

      const intersect = ((yi > lng) !== (yj > lng)) &&
        (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);

      if (intersect) {
        inside = !inside;
      }
      j = i;
    }

    return inside;
  }

  /**
   * Busca en la BD y retorna el recargo total acumulado de todas las zonas que contienen el punto.
   */
  static async calculateExtraRate(lat: number, lng: number): Promise<number> {
    const zones = await prisma.zone.findMany({
      where: { is_active: true },
    });

    let totalExtra = 0;

    for (const zone of zones) {
      // Prisma Json field needs to be cast or checked
      const coordinates = zone.coordinates as any[];
      if (this.isPointInPolygon(lat, lng, coordinates)) {
        totalExtra += Number(zone.extra_rate);
      }
    }

    return totalExtra;
  }
}

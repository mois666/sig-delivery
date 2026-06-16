import { getOSRMRoute } from '../lib/osrm';

// ─── Interfaces ────────────────────────────────────────────────────────────────

export interface RouteResult {
  /** Distancia en metros (fuente: OSRM) */
  distanceMeters: number;
  /** Distancia en kilómetros (fuente: OSRM) */
  distanceKm: number;
  /** Duración estimada del recorrido en segundos (fuente: OSRM) */
  durationSeconds: number;
  /** Geometría de la ruta real (GeoJSON LineString, SRID 4326) */
  geometry: GeoJSON.LineString;
  /** WKT de la ruta, listo para insertar en PostGIS */
  geometryWKT: string;
}

// ─── Servicio ─────────────────────────────────────────────────────────────────

/**
 * RoutingService
 *
 * Responsabilidades:
 *  - Consultar OSRM para obtener la ruta real sobre la red vial.
 *  - Retornar distancia real (metros y km), duración y geometría GeoJSON.
 *  - Convertir la geometría a WKT para uso directo con PostGIS.
 *
 * La distancia oficial del sistema SIEMPRE debe provenir de este servicio.
 * No se utiliza Haversine ni distancia en línea recta.
 */
export class RoutingService {
  /**
   * Calcula la ruta real entre origen y destino usando OSRM.
   *
   * @param originLat      Latitud del punto de origen
   * @param originLng      Longitud del punto de origen
   * @param destinationLat Latitud del punto de destino
   * @param destinationLng Longitud del punto de destino
   * @returns RouteResult con distancia real, duración y geometría
   * @throws Error si OSRM no puede encontrar una ruta válida
   */
  static async calculateRoute(
    originLat:      number,
    originLng:      number,
    destinationLat: number,
    destinationLng: number,
  ): Promise<RouteResult> {
    const osrmRoute = await getOSRMRoute(
      originLat,
      originLng,
      destinationLat,
      destinationLng,
    );

    const distanceMeters = osrmRoute.distance_m;
    const distanceKm     = distanceMeters / 1000;
    const durationSeconds = osrmRoute.duration_s;
    const geometry        = osrmRoute.geometry;

    // Convertir GeoJSON LineString → WKT para PostGIS
    const coords = geometry.coordinates
      .map((c: number[]) => `${c[0]} ${c[1]}`)
      .join(', ');
    const geometryWKT = `LINESTRING(${coords})`;

    return {
      distanceMeters,
      distanceKm,
      durationSeconds,
      geometry,
      geometryWKT,
    };
  }
}

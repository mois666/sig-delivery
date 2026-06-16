import prisma from '../../../lib/prisma';
import { RoutingService } from '../../../services/routing.service';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface ZoneCrossing {
  zone_id:     number;
  zone_name:   string;
  distance_km: number;
  extra_rate:  number;
  cost:        number;
}

export interface PricingDetails {
  base_fee:            number;
  /** Distancia real por calles (fuente: OSRM). Equivale a route_distance_km. */
  route_distance_km:   number;
  normal_distance_km:  number;
  normal_cost:         number;
  zones:               ZoneCrossing[];
  total_delivery_fee:  number;
  duration_seconds:    number;
  route_geometry:      GeoJSON.LineString | null;
  /** WKT de la ruta, listo para persistir en PostGIS */
  route_geometry_wkt:  string | null;
}

// ─── Error de cobertura ───────────────────────────────────────────────────────

export class CoverageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CoverageError';
  }
}

// ─── Servicio Principal ───────────────────────────────────────────────────────

/**
 * PricingService
 *
 * Calcula la tarifa de delivery usando:
 *  1. PostGIS  → valida que origen y destino están dentro del área de cobertura
 *  2. OSRM     → ruta real (LineString) + distancia real + duración
 *  3. PostGIS  → intersecciones de la ruta con zonas de difícil acceso
 *  4. Fórmula oficial:
 *       normalCost = (route_km - Σ zone_km) * base_fee
 *       zoneCost   = Σ [ (zone_km * base_fee) / extra_rate ]
 *       total_fee  = normalCost + zoneCost
 *
 * Un extra_rate MENOR significa zona MÁS difícil → costo MAYOR.
 * La distancia oficial del sistema proviene ÚNICAMENTE de OSRM (RoutingService).
 */
export class PricingService {
  static async calculateDeliveryFee(
    pickupLat:   number,
    pickupLng:   number,
    deliveryLat: number,
    deliveryLng: number,
    cityId:      number,
  ): Promise<PricingDetails> {

    // ── 1. Obtener ciudad y tarifa base ──────────────────────────────────────
    const city = await prisma.city.findUnique({ where: { id: cityId } });
    if (!city) throw new Error(`Ciudad ${cityId} no encontrada`);

    const base_fee = Number(city.base_delivery_fee);

    // ── 2. Validar cobertura (origen y destino ∈ coverage_area) ─────────────
    const coverageCheck = await prisma.$queryRaw<Array<{
      pickup_covered:   boolean;
      delivery_covered: boolean;
    }>>`
      SELECT
        ST_Within(
          ST_SetSRID(ST_MakePoint(${pickupLng}, ${pickupLat}), 4326),
          coverage_area
        ) AS pickup_covered,
        ST_Within(
          ST_SetSRID(ST_MakePoint(${deliveryLng}, ${deliveryLat}), 4326),
          coverage_area
        ) AS delivery_covered
      FROM cities
      WHERE id = ${cityId}
      LIMIT 1
    `;

    if (coverageCheck.length > 0) {
      const { pickup_covered, delivery_covered } = coverageCheck[0];
      if (!pickup_covered) {
        throw new CoverageError(
          'El punto de recogida está fuera del área de cobertura de la ciudad.',
        );
      }
      if (!delivery_covered) {
        throw new CoverageError(
          'El punto de entrega está fuera del área de cobertura de la ciudad.',
        );
      }
    }

    // ── 3. Obtener ruta real desde OSRM (vía RoutingService) ─────────────────
    let route_distance_km = 0;
    let duration_seconds  = 0;
    let routeGeoJSON: GeoJSON.LineString | null = null;
    let routeWKT: string | null = null;

    try {
      const route = await RoutingService.calculateRoute(
        pickupLat,
        pickupLng,
        deliveryLat,
        deliveryLng,
      );

      route_distance_km = route.distanceKm;
      duration_seconds  = route.durationSeconds;
      routeGeoJSON      = route.geometry;
      routeWKT          = route.geometryWKT;

    } catch (err) {
      console.error('[PricingService] OSRM falló, usando distancia geodésica PostGIS:', err);

      // Fallback: distancia geodésica punto a punto con PostGIS
      const distRes = await prisma.$queryRaw<Array<{ dist_km: number }>>`
        SELECT ST_Distance(
          ST_SetSRID(ST_MakePoint(${pickupLng}, ${pickupLat}), 4326)::geography,
          ST_SetSRID(ST_MakePoint(${deliveryLng}, ${deliveryLat}), 4326)::geography
        ) / 1000.0 AS dist_km
      `;
      route_distance_km = Number(distRes[0]?.dist_km ?? 0);
      duration_seconds  = Math.round((route_distance_km / 30) * 3600); // estimación 30 km/h
      routeWKT = `LINESTRING(${pickupLng} ${pickupLat}, ${deliveryLng} ${deliveryLat})`;
    }

    // ── 4. Detectar intersecciones con zonas (PostGIS) ───────────────────────
    let zoneCrossings: Array<{
      id:         number;
      name:       string;
      extra_rate: string;
      km_inside:  number;
    }> = [];

    if (route_distance_km > 0 && routeWKT) {
      try {
        zoneCrossings = await prisma.$queryRaw<typeof zoneCrossings>`
          SELECT
            z.id,
            z.name,
            z.extra_rate::text AS extra_rate,
            COALESCE(
              ST_Length(
                ST_Intersection(
                  z.polygon,
                  ST_SetSRID(ST_GeomFromText(${routeWKT}), 4326)
                )::geography
              ) / 1000.0,
              0
            ) AS km_inside
          FROM zones z
          WHERE z.city_id    = ${cityId}
            AND z.is_active  = true
            AND z.extra_rate > 0
            AND ST_Intersects(
              z.polygon,
              ST_SetSRID(ST_GeomFromText(${routeWKT}), 4326)
            )
        `;
      } catch (err) {
        console.error('[PricingService] Error en consulta PostGIS de zonas:', err);
      }
    }

    // ── 5. Calcular costos ───────────────────────────────────────────────────
    const validZones = zoneCrossings.filter(z => z.km_inside > 0.001 && Number(z.extra_rate) > 0);

    // Cap: la suma de km en zonas no puede superar el total
    let sumZoneKm = validZones.reduce((sum, z) => sum + z.km_inside, 0);
    sumZoneKm = Math.min(sumZoneKm, route_distance_km);

    const normal_distance_km = Math.max(0, route_distance_km - sumZoneKm);
    const normal_cost        = round2(normal_distance_km * base_fee);

    const zones: ZoneCrossing[] = validZones.map(z => {
      const extra_rate  = Number(z.extra_rate);
      const distance_km = round2(z.km_inside);
      const cost        = round2((distance_km * base_fee) / extra_rate);
      return { zone_id: z.id, zone_name: z.name, distance_km, extra_rate, cost };
    });

    const zone_total_cost = zones.reduce((sum, z) => sum + z.cost, 0);
    let total_delivery_fee = round2(normal_cost + zone_total_cost);

    // Garantía mínima: al menos la tarifa base de la ciudad
    if (total_delivery_fee < base_fee) {
      total_delivery_fee = base_fee;
    }

    return {
      base_fee,
      route_distance_km:  round2(route_distance_km),
      normal_distance_km: round2(normal_distance_km),
      normal_cost,
      zones,
      total_delivery_fee,
      duration_seconds,
      route_geometry:     routeGeoJSON,
      route_geometry_wkt: routeWKT,
    };
  }
}

// ─── Utilidades ──────────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

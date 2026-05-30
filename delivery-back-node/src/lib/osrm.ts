import axios from 'axios';

export interface OSRMRoute {
  distance_m: number;      // metros
  duration_s: number;      // segundos
  geometry: GeoJSON.LineString; // ruta real GeoJSON
}

/**
 * Consulta OSRM para obtener la ruta real entre dos puntos.
 * Retorna distancia (m), duración (s) y geometría LineString GeoJSON.
 *
 * OSRM espera coordenadas en orden [lng, lat].
 */
export async function getOSRMRoute(
  pickupLat: number,
  pickupLng: number,
  deliveryLat: number,
  deliveryLng: number
): Promise<OSRMRoute> {
  const baseUrl = process.env.OSRM_URL || 'http://router.project-osrm.org';

  const url = `${baseUrl}/route/v1/driving/${pickupLng},${pickupLat};${deliveryLng},${deliveryLat}`;

  const { data } = await axios.get(url, {
    params: {
      overview: 'full',
      geometries: 'geojson',
      steps: false,
    },
    timeout: 10000, // 10s timeout
  });

  if (!data || data.code !== 'Ok' || !data.routes?.length) {
    throw new Error(`OSRM error: ${data?.code || 'No route found'}`);
  }

  const route = data.routes[0];

  return {
    distance_m: route.distance,
    duration_s: route.duration,
    geometry:   route.geometry as GeoJSON.LineString,
  };
}

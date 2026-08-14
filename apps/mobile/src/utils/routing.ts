// utils/routing.ts
// Real road routing via OSRM's free public router — no API key required,
// same "no paid service" precedent as geocoding.ts's use of Nominatim.
// Usage policy: fine for low-volume interactive use (one request per leg,
// throttled by the caller) — not for bulk routing.

export interface RoutePoint { lat: number; lng: number; }

export interface RouteResult {
  /** Real road geometry, in order from `from` to `to`. */
  points: RoutePoint[];
  distanceKm: number;
  durationMin: number;
}

/**
 * Fetch a real driving route between two points. Returns null on any
 * failure (network, no route found) — callers must handle this honestly
 * (e.g. fall back to a visually-distinct straight line), never silently
 * present a straight line as if it were a real route.
 */
export async function fetchRoute(from: RoutePoint, to: RoutePoint): Promise<RouteResult | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const route = data?.routes?.[0];
    const coords: [number, number][] = route?.geometry?.coordinates;
    if (!coords || coords.length < 2) return null;
    return {
      points: coords.map(([lng, lat]) => ({ lat, lng })),
      distanceKm: route.distance / 1000,
      durationMin: route.duration / 60,
    };
  } catch {
    return null;
  }
}

/** Straight-line distance in km — used only to decide when a route is stale enough to refetch. */
export function haversineKm(a: RoutePoint, b: RoutePoint): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

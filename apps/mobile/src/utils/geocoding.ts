// utils/geocoding.ts
// Free geocoding via OpenStreetMap Nominatim — no API key required.
// Usage policy: max 1 request/second; always include a User-Agent header.

export interface GeocodeSuggestion {
  displayName: string;
  /** Shortened version of displayName (first 3 parts) — suitable for UI labels */
  shortName: string;
  lat: number;
  lng: number;
}

function shorten(displayName: string): string {
  return displayName
    .split(',')
    .map(p => p.trim())
    .slice(0, 3)
    .join(', ');
}

/**
 * Forward geocode: convert a text query into a list of coordinate suggestions.
 * Returns [] if the query is too short or the request fails.
 */
export async function searchAddress(query: string): Promise<GeocodeSuggestion[]> {
  if (!query || query.trim().length < 3) return [];
  try {
    const params = new URLSearchParams({
      format: 'json',
      q: query.trim(),
      limit: '5',
      'accept-language': 'en',
      addressdetails: '1',
    });
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?${params}`,
      { headers: { 'User-Agent': 'Guranda-App/1.0 (ride-sharing)' } }
    );
    if (!res.ok) return [];
    const data: any[] = await res.json();
    return data.map(item => ({
      displayName: item.display_name,
      shortName: shorten(item.display_name),
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
    }));
  } catch {
    return [];
  }
}

/**
 * Reverse geocode: convert coordinates into a human-readable address string.
 * Falls back to "lat, lng" if the request fails.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=en`,
      { headers: { 'User-Agent': 'Guranda-App/1.0 (ride-sharing)' } }
    );
    if (!res.ok) throw new Error('HTTP error');
    const data = await res.json();
    const a = data.address || {};
    const parts = [
      a.road || a.pedestrian || a.footway,
      a.suburb || a.neighbourhood || a.quarter,
      a.city || a.town || a.village || a.municipality,
    ].filter(Boolean);
    return parts.length > 0
      ? parts.join(', ')
      : shorten(data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

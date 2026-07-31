// Free geocoding via OpenStreetMap Nominatim — no API key required.
// Mirrors apps/mobile/src/utils/geocoding.ts; used server-side where a caller
// only has an address string (e.g. the AI companion's request_ride tool)
// rather than coordinates already picked on a map.
// Usage policy: max 1 request/second; always include a User-Agent header.

export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
}

export async function geocodeAddress(
  query: string,
): Promise<GeocodeResult | null> {
  if (!query || query.trim().length < 3) return null;
  try {
    const params = new URLSearchParams({
      format: 'json',
      q: query.trim(),
      limit: '1',
      'accept-language': 'en',
    });
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?${params}`,
      {
        headers: { 'User-Agent': 'Guranda-App/1.0 (ai-ride-request)' },
      },
    );
    if (!res.ok) return null;
    const data: any[] = await res.json();
    if (!data.length) return null;
    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      displayName: data[0].display_name,
    };
  } catch {
    return null;
  }
}

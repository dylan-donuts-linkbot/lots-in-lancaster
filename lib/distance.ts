/**
 * Distance calculations using Google Maps Distance Matrix API
 *
 * Calculates driving distances from lots to key locations.
 *
 * Requires: GOOGLE_MAPS_API_KEY environment variable
 * API docs: https://developers.google.com/maps/documentation/distance-matrix/overview
 *
 * Setup:
 *   1. Enable "Distance Matrix API" in Google Cloud Console
 *   2. Set GOOGLE_MAPS_API_KEY in .env.local
 *   3. Ensure the API key has Distance Matrix API enabled
 */

// Lancaster City center coordinates
const LANCASTER_CITY = { lat: 40.0379, lng: -76.3055 }

interface DistanceResult {
  distanceMiles: number | null
  durationMinutes: number | null
}

/**
 * Calculate driving distance from a point to Lancaster City.
 *
 * TODO: Requires GOOGLE_MAPS_API_KEY configuration
 * Returns null values until API key is configured.
 */
export async function getDistanceToLancasterCity(
  lat: number,
  lng: number
): Promise<DistanceResult> {
  return getDistance(lat, lng, LANCASTER_CITY.lat, LANCASTER_CITY.lng)
}

/**
 * Calculate driving distance between two points using Google Distance Matrix API.
 *
 * Returns null values if:
 * - No API key configured
 * - API call fails
 * - No route found
 */
export async function getDistance(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): Promise<DistanceResult> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    // Stub: return null until API key is configured
    return { distanceMiles: null, durationMinutes: null }
  }

  try {
    const params = new URLSearchParams({
      origins: `${originLat},${originLng}`,
      destinations: `${destLat},${destLng}`,
      units: 'imperial',
      key: apiKey,
    })

    const res = await fetch(
      `https://maps.googleapis.com/maps/api/distancematrix/json?${params.toString()}`
    )

    if (!res.ok) return { distanceMiles: null, durationMinutes: null }

    const data = await res.json() as {
      rows?: Array<{
        elements?: Array<{
          status?: string
          distance?: { value: number } // meters
          duration?: { value: number } // seconds
        }>
      }>
    }

    const element = data.rows?.[0]?.elements?.[0]
    if (!element || element.status !== 'OK') {
      return { distanceMiles: null, durationMinutes: null }
    }

    return {
      distanceMiles: element.distance ? +(element.distance.value / 1609.344).toFixed(1) : null,
      durationMinutes: element.duration ? Math.round(element.duration.value / 60) : null,
    }
  } catch {
    return { distanceMiles: null, durationMinutes: null }
  }
}

/**
 * Calculate straight-line (haversine) distance in miles.
 * Free alternative that doesn't require an API key.
 */
export function getHaversineDistanceMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3958.8 // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * Get straight-line distance to Lancaster City center (no API key needed).
 */
export function getDistanceToLancasterCityApprox(lat: number, lng: number): number {
  return +getHaversineDistanceMiles(lat, lng, LANCASTER_CITY.lat, LANCASTER_CITY.lng).toFixed(1)
}

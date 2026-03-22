/**
 * Google Maps Static API — satellite image URL generator
 *
 * Generates a URL for a satellite view of a given lat/lng.
 * Does NOT download the image; just constructs the URL.
 *
 * Requires: GOOGLE_MAPS_API_KEY environment variable
 * API docs: https://developers.google.com/maps/documentation/maps-static/overview
 */

const DEFAULT_ZOOM = 18 // Close enough to see the lot
const DEFAULT_SIZE = '600x400'
const MAP_TYPE = 'satellite'

/**
 * Generate a Google Maps Static API satellite image URL.
 * Returns null if no API key is configured.
 */
export function getSatelliteImageUrl(
  lat: number,
  lng: number,
  options?: { zoom?: number; size?: string }
): string | null {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) return null

  const zoom = options?.zoom ?? DEFAULT_ZOOM
  const size = options?.size ?? DEFAULT_SIZE

  const params = new URLSearchParams({
    center: `${lat},${lng}`,
    zoom: String(zoom),
    size,
    maptype: MAP_TYPE,
    key: apiKey,
  })

  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`
}

/**
 * Generate a satellite image URL without requiring an API key.
 * Uses the unsigned URL format — useful for previews but may be rate-limited.
 * Falls back to a generic aerial view link.
 */
export function getSatellitePreviewUrl(lat: number, lng: number): string {
  // Google Earth web link as a free fallback
  return `https://earth.google.com/web/@${lat},${lng},0a,500d,35y,0h,0t,0r`
}

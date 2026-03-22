/**
 * Google Street View URL generator
 *
 * Computes Street View URLs on-the-fly from lat/lng coordinates.
 * No API key required — these are public Google Maps URLs.
 */

/**
 * Generate a Google Street View URL for a given lat/lng.
 * Opens the Street View panorama centered on the coordinates.
 */
export function getStreetViewUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`
}

/**
 * Generate a Google Street View Static API image URL (requires API key).
 * Returns null if no API key is configured.
 */
export function getStreetViewImageUrl(
  lat: number,
  lng: number,
  options?: { size?: string; heading?: number; pitch?: number }
): string | null {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) return null

  const size = options?.size ?? '600x400'
  const params = new URLSearchParams({
    location: `${lat},${lng}`,
    size,
    key: apiKey,
  })

  if (options?.heading != null) params.set('heading', String(options.heading))
  if (options?.pitch != null) params.set('pitch', String(options.pitch))

  return `https://maps.googleapis.com/maps/api/streetview?${params.toString()}`
}

import { supabaseServer } from '@/lib/supabase-server'

/**
 * Log a scrape run to the scrape_log table.
 * Non-fatal — silently catches errors.
 */
export async function logScrape(
  source: string,
  recordsFound: number,
  recordsAdded: number,
  recordsUpdated: number,
  errors: string[]
): Promise<void> {
  try {
    await supabaseServer.from('scrape_log').insert({
      source,
      records_found: recordsFound,
      records_added: recordsAdded,
      records_updated: recordsUpdated,
      errors: errors.length > 0 ? errors.join('; ') : null,
      scraped_at: new Date().toISOString(),
    })
  } catch {
    // log failure is non-fatal
  }
}

/**
 * Build a Google Maps URL from coordinates or address.
 * Returns null if no usable data.
 */
export function buildGoogleMapsUrl(
  lat: number | null,
  lng: number | null,
  address: string | null
): string | null {
  if (lat && lng) return `https://maps.google.com/?q=${lat},${lng}`
  if (address)
    return `https://maps.google.com/?q=${encodeURIComponent(address + ' Lancaster County PA')}`
  return null
}

/**
 * Validate CRON_SECRET from Authorization header.
 * Returns true if valid, false if missing/invalid.
 */
export function validateCronSecret(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true // No secret configured = allow (dev mode)

  const authHeader = request.headers.get('authorization')
  if (!authHeader) return false

  const token = authHeader.replace(/^Bearer\s+/i, '')
  return token === secret
}

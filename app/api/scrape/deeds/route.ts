import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

// Lancaster County Recorder of Deeds scraper
// Primary: https://landrecords.lancastercountypa.gov
// Fallback: GIS parcel data cross-referenced with recent ownership changes
//
// Note: The land records portal typically requires authentication or a paid
// subscription. This scraper attempts public endpoints and falls back to
// checking recently-changed GIS records.

const DEED_PORTAL = 'https://landrecords.lancastercountypa.gov'

// Some recorder portals expose a public search API
const DEED_SEARCH_URLS = [
  'https://landrecords.lancastercountypa.gov/api/search',
  'https://landrecords.lancastercountypa.gov/search',
  'https://recorder.lancastercountypa.gov/api/deeds',
  'https://recorder.lancastercountypa.gov/deeds/search',
]

// Fallback: use GIS data to find recent ownership changes
// We query our existing lots table for GIS records and look for
// any that have changed since last run.
const GIS_RECENT_ENDPOINT =
  'https://services.lancastercountypa.gov/lancastercountypa/rest/services/Parcels/MapServer/0/query'

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  Connection: 'keep-alive',
}

interface DeedRecord {
  grantee?: string
  grantor?: string
  consideration?: number | string
  recordingDate?: string
  deedDate?: string
  parcelId?: string
  address?: string
  township?: string
  city?: string
  zip?: string
  bookPage?: string
  instrumentType?: string
}

function parseConsideration(val: unknown): number | null {
  if (val == null) return null
  const s = String(val).replace(/[$,\s]/g, '')
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

function buildGoogleMapsUrl(
  lat: number | null,
  lng: number | null,
  address: string | null
): string | null {
  if (lat && lng) return `https://maps.google.com/?q=${lat},${lng}`
  if (address)
    return `https://maps.google.com/?q=${encodeURIComponent(address + ' Lancaster County PA')}`
  return null
}

function normalizeDeed(d: DeedRecord) {
  const soldPrice = parseConsideration(d.consideration)
  // Skip nominal transfers (e.g. $1 family transfers)
  if (soldPrice !== null && soldPrice < 100) return null

  const recordingDate = d.recordingDate ?? d.deedDate ?? null

  return {
    owner_name: d.grantee ?? null,
    address: d.address ?? null,
    city: d.city ?? null,
    township: d.township ?? d.city ?? null,
    zip: d.zip ?? null,
    parcel_id: d.parcelId ?? null,
    status: 'sold' as const,
    sold_price: soldPrice,
    sold_date: recordingDate,
    source: 'deeds' as const,
    google_maps_url: buildGoogleMapsUrl(null, null, d.address ?? null),
    last_run_at: new Date().toISOString(),
    raw_data: d,
  }
}

async function tryDeedPortalDirectly(): Promise<{
  records: DeedRecord[]
  errors: string[]
}> {
  const errors: string[] = []
  const records: DeedRecord[] = []

  // First, check if portal is publicly accessible
  try {
    const res = await fetch(DEED_PORTAL, {
      headers: BROWSER_HEADERS,
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) {
      errors.push(`Deed portal returned HTTP ${res.status}`)
      return { records, errors }
    }
    const html = await res.text()

    // Check for public search form / API hints in the page
    if (html.includes('login') || html.includes('sign in') || html.includes('authenticate')) {
      errors.push('Deed portal requires authentication — cannot scrape without credentials')
      return { records, errors }
    }

    // Try to find embedded JSON data
    const nextMatch = html.match(
      /<script[^>]+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/
    )
    if (nextMatch?.[1]) {
      try {
        const data = JSON.parse(nextMatch[1])
        const found = findDeedRecords(data)
        if (found.length > 0) records.push(...found)
      } catch {
        // continue
      }
    }
  } catch (e) {
    errors.push(`Deed portal: ${e instanceof Error ? e.message : String(e)}`)
  }

  // Try known API endpoints
  for (const url of DEED_SEARCH_URLS) {
    try {
      const params = new URLSearchParams({
        county: 'Lancaster',
        state: 'PA',
        type: 'deed',
        dateFrom: getDateDaysAgo(90),
        limit: '100',
      })
      const res = await fetch(`${url}?${params}`, {
        headers: { ...BROWSER_HEADERS, Accept: 'application/json' },
        signal: AbortSignal.timeout(10000),
      })
      if (res.ok) {
        const json = await res.json()
        const found =
          json?.deeds ?? json?.records ?? json?.results ?? json?.data ?? []
        if (Array.isArray(found) && found.length > 0) {
          records.push(...(found as DeedRecord[]))
          break
        }
      }
    } catch {
      // try next
    }
  }

  return { records, errors }
}

function getDateDaysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().split('T')[0]
}

function findDeedRecords(obj: unknown, depth = 0): DeedRecord[] {
  if (depth > 8 || obj === null || typeof obj !== 'object') return []
  if (Array.isArray(obj)) {
    if (
      obj.length > 0 &&
      typeof obj[0] === 'object' &&
      obj[0] !== null &&
      ('grantee' in (obj[0] as object) || 'grantor' in (obj[0] as object))
    ) {
      return obj as DeedRecord[]
    }
    for (const item of obj) {
      const found = findDeedRecords(item, depth + 1)
      if (found.length > 0) return found
    }
  } else {
    for (const val of Object.values(obj as Record<string, unknown>)) {
      const found = findDeedRecords(val, depth + 1)
      if (found.length > 0) return found
    }
  }
  return []
}

// Fallback: Get recent GIS data and cross-reference for ownership changes
// This queries parcels that have a recent deed date field
async function getRecentGISOwnershipChanges(): Promise<{
  records: DeedRecord[]
  errors: string[]
}> {
  const errors: string[] = []
  const records: DeedRecord[] = []

  const cutoffDate = getDateDaysAgo(90)

  // Try various date field names that GIS systems use for deed/transfer dates
  const whereClauses = [
    `DEED_DATE >= DATE '${cutoffDate}' AND ACRES >= 1`,
    `TRANSFER_DATE >= DATE '${cutoffDate}' AND ACRES >= 1`,
    `LAST_SALE_DATE >= DATE '${cutoffDate}' AND ACRES >= 1`,
    `SALE_DATE >= DATE '${cutoffDate}' AND ACRES >= 1`,
  ]

  const endpoints = [
    'https://services.lancastercountypa.gov/lancastercountypa/rest/services/Parcels/MapServer/0/query',
    'https://gis.lancastercountypa.gov/arcgis/rest/services/Parcels/MapServer/0/query',
  ]

  for (const endpoint of endpoints) {
    for (const where of whereClauses) {
      try {
        const params = new URLSearchParams({
          where,
          outFields: '*',
          f: 'json',
          resultRecordCount: '500',
        })
        const res = await fetch(`${endpoint}?${params}`, {
          headers: BROWSER_HEADERS,
          signal: AbortSignal.timeout(15000),
        })
        if (!res.ok) continue
        const json = await res.json()
        if (json.error) continue
        const features = json.features ?? []
        if (features.length === 0) continue

        for (const f of features) {
          const a = f.attributes ?? {}
          const deed: DeedRecord = {
            grantee:
              a.OWNER ?? a.OWNER_NAME ?? a.OWNERNAME ?? a.GRANTEE ?? null,
            grantor:
              a.PREV_OWNER ?? a.PREVIOUS_OWNER ?? a.GRANTOR ?? null,
            consideration:
              a.SALE_PRICE ??
              a.LAST_SALE_PRICE ??
              a.CONSIDERATION ??
              a.DEED_PRICE ??
              null,
            recordingDate:
              a.DEED_DATE ??
              a.TRANSFER_DATE ??
              a.LAST_SALE_DATE ??
              a.SALE_DATE ??
              null,
            parcelId:
              a.PARCEL_ID ??
              a.PARCELID ??
              a.PIN ??
              a.APN ??
              null,
            address:
              a.SITE_ADDRESS ?? a.SITEADDRESS ?? a.ADDR ?? a.ADDRESS ?? null,
            township:
              a.MUNI_NAME ?? a.MUNICIPALITY ?? a.TOWNSHIP ?? a.CITY ?? null,
            city: a.SITUS_CITY ?? a.SITE_CITY ?? a.CITY ?? null,
            zip: a.SITUS_ZIP ?? a.ZIP ?? a.ZIP_CODE ?? null,
          }
          records.push(deed)
        }
        return { records, errors }
      } catch {
        // try next
      }
    }
  }

  if (records.length === 0) {
    errors.push(
      'GIS deed fallback: No accessible endpoint returned recent ownership data. ' +
        'Lancaster County deed records may require authentication.'
    )
  }

  return { records, errors }
}

async function logScrape(
  source: string,
  recordsFound: number,
  recordsAdded: number,
  recordsUpdated: number,
  errors: string[]
) {
  try {
    await supabaseServer.from('scrape_log').insert({
      source,
      records_found: recordsFound,
      records_added: recordsAdded,
      records_updated: recordsUpdated,
      errors: errors.length > 0 ? errors.join('; ') : null,
      run_at: new Date().toISOString(),
    })
  } catch {
    // non-fatal
  }
}

export async function GET() {
  return runScraper()
}

export async function POST() {
  return runScraper()
}

async function runScraper() {
  const allErrors: string[] = []
  let recordsFound = 0
  let recordsAdded = 0
  let method = 'none'

  // Try deed portal directly
  const { records: deedRecords, errors: deedErrors } =
    await tryDeedPortalDirectly()
  allErrors.push(...deedErrors)

  let records = deedRecords
  if (records.length > 0) {
    method = 'portal'
  } else {
    // Fallback: GIS ownership changes
    allErrors.push('Deed portal not accessible — falling back to GIS ownership changes')
    const { records: gisRecords, errors: gisErrors } =
      await getRecentGISOwnershipChanges()
    allErrors.push(...gisErrors)
    records = gisRecords
    if (records.length > 0) method = 'gis_fallback'
  }

  recordsFound = records.length

  if (records.length > 0) {
    const rows = records.map(normalizeDeed).filter((r): r is NonNullable<typeof r> => r !== null)

    const batchSize = 50
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize)

      // Try upsert on parcel_id first, then fall back to address
      const withParcel = batch.filter((r) => r.parcel_id)
      const withoutParcel = batch.filter((r) => !r.parcel_id)

      if (withParcel.length > 0) {
        const { data, error } = await supabaseServer
          .from('lots')
          .upsert(withParcel, { onConflict: 'parcel_id', ignoreDuplicates: false })
          .select('id')
        if (error) allErrors.push(`Deed upsert (parcel_id): ${error.message}`)
        else recordsAdded += data?.length ?? 0
      }

      if (withoutParcel.length > 0) {
        const { data, error } = await supabaseServer
          .from('lots')
          .insert(withoutParcel)
          .select('id')
        if (error) allErrors.push(`Deed insert (no parcel_id): ${error.message}`)
        else recordsAdded += data?.length ?? 0
      }
    }
  }

  await logScrape('deeds', recordsFound, recordsAdded, 0, allErrors)

  return NextResponse.json({
    success: true,
    method,
    records_found: recordsFound,
    records_added: recordsAdded,
    records_updated: 0,
    note:
      records.length === 0
        ? 'Lancaster County deed records portal requires authentication. No public API was found. GIS fallback also returned no recent deed data from accessible endpoints.'
        : undefined,
    errors: allErrors.length > 0 ? allErrors : undefined,
  })
}

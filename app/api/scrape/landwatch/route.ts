import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

// LandWatch + Land.com scraper for Lancaster County PA land listings

const LANDWATCH_API =
  'https://www.landwatch.com/api/search?CountyId=1310&MinAcreage=1&PropertyType=Land&PageSize=100'

const LANDWATCH_BROWSE =
  'https://www.landwatch.com/lancaster-county-pennsylvania-land-for-sale'

const LAND_COM_API =
  'https://www.land.com/api/search/properties?state=PA&county=Lancaster&minAcres=1&type=land&limit=100'

const LAND_COM_BROWSE =
  'https://www.land.com/land-for-sale/pennsylvania/lancaster-county/'

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  Connection: 'keep-alive',
}

const JSON_HEADERS = {
  ...BROWSER_HEADERS,
  Accept: 'application/json, text/plain, */*',
  Referer: 'https://www.landwatch.com/',
}

interface LandWatchListing {
  id?: string | number
  title?: string
  price?: number
  acres?: number
  acreage?: number
  county?: string
  state?: string
  city?: string
  address?: string
  url?: string
  propertyUrl?: string
  listingUrl?: string
  latitude?: number
  longitude?: number
  lat?: number
  lon?: number
  lng?: number
  agentName?: string
  agentPhone?: string
  brokerName?: string
  mlsId?: string
  listingId?: string
}

interface LandComListing {
  id?: string | number
  price?: number
  acres?: number
  acreage?: number
  county?: string
  state?: string
  city?: string
  address?: string
  url?: string
  propertyUrl?: string
  latitude?: number
  longitude?: number
  agentName?: string
  agentPhone?: string
  mlsId?: string
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

function normalizeLandWatch(l: LandWatchListing) {
  const id = l.id ? String(l.id) : null
  const url = l.url ?? l.propertyUrl ?? l.listingUrl ?? null
  const sourceUrl = url
    ? url.startsWith('http')
      ? url
      : `https://www.landwatch.com${url}`
    : id
    ? `https://www.landwatch.com/listing/${id}`
    : null

  if (!sourceUrl) return null

  const acres = l.acres ?? l.acreage ?? null
  const lat = l.latitude ?? l.lat ?? null
  const lng = l.longitude ?? l.lon ?? l.lng ?? null

  return {
    address: l.address ?? null,
    city: l.city ?? null,
    township: l.city ?? null,
    lot_size_acres: acres,
    status: 'for_sale' as const,
    list_price: l.price ?? null,
    lat,
    lng,
    source_url: sourceUrl,
    agent_name: l.agentName ?? l.brokerName ?? null,
    agent_contact: l.agentPhone ?? null,
    mls_id: l.mlsId ?? null,
    google_maps_url: buildGoogleMapsUrl(lat, lng, l.address ?? null),
    source: 'landwatch' as const,
    last_scraped_at: new Date().toISOString(),
    raw_data: l,
  }
}

function normalizeLandCom(l: LandComListing) {
  const id = l.id ? String(l.id) : null
  const url = l.url ?? l.propertyUrl ?? null
  const sourceUrl = url
    ? url.startsWith('http')
      ? url
      : `https://www.land.com${url}`
    : id
    ? `https://www.land.com/listing/${id}`
    : null

  if (!sourceUrl) return null

  const acres = l.acres ?? l.acreage ?? null
  const lat = l.latitude ?? null
  const lng = l.longitude ?? null

  return {
    address: l.address ?? null,
    city: l.city ?? null,
    township: l.city ?? null,
    lot_size_acres: acres,
    status: 'for_sale' as const,
    list_price: l.price ?? null,
    lat,
    lng,
    source_url: sourceUrl,
    agent_name: l.agentName ?? null,
    agent_contact: l.agentPhone ?? null,
    mls_id: l.mlsId ?? null,
    google_maps_url: buildGoogleMapsUrl(lat, lng, l.address ?? null),
    source: 'landdotcom' as const,
    last_scraped_at: new Date().toISOString(),
    raw_data: l,
  }
}

// Extract listings from __NEXT_DATA__ or other embedded JSON
function extractFromHtml(html: string, source: 'landwatch' | 'landdotcom'): LandWatchListing[] {
  // Try __NEXT_DATA__
  const nextMatch = html.match(
    /<script[^>]+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/
  )
  if (nextMatch?.[1]) {
    try {
      const data = JSON.parse(nextMatch[1])
      // Search for arrays that look like listings
      const listings = findListings(data)
      if (listings.length > 0) return listings
    } catch {
      // continue
    }
  }

  // Try window.__INITIAL_STATE__ or similar
  const stateMatch = html.match(
    /window\.__(?:INITIAL|PRELOADED)_STATE__\s*=\s*({[\s\S]*?})(?:;|\s*<\/script>)/
  )
  if (stateMatch?.[1]) {
    try {
      const data = JSON.parse(stateMatch[1])
      const listings = findListings(data)
      if (listings.length > 0) return listings
    } catch {
      // continue
    }
  }

  // Try JSON-LD
  const jsonLdMatches = [...html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)]
  for (const m of jsonLdMatches) {
    try {
      const data = JSON.parse(m[1])
      if (Array.isArray(data) && data.length > 0 && data[0].price) {
        return data
      }
    } catch {
      // continue
    }
  }

  return []
}

// Recursively search an object for arrays that look like land listings
function findListings(obj: unknown, depth = 0): LandWatchListing[] {
  if (depth > 8 || obj === null || typeof obj !== 'object') return []
  if (Array.isArray(obj)) {
    if (
      obj.length > 0 &&
      typeof obj[0] === 'object' &&
      obj[0] !== null &&
      ('acres' in (obj[0] as object) ||
        'acreage' in (obj[0] as object) ||
        'price' in (obj[0] as object)) &&
      ('url' in (obj[0] as object) ||
        'propertyUrl' in (obj[0] as object) ||
        'id' in (obj[0] as object))
    ) {
      return obj as LandWatchListing[]
    }
    for (const item of obj) {
      const found = findListings(item, depth + 1)
      if (found.length > 0) return found
    }
  } else {
    for (const val of Object.values(obj as Record<string, unknown>)) {
      const found = findListings(val, depth + 1)
      if (found.length > 0) return found
    }
  }
  return []
}

async function scrapeLandWatch(): Promise<{
  listings: LandWatchListing[]
  errors: string[]
}> {
  const errors: string[] = []
  const listings: LandWatchListing[] = []

  // Try API first
  try {
    const res = await fetch(LANDWATCH_API, {
      headers: JSON_HEADERS,
      signal: AbortSignal.timeout(20000),
    })
    if (res.ok) {
      const json = await res.json()
      const results =
        json?.properties ??
        json?.listings ??
        json?.results ??
        json?.data ??
        null
      if (Array.isArray(results) && results.length > 0) {
        listings.push(...(results as LandWatchListing[]))
        return { listings, errors }
      }
    } else {
      errors.push(`LandWatch API HTTP ${res.status}`)
    }
  } catch (e) {
    errors.push(`LandWatch API: ${e instanceof Error ? e.message : String(e)}`)
  }

  // Fallback: browse page
  try {
    const res = await fetch(LANDWATCH_BROWSE, {
      headers: BROWSER_HEADERS,
      signal: AbortSignal.timeout(20000),
    })
    if (res.ok) {
      const html = await res.text()
      const found = extractFromHtml(html, 'landwatch')
      if (found.length > 0) {
        listings.push(...found)
      } else {
        errors.push('LandWatch browse page returned no parseable listings')
      }
    } else {
      errors.push(`LandWatch browse HTTP ${res.status}`)
    }
  } catch (e) {
    errors.push(`LandWatch browse: ${e instanceof Error ? e.message : String(e)}`)
  }

  return { listings, errors }
}

async function scrapeLandCom(): Promise<{
  listings: LandComListing[]
  errors: string[]
}> {
  const errors: string[] = []
  const listings: LandComListing[] = []

  // Try Land.com API
  const apiUrls = [
    LAND_COM_API,
    'https://www.land.com/api/v2/listings?state=PA&county=Lancaster&minAcres=1',
    'https://api.land.com/search?state=PA&county=Lancaster&minAcres=1',
  ]

  for (const apiUrl of apiUrls) {
    try {
      const res = await fetch(apiUrl, {
        headers: { ...JSON_HEADERS, Referer: 'https://www.land.com/' },
        signal: AbortSignal.timeout(15000),
      })
      if (res.ok) {
        const json = await res.json()
        const results =
          json?.properties ??
          json?.listings ??
          json?.results ??
          json?.data ??
          null
        if (Array.isArray(results) && results.length > 0) {
          listings.push(...(results as LandComListing[]))
          return { listings, errors }
        }
      }
    } catch {
      // try next
    }
  }

  // Fallback: browse
  try {
    const res = await fetch(LAND_COM_BROWSE, {
      headers: BROWSER_HEADERS,
      signal: AbortSignal.timeout(20000),
    })
    if (res.ok) {
      const html = await res.text()
      const found = extractFromHtml(html, 'landdotcom')
      if (found.length > 0) {
        listings.push(...(found as LandComListing[]))
      } else {
        errors.push('Land.com browse returned no parseable listings')
      }
    } else {
      errors.push(`Land.com browse HTTP ${res.status}`)
    }
  } catch (e) {
    errors.push(`Land.com browse: ${e instanceof Error ? e.message : String(e)}`)
  }

  return { listings, errors }
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
      scraped_at: new Date().toISOString(),
    })
  } catch {
    // non-fatal
  }
}

async function upsertRows(
  rows: Array<ReturnType<typeof normalizeLandWatch> | ReturnType<typeof normalizeLandCom>>,
  source: string
): Promise<{ added: number; errors: string[] }> {
  const errors: string[] = []
  let added = 0
  const valid = rows.filter((r): r is NonNullable<typeof r> => r !== null)

  const batchSize = 50
  for (let i = 0; i < valid.length; i += batchSize) {
    const batch = valid.slice(i, i + batchSize)
    const { data, error } = await supabaseServer
      .from('lots')
      .upsert(batch, { onConflict: 'source_url', ignoreDuplicates: false })
      .select('id')

    if (error) {
      errors.push(`Upsert ${source} batch ${i}: ${error.message}`)
      // Fallback: insert without conflict resolution
      const { data: insData } = await supabaseServer
        .from('lots')
        .insert(batch)
        .select('id')
      added += insData?.length ?? 0
    } else {
      added += data?.length ?? 0
    }
  }
  return { added, errors }
}

export async function GET() {
  return runScraper()
}

export async function POST() {
  return runScraper()
}

async function runScraper() {
  const allErrors: string[] = []
  let totalFound = 0
  let totalAdded = 0

  // Scrape LandWatch
  const lwResult = await scrapeLandWatch()
  allErrors.push(...lwResult.errors)
  const lwRows = lwResult.listings.map(normalizeLandWatch)
  totalFound += lwResult.listings.length
  if (lwRows.length > 0) {
    const { added, errors } = await upsertRows(lwRows, 'landwatch')
    totalAdded += added
    allErrors.push(...errors)
  }
  await logScrape(
    'landwatch',
    lwResult.listings.length,
    lwRows.filter(Boolean).length,
    0,
    lwResult.errors
  )

  // Scrape Land.com
  const ldResult = await scrapeLandCom()
  allErrors.push(...ldResult.errors)
  const ldRows = ldResult.listings.map(normalizeLandCom)
  totalFound += ldResult.listings.length
  if (ldRows.length > 0) {
    const { added, errors } = await upsertRows(ldRows, 'landdotcom')
    totalAdded += added
    allErrors.push(...errors)
  }
  await logScrape(
    'landdotcom',
    ldResult.listings.length,
    ldRows.filter(Boolean).length,
    0,
    ldResult.errors
  )

  return NextResponse.json({
    success: true,
    landwatch: {
      records_found: lwResult.listings.length,
      errors: lwResult.errors.length > 0 ? lwResult.errors : undefined,
    },
    landdotcom: {
      records_found: ldResult.listings.length,
      errors: ldResult.errors.length > 0 ? ldResult.errors : undefined,
    },
    records_found: totalFound,
    records_added: totalAdded,
    records_updated: 0,
    errors: allErrors.length > 0 ? allErrors : undefined,
  })
}

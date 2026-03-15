import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

// Zillow land scraper for Lancaster County PA
// Zillow heavily blocks scrapers; this route handles failures gracefully.

const ZILLOW_SEARCH_STATE = JSON.stringify({
  pagination: {},
  isMapVisible: false,
  filterState: {
    lotSize: { min: 43560 },
    isLotLand: { value: true },
    isAllHomes: { value: true },
  },
  regionSelection: [{ regionId: 2756, regionType: 4 }],
})

const ZILLOW_API_URL = `https://www.zillow.com/search/GetSearchPageState.htm?searchQueryState=${encodeURIComponent(ZILLOW_SEARCH_STATE)}&wants={"cat1":["listResults"]}&requestId=1`

const ZILLOW_BROWSE_URL =
  'https://www.zillow.com/lancaster-county-pa/lots-land/'

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Accept-Encoding': 'gzip, deflate, br',
  Connection: 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Cache-Control': 'max-age=0',
}

interface ZillowListing {
  zpid?: number | string
  address?: string
  streetAddress?: string
  city?: string
  state?: string
  zipcode?: string
  price?: number
  unformattedPrice?: number
  lotAreaValue?: number
  lotAreaUnit?: string
  latLong?: { latitude?: number; longitude?: number }
  latitude?: number
  longitude?: number
  detailUrl?: string
  statusType?: string
  brokerName?: string
  variableData?: { text?: string }
  mlsId?: string
  listingAgent?: { name?: string; phone?: string }
  hdpData?: {
    homeInfo?: {
      price?: number
      lotAreaValue?: number
      zipcode?: string
      city?: string
      streetAddress?: string
      latitude?: number
      longitude?: number
      zpid?: number
    }
  }
}

function acresFromListing(listing: ZillowListing): number | null {
  const val = listing.lotAreaValue
  const unit = (listing.lotAreaUnit ?? '').toLowerCase()
  if (val == null) return null
  if (unit === 'acres' || unit === 'acre') return Math.round(val * 1000) / 1000
  if (unit === 'sqft' || unit === 'squarefeet' || unit === '')
    return Math.round((val / 43560) * 1000) / 1000
  return null
}

function buildGoogleMapsUrl(
  lat: number | null,
  lng: number | null,
  address: string | null
): string | null {
  if (lat && lng) return `https://maps.google.com/?q=${lat},${lng}`
  if (address) return `https://maps.google.com/?q=${encodeURIComponent(address + ' Lancaster County PA')}`
  return null
}

function normalizeZillowListing(listing: ZillowListing) {
  const info = listing.hdpData?.homeInfo ?? {}
  const zpid = listing.zpid ?? info.zpid
  const street = listing.streetAddress ?? info.streetAddress ?? listing.address ?? ''
  const city =
    listing.city ?? info.city ?? ''
  const zip = listing.zipcode ?? info.zipcode ?? ''
  const address = [street, city, zip].filter(Boolean).join(', ') || null

  const price =
    listing.unformattedPrice ?? listing.price ?? info.price ?? null
  const lotAcres = acresFromListing(listing) ??
    (info.lotAreaValue ? Math.round((info.lotAreaValue / 43560) * 1000) / 1000 : null)

  const lat = listing.latitude ?? listing.latLong?.latitude ?? info.latitude ?? null
  const lng = listing.longitude ?? listing.latLong?.longitude ?? info.longitude ?? null

  const zillowUrl = listing.detailUrl
    ? listing.detailUrl.startsWith('http')
      ? listing.detailUrl
      : `https://www.zillow.com${listing.detailUrl}`
    : zpid
    ? `https://www.zillow.com/homedetails/${zpid}_zpid/`
    : null

  if (!zillowUrl) return null

  return {
    address: street || null,
    city: city || null,
    zip: zip || null,
    township: city || null,
    lot_size_acres: lotAcres,
    status: 'for_sale' as const,
    list_price: price ? Math.round(price) : null,
    lat,
    lng,
    zillow_url: zillowUrl,
    zillow_link: zillowUrl,
    agent_name: listing.listingAgent?.name ?? listing.brokerName ?? null,
    agent_contact: listing.listingAgent?.phone ?? null,
    mls_id: listing.mlsId ?? null,
    google_maps_url: buildGoogleMapsUrl(lat, lng, address),
    source: 'zillow' as const,
    last_scraped_at: new Date().toISOString(),
    raw_data: listing,
  }
}

async function tryZillowAPI(): Promise<ZillowListing[] | null> {
  try {
    const res = await fetch(ZILLOW_API_URL, {
      headers: {
        ...BROWSER_HEADERS,
        Accept: 'application/json, text/plain, */*',
        Referer: 'https://www.zillow.com/',
      },
      signal: AbortSignal.timeout(20000),
    })
    if (!res.ok) return null
    const json = await res.json()
    // Navigate the Zillow response structure
    const results =
      json?.cat1?.searchResults?.listResults ??
      json?.searchResults?.listResults ??
      json?.listResults ??
      null
    if (!Array.isArray(results)) return null
    return results as ZillowListing[]
  } catch {
    return null
  }
}

async function tryZillowBrowse(): Promise<ZillowListing[] | null> {
  try {
    const res = await fetch(ZILLOW_BROWSE_URL, {
      headers: BROWSER_HEADERS,
      signal: AbortSignal.timeout(20000),
    })
    if (!res.ok) return null
    const html = await res.text()

    // Zillow embeds listing data in a <script id="__NEXT_DATA__"> tag
    const nextDataMatch = html.match(
      /<script[^>]+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/
    )
    if (nextDataMatch?.[1]) {
      try {
        const data = JSON.parse(nextDataMatch[1])
        const results =
          data?.props?.pageProps?.searchPageState?.cat1?.searchResults
            ?.listResults ??
          data?.props?.pageProps?.listResults ??
          null
        if (Array.isArray(results)) return results as ZillowListing[]
      } catch {
        // parsing failed
      }
    }

    // Try alternate data embedding patterns
    const apolloMatch = html.match(/window\.__APOLLO_STATE__\s*=\s*({[\s\S]*?});\s*<\/script>/)
    if (apolloMatch?.[1]) {
      try {
        const data = JSON.parse(apolloMatch[1])
        const listings = Object.values(data).filter(
          (v: unknown) =>
            typeof v === 'object' &&
            v !== null &&
            'zpid' in (v as Record<string, unknown>)
        ) as ZillowListing[]
        if (listings.length > 0) return listings
      } catch {
        // parsing failed
      }
    }

    return null
  } catch {
    return null
  }
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

export async function GET() {
  return runScraper()
}

export async function POST() {
  return runScraper()
}

async function runScraper() {
  const errors: string[] = []
  let recordsFound = 0
  let recordsAdded = 0
  let method = 'none'

  // Try Zillow internal API first
  let listings = await tryZillowAPI()
  if (listings && listings.length > 0) {
    method = 'api'
  } else {
    errors.push('Zillow API blocked or returned no results — trying browse page')
    listings = await tryZillowBrowse()
    if (listings && listings.length > 0) {
      method = 'browse'
    } else {
      errors.push('Zillow browse page blocked or returned no parseable data')
    }
  }

  if (!listings || listings.length === 0) {
    await logScrape('zillow', 0, 0, 0, errors)
    return NextResponse.json({
      success: false,
      blocked: true,
      records_found: 0,
      records_added: 0,
      records_updated: 0,
      message:
        'Zillow blocked this scraper. This is expected — Zillow heavily restricts automated access.',
      errors,
    })
  }

  recordsFound = listings.length

  const rows = listings
    .map(normalizeZillowListing)
    .filter((r): r is NonNullable<typeof r> => r !== null)

  const batchSize = 50
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)
    const { data, error: upsertError } = await supabaseServer
      .from('lots')
      .upsert(batch, { onConflict: 'zillow_url', ignoreDuplicates: false })
      .select('id')

    if (upsertError) {
      // zillow_url column may not exist yet — try with source+address fallback
      errors.push(`Upsert error: ${upsertError.message}`)
      // Try inserting without conflict key
      const { data: insData, error: insError } = await supabaseServer
        .from('lots')
        .upsert(batch, { ignoreDuplicates: true })
        .select('id')
      if (!insError) recordsAdded += insData?.length ?? 0
      else errors.push(`Insert fallback error: ${insError.message}`)
    } else {
      recordsAdded += data?.length ?? 0
    }
  }

  await logScrape('zillow', recordsFound, recordsAdded, 0, errors)

  return NextResponse.json({
    success: true,
    method,
    records_found: recordsFound,
    records_added: recordsAdded,
    records_updated: 0,
    errors: errors.length > 0 ? errors : undefined,
  })
}

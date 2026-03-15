import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

// Lancaster County PA GIS scraper
// Tries multiple ArcGIS endpoints with fallback to PASDA statewide parcels

const GIS_ENDPOINTS = [
  // Primary: Lancaster County direct ArcGIS — documented in DATA_SOURCES.md
  'https://services.lancastercountypa.gov/lancastercountypa/rest/services/Parcels/MapServer/0/query',
  // Alternate: lcwatlas portal
  'https://lcwatlas.lancastercountypa.gov/arcgis/rest/services/Parcels/MapServer/0/query',
  // Fallback 1: Lancaster County alternate subdomain
  'https://gis.lancastercountypa.gov/arcgis/rest/services/Parcels/MapServer/0/query',
  // Fallback 2: maps subdomain
  'https://maps.lancastercountypa.gov/arcgis/rest/services/Parcels/MapServer/0/query',
]

// PASDA statewide PA parcels — confirmed to exist
const PASDA_ENDPOINT =
  'https://services.pasda.psu.edu/arcgis/rest/services/pasda/PAParcels_2023/MapServer/0/query'

// Lancaster County FIPS code is 42071
const LANCASTER_FIPS = '42071'
const LANCASTER_COUNTY_NAME = 'LANCASTER'

interface ArcGISFeature {
  attributes: Record<string, unknown>
  geometry?: {
    x?: number
    y?: number
    rings?: number[][][]
    paths?: number[][][]
  }
}

interface ArcGISResponse {
  features?: ArcGISFeature[]
  exceededTransferLimit?: boolean
  error?: { code: number; message: string }
}

function buildQueryUrl(base: string, offset: number, where: string): string {
  const params = new URLSearchParams({
    where,
    outFields: '*',
    f: 'json',
    resultRecordCount: '1000',
    resultOffset: String(offset),
    returnGeometry: 'true',
  })
  return `${base}?${params.toString()}`
}

async function tryFetchGIS(
  endpoint: string,
  where: string,
  signal: AbortSignal
): Promise<ArcGISResponse | null> {
  try {
    const url = buildQueryUrl(endpoint, 0, where)
    const res = await fetch(url, {
      signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LotScraper/1.0)' },
    })
    if (!res.ok) return null
    const json = (await res.json()) as ArcGISResponse
    if (json.error) return null
    return json
  } catch {
    return null
  }
}

function extractLatLng(
  feature: ArcGISFeature
): { lat: number; lng: number } | null {
  const g = feature.geometry
  if (!g) return null
  // Point geometry
  if (typeof g.x === 'number' && typeof g.y === 'number') {
    // ArcGIS web mercator (EPSG:3857) coords need conversion if not WGS84
    // If values are large (>180) they're likely web mercator
    if (Math.abs(g.x) <= 180 && Math.abs(g.y) <= 90) {
      return { lat: g.y, lng: g.x }
    }
    // Convert web mercator to WGS84
    const lng = (g.x / 20037508.34) * 180
    const lat =
      (Math.atan(Math.exp((g.y / 20037508.34) * Math.PI)) * 360) / Math.PI -
      90
    if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      return { lat: Math.round(lat * 1e6) / 1e6, lng: Math.round(lng * 1e6) / 1e6 }
    }
    return null
  }
  // Polygon — use centroid from first ring
  if (g.rings && g.rings.length > 0 && g.rings[0].length > 0) {
    const ring = g.rings[0]
    const sumX = ring.reduce((s, p) => s + p[0], 0) / ring.length
    const sumY = ring.reduce((s, p) => s + p[1], 0) / ring.length
    if (Math.abs(sumX) <= 180 && Math.abs(sumY) <= 90) {
      return { lat: sumY, lng: sumX }
    }
    const lng = (sumX / 20037508.34) * 180
    const lat =
      (Math.atan(Math.exp((sumY / 20037508.34) * Math.PI)) * 360) / Math.PI -
      90
    if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      return { lat: Math.round(lat * 1e6) / 1e6, lng: Math.round(lng * 1e6) / 1e6 }
    }
  }
  return null
}

function firstStr(attrs: Record<string, unknown>, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = attrs[k]
    if (v != null && String(v).trim() !== '') return String(v).trim()
  }
  return null
}

function firstNum(attrs: Record<string, unknown>, ...keys: string[]): number | null {
  for (const k of keys) {
    const v = attrs[k]
    const n = parseFloat(String(v))
    if (!isNaN(n)) return n
  }
  return null
}

function normalizeFeature(feature: ArcGISFeature) {
  const a = feature.attributes
  const coords = extractLatLng(feature)

  const address = firstStr(
    a,
    'SITE_ADDRESS', 'SITEADDRESS', 'ADDR', 'ADDRESS', 'PROP_ADDR',
    'PROPERTY_ADDRESS', 'FULLADDRESS', 'LOCATION', 'ADDR_FULL'
  )
  const township = firstStr(
    a,
    'MUNI_NAME', 'MUNICIPALITY', 'MUNINAME', 'TOWNSHIP', 'CITY', 'CITY_NAME',
    'MUNICIPAL', 'ADMIN_AREA', 'MUNICIPALITY_NAME'
  )
  const acres = firstNum(a, 'ACRES', 'ACREAGE', 'SHAPE_AREA_ACRES', 'CALC_ACRES', 'GIS_ACRES')
  const zoning = firstStr(
    a,
    'ZONING', 'ZONING_CODE', 'ZONE_CODE', 'ZONECODE', 'ZONING_CLASS',
    'ZONING_DIST', 'ZONE', 'ZONING_DISTRICT'
  )
  const parcelId = firstStr(
    a,
    'PARCEL_ID', 'PARCELID', 'PIN', 'APN', 'PARID', 'OBJECTID',
    'FID', 'GEOPIN', 'PARCEL_NUMBER', 'PIN_NUMBER', 'TAXPARCELID'
  )
  const ownerName = firstStr(
    a,
    'OWNER', 'OWNER_NAME', 'OWNERNAME', 'OWNER1', 'OWNER_FULL',
    'OWNER_NAM', 'GRANTOR', 'OWNER_NANE'
  )
  const city = firstStr(a, 'SITUS_CITY', 'SITE_CITY', 'CITY', 'ADDR_CITY')
  const zip = firstStr(a, 'SITUS_ZIP', 'SITE_ZIP', 'ZIP', 'ZIP_CODE', 'ADDR_ZIP', 'ZIPCODE')

  const googleMapsUrl =
    coords
      ? `https://maps.google.com/?q=${coords.lat},${coords.lng}`
      : address
      ? `https://maps.google.com/?q=${encodeURIComponent(address + ' Lancaster County PA')}`
      : null

  return {
    address,
    township,
    city,
    zip,
    lot_size_acres: acres,
    zoning,
    parcel_id: parcelId ? String(parcelId) : null,
    owner_name: ownerName,
    status: 'unknown' as const,
    source: 'gis' as const,
    lat: coords?.lat ?? null,
    lng: coords?.lng ?? null,
    google_maps_url: googleMapsUrl,
    last_scraped_at: new Date().toISOString(),
    raw_data: a,
  }
}

async function fetchAllPages(
  endpoint: string,
  where: string,
  signal: AbortSignal
): Promise<{ features: ArcGISFeature[]; error?: string }> {
  const features: ArcGISFeature[] = []
  let offset = 0
  const pageSize = 1000

  while (true) {
    const url = buildQueryUrl(endpoint, offset, where)
    try {
      const res = await fetch(url, {
        signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LotScraper/1.0)' },
      })
      if (!res.ok) {
        return { features, error: `HTTP ${res.status}` }
      }
      const json = (await res.json()) as ArcGISResponse
      if (json.error) {
        return { features, error: json.error.message }
      }
      const batch = json.features ?? []
      features.push(...batch)
      if (!json.exceededTransferLimit || batch.length < pageSize) break
      offset += pageSize
    } catch (err) {
      return { features, error: err instanceof Error ? err.message : String(err) }
    }
  }
  return { features }
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
    // log failure is non-fatal
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
  let recordsUpdated = 0

  // Abort after 55 seconds (Vercel function limit is 60s on hobby, 300s on pro)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 55000)

  try {
    // Try primary Lancaster County endpoints first
    const whereAcres = 'ACRES>=1'
    const wherePASQL = `COUNTY_NAME='${LANCASTER_COUNTY_NAME}' AND SHAPE_Area>=43560`

    let features: ArcGISFeature[] = []
    let endpointUsed = ''

    // Try direct Lancaster County endpoints
    for (const ep of GIS_ENDPOINTS) {
      const test = await tryFetchGIS(ep, whereAcres, controller.signal)
      if (test && (test.features?.length ?? 0) > 0) {
        const result = await fetchAllPages(ep, whereAcres, controller.signal)
        if (result.features.length > 0) {
          features = result.features
          endpointUsed = ep
          if (result.error) errors.push(result.error)
        }
        break
      }
    }

    // Fallback: try PASDA statewide
    if (features.length === 0) {
      const pasdaEndpoints = [
        'https://services.pasda.psu.edu/arcgis/rest/services/pasda/PAParcels_2023/MapServer/0/query',
        'https://services.pasda.psu.edu/arcgis/rest/services/pasda/PAParcels_2022/MapServer/0/query',
        'https://services.pasda.psu.edu/arcgis/rest/services/pasda/PAParcels/MapServer/0/query',
        'https://services.pasda.psu.edu/arcgis/rest/services/pasda/PACountyParcels/MapServer/0/query',
      ]
      for (const ep of pasdaEndpoints) {
        const test = await tryFetchGIS(ep, wherePASQL, controller.signal)
        if (test && (test.features?.length ?? 0) > 0) {
          const result = await fetchAllPages(ep, wherePASQL, controller.signal)
          if (result.features.length > 0) {
            features = result.features
            endpointUsed = ep
            if (result.error) errors.push(result.error)
          }
          break
        }
        // Also try FIPS-based query
        const testFips = await tryFetchGIS(
          ep,
          `COUNTY_FIPS='${LANCASTER_FIPS}' AND SHAPE_Area>=43560`,
          controller.signal
        )
        if (testFips && (testFips.features?.length ?? 0) > 0) {
          const result = await fetchAllPages(
            ep,
            `COUNTY_FIPS='${LANCASTER_FIPS}' AND SHAPE_Area>=43560`,
            controller.signal
          )
          if (result.features.length > 0) {
            features = result.features
            endpointUsed = ep
            if (result.error) errors.push(result.error)
          }
          break
        }
      }
    }

    if (features.length === 0) {
      errors.push(
        'No GIS endpoint returned data. Lancaster County GIS may require VPN or authentication. Tried: ' +
          [...GIS_ENDPOINTS, PASDA_ENDPOINT].join(', ')
      )
      await logScrape('gis', 0, 0, 0, errors)
      return NextResponse.json({
        success: false,
        records_found: 0,
        records_added: 0,
        records_updated: 0,
        errors,
        message: 'No accessible GIS endpoint found for Lancaster County PA parcels',
      })
    }

    recordsFound = features.length

    // Normalize and upsert in batches
    const batchSize = 100
    for (let i = 0; i < features.length; i += batchSize) {
      const batch = features.slice(i, i + batchSize)
      const rows = batch.map(normalizeFeature).filter((r) => r.parcel_id)

      if (rows.length === 0) continue

      const { data, error: upsertError } = await supabaseServer
        .from('lots')
        .upsert(rows, { onConflict: 'parcel_id', ignoreDuplicates: false })
        .select('id')

      if (upsertError) {
        errors.push(`Upsert batch ${i}: ${upsertError.message}`)
      } else {
        // Supabase upsert doesn't distinguish added vs updated easily;
        // use returned count as proxy
        recordsAdded += data?.length ?? 0
      }
    }

    await logScrape('gis', recordsFound, recordsAdded, recordsUpdated, errors)

    return NextResponse.json({
      success: true,
      endpoint_used: endpointUsed,
      records_found: recordsFound,
      records_added: recordsAdded,
      records_updated: recordsUpdated,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    errors.push(msg)
    await logScrape('gis', recordsFound, recordsAdded, recordsUpdated, errors)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  } finally {
    clearTimeout(timeout)
  }
}

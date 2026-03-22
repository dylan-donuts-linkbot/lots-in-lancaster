import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { logScrape, buildGoogleMapsUrl, validateCronSecret } from '@/lib/scrape-utils'

// Lancaster County PA GIS Parcel Scraper
// Source: Lancaster County ArcGIS Online - Parcels with Owner Data
// Endpoint confirmed public and working: services.arcgis.com/G4S1dGvn7PIgYd6Y
// 
// Pulls all parcels >= 1 acre. Paginates in batches of 1000.
// Filters to residential (R), farm (F), and agricultural (A) class parcels.
// These represent land that could be built on or purchased.

const GIS_ENDPOINT =
  'https://services.arcgis.com/G4S1dGvn7PIgYd6Y/arcgis/rest/services/Parcels_owners/FeatureServer/0/query'

// Lancaster County municipality codes → names (partial, most common)
const MUNI_NAMES: Record<number, string> = {
  1: 'Lancaster City', 2: 'Adamstown Boro', 3: 'Akron Boro', 4: 'Christiana Boro',
  5: 'Elizabethtown Boro', 6: 'Ephrata Boro', 7: 'Lititz Boro', 8: 'Manheim Boro',
  9: 'Marietta Boro', 10: 'Millersville Boro', 11: 'Mount Joy Boro', 12: 'Mountville Boro',
  13: 'New Holland Boro', 14: 'Quarryville Boro', 15: 'Strasburg Boro', 16: 'Columbia Boro',
  20: 'Bart Twp', 21: 'Brecknock Twp', 22: 'Caernarvon Twp', 23: 'Clay Twp',
  24: 'Colerain Twp', 25: 'Conestoga Twp', 26: 'Conoy Twp', 27: 'Drumore Twp',
  28: 'East Cocalico Twp', 29: 'East Donegal Twp', 30: 'East Earl Twp',
  31: 'East Hempfield Twp', 32: 'East Lampeter Twp', 33: 'Eden Twp',
  34: 'Elizabeth Twp', 35: 'Ephrata Twp', 36: 'Fulton Twp',
  37: 'Lancaster Twp', 38: 'Leacock Twp', 39: 'Little Britain Twp',
  40: 'Manheim Twp', 41: 'Manor Twp', 42: 'Martic Twp',
  43: 'Mount Joy Twp', 44: 'Paradise Twp', 45: 'Penn Twp',
  46: 'Pequea Twp', 47: 'Providence Twp', 48: 'Rapho Twp',
  49: 'Sadsbury Twp', 50: 'Salisbury Twp', 51: 'Strasburg Twp',
  52: 'Upper Leacock Twp', 53: 'Warwick Twp', 54: 'West Cocalico Twp',
  55: 'West Donegal Twp', 56: 'West Earl Twp', 57: 'West Hempfield Twp',
  58: 'West Lampeter Twp',
}

interface ArcGISFeature {
  attributes: {
    UPI?: string
    LOC_ADDRESS?: string
    MUNI?: number
    ACRE_PLAN_TOT?: number
    OWN1?: string
    OWN2?: string
    ADDR1?: string
    ADDR2?: string
    ADDR3?: string
    LUC?: string
    CLASS?: string
    LAST_SALE_PRICE?: number
    LOT_ASSESS?: number
    TOT_ASSESS?: number
    XCOORD?: number
    YCOORD?: number
    DEED_REC_DATE?: number
    SUBDIV_NAME?: string
    LEGAL1?: string
    [key: string]: unknown
  }
}

function buildUrl(offset: number, where: string): string {
  const params = new URLSearchParams({
    where,
    outFields: 'UPI,LOC_ADDRESS,MUNI,ACRE_PLAN_TOT,OWN1,OWN2,ADDR1,ADDR2,ADDR3,LUC,CLASS,LAST_SALE_PRICE,LOT_ASSESS,TOT_ASSESS,XCOORD,YCOORD,DEED_REC_DATE,SUBDIV_NAME,LEGAL1',
    f: 'json',
    resultRecordCount: '1000',
    resultOffset: String(offset),
    returnGeometry: 'false',
    orderByFields: 'OBJECTID ASC',
  })
  return `${GIS_ENDPOINT}?${params.toString()}`
}

function featureToLot(f: ArcGISFeature) {
  const a = f.attributes
  if (!a.ACRE_PLAN_TOT || a.ACRE_PLAN_TOT < 1) return null

  const upi = a.UPI ?? null
  if (!upi) return null

  const lat = a.YCOORD ?? null
  const lng = a.XCOORD ?? null
  const address = a.LOC_ADDRESS ?? null
  const township = a.MUNI ? (MUNI_NAMES[a.MUNI] ?? `Municipality ${a.MUNI}`) : null

  const googleMapsUrl = lat && lng
    ? `https://maps.google.com/?q=${lat},${lng}`
    : address
    ? `https://maps.google.com/?q=${encodeURIComponent(address + ', Lancaster County, PA')}`
    : null

  // Determine status: if sold recently (within last 2 years), mark sold
  let status: 'for_sale' | 'sold' | 'unknown' = 'unknown'
  let soldDate: string | null = null
  if (a.DEED_REC_DATE) {
    const deedDate = new Date(a.DEED_REC_DATE)
    const twoYearsAgo = new Date()
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2)
    if (deedDate > twoYearsAgo) {
      status = 'sold'
      soldDate = deedDate.toISOString()
    }
  }

  // Build owner contact from address fields
  const ownerParts = [a.ADDR1, a.ADDR2, a.ADDR3].filter(Boolean)
  const ownerContact = ownerParts.join(', ') || null

  // Detect if has_building from assessment data
  const has_building = (a.LOT_ASSESS ?? 0) > 0 && (a.TOT_ASSESS ?? 0) > (a.LOT_ASSESS ?? 0)

  // Build enriched_data with GIS-specific fields
  const enriched_data = {
    zoning: a.LUC ?? null,
    tax_parcel: upi ?? null,
    owner_name: [a.OWN1, a.OWN2].filter(Boolean).join(' / ') || null,
    year_built: null, // GIS doesn't provide this
    structure_count: has_building ? 1 : 0,
    lot_assessment: a.LOT_ASSESS ?? null,
    total_assessment: a.TOT_ASSESS ?? null,
    source_url: upi ? `https://lancastercountyassessment.org/AssessmentSearch/PropertyDetail/${encodeURIComponent(upi)}` : null,
  }

  return {
    address,
    city: township,
    township,
    zip: null,
    lot_size_acres: a.ACRE_PLAN_TOT,
    status,
    list_price: null,
    sold_price: status === 'sold' ? (a.LAST_SALE_PRICE ?? null) : null,
    sold_date: soldDate,
    mls_id: null,
    source_url: upi ? `https://lancastercountyassessment.org/AssessmentSearch/PropertyDetail/${encodeURIComponent(upi)}` : null,
    latitude: lat,
    longitude: lng,
    google_maps_url: googleMapsUrl,
    owner_name: [a.OWN1, a.OWN2].filter(Boolean).join(' / ') || null,
    owner_contact: ownerContact,
    agent_name: null,
    agent_contact: null,
    source: 'gis' as const,
    has_building,
    enriched_data,
    gis_latitude: lat,
    gis_longitude: lng,
    images: [],
    raw_data: a,
    last_scraped_at: new Date().toISOString(),
  }
}

export async function GET(request: NextRequest) {
  if (!validateCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return runScraper()
}

export async function POST(request: NextRequest) {
  if (!validateCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return runScraper()
}

async function runScraper() {
  const errors: string[] = []
  let totalFound = 0
  let totalAdded = 0

  // Filter: >= 1 acre, residential/farm/agricultural class only (skip commercial, industrial, exempt)
  // CLASS: R=Residential, F=Farm, A=Agricultural, C=Commercial, I=Industrial, E=Exempt
  const where = "ACRE_PLAN_TOT >= 1 AND CLASS IN ('R', 'F', 'A')"

  let offset = 0
  const batchSize = 1000
  let keepGoing = true

  // Safety: max 20 batches per run (20k records) to stay within Vercel 60s limit
  let batchCount = 0
  const MAX_BATCHES = 20

  while (keepGoing && batchCount < MAX_BATCHES) {
    try {
      const url = buildUrl(offset, where)
      const res = await fetch(url, {
        signal: AbortSignal.timeout(25000),
        headers: { 'User-Agent': 'LancasterLotFinder/1.0' },
      })

      if (!res.ok) {
        errors.push(`GIS HTTP ${res.status} at offset ${offset}`)
        break
      }

      const json = await res.json() as {
        features?: ArcGISFeature[]
        exceededTransferLimit?: boolean
        error?: { code: number; message: string }
      }

      if (json.error) {
        errors.push(`GIS error: ${json.error.message}`)
        break
      }

      const features = json.features ?? []
      totalFound += features.length

      if (features.length === 0) {
        keepGoing = false
        break
      }

      // Normalize
      const rows = features.map(featureToLot).filter((r): r is NonNullable<ReturnType<typeof featureToLot>> => r !== null)

      // Insert to Supabase in sub-batches of 200
      // Uses parcel_id (UPI) to skip duplicates gracefully
      const SUB_BATCH = 200
      for (let i = 0; i < rows.length; i += SUB_BATCH) {
        const chunk = rows.slice(i, i + SUB_BATCH)
        const { data, error } = await supabaseServer
          .from('lots')
          .insert(chunk)
          .select('id')
        if (error) {
          // Ignore duplicate key errors silently, log others
          if (!error.message.includes('duplicate') && !error.message.includes('unique')) {
            errors.push(`Insert error at offset ${offset + i}: ${error.message}`)
          }
        } else {
          totalAdded += data?.length ?? 0
        }
      }

      keepGoing = json.exceededTransferLimit === true
      offset += features.length
      batchCount++
    } catch (e) {
      errors.push(`Fetch error at offset ${offset}: ${e instanceof Error ? e.message : String(e)}`)
      break
    }
  }

  await logScrape('gis', totalFound, totalAdded, 0, errors)

  return NextResponse.json({
    success: errors.length === 0 || totalAdded > 0,
    source: 'Lancaster County ArcGIS Parcels',
    records_found: totalFound,
    records_added: totalAdded,
    batches_run: batchCount,
    more_available: keepGoing,
    errors: errors.length > 0 ? errors : undefined,
  })
}

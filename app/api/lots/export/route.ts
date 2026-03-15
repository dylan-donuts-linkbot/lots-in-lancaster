import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

interface Lot {
  id: string
  address: string | null
  township: string | null
  city: string | null
  zip: string | null
  lot_size_acres: number | null
  zoning: string | null
  utilities: string | null
  status: string | null
  list_price: number | null
  sold_price: number | null
  sold_date: string | null
  listed_date: string | null
  mls_id: string | null
  zillow_link: string | null
  zillow_url: string | null
  google_maps_url: string | null
  owner_name: string | null
  agent_name: string | null
  agent_contact: string | null
  source: string | null
  lat: number | null
  lng: number | null
  last_scraped_at: string | null
}

function escapeCSV(val: string | number | null | undefined): string {
  if (val == null) return ''
  const s = String(val)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}

function rowToCSV(lot: Lot): string {
  const zillowUrl = lot.zillow_url ?? lot.zillow_link ?? ''
  const cols = [
    lot.address,
    lot.township,
    lot.city,
    lot.zip,
    lot.lot_size_acres,
    lot.zoning,
    lot.utilities,
    lot.status,
    lot.list_price,
    lot.sold_price,
    lot.sold_date,
    lot.mls_id,
    zillowUrl,
    lot.google_maps_url,
    lot.owner_name,
    lot.agent_name,
    lot.agent_contact,
    lot.source,
  ]
  return cols.map(escapeCSV).join(',')
}

const CSV_HEADERS = [
  'Address',
  'Township',
  'City',
  'Zip',
  'Lot Size (Acres)',
  'Zoning',
  'Utilities',
  'Status',
  'List Price',
  'Sold Price',
  'Sold Date',
  'MLS ID',
  'Zillow URL',
  'Google Maps URL',
  'Owner',
  'Agent',
  'Agent Contact',
  'Source',
].join(',')

function escapeXML(s: string | null | undefined): string {
  if (!s) return ''
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function lotToKMLPlacemark(lot: Lot): string {
  const name = lot.address ?? `Lot ${lot.id}`
  const zillowUrl = lot.zillow_url ?? lot.zillow_link ?? ''

  const descParts: string[] = []
  if (lot.lot_size_acres != null) descParts.push(`Size: ${lot.lot_size_acres} acres`)
  if (lot.status) descParts.push(`Status: ${lot.status}`)
  if (lot.list_price != null)
    descParts.push(`List Price: $${lot.list_price.toLocaleString()}`)
  if (lot.sold_price != null)
    descParts.push(`Sold Price: $${lot.sold_price.toLocaleString()}`)
  if (lot.zoning) descParts.push(`Zoning: ${lot.zoning}`)
  if (lot.township) descParts.push(`Township: ${lot.township}`)
  if (lot.source) descParts.push(`Source: ${lot.source}`)
  if (zillowUrl) descParts.push(`Zillow: ${zillowUrl}`)

  const description = descParts.join('\n')

  // Only include placemark if we have coordinates
  if (lot.lat && lot.lng) {
    return `    <Placemark>
      <name>${escapeXML(name)}</name>
      <description>${escapeXML(description)}</description>
      <Point>
        <coordinates>${lot.lng},${lot.lat},0</coordinates>
      </Point>
    </Placemark>`
  } else {
    // No coordinates — still include but without geometry
    return `    <Placemark>
      <name>${escapeXML(name)}</name>
      <description>${escapeXML(description)}</description>
    </Placemark>`
  }
}

async function fetchLots(request: NextRequest): Promise<Lot[]> {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const minAcres = searchParams.get('minAcres')
  const maxAcres = searchParams.get('maxAcres')
  const township = searchParams.get('township')
  const minPrice = searchParams.get('minPrice')
  const maxPrice = searchParams.get('maxPrice')
  const source = searchParams.get('source')

  let query = supabaseServer.from('lots').select('*')

  if (status) query = query.eq('status', status)
  if (minAcres) query = query.gte('lot_size_acres', parseFloat(minAcres))
  if (maxAcres) query = query.lte('lot_size_acres', parseFloat(maxAcres))
  if (township) query = query.ilike('township', `%${township}%`)
  if (minPrice) query = query.gte('list_price', parseFloat(minPrice))
  if (maxPrice) query = query.lte('list_price', parseFloat(maxPrice))
  if (source) query = query.eq('source', source)

  // Export up to 10,000 records
  query = query.order('last_scraped_at', { ascending: false }).limit(10000)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as Lot[]
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const format = searchParams.get('format') ?? 'csv'

  try {
    const lots = await fetchLots(request)

    if (format === 'kml') {
      const placemarks = lots.map(lotToKMLPlacemark).join('\n')
      const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Lots in Lancaster County PA</name>
    <description>Land listings aggregated from public sources. Generated ${new Date().toISOString()}</description>
${placemarks}
  </Document>
</kml>`

      return new NextResponse(kml, {
        headers: {
          'Content-Type': 'application/vnd.google-earth.kml+xml',
          'Content-Disposition': `attachment; filename="lots-lancaster.kml"`,
        },
      })
    }

    // Default: CSV
    const rows = [CSV_HEADERS, ...lots.map(rowToCSV)]
    const csv = rows.join('\r\n')

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="lots-lancaster.csv"`,
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

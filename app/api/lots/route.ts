import { NextRequest, NextResponse } from 'next/server'
import { buildLotQuery, filtersFromSearchParams } from '@/lib/lot-query'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const filters = filtersFromSearchParams(searchParams)

  const orderBy = searchParams.get('orderBy') || 'price'
  const limit = Math.min(parseInt(searchParams.get('limit') || '500'), 1000)
  const offset = parseInt(searchParams.get('offset') || '0')

  let query = buildLotQuery(filters)

  const orderColumn: Record<string, string> = {
    price: 'list_price',
    acres: 'lot_size_acres',
    updated_at: 'last_scraped_at',
  }
  const col = orderColumn[orderBy] ?? 'list_price'
  query = query.order(col, { ascending: true, nullsFirst: false })
  query = query.range(offset, offset + limit - 1)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}

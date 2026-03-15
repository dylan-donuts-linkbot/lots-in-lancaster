import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const status = searchParams.get('status')
  const minAcres = searchParams.get('minAcres')
  const maxAcres = searchParams.get('maxAcres')
  const township = searchParams.get('township')
  const minPrice = searchParams.get('minPrice')
  const maxPrice = searchParams.get('maxPrice')
  const source = searchParams.get('source')
  const orderBy = searchParams.get('orderBy') || 'price'
  const limit = Math.min(parseInt(searchParams.get('limit') || '500'), 1000)
  const offset = parseInt(searchParams.get('offset') || '0')

  let query = supabaseServer.from('lots').select('*')

  if (status) query = query.eq('status', status)
  if (minAcres) query = query.gte('lot_size_acres', parseFloat(minAcres))
  if (maxAcres) query = query.lte('lot_size_acres', parseFloat(maxAcres))
  if (township) query = query.ilike('township', `%${township}%`)
  if (minPrice) query = query.gte('list_price', parseFloat(minPrice))
  if (maxPrice) query = query.lte('list_price', parseFloat(maxPrice))
  if (source) query = query.eq('source', source)

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

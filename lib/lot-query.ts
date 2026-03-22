import { supabaseServer } from '@/lib/supabase-server'
import type { LotFilters } from '@/lib/types'

/**
 * Build a filtered Supabase query for lots.
 * Shared between /api/lots and /api/lots/export.
 */
export function buildLotQuery(filters: LotFilters) {
  let query = supabaseServer.from('lots').select('*')

  if (filters.status) query = query.eq('status', filters.status)
  if (filters.minAcres) query = query.gte('lot_size_acres', parseFloat(filters.minAcres))
  if (filters.maxAcres) query = query.lte('lot_size_acres', parseFloat(filters.maxAcres))
  if (filters.township) query = query.ilike('township', `%${filters.township}%`)
  if (filters.minPrice) query = query.gte('list_price', parseFloat(filters.minPrice))
  if (filters.maxPrice) query = query.lte('list_price', parseFloat(filters.maxPrice))
  if (filters.source) query = query.eq('source', filters.source)
  if (filters.hasBuilding) query = query.eq('has_building', true)

  return query
}

/**
 * Extract LotFilters from URLSearchParams.
 */
export function filtersFromSearchParams(searchParams: URLSearchParams): LotFilters {
  return {
    status: searchParams.get('status'),
    minAcres: searchParams.get('minAcres'),
    maxAcres: searchParams.get('maxAcres'),
    township: searchParams.get('township'),
    minPrice: searchParams.get('minPrice'),
    maxPrice: searchParams.get('maxPrice'),
    source: searchParams.get('source'),
    hasBuilding: searchParams.get('hasBuilding') === 'true',
  }
}

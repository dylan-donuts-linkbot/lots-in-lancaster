import { Suspense } from 'react'
import { buildLotQuery } from '@/lib/lot-query'
import type { LotSummary, LotFilters } from '@/lib/types'
import HomeClient from './HomeClient'

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

async function fetchLots(filters: LotFilters): Promise<LotSummary[]> {
  let query = buildLotQuery(filters)
  query = query.order('list_price', { ascending: true, nullsFirst: false })
  query = query.range(0, 499)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as LotSummary[]
}

function LoadingSkeleton() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0', color: '#999', fontSize: '1.2rem' }}>
      Loading lots...
    </div>
  )
}

async function LotResults({ filters }: { filters: LotFilters }) {
  const lots = await fetchLots(filters)
  return <HomeClient initialLots={lots} />
}

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams
  const str = (v: string | string[] | undefined) => (typeof v === 'string' ? v : undefined)

  const filters: LotFilters = {
    status: str(params.status),
    minAcres: str(params.minAcres),
    maxAcres: str(params.maxAcres),
    township: str(params.township),
    minPrice: str(params.minPrice),
    maxPrice: str(params.maxPrice),
    hasBuilding: params.hasBuilding === 'true',
  }

  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <LotResults filters={filters} />
    </Suspense>
  )
}

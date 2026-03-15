'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

interface Lot {
  id: string
  address: string | null
  township: string | null
  lot_size_acres: number | null
  status: string | null
  list_price: number | null
  source: string | null
  last_scraped_at: string | null
}

function fmt(n: number | null, prefix = '') {
  if (n == null) return '—'
  return prefix + n.toLocaleString()
}

function fmtDate(s: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString()
}

function StatusBadge({ status }: { status: string | null }) {
  const map: Record<string, string> = {
    for_sale: 'bg-green-100 text-green-800',
    sold: 'bg-gray-200 text-gray-600',
    unknown: 'bg-yellow-100 text-yellow-800',
  }
  const cls = map[status ?? ''] ?? 'bg-gray-100 text-gray-500'
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {status ?? 'unknown'}
    </span>
  )
}

export default function Home() {
  const [lots, setLots] = useState<Lot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [status, setStatus] = useState('')
  const [minAcres, setMinAcres] = useState('')
  const [maxAcres, setMaxAcres] = useState('')
  const [township, setTownship] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')

  const fetchLots = useCallback(async () => {
    setLoading(true)
    setError(null)
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    if (minAcres) params.set('minAcres', minAcres)
    if (maxAcres) params.set('maxAcres', maxAcres)
    if (township) params.set('township', township)
    if (minPrice) params.set('minPrice', minPrice)
    if (maxPrice) params.set('maxPrice', maxPrice)

    try {
      const res = await fetch(`/api/lots?${params.toString()}`)
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setLots(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [status, minAcres, maxAcres, township, minPrice, maxPrice])

  useEffect(() => {
    fetchLots()
  }, [fetchLots])

  const clearFilters = () => {
    setStatus(''); setMinAcres(''); setMaxAcres('')
    setTownship(''); setMinPrice(''); setMaxPrice('')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-2xl font-semibold text-gray-900">Lots in Lancaster</h1>
        <p className="text-sm text-gray-500 mt-0.5">Land listings aggregated from public sources</p>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Filters</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
              >
                <option value="">All</option>
                <option value="for_sale">For Sale</option>
                <option value="sold">Sold</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Min Acres</label>
              <input type="number" min="0" step="0.1" value={minAcres} onChange={e => setMinAcres(e.target.value)} placeholder="0"
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Max Acres</label>
              <input type="number" min="0" step="0.1" value={maxAcres} onChange={e => setMaxAcres(e.target.value)} placeholder="Any"
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Township</label>
              <input type="text" value={township} onChange={e => setTownship(e.target.value)} placeholder="Search..."
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Min Price</label>
              <input type="number" min="0" step="1000" value={minPrice} onChange={e => setMinPrice(e.target.value)} placeholder="$0"
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Max Price</label>
              <input type="number" min="0" step="1000" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} placeholder="Any"
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button onClick={fetchLots}
              className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none">
              Apply Filters
            </button>
            <button onClick={clearFilters}
              className="rounded border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 focus:outline-none">
              Clear
            </button>
            {!loading && (
              <span className="text-xs text-gray-400">
                {lots.length} lot{lots.length !== 1 ? 's' : ''} found
              </span>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">
            Error: {error}
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-24 text-sm text-gray-400">
            Loading lots...
          </div>
        ) : lots.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <svg className="w-12 h-12 mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <p className="font-medium">No lots found</p>
            <p className="text-xs mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {['Address', 'Township', 'Lot Size', 'Status', 'Price', 'Source', 'Last Updated'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {lots.map(lot => (
                    <tr key={lot.id}
                      className="hover:bg-blue-50 cursor-pointer transition-colors"
                      onClick={() => { window.location.href = `/lots/${lot.id}` }}
                    >
                      <td className="px-4 py-3 text-sm font-medium whitespace-nowrap">
                        <Link href={`/lots/${lot.id}`} className="text-blue-600 hover:underline" onClick={e => e.stopPropagation()}>
                          {lot.address ?? '—'}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{lot.township ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                        {lot.lot_size_acres != null ? `${lot.lot_size_acres} ac` : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap"><StatusBadge status={lot.status} /></td>
                      <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{fmt(lot.list_price, '$')}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{lot.source ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-400 whitespace-nowrap">{fmtDate(lot.last_scraped_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

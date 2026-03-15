'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

interface ScrapeLog {
  id: string
  source: string
  records_found: number | null
  records_added: number | null
  records_updated: number | null
  errors: string | null
  scraped_at: string | null
}

interface SourceStats {
  source: string
  lastRun: string | null
  recordsFound: number
  recordsAdded: number
  recordsUpdated: number
  errors: string | null
  totalInDB: number
}

interface TriggerResult {
  source: string
  status: 'idle' | 'running' | 'done' | 'error'
  message?: string
}

const SCRAPERS = [
  { source: 'gis', label: 'Lancaster County GIS', path: '/api/scrape/gis', color: 'blue' },
  { source: 'zillow', label: 'Zillow', path: '/api/scrape/zillow', color: 'indigo' },
  { source: 'landwatch', label: 'LandWatch / Land.com', path: '/api/scrape/landwatch', color: 'green' },
  { source: 'landdotcom', label: 'Land.com', path: '/api/scrape/landwatch', color: 'emerald' },
  { source: 'deeds', label: 'Recorder of Deeds', path: '/api/scrape/deeds', color: 'amber' },
] as const

function fmtDate(s: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleString()
}

function fmtNum(n: number | null): string {
  if (n == null) return '—'
  return n.toLocaleString()
}

function StatusDot({ source, triggers }: { source: string; triggers: Record<string, TriggerResult> }) {
  const t = triggers[source]
  if (!t || t.status === 'idle') return <span className="inline-block w-2 h-2 rounded-full bg-gray-300" />
  if (t.status === 'running') return <span className="inline-block w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
  if (t.status === 'done') return <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
  return <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
}

export default function AdminPage() {
  const [stats, setStats] = useState<SourceStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [triggers, setTriggers] = useState<Record<string, TriggerResult>>({})
  const [totalLots, setTotalLots] = useState<number | null>(null)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Fetch scrape logs
      const logsRes = await fetch(
        '/api/admin/scrape-logs'
      )
      if (!logsRes.ok) throw new Error(await logsRes.text())
      const data = await logsRes.json()
      setStats(data.stats ?? [])
      setTotalLots(data.totalLots ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  async function triggerScraper(source: string, path: string) {
    setTriggers((prev) => ({
      ...prev,
      [source]: { source, status: 'running' },
    }))
    try {
      const res = await fetch(path, { method: 'POST' })
      const json = await res.json()
      setTriggers((prev) => ({
        ...prev,
        [source]: {
          source,
          status: res.ok ? 'done' : 'error',
          message: json.message ?? (json.error ? String(json.error) : JSON.stringify(json).slice(0, 200)),
        },
      }))
      // Refresh stats after trigger
      setTimeout(fetchStats, 1500)
    } catch (e) {
      setTriggers((prev) => ({
        ...prev,
        [source]: {
          source,
          status: 'error',
          message: e instanceof Error ? e.message : String(e),
        },
      }))
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
                ← Back to listings
              </Link>
              <span className="text-gray-300">|</span>
              <h1 className="text-xl font-semibold text-gray-900">Scrape Admin Dashboard</h1>
            </div>
            {totalLots != null && (
              <p className="text-sm text-gray-500 mt-0.5">
                {totalLots.toLocaleString()} total lots in database
              </p>
            )}
          </div>
          <button
            onClick={fetchStats}
            disabled={loading}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {error && (
          <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-6">
            Error loading stats: {error}
          </div>
        )}

        {/* Scraper Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {SCRAPERS.map((scraper) => {
            const stat = stats.find((s) => s.source === scraper.source)
            const trigger = triggers[scraper.source]
            return (
              <div key={scraper.source} className="bg-white rounded-lg border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <StatusDot source={scraper.source} triggers={triggers} />
                    <h2 className="text-sm font-semibold text-gray-900">{scraper.label}</h2>
                  </div>
                  <span className="text-xs text-gray-400 font-mono bg-gray-50 px-1.5 py-0.5 rounded">
                    {scraper.source}
                  </span>
                </div>

                <dl className="grid grid-cols-2 gap-3 text-sm mb-4">
                  <div>
                    <dt className="text-xs text-gray-500 uppercase tracking-wide">Last Run</dt>
                    <dd className="mt-0.5 text-gray-800 text-xs">{fmtDate(stat?.lastRun ?? null)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500 uppercase tracking-wide">In DB</dt>
                    <dd className="mt-0.5 text-gray-800 font-semibold">{fmtNum(stat?.totalInDB ?? null)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500 uppercase tracking-wide">Found</dt>
                    <dd className="mt-0.5 text-gray-700">{fmtNum(stat?.recordsFound ?? null)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500 uppercase tracking-wide">Added</dt>
                    <dd className="mt-0.5 text-gray-700">{fmtNum(stat?.recordsAdded ?? null)}</dd>
                  </div>
                </dl>

                {stat?.errors && (
                  <div className="mb-3 text-xs text-red-600 bg-red-50 rounded p-2 border border-red-100 line-clamp-2">
                    {stat.errors}
                  </div>
                )}

                {trigger?.message && (
                  <div
                    className={`mb-3 text-xs rounded p-2 border line-clamp-3 ${
                      trigger.status === 'error'
                        ? 'bg-red-50 border-red-100 text-red-700'
                        : 'bg-green-50 border-green-100 text-green-700'
                    }`}
                  >
                    {trigger.message}
                  </div>
                )}

                <button
                  onClick={() => triggerScraper(scraper.source, scraper.path)}
                  disabled={trigger?.status === 'running'}
                  className="w-full rounded bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {trigger?.status === 'running' ? 'Running...' : 'Run Now'}
                </button>
              </div>
            )
          })}
        </div>

        {/* Cron Schedule */}
        <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Vercel Cron Schedule</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 pr-6 text-xs font-semibold text-gray-500 uppercase tracking-wide">Scraper</th>
                  <th className="text-left py-2 pr-6 text-xs font-semibold text-gray-500 uppercase tracking-wide">Schedule</th>
                  <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Runs At (UTC)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[
                  { source: 'GIS', schedule: '0 6 * * *', time: '6:00 AM daily' },
                  { source: 'Zillow', schedule: '0 7 * * *', time: '7:00 AM daily' },
                  { source: 'LandWatch', schedule: '0 8 * * *', time: '8:00 AM daily' },
                  { source: 'Deeds', schedule: '0 9 * * *', time: '9:00 AM daily' },
                ].map((row) => (
                  <tr key={row.source}>
                    <td className="py-2 pr-6 text-gray-900">{row.source}</td>
                    <td className="py-2 pr-6 font-mono text-gray-600 text-xs">{row.schedule}</td>
                    <td className="py-2 text-gray-500">{row.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Log Entries */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Recent Scrape Log</h2>
          {loading ? (
            <p className="text-sm text-gray-400">Loading...</p>
          ) : stats.length === 0 ? (
            <p className="text-sm text-gray-400">No scrape logs yet. Run a scraper to see results here.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm divide-y divide-gray-100">
                <thead>
                  <tr>
                    {['Source', 'Last Run', 'Found', 'Added', 'Updated', 'Total in DB', 'Errors'].map((h) => (
                      <th
                        key={h}
                        className="text-left py-2 pr-4 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {stats.map((s) => (
                    <tr key={s.source}>
                      <td className="py-2 pr-4 font-mono text-xs text-gray-900">{s.source}</td>
                      <td className="py-2 pr-4 text-gray-600 text-xs whitespace-nowrap">{fmtDate(s.lastRun)}</td>
                      <td className="py-2 pr-4 text-gray-700">{fmtNum(s.recordsFound)}</td>
                      <td className="py-2 pr-4 text-gray-700">{fmtNum(s.recordsAdded)}</td>
                      <td className="py-2 pr-4 text-gray-700">{fmtNum(s.recordsUpdated)}</td>
                      <td className="py-2 pr-4 text-gray-900 font-semibold">{fmtNum(s.totalInDB)}</td>
                      <td className="py-2 text-xs text-red-600 max-w-xs truncate">
                        {s.errors ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET() {
  try {
    // Get latest log per source
    const { data: logs, error: logsError } = await supabaseServer
      .from('scrape_log')
      .select('*')
      .order('scraped_at', { ascending: false })
      .limit(200)

    if (logsError) {
      return NextResponse.json({ error: logsError.message }, { status: 500 })
    }

    // Get lot counts grouped by source
    const { data: lotCounts, error: countError } = await supabaseServer
      .from('lots')
      .select('source')

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 })
    }

    // Count by source
    const countBySource: Record<string, number> = {}
    for (const lot of lotCounts as any[] ?? []) {
      const s = (lot as any)?.source ?? 'unknown'
      countBySource[s] = (countBySource[s] ?? 0) + 1
    }

    const totalLots = (lotCounts ?? []).length

    // Get unique sources from logs
    const sourcesSeen = new Set<string>()
    const latestBySource: Record<string, any> = {}

    for (const log of logs as any[] ?? []) {
      const s = (log as any)?.source
      if (!sourcesSeen.has(s)) {
        sourcesSeen.add(s)
        latestBySource[s] = log
      }
    }

    const stats = Object.values(latestBySource).map((log) => ({
      source: log.source,
      lastRun: log.scraped_at,
      recordsFound: log.records_found ?? 0,
      recordsAdded: log.records_added ?? 0,
      recordsUpdated: log.records_updated ?? 0,
      errors: log.errors ?? null,
      totalInDB: countBySource[log.source] ?? 0,
    }))

    // Add sources that are in lots table but have no log entries
    for (const [source, count] of Object.entries(countBySource)) {
      if (!latestBySource[source]) {
        stats.push({
          source,
          lastRun: null,
          recordsFound: 0,
          recordsAdded: 0,
          recordsUpdated: 0,
          errors: null,
          totalInDB: count,
        })
      }
    }

    return NextResponse.json({ stats, totalLots })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

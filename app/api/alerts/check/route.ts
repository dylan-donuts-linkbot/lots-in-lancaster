import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

// Cron endpoint: runs daily to match new lots against user alerts
// Called via: curl https://lots-in-lancaster.vercel.app/api/alerts/check
// Add to vercel.json cron: "0 8 * * *" (daily at 8 AM UTC)

interface Alert {
  id: string
  name: string
  min_acres?: number
  max_acres?: number
  min_price?: number
  max_price?: number
  townships?: string[]
  status?: string
  sources?: string[]
  last_checked?: string
}

interface Lot {
  id: string
  address: string
  city: string
  lot_size_acres: number
  list_price?: number
  status: string
  source: string
  created_at: string
}

function lotMatchesAlert(lot: Lot, alert: Alert): boolean {
  // Check acreage
  if (alert.min_acres && lot.lot_size_acres < alert.min_acres) return false
  if (alert.max_acres && lot.lot_size_acres > alert.max_acres) return false

  // Check price
  if (lot.list_price) {
    if (alert.min_price && lot.list_price < alert.min_price) return false
    if (alert.max_price && lot.list_price > alert.max_price) return false
  }

  // Check township
  if (alert.townships && alert.townships.length > 0) {
    const matchesTownship = alert.townships.some(t =>
      lot.city?.toLowerCase().includes(t.toLowerCase())
    )
    if (!matchesTownship) return false
  }

  // Check status
  if (alert.status && lot.status !== alert.status) return false

  // Check source
  if (alert.sources && alert.sources.length > 0) {
    if (!alert.sources.includes(lot.source)) return false
  }

  return true
}

export async function GET(req: NextRequest) {
  try {
    // Verify this is a legitimate cron call (optional: could add secret header check)
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      // Only enforce in production
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    // Get all alerts
    const { data: alerts, error: alertError } = await supabaseServer
      .from('alerts')
      .select('*')

    if (alertError) {
      return NextResponse.json({ error: alertError.message }, { status: 400 })
    }

    if (!alerts || alerts.length === 0) {
      return NextResponse.json({
        message: 'No alerts to check',
        matched: 0,
      })
    }

    // Get lots created since last check (last 24 hours default)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: recentLots, error: lotError } = await supabaseServer
      .from('lots')
      .select('*')
      .gt('created_at', twentyFourHoursAgo)
      .order('created_at', { ascending: false })

    if (lotError) {
      return NextResponse.json({ error: lotError.message }, { status: 400 })
    }

    // Match lots against alerts
    const matches: Array<{
      alert_id: string
      alert_name: string
      lots: Lot[]
    }> = []

    for (const alert of alerts) {
      const matchedLots = recentLots.filter(lot => lotMatchesAlert(lot, alert))

      if (matchedLots.length > 0) {
        matches.push({
          alert_id: alert.id,
          alert_name: alert.name,
          lots: matchedLots,
        })

        // Update last_checked timestamp
        await supabaseServer
          .from('alerts')
          .update({
            last_checked: new Date().toISOString(),
          })
          .eq('id', alert.id)

        // Store matches in alerts_matches table for historical tracking
        for (const lot of matchedLots) {
          await supabaseServer.from('alerts_matches').insert({
            alert_id: alert.id,
            lot_id: lot.id,
            matched_at: new Date().toISOString(),
          })
        }
      }
    }

    return NextResponse.json({
      message: `Alert check complete: ${recentLots.length} new lots checked against ${alerts.length} alerts`,
      matches_found: matches.length,
      total_matched_lots: matches.reduce((sum, m) => sum + m.lots.length, 0),
      matches,
    })
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  // Also allow POST for easier manual triggering
  return GET(req)
}

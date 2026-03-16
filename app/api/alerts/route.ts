import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

// GET: List all alerts
// POST: Create a new alert
// PATCH: Update an alert
// DELETE: Delete an alert

interface Alert {
  id?: string
  name: string
  min_acres?: number
  max_acres?: number
  min_price?: number
  max_price?: number
  townships?: string[] // Lancaster County townships to search
  status?: 'unknown' | 'sold' | 'for_sale'
  sources?: string[] // ['gis', 'landwatch', 'redfin', etc]
  created_at?: string
  updated_at?: string
}

export async function GET(req: NextRequest) {
  try {
    const { data, error } = await supabaseServer
      .from('alerts')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ alerts: data })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: Alert = await req.json()

    const { data, error } = await supabaseServer
      .from('alerts')
      .insert({
        name: body.name,
        min_acres: body.min_acres,
        max_acres: body.max_acres,
        min_price: body.min_price,
        max_price: body.max_price,
        townships: body.townships || [],
        status: body.status || 'for_sale',
        sources: body.sources || ['gis', 'landwatch'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ alert: data?.[0] }, { status: 201 })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, ...updates } = await req.json()

    if (!id) {
      return NextResponse.json({ error: 'Missing alert ID' }, { status: 400 })
    }

    const { data, error } = await supabaseServer
      .from('alerts')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ alert: data?.[0] })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()

    if (!id) {
      return NextResponse.json({ error: 'Missing alert ID' }, { status: 400 })
    }

    const { error } = await supabaseServer
      .from('alerts')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

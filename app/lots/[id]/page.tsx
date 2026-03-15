import { supabaseServer } from '@/lib/supabase-server'
import Link from 'next/link'
import { notFound } from 'next/navigation'

interface Lot {
  id: string
  address: string | null
  township: string | null
  city: string | null
  zip: string | null
  utilities: string | null
  lot_size_acres: number | null
  zoning: string | null
  status: string | null
  parcel_id: string | null
  list_price: number | null
  sold_price: number | null
  sold_date: string | null
  listed_date: string | null
  owner_name: string | null
  owner_contact: string | null
  agent_name: string | null
  agent_contact: string | null
  zillow_link: string | null
  realtor_link: string | null
  lat: number | null
  lng: number | null
  source: string | null
  last_scraped_at: string | null
  raw_data: unknown | null
}

function fmt(n: number | null, prefix = '') {
  if (n == null) return '—'
  return prefix + n.toLocaleString()
}

function fmtDate(s: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString()
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-900">{value || '—'}</dd>
    </div>
  )
}

function ContactField({ label, value }: { label: string; value: string | null }) {
  if (!value) return <Field label={label} value={null} />
  const isPhone = /^[\d\s\-\(\)\+]+$/.test(value.trim())
  const isEmail = value.includes('@')
  let rendered: React.ReactNode = value
  if (isPhone) rendered = <a href={`tel:${value.replace(/\s/g, '')}`} className="text-blue-600 hover:underline">{value}</a>
  else if (isEmail) rendered = <a href={`mailto:${value}`} className="text-blue-600 hover:underline">{value}</a>
  return <Field label={label} value={rendered} />
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <h2 className="text-sm font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">{title}</h2>
      <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {children}
      </dl>
    </div>
  )
}

function StatusBadge({ status }: { status: string | null }) {
  const map: Record<string, string> = {
    for_sale: 'bg-green-100 text-green-800',
    sold: 'bg-gray-200 text-gray-600',
    unknown: 'bg-yellow-100 text-yellow-800',
  }
  const cls = map[status ?? ''] ?? 'bg-gray-100 text-gray-500'
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {status ?? 'unknown'}
    </span>
  )
}

export default async function LotDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data: lot, error } = await supabaseServer
    .from('lots')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !lot) notFound()

  const l = lot as Lot
  const googleMapsUrl = l.lat && l.lng
    ? `https://maps.google.com/maps?q=${l.lat},${l.lng}`
    : l.address
      ? `https://maps.google.com/maps?q=${encodeURIComponent([l.address, l.city, 'PA', l.zip].filter(Boolean).join(', '))}`
      : null

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to listings
          </Link>
          <span className="text-gray-300">|</span>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{l.address ?? 'Lot Detail'}</h1>
            {(l.township || l.city) && (
              <p className="text-sm text-gray-500">{[l.township, l.city, 'PA', l.zip].filter(Boolean).join(', ')}</p>
            )}
          </div>
          <div className="ml-auto">
            <StatusBadge status={l.status} />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        {/* Map */}
        {l.lat && l.lng ? (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <iframe
              title="Map"
              width="100%"
              height="300"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={`https://maps.google.com/maps?q=${l.lat},${l.lng}&z=15&output=embed`}
              className="w-full"
            />
          </div>
        ) : null}

        {/* Address & Location */}
        <Section title="Address & Location">
          <Field label="Address" value={l.address} />
          <Field label="Township" value={l.township} />
          <Field label="City" value={l.city} />
          <Field label="Zip" value={l.zip} />
          <Field label="Utilities" value={l.utilities} />
          {l.lat && l.lng && (
            <Field label="Coordinates" value={`${l.lat}, ${l.lng}`} />
          )}
        </Section>

        {/* Property Details */}
        <Section title="Property Details">
          <Field label="Lot Size" value={l.lot_size_acres != null ? `${l.lot_size_acres} acres` : null} />
          <Field label="Zoning" value={l.zoning} />
          <Field label="Status" value={<StatusBadge status={l.status} />} />
          <Field label="Parcel ID" value={l.parcel_id} />
        </Section>

        {/* Pricing */}
        <Section title="Pricing">
          <Field label="List Price" value={fmt(l.list_price, '$')} />
          <Field label="Sold Price" value={fmt(l.sold_price, '$')} />
          <Field label="Listed Date" value={fmtDate(l.listed_date)} />
          <Field label="Sold Date" value={fmtDate(l.sold_date)} />
        </Section>

        {/* Contacts */}
        <Section title="Contacts">
          <Field label="Owner Name" value={l.owner_name} />
          <ContactField label="Owner Contact" value={l.owner_contact} />
          <Field label="Agent Name" value={l.agent_name} />
          <ContactField label="Agent Contact" value={l.agent_contact} />
        </Section>

        {/* Links */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">Links</h2>
          <div className="flex flex-wrap gap-3">
            {l.zillow_link && (
              <a href={l.zillow_link} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100">
                Zillow
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
            {l.realtor_link && (
              <a href={l.realtor_link} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100">
                Realtor.com
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
            {googleMapsUrl && (
              <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded border border-green-200 bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700 hover:bg-green-100">
                Google Maps
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
          </div>
          {!l.zillow_link && !l.realtor_link && !googleMapsUrl && (
            <p className="text-sm text-gray-400">No links available</p>
          )}
        </div>

        {/* Scraped Data */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">Scraped Data</h2>
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
            <Field label="Source" value={l.source} />
            <Field label="Last Scraped" value={fmtDate(l.last_scraped_at)} />
          </dl>
          {l.raw_data && (
            <details className="group">
              <summary className="cursor-pointer text-xs font-medium text-blue-600 hover:text-blue-800 select-none">
                View raw data
              </summary>
              <pre className="mt-2 overflow-x-auto rounded bg-gray-50 p-3 text-xs text-gray-700 border border-gray-200">
                {JSON.stringify(l.raw_data, null, 2)}
              </pre>
            </details>
          )}
        </div>
      </main>
    </div>
  )
}

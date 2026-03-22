// Shared type definitions — single source of truth for the Lot interface

/** Minimal lot fields used in listing views */
export interface LotSummary {
  id: string
  address: string | null
  township: string | null
  lot_size_acres: number | null
  status: string | null
  list_price: number | null
  source: string | null
  last_scraped_at: string | null
  has_building: boolean | null
  images: Array<{ url: string; source: string }> | null
  enriched_data: Record<string, unknown> | null
  gis_latitude: number | null
  gis_longitude: number | null
}

/** Full lot record from Supabase */
export interface Lot extends LotSummary {
  city: string | null
  zip: string | null
  utilities: string | null
  zoning: string | null
  parcel_id: string | null
  sold_price: number | null
  sold_date: string | null
  listed_date: string | null
  owner_name: string | null
  owner_contact: string | null
  agent_name: string | null
  agent_contact: string | null
  zillow_link: string | null
  zillow_url: string | null
  realtor_link: string | null
  google_maps_url: string | null
  mls_id: string | null
  lat: number | null
  lng: number | null
  raw_data: unknown | null

  // Phase 3: Data Enrichment
  satellite_image_url: string | null
  satellite_cached_at: string | null
  zoning_description: string | null
  assessed_value: number | null
  annual_tax: number | null
  last_assessment_year: number | null
  distance_to_lancaster_city: number | null
  distance_to_nearest_town: number | null
}

/** Filter params used across listing & export routes */
export interface LotFilters {
  status?: string | null
  minAcres?: string | null
  maxAcres?: string | null
  township?: string | null
  minPrice?: string | null
  maxPrice?: string | null
  source?: string | null
  hasBuilding?: boolean
}

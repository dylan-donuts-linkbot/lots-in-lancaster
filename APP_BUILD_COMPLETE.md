# App Build Complete

## Pages Built

### Home / Lots Listing (`/`)
- Client component with live filter controls: status dropdown, min/max acres, township search, min/max price
- Table with columns: Address, Township, Lot Size, Status, Price, Source, Last Updated
- Sorted by price ascending via API (nulls last)
- Empty state UI when no results
- Clickable rows navigate to detail page
- Filter count shown after results load

### Lot Detail (`/lots/[id]`)
- Server-side rendered via Supabase service role client
- Sections: Address & Location, Property Details, Pricing, Contacts, Links, Scraped Data
- Clickable phone/email links in Contacts section
- Google Maps iframe embed when lat/lng available; falls back to address-based link
- External links (Zillow, Realtor.com, Google Maps) open in new tab
- Expandable `<details>` block for raw JSON data
- 404 via `notFound()` if ID not found
- Back button to listings

## API Route (`/api/lots`)
- `GET /api/lots` accepts: `status`, `minAcres`, `maxAcres`, `township`, `minPrice`, `maxPrice`, `source`, `orderBy`, `limit`, `offset`
- Uses Supabase service role key (server-side only — keys never sent to browser)
- Validates/sanitizes orderBy to prevent arbitrary column injection
- Default limit 500, max 1000

## Supabase Integration
- Listing page calls `/api/lots` (no Supabase keys in browser bundle)
- Detail page uses `supabaseServer` (service role) directly in server component
- Queries `lots` table with `.select('*')`

## Vercel Auto-Deploy
- Triggered via `git push origin main` (commit `c298fab`)
- Vercel will auto-deploy on push to main

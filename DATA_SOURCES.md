# Lancaster County PA — Land Data Sources

Research compiled for the Lots in Lancaster project.
**Filters:** ≥1 acre, SFR zoning, Lancaster County PA
**Budget:** ≤$150k (utilities), ≤$100k (no utilities)

---

## 1. Lancaster County GIS / Parcels (PRIMARY)

- **URL:** https://lcwatlas.lancastercountypa.gov
- **API:** ArcGIS REST Services at `https://services.lancastercountypa.gov/lancastercountypa/rest/services/Parcels/MapServer`
- **Data available:** Parcel boundaries, owner name, mailing address, parcel ID, acreage, land use code, zoning
- **Access method:** ArcGIS REST API — query with `where=ACRES>=1 AND ZONING LIKE '%SF%'`, returns GeoJSON or JSON
- **Rate limits:** None known (public government data)
- **ToS:** Public record — no restrictions
- **Key fields:** PARCELID, OWNER, MAILADDR, ACRES, LANDUSE, ZONING, geometry (for lat/lng centroid)
- **Notes:** This is the most comprehensive source for ALL parcels (including off-market). Use this as the base dataset, then cross-reference with listing sites for price/sale data.
- **Private sales:** Cross-reference parcel ownership changes against the Recorder of Deeds transfer data

---

## 2. Lancaster County Recorder of Deeds (PRIVATE SALES)

- **URL:** https://landrecords.lancastercountypa.gov
- **Data available:** Deed transfers, grantor/grantee, sale date, consideration (price), parcel ID, property description
- **Access method:** Web portal search by date range, parcel ID, or name. Also available via Pennsylvania's unified land records system.
- **Rate limits:** Scraper-friendly with reasonable delays
- **ToS:** Public record — no restrictions on access
- **Key fields:** Grantor (seller), Grantee (buyer), Consideration (price), Recording Date, Legal Description, Parcel ID
- **Notes:** This is the ONLY source for private sales (not MLS-listed). Filter by deed type = "Deed" or "Warranty Deed", consideration > $1 (excludes family transfers), cross-reference parcel ID against GIS for acreage filter.
- **Date range:** Filter last 2 years

---

## 3. Bright MLS (PUBLIC MLS LISTINGS)

- **URL:** https://www.brightmls.com (agent-facing) / public search at Realtor.com
- **Coverage:** Serves Lancaster County PA — dominant MLS for the region
- **Data available:** Active listings, sold listings (last 2 years), list price, sold price, DOM, MLS ID, agent info, lot size, zoning
- **Access method:** 
  - Public: Realtor.com API or scrape (Bright MLS data feeds into Realtor.com)
  - Preferred: Use Realtor.com's public listing search for Lancaster County, land category
  - IDX feed requires licensed agent access — use public portals instead
- **Rate limits:** Realtor.com blocks aggressive scraping — use Playwright with delays
- **Key fields:** MLS_ID, list_price, sold_price, address, lot_size, zoning, agent_name, agent_phone, listing_url
- **Notes:** Best source for MLS-listed active and recently sold lots

---

## 4. Zillow Land Listings

- **URL:** https://www.zillow.com/lancaster-county-pa/lots-land/
- **Data available:** Active for-sale listings (pulls from MLS + FSBO), Zestimate, list price, lot size, address, agent info, Zillow listing URL
- **Access method:** 
  - Unofficial API via RapidAPI: `zillow-com1.p.rapidapi.com` — search by location + home type = lot/land
  - Playwright scrape as fallback (Zillow blocks bots aggressively)
- **Rate limits:** Strict — use delays, rotate user agents
- **ToS:** Scraping technically against ToS — use unofficial API or Playwright carefully
- **Key fields:** zpid, address, price, lotSizeAcres, listingUrl, agentName, agentPhone, latitude, longitude
- **Notes:** Good for active listings and some FSBO. Less reliable for sold data — use MLS/Deeds for that.

---

## 5. LandWatch.com

- **URL:** https://www.landwatch.com/lancaster-county-pennsylvania-land-for-sale
- **Data available:** Active land listings, acreage, price, agent/broker contact, listing URL
- **Access method:** Playwright scrape — more scraper-friendly than Zillow. Direct URL with filters: county=Lancaster, state=PA, minAcres=1
- **Rate limits:** Moderate — add 1-2s delays between requests
- **ToS:** Scraping allowed with reasonable use
- **Key fields:** title, acres, price, address, contact_name, contact_phone, listing_url, lat/lng (often in page data)
- **Notes:** Land-specific site — higher signal-to-noise than Zillow for lots

---

## 6. Land.com

- **URL:** https://www.land.com/land-for-sale/pennsylvania/lancaster-county/
- **Data available:** Similar to LandWatch — active listings, acreage, price, agent contact
- **Access method:** Playwright scrape. Same company as LandWatch (Network of Land), similar structure.
- **Rate limits:** Moderate
- **Notes:** Often same listings as LandWatch but worth including for coverage

---

## 7. LandAndFarm.com

- **URL:** https://www.landandfarm.com/search/PA-land-for-sale/?county=Lancaster
- **Data available:** Listings including farm-adjacent lots, often overlaps with LandWatch
- **Access method:** Playwright scrape
- **Notes:** Good for agricultural-zoned lots that may allow SFR

---

## 8. Pennsylvania Spatial Data Access (PASDA)

- **URL:** https://www.pasda.psu.edu
- **Data available:** Statewide GIS datasets including parcel boundaries, zoning layers, municipal boundaries, roads, utilities infrastructure
- **Access method:** Direct download (Shapefile/GeoJSON) — bulk data
- **Rate limits:** None (open data portal)
- **ToS:** Public — no restrictions
- **Notes:** Use for utility infrastructure layer (sewer/water service areas) to determine whether a parcel has utilities available. Lancaster County sewer authority service area maps available here.

---

## 9. Lancaster County Tax Assessment

- **URL:** https://assessment.lancastercountypa.gov
- **Data available:** Assessment values, owner info, parcel info, tax history
- **Access method:** Web search / scrape per parcel
- **Notes:** Useful for cross-referencing owner contact info and property tax data. Less useful as primary source — GIS has better parcel data.

---

## Recommended Scraping Priority

| Priority | Source | Why |
|----------|--------|-----|
| 1 | Lancaster County GIS ArcGIS API | Complete parcel dataset, free, structured API |
| 2 | Lancaster County Recorder of Deeds | Only source for private sales |
| 3 | LandWatch.com | Best land-specific listing site, scraper-friendly |
| 4 | Zillow (unofficial API) | Large reach, active listings |
| 5 | Land.com | Additional listing coverage |
| 6 | Realtor.com (Bright MLS) | MLS data, sold prices |
| 7 | PASDA utilities layer | Determine utilities availability for budget filter |

---

## Utilities Detection Strategy

Per budget requirement ($150k w/ utilities / $100k w/o):
- Pull Lancaster County Municipal Authority service area boundaries from PASDA or LCMA website
- Cross-reference lot lat/lng against service area polygons
- Flag each lot as `utilities=yes/no/unknown`
- This enables the app to apply the correct budget filter per lot

---

_Researched: 2026-03-15_

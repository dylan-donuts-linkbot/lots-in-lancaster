/**
 * Lancaster County Tax Assessment Data Scraper (STUB)
 *
 * Lancaster County provides property assessment data through:
 *   - Web portal: https://lancastercountyassessment.org/
 *   - Individual property lookup: https://lancastercountyassessment.org/AssessmentSearch/PropertyDetail/{UPI}
 *
 * The GIS data already includes LOT_ASSESS and TOT_ASSESS fields.
 * This module provides a structured interface for tax data enrichment.
 *
 * TODO: The Lancaster County Assessor website does not expose a public JSON API.
 *       Options for future implementation:
 *       1. Scrape the HTML from the PropertyDetail page (fragile, may violate ToS)
 *       2. Check if they offer a data download / bulk export
 *       3. Use the GIS TOT_ASSESS field as an approximation
 *       4. Check PA state-level assessment APIs
 *
 * Tax rate reference (Lancaster County):
 *   - County tax rate: ~4.369 mills (2024)
 *   - School district varies by municipality
 *   - Total effective rate: roughly 20-30 mills depending on school district
 *   - Formula: annual_tax = (assessed_value / 1000) * millage_rate
 */

export interface TaxData {
  assessedValue: number | null
  annualTax: number | null
  lastAssessmentYear: number | null
}

// Average total millage rate for Lancaster County (county + school + municipal)
// This is a rough estimate — actual rates vary by school district
const ESTIMATED_TOTAL_MILLAGE = 25 // mills per $1,000 of assessed value

/**
 * Estimate tax data from GIS assessment values.
 *
 * Uses the total assessment from GIS data and an estimated millage rate
 * to approximate annual property tax.
 *
 * @param totalAssessment - TOT_ASSESS value from GIS parcel data
 * @param lotAssessment - LOT_ASSESS value from GIS parcel data (land only)
 */
export function estimateTaxFromGIS(
  totalAssessment: number | null,
  lotAssessment: number | null
): TaxData {
  if (totalAssessment == null && lotAssessment == null) {
    return { assessedValue: null, annualTax: null, lastAssessmentYear: null }
  }

  const assessedValue = totalAssessment ?? lotAssessment ?? null
  const annualTax = assessedValue != null
    ? Math.round((assessedValue / 1000) * ESTIMATED_TOTAL_MILLAGE)
    : null

  return {
    assessedValue,
    annualTax,
    lastAssessmentYear: new Date().getFullYear(), // GIS data is current year
  }
}

/**
 * Fetch tax data from Lancaster County Assessor website.
 *
 * TODO: Not implemented — requires HTML scraping or API access.
 * Currently returns null values. Use estimateTaxFromGIS() as a fallback.
 *
 * @param parcelId - UPI (Universal Parcel Identifier) e.g. "350-12345-0-0000"
 */
export async function fetchTaxData(parcelId: string): Promise<TaxData> {
  // Endpoint that would need to be scraped:
  // https://lancastercountyassessment.org/AssessmentSearch/PropertyDetail/{parcelId}
  //
  // Expected data structure from the page:
  // {
  //   assessedValue: number,    // "Total Assessment" field
  //   landValue: number,        // "Land Assessment" field  
  //   improvementValue: number, // "Improvement Assessment" field
  //   taxYear: number,          // Assessment year
  //   countyTax: number,        // County portion
  //   schoolTax: number,        // School district portion
  //   municipalTax: number,     // Municipal portion
  //   totalTax: number          // Sum of all
  // }

  void parcelId // suppress unused warning
  return { assessedValue: null, annualTax: null, lastAssessmentYear: null }
}

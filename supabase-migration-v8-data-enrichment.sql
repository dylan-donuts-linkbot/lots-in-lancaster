-- Phase 3: Data Enrichment Migration
-- Adds satellite imagery, zoning descriptions, tax data, and distance calculations
-- All new columns are NULLABLE for backward compatibility

-- 1. Satellite Images
ALTER TABLE lots ADD COLUMN IF NOT EXISTS satellite_image_url TEXT;
ALTER TABLE lots ADD COLUMN IF NOT EXISTS satellite_cached_at TIMESTAMPTZ;

-- 2. Zoning Description (human-readable)
ALTER TABLE lots ADD COLUMN IF NOT EXISTS zoning_description TEXT;

-- 3. Tax Assessment Data
ALTER TABLE lots ADD COLUMN IF NOT EXISTS assessed_value NUMERIC;
ALTER TABLE lots ADD COLUMN IF NOT EXISTS annual_tax NUMERIC;
ALTER TABLE lots ADD COLUMN IF NOT EXISTS last_assessment_year INTEGER;

-- 4. Distance Calculations
ALTER TABLE lots ADD COLUMN IF NOT EXISTS distance_to_lancaster_city NUMERIC;  -- miles
ALTER TABLE lots ADD COLUMN IF NOT EXISTS distance_to_nearest_town NUMERIC;    -- miles

-- Notes:
-- street_view_url is computed on-the-fly from lat/lng, not stored
-- All columns are nullable to avoid breaking existing rows
-- satellite_image_url stores Google Maps Static API URL (not the image itself)
-- distance columns store driving distance in miles

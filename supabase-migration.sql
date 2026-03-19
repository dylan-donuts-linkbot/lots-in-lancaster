-- Supabase migration for Lots in Lancaster overhaul
-- Add new columns to lots table

-- Add has_building boolean column
ALTER TABLE lots ADD COLUMN IF NOT EXISTS has_building BOOLEAN;

-- Add images JSONB array column
ALTER TABLE lots ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;

-- Add enriched_data JSONB column
ALTER TABLE lots ADD COLUMN IF NOT EXISTS enriched_data JSONB DEFAULT '{}'::jsonb;

-- Add GIS coordinates
ALTER TABLE lots ADD COLUMN IF NOT EXISTS gis_latitude FLOAT;
ALTER TABLE lots ADD COLUMN IF NOT EXISTS gis_longitude FLOAT;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_lots_has_building ON lots(has_building);
CREATE INDEX IF NOT EXISTS idx_lots_gis_coords ON lots(gis_latitude, gis_longitude);

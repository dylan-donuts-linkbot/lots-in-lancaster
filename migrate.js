const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gzqxkkcqbpgjysvhcjlv.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_KEY;

if (!serviceRoleKey) {
  console.error('Error: SUPABASE_SERVICE_KEY environment variable not set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
});

const migration = `
ALTER TABLE lots ADD COLUMN IF NOT EXISTS satellite_image_url TEXT;
ALTER TABLE lots ADD COLUMN IF NOT EXISTS satellite_cached_at TIMESTAMPTZ;
ALTER TABLE lots ADD COLUMN IF NOT EXISTS zoning_description TEXT;
ALTER TABLE lots ADD COLUMN IF NOT EXISTS assessed_value NUMERIC;
ALTER TABLE lots ADD COLUMN IF NOT EXISTS annual_tax NUMERIC;
ALTER TABLE lots ADD COLUMN IF NOT EXISTS last_assessment_year INTEGER;
ALTER TABLE lots ADD COLUMN IF NOT EXISTS distance_to_lancaster_city NUMERIC;
ALTER TABLE lots ADD COLUMN IF NOT EXISTS distance_to_nearest_town NUMERIC;
`;

async function runMigration() {
  try {
    console.log('Running Phase 3 migration...');
    const { data, error } = await supabase.rpc('exec_sql', { query: migration });
    
    if (error) {
      console.error('Migration failed:', error);
      process.exit(1);
    }
    
    console.log('✅ Migration successful!');
    if (data) console.log(data);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

runMigration();

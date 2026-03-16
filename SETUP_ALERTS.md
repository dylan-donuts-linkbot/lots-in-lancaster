# Alerts Feature Setup

The alerts system allows users to save searches and get notified when new lots match their criteria.

## Required Supabase Tables

Run the following SQL in the Supabase dashboard (SQL Editor) to create the necessary tables:

```sql
-- Alerts table: stores user-defined searches
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  min_acres NUMERIC,
  max_acres NUMERIC,
  min_price NUMERIC,
  max_price NUMERIC,
  townships TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'for_sale', -- 'unknown', 'sold', 'for_sale'
  sources TEXT[] DEFAULT '{gis,landwatch}', -- data sources to search
  last_checked TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Alert matches table: historical log of which lots matched which alerts
CREATE TABLE IF NOT EXISTS alerts_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID REFERENCES alerts(id) ON DELETE CASCADE,
  lot_id UUID REFERENCES lots(id) ON DELETE CASCADE,
  matched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_alerts_matches_alert_id ON alerts_matches(alert_id);
CREATE INDEX idx_alerts_matches_lot_id ON alerts_matches(lot_id);
CREATE INDEX idx_alerts_matches_matched_at ON alerts_matches(matched_at);
```

## API Endpoints

### Create an Alert
```bash
curl -X POST https://lots-in-lancaster.vercel.app/api/alerts \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Under $500k, 5+ acres",
    "min_acres": 5,
    "max_acres": null,
    "min_price": null,
    "max_price": 500000,
    "townships": ["Lancaster", "Manheim", "Lititz"],
    "status": "for_sale",
    "sources": ["landwatch", "gis"]
  }'
```

### List All Alerts
```bash
curl https://lots-in-lancaster.vercel.app/api/alerts
```

### Update an Alert
```bash
curl -X PATCH https://lots-in-lancaster.vercel.app/api/alerts \
  -H "Content-Type: application/json" \
  -d '{
    "id": "alert-uuid",
    "max_price": 600000
  }'
```

### Delete an Alert
```bash
curl -X DELETE https://lots-in-lancaster.vercel.app/api/alerts \
  -H "Content-Type: application/json" \
  -d '{"id": "alert-uuid"}'
```

### Check Alerts (Cron)
Runs automatically daily at 10 AM UTC via Vercel Cron.
Manual trigger:
```bash
curl -X POST https://lots-in-lancaster.vercel.app/api/alerts/check \
  -H "Authorization: Bearer $CRON_SECRET"
```

## Cron Schedule

- **GIS Scraper**: 6 AM UTC (pulls Lancaster County parcels)
- **Zillow Scraper**: 7 AM UTC
- **LandWatch Scraper**: 8 AM UTC
- **Deeds Scraper**: 9 AM UTC
- **Alerts Check**: 10 AM UTC (matches new lots against alerts)

## Future Enhancements

- [ ] Email/SMS notifications when alerts match
- [ ] User dashboard to manage their alerts
- [ ] Price tracking and trend analysis
- [ ] Telegram/Slack integration
- [ ] Saved searches with custom filters (zoning, utilities, etc)

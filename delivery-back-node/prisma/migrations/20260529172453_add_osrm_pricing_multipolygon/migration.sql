-- Migration: add_osrm_pricing_multipolygon
-- 1. Ensure PostGIS extension exists
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Add pricing_details column to orders
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "pricing_details" JSONB;

-- 3. Migrate Zone polygon: Polygon → MultiPolygon (preserves existing data)
ALTER TABLE "zones"
  ALTER COLUMN "polygon" TYPE geometry(MultiPolygon, 4326)
  USING ST_Multi("polygon");

-- 4. Set extra_rate default to 1.0 (normal zone)
ALTER TABLE "zones" ALTER COLUMN "extra_rate" SET DEFAULT 1.0;

-- 5. Create GIST spatial indexes for performance
CREATE INDEX IF NOT EXISTS idx_city_coverage ON "cities" USING GIST (coverage_area);
CREATE INDEX IF NOT EXISTS idx_zone_polygon   ON "zones"  USING GIST (polygon);

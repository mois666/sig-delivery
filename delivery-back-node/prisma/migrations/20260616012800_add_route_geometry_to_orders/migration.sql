-- AddColumn: route_geometry (PostGIS LineString) to orders table
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "route_geometry" geometry(LineString,4326);

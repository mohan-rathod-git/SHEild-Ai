-- ============================================================
-- SHEildAI — Initial Migration
-- Enable the PostGIS extension for spatial queries
-- (safe-route geometry, incident locations, volunteer proximity)
-- ============================================================

create extension if not exists postgis;

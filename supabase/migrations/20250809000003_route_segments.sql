-- ============================================================
-- SHEildAI — Migration: route_segments
--
-- Stores road segments with risk metadata for the Predict pillar.
-- Geometry is a PostGIS LineString in WGS-84 (SRID 4326).
--
-- Access policy:
--   • Public READ  — anyone (anon/auth) can read risk data
--   • Service-role WRITE — only backend (service key) can insert/update/delete
-- ============================================================

-- ── Table ────────────────────────────────────────────────────
create table if not exists public.route_segments (
    id              bigserial primary key,
    segment_name    text        not null,
    geom            geometry(LineString, 4326) not null,
    risk_score      float       not null check (risk_score >= 0 and risk_score <= 1),
    lit_status      text        not null default 'unknown'
                                check (lit_status in ('well_lit', 'partially_lit', 'unlit', 'unknown')),
    cctv_present    boolean     not null default false,
    notes           text,
    created_at      timestamptz not null default now()
);

-- Spatial index for bounding-box queries
create index if not exists route_segments_geom_idx
    on public.route_segments using gist(geom);

-- ── Row Level Security ───────────────────────────────────────
alter table public.route_segments enable row level security;

-- Public read (anon + authenticated)
create policy "public_read_segments"
    on public.route_segments
    for select
    using (true);

-- Service-role-only writes (INSERT / UPDATE / DELETE)
-- The service role bypasses RLS by default in Supabase, so no explicit
-- write policy is needed — but we add a named policy for clarity / audit.
-- Authenticated users cannot write; the backend uses the service key.
create policy "service_role_write_segments"
    on public.route_segments
    for all
    using (auth.role() = 'service_role')
    with check (auth.role() = 'service_role');

-- ── Seed data — Bengaluru: Koramangala ↔ Indiranagar corridor ─
-- Approximate lat/lng pairs for a realistic urban area.
-- risk_score: 0.0 = very safe, 1.0 = high risk
-- These are mock values; Phase 6 will replace with ML predictions.

insert into public.route_segments
    (segment_name, geom, risk_score, lit_status, cctv_present, notes)
values
    -- Main arterial (well-lit, CCTV — low risk)
    ('80 Feet Road - Sec 1',
     ST_GeomFromText('LINESTRING(77.6101 12.9352, 77.6130 12.9378, 77.6158 12.9402)', 4326),
     0.12, 'well_lit', true, 'Main commercial road, heavy footfall'),

    ('80 Feet Road - Sec 2',
     ST_GeomFromText('LINESTRING(77.6158 12.9402, 77.6185 12.9425, 77.6210 12.9448)', 4326),
     0.15, 'well_lit', true, 'Continues to Indiranagar junction'),

    ('Indiranagar 100 Feet Road',
     ST_GeomFromText('LINESTRING(77.6380 12.9784, 77.6410 12.9768, 77.6441 12.9754)', 4326),
     0.10, 'well_lit', true, 'Commercial strip, 24/7 activity'),

    -- Side streets (partial lighting — moderate risk)
    ('12th Main Koramangala',
     ST_GeomFromText('LINESTRING(77.6190 12.9352, 77.6212 12.9340, 77.6235 12.9328)', 4326),
     0.42, 'partially_lit', false, 'Residential lane, quieter at night'),

    ('17th Cross Indiranagar',
     ST_GeomFromText('LINESTRING(77.6395 12.9743, 77.6378 12.9732, 77.6360 12.9720)', 4326),
     0.38, 'partially_lit', false, 'Mixed residential/commercial'),

    ('HAL Old Airport Road - South',
     ST_GeomFromText('LINESTRING(77.6478 12.9680, 77.6496 12.9656, 77.6512 12.9632)', 4326),
     0.45, 'partially_lit', true, 'Near airport perimeter, less foot traffic'),

    ('Koramangala 5th Block Inner',
     ST_GeomFromText('LINESTRING(77.6231 12.9348, 77.6250 12.9362, 77.6268 12.9375)', 4326),
     0.35, 'partially_lit', false, 'Residential area'),

    -- Dark/high-risk segments (unlit, no CCTV)
    ('Service Lane near Ejipura',
     ST_GeomFromText('LINESTRING(77.6135 12.9502, 77.6148 12.9518, 77.6162 12.9533)', 4326),
     0.78, 'unlit', false, 'Poorly lit service road, avoid at night'),

    ('Underpass - Silk Board',
     ST_GeomFromText('LINESTRING(77.6219 12.9175, 77.6230 12.9188, 77.6240 12.9200)', 4326),
     0.85, 'unlit', false, 'Underpass with limited visibility'),

    ('Back Lane - Hongasandra',
     ST_GeomFromText('LINESTRING(77.6085 12.9092, 77.6098 12.9105, 77.6112 12.9118)', 4326),
     0.72, 'unlit', false, 'Industrial back lane, avoid after dark'),

    -- Medium segments bridging corridors
    ('Sarjapur Road - Junction Stretch',
     ST_GeomFromText('LINESTRING(77.6265 12.9318, 77.6290 12.9335, 77.6315 12.9350)', 4326),
     0.52, 'partially_lit', true, 'Busy junction, moderate safety'),

    ('CMH Road',
     ST_GeomFromText('LINESTRING(77.6402 12.9752, 77.6425 12.9770, 77.6448 12.9788)', 4326),
     0.22, 'well_lit', true, 'Main road with good coverage'),

    ('Domlur Link Road',
     ST_GeomFromText('LINESTRING(77.6302 12.9610, 77.6325 12.9625, 77.6348 12.9640)', 4326),
     0.48, 'partially_lit', false, 'Connects Koramangala to Indiranagar'),

    ('Intermediate Ring Road - East',
     ST_GeomFromText('LINESTRING(77.6350 12.9580, 77.6375 12.9600, 77.6400 12.9620)', 4326),
     0.30, 'well_lit', true, 'Major arterial, good lighting'),

    ('Intermediate Ring Road - West',
     ST_GeomFromText('LINESTRING(77.6100 12.9560, 77.6125 12.9575, 77.6150 12.9590)', 4326),
     0.25, 'well_lit', true, 'Wide road, well maintained'),

    -- Short connector lanes
    ('Old Madras Road Spur',
     ST_GeomFromText('LINESTRING(77.6462 12.9720, 77.6478 12.9705, 77.6495 12.9690)', 4326),
     0.62, 'partially_lit', false, 'Narrow connector, use with caution'),

    ('Koramangala Water Tank Lane',
     ST_GeomFromText('LINESTRING(77.6145 12.9390, 77.6162 12.9405, 77.6178 12.9420)', 4326),
     0.68, 'unlit', false, 'Isolated stretch near water tank'),

    ('4th T Block Road',
     ST_GeomFromText('LINESTRING(77.6310 12.9448, 77.6330 12.9462, 77.6350 12.9475)', 4326),
     0.28, 'well_lit', false, 'Residential main road, moderate traffic'),

    ('St Johns Road',
     ST_GeomFromText('LINESTRING(77.6195 12.9680, 77.6218 12.9695, 77.6242 12.9710)', 4326),
     0.18, 'well_lit', true, 'Hospital area, good security presence'),

    ('Viveka Nagar Cross',
     ST_GeomFromText('LINESTRING(77.6490 12.9805, 77.6510 12.9820, 77.6530 12.9835)', 4326),
     0.55, 'partially_lit', false, 'Quieter residential cross street')
;

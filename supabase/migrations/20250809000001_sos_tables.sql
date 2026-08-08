-- ============================================================
-- SHEildAI — SOS Respond Tables
-- Creates: sos_events, sos_event_recipients, volunteers
-- Enables: RLS policies + Supabase Realtime replication
-- ============================================================

-- ── sos_events ──────────────────────────────────────────────
create table if not exists public.sos_events (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  lat            double precision not null,
  lng            double precision not null,
  triggered_at   timestamptz not null default now(),
  status         text not null default 'triggered'
                   check (status in ('triggered', 'acknowledged', 'resolved')),
  trigger_source text not null
                   check (trigger_source in ('manual', 'voice', 'motion', 'mic')),
  synced_offline boolean not null default false,
  created_at     timestamptz not null default now()
);

-- Spatial index for proximity queries
create index if not exists idx_sos_events_location
  on public.sos_events using gist (
    ST_SetSRID(ST_MakePoint(lng, lat), 4326)
  );

create index if not exists idx_sos_events_user
  on public.sos_events (user_id, triggered_at desc);

-- RLS
alter table public.sos_events enable row level security;

-- Users can insert their own SOS events
create policy "Users can insert own SOS events"
  on public.sos_events for insert
  with check (auth.uid() = user_id);

-- Users can select their own SOS events
create policy "Users can select own SOS events"
  on public.sos_events for select
  using (auth.uid() = user_id);

-- Users can update their own SOS events (e.g. cancel / resolve)
create policy "Users can update own SOS events"
  on public.sos_events for update
  using (auth.uid() = user_id);

-- Recipients (volunteers / contacts / police) can SELECT an SOS event
-- if they have a row in sos_event_recipients for it
create policy "Recipients can view linked SOS events"
  on public.sos_events for select
  using (
    exists (
      select 1 from public.sos_event_recipients r
      where r.sos_event_id = id
        and r.recipient_user_id = auth.uid()
    )
  );


-- ── sos_event_recipients ────────────────────────────────────
create table if not exists public.sos_event_recipients (
  id                 uuid primary key default gen_random_uuid(),
  sos_event_id       uuid not null references public.sos_events(id) on delete cascade,
  recipient_user_id  uuid not null references auth.users(id) on delete cascade,
  role               text not null
                       check (role in ('contact', 'volunteer', 'police')),
  notified_at        timestamptz not null default now(),
  acknowledged_at    timestamptz,
  created_at         timestamptz not null default now()
);

create index if not exists idx_sos_recipients_event
  on public.sos_event_recipients (sos_event_id);

create index if not exists idx_sos_recipients_user
  on public.sos_event_recipients (recipient_user_id);

-- RLS
alter table public.sos_event_recipients enable row level security;

-- Recipients can see their own recipient rows
create policy "Recipients can view own recipient rows"
  on public.sos_event_recipients for select
  using (auth.uid() = recipient_user_id);

-- The SOS event owner can also see all recipients for their event
create policy "Event owner can view all recipients"
  on public.sos_event_recipients for select
  using (
    exists (
      select 1 from public.sos_events e
      where e.id = sos_event_id
        and e.user_id = auth.uid()
    )
  );

-- Recipients can update their own row (to set acknowledged_at)
create policy "Recipients can acknowledge"
  on public.sos_event_recipients for update
  using (auth.uid() = recipient_user_id);


-- ── volunteers ──────────────────────────────────────────────
create table if not exists public.volunteers (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade unique,
  lat          double precision not null,
  lng          double precision not null,
  is_verified  boolean not null default false,
  is_available boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Spatial index for proximity queries
create index if not exists idx_volunteers_location
  on public.volunteers using gist (
    ST_SetSRID(ST_MakePoint(lng, lat), 4326)
  );

create index if not exists idx_volunteers_available
  on public.volunteers (is_verified, is_available)
  where is_verified = true and is_available = true;

-- RLS
alter table public.volunteers enable row level security;

-- Any authenticated user can see volunteers (for map display etc.)
create policy "Authenticated users can view volunteers"
  on public.volunteers for select
  using (auth.role() = 'authenticated');

-- Users can insert/update their own volunteer profile
create policy "Users can manage own volunteer profile"
  on public.volunteers for insert
  with check (auth.uid() = user_id);

create policy "Users can update own volunteer profile"
  on public.volunteers for update
  using (auth.uid() = user_id);


-- ── Enable Supabase Realtime replication ────────────────────
-- Clients subscribe to live INSERT/UPDATE on these tables so
-- the SOS active screen updates in real time.
alter publication supabase_realtime add table public.sos_events;
alter publication supabase_realtime add table public.sos_event_recipients;

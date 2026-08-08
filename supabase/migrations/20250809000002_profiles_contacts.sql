-- ============================================================
-- SHEildAI — Profiles & Trusted Contacts
-- Creates: profiles, trusted_contacts
-- Enables: RLS policies
-- ============================================================

-- ── profiles ────────────────────────────────────────────────
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text,
  phone         text,
  avatar_url    text,
  city          text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Auto-create profile row on new signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data->>'display_name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);


-- ── trusted_contacts ────────────────────────────────────────
create table if not exists public.trusted_contacts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  phone        text,
  email        text,
  notify_sms   boolean not null default true,
  notify_email boolean not null default true,
  created_at   timestamptz not null default now()
);

create index if not exists idx_trusted_contacts_user
  on public.trusted_contacts (user_id);

-- RLS
alter table public.trusted_contacts enable row level security;

create policy "Users can manage own contacts"
  on public.trusted_contacts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Early Warning for Disease Outbreak Detection - Katipunan RHU, Zamboanga del Norte
-- Run this in the Supabase SQL editor.
-- Only aggregated monthly counts are stored. No patient identifiers.

create extension if not exists "pgcrypto";

-- Enumerations -------------------------------------------------------------
do $$ begin
  create type disease_t as enum ('cough', 'fever', 'diarrhea');
exception when duplicate_object then null; end $$;

do $$ begin
  create type risk_level_t as enum ('low', 'moderate', 'high');
exception when duplicate_object then null; end $$;

do $$ begin
  create type user_role_t as enum ('admin', 'health_officer', 'viewer');
exception when duplicate_object then null; end $$;

-- Users / roles ------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role user_role_t not null default 'viewer',
  created_at timestamptz not null default now()
);

-- Helper: current user's role
create or replace function public.current_role_name()
returns user_role_t
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid()
$$;

-- Auto-create a profile (viewer) when someone signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name) values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Data tables --------------------------------------------------------------
create table if not exists monthly_cases (
  id uuid primary key default gen_random_uuid(),
  year int not null check (year between 2000 and 2100),
  month int not null check (month between 1 and 12),
  cough int not null check (cough >= 0),
  fever int not null check (fever >= 0),
  diarrhea int not null check (diarrhea >= 0),
  entered_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  unique (year, month)
);

create table if not exists monthly_weather (
  id uuid primary key default gen_random_uuid(),
  year int not null,
  month int not null check (month between 1 and 12),
  rainfall_mm numeric not null,       -- total monthly rainfall
  temperature_c numeric not null,     -- mean monthly temperature
  humidity_pct numeric not null,      -- mean monthly relative humidity
  source text default 'open-meteo',
  created_at timestamptz not null default now(),
  unique (year, month)
);

-- Pipeline output tables (written by the Python job using the service role key)
create table if not exists predictions (
  id uuid primary key default gen_random_uuid(),
  year int not null,
  month int not null,
  disease disease_t not null,
  risk_score numeric not null check (risk_score between 0 and 1),
  risk_level risk_level_t not null,
  stat_threshold numeric,             -- statistical baseline threshold (cases)
  stat_exceeded boolean,
  top_factors jsonb,                  -- [{"feature": "...", "importance": 0.31}, ...]
  created_at timestamptz not null default now(),
  unique (year, month, disease)
);

create table if not exists alerts (
  id uuid primary key default gen_random_uuid(),
  year int not null,
  month int not null,
  disease disease_t not null,
  level risk_level_t not null,
  message text,
  status text not null default 'open' check (status in ('open', 'acknowledged', 'resolved')),
  acknowledged_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  unique (year, month, disease)
);

create table if not exists model_metrics (
  id uuid primary key default gen_random_uuid(),
  disease disease_t not null,
  model_name text not null,           -- 'statistical_baseline' | 'rf_no_weather' | 'rf_with_weather'
  accuracy numeric,
  precision_score numeric,
  recall numeric,
  f1 numeric,
  confusion_matrix jsonb,             -- {"tn":..,"fp":..,"fn":..,"tp":..}
  n_train int,
  n_test int,
  trained_at timestamptz not null default now()
);

create table if not exists settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

insert into settings (key, value) values
  ('alert_threshold', '{"sd_multiplier": 1.5, "moderate_score": 0.4, "high_score": 0.7}'),
  ('location', '{"name": "Katipunan, Zamboanga del Norte", "latitude": 8.5167, "longitude": 123.2833}')
on conflict (key) do nothing;

-- Row-level security -------------------------------------------------------
alter table profiles       enable row level security;
alter table monthly_cases  enable row level security;
alter table monthly_weather enable row level security;
alter table predictions    enable row level security;
alter table alerts         enable row level security;
alter table model_metrics  enable row level security;
alter table settings       enable row level security;

-- profiles: read own; admin reads/updates all
create policy "profiles read own or admin" on profiles for select
  using (id = auth.uid() or public.current_role_name() = 'admin');
create policy "profiles admin update" on profiles for update
  using (public.current_role_name() = 'admin');

-- Any signed-in user can read data and results
create policy "read cases"    on monthly_cases   for select to authenticated using (true);
create policy "read weather"  on monthly_weather for select to authenticated using (true);
create policy "read predictions" on predictions  for select to authenticated using (true);
create policy "read alerts"   on alerts          for select to authenticated using (true);
create policy "read metrics"  on model_metrics   for select to authenticated using (true);
create policy "read settings" on settings        for select to authenticated using (true);

-- Admin and health officers can enter case data
create policy "write cases insert" on monthly_cases for insert to authenticated
  with check (public.current_role_name() in ('admin', 'health_officer'));
create policy "write cases update" on monthly_cases for update to authenticated
  using (public.current_role_name() in ('admin', 'health_officer'));
create policy "write cases delete" on monthly_cases for delete to authenticated
  using (public.current_role_name() = 'admin');

-- Health officers/admin can acknowledge alerts
create policy "ack alerts" on alerts for update to authenticated
  using (public.current_role_name() in ('admin', 'health_officer'));

-- Only admin changes settings
create policy "admin settings write" on settings for all to authenticated
  using (public.current_role_name() = 'admin')
  with check (public.current_role_name() = 'admin');

-- monthly_weather, predictions, model_metrics and new alerts are written by the
-- Python pipeline with the service role key, which bypasses RLS.

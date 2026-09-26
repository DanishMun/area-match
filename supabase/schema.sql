-- Area Match database tables. `npm run db:setup` runs this for you.

create table if not exists cities (
  id    text primary key,          -- 'hel', 'tre'
  title text not null
);

create table if not exists areas (
  id      text primary key,        -- e.g. 'hel-kallio'
  city_id text not null references cities(id) on delete cascade,
  name    text not null,
  town    text not null,
  lat     double precision not null,
  lon     double precision not null,
  eur_m2  numeric(6,2) not null,   -- average unfurnished rent, € per m² per month
  mode    char(1) not null check (mode in ('M','T','R','B')),  -- metro, train, tram, bus
  traits  jsonb not null,          -- { "quiet": 4, "nightlife": 2, ... } each 1–5
  blurb   text not null,
  updated_at timestamptz not null default now()
);

create table if not exists destinations (
  id         text primary key,
  city_id    text not null references cities(id) on delete cascade,
  name       text not null,
  lat        double precision not null,
  lon        double precision not null,
  fast       boolean not null default false,  -- next to a metro/train station
  sort_order int not null default 0
);

create table if not exists transit_lines (
  id      serial primary key,
  city_id text not null references cities(id) on delete cascade,
  kind    text not null check (kind in ('metro','train','tram')),
  name    text,
  points  jsonb not null           -- [[lat, lon], ...]
);

create table if not exists travel_cache (
  key        text primary key,     -- city|fromLat,fromLon|toLat,toLon
  minutes    int not null,
  created_at timestamptz not null default now()
);

create index if not exists areas_city_idx on areas(city_id);
create index if not exists destinations_city_idx on destinations(city_id);

-- Supabase turns on its public REST API for new tables. We only read data from our own server,
-- so we lock the tables for the public API (Row Level Security with no policies = no public access).
alter table cities        enable row level security;
alter table areas         enable row level security;
alter table destinations  enable row level security;
alter table transit_lines enable row level security;
alter table travel_cache  enable row level security;

-- FairBills — bottled LPG: suppliers, prices, scrape logs, + bill_submissions fuel type.
-- Seed prices: Origin LPG 45kg is REAL (captured from originenergy.com.au/lpg/offers,
-- new-customer pricing). Other suppliers are plausible SAMPLE values for the Armidale
-- region to demo the comparison — VERIFY / replace with scraped data before launch.

create table if not exists lpg_suppliers (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null unique,
  display_name       text not null,
  type               text not null check (type in ('national','regional','local','exchange')),
  has_online_pricing boolean not null default false,
  phone_retentions   text,
  email_retentions   text,
  contact_page_url   text,
  service_area       text,
  notes              text,
  is_active          boolean default true,
  created_at         timestamptz default now()
);

create table if not exists lpg_prices (
  id                        uuid primary key default gen_random_uuid(),
  supplier                  text not null references lpg_suppliers (name),
  postcode                  text not null,
  bottle_size_kg            int not null check (bottle_size_kg in (9, 45)),
  price_per_bottle_cents    int not null,
  rental_fee_per_year_cents int,
  delivery_fee_cents        int,
  is_promotional            boolean default false,
  promo_conditions          text,
  source_url                text,
  confidence                text default 'high' check (confidence in ('high','medium','low')),
  scraped_at                timestamptz default now(),
  unique (supplier, postcode, bottle_size_kg)
);

create index if not exists lpg_prices_postcode_size_idx on lpg_prices (postcode, bottle_size_kg);
create index if not exists lpg_prices_freshness_idx on lpg_prices (scraped_at);

create table if not exists scrape_runs (
  id                 uuid primary key default gen_random_uuid(),
  run_at             timestamptz not null default now(),
  scraper_name       text,
  postcodes_processed int,
  prices_updated     int,
  errors_count       int default 0,
  results            jsonb,
  duration_ms        int
);

-- Extend bill_submissions for multiple fuel types
alter table bill_submissions
  add column if not exists fuel_type text default 'electricity'
    check (fuel_type in ('electricity','reticulated_gas','bottled_lpg'));
alter table bill_submissions add column if not exists lpg_data jsonb;

-- RLS: suppliers + prices world-readable; scrape_runs service-role only.
alter table lpg_suppliers enable row level security;
alter table lpg_prices    enable row level security;
alter table scrape_runs    enable row level security;

create policy "lpg suppliers are publicly readable" on lpg_suppliers for select using (true);
create policy "lpg prices are publicly readable"    on lpg_prices    for select using (true);

-- Seed suppliers (phones from the build brief — verify before launch)
insert into lpg_suppliers (name, display_name, type, has_online_pricing, phone_retentions, contact_page_url, service_area, notes) values
  ('Origin LPG', 'Origin LPG', 'national', true, '13 14 61', 'https://www.originenergy.com.au/lpg/', 'national', 'Auto-delivery; new-customer promo pricing'),
  ('Elgas', 'Elgas', 'national', true, '131 161', 'https://www.elgas.com.au/contact-us/', 'national', 'Promo pricing for new customers'),
  ('Supagas', 'Supagas', 'national', true, '13 11 21', 'https://www.supagas.com.au/contact-us', 'national', null),
  ('Bunnings Swap & Go', 'Bunnings (Swap & Go)', 'exchange', true, null, 'https://www.bunnings.com.au/our-services/in-store/swap-n-go-gas-bottles', 'national', '9kg cylinder exchange'),
  ('Plus LPG Armidale', 'Plus LPG', 'local', false, null, null, '2350,2351,2353,2358', 'Local operator; call for current price'),
  ('Tamworth Bottled Gas', 'Tamworth Bottled Gas', 'regional', false, null, null, '2340,2341,2344,2350', 'Regional; weekly delivery route')
on conflict (name) do nothing;

-- Seed prices for the Armidale region (2350). Origin 45kg = real; others = sample.
insert into lpg_prices (supplier, postcode, bottle_size_kg, price_per_bottle_cents, rental_fee_per_year_cents, is_promotional, promo_conditions, confidence, source_url) values
  ('Origin LPG',            '2350', 45,  9900, 5200, true,  'First 3 bottles within 12 months, then $135/bottle', 'high',   'https://www.originenergy.com.au/lpg/offers/'),
  ('Elgas',                 '2350', 45, 11200, null, true,  'New-customer promotional price',                     'medium', null),
  ('Supagas',               '2350', 45, 11900, null, false, null,                                                  'medium', null),
  ('Plus LPG Armidale',     '2350', 45,  8900, null, false, 'Local, no rental, auto-delivery',                     'low',    null),
  ('Tamworth Bottled Gas',  '2350', 45,  9800, null, false, 'Regional weekly route',                               'low',    null),
  ('Origin LPG',            '2350',  9,  4500, null, false, null,                                                  'medium', 'https://www.originenergy.com.au/lpg/offers/'),
  ('Bunnings Swap & Go',    '2350',  9,  3200, null, false, '8.5kg cylinder exchange',                             'medium', 'https://www.bunnings.com.au/our-services/in-store/swap-n-go-gas-bottles')
on conflict (supplier, postcode, bottle_size_kg) do nothing;

-- FairBills v1 — initial schema
-- Deviations from the original brief, with rationale:
--  * Rate columns use numeric (not int cents). Real AER rates carry sub-cent
--    precision (e.g. 0.2341 $/kWh = 23.41 c/kWh). The brief insists on never
--    rounding savings, so we keep full precision and store values in cents.
--  * plans.id is a composite "<planId>__<distributor>" because one AER planId
--    can apply to multiple distributors, and the comparison engine queries by
--    distributor. plan_id retains the raw AER id.
--  * RLS is enabled everywhere. plans + fairbills_stats are world-readable;
--    bill_submissions + email_followups have no anon policy, so only the
--    service role (which bypasses RLS) can touch them.

-- ---------------------------------------------------------------------------
-- plans: every current market offer, loaded nightly from the AER PRD API
-- ---------------------------------------------------------------------------
create table if not exists plans (
  id                          text primary key,           -- "<plan_id>__<distributor>"
  plan_id                     text not null,               -- raw AER planId
  retailer_name               text not null,
  retailer_id                 text not null,               -- AER brand slug, e.g. "agl"
  plan_name                   text not null,
  state                       text not null default 'NSW',
  distributor                 text not null,               -- Ausgrid | Endeavour Energy | Essential Energy
  tariff_type                 text not null,               -- flat | time_of_use | controlled_load
  fuel_type                   text not null default 'ELECTRICITY',
  customer_type               text not null default 'RESIDENTIAL',
  is_market_offer             boolean not null default true,

  -- rates stored in cents (numeric, sub-cent precision preserved)
  supply_charge_per_day_cents numeric not null,
  usage_rate_cents_flat       numeric,                     -- flat plans
  usage_rate_cents_peak       numeric,                     -- time-of-use
  usage_rate_cents_shoulder   numeric,
  usage_rate_cents_offpeak    numeric,
  controlled_load_cents       numeric,                     -- optional controlled load rate
  solar_fit_cents             numeric,                     -- single-rate solar feed-in, if any

  included_postcodes          text[],                      -- for the no-bill postcode flow
  features                    jsonb,                       -- incentives, green power, fixed, fees, etc.

  effective_from              date not null,
  effective_to                date,
  raw_data                    jsonb,                       -- full AER detail response (debugging)
  last_synced_at              timestamptz not null default now()
);

create index if not exists plans_distributor_idx on plans (distributor);
create index if not exists plans_market_idx       on plans (is_market_offer, state, distributor);
create index if not exists plans_tariff_idx       on plans (tariff_type);
create index if not exists plans_plan_id_idx       on plans (plan_id);

-- ---------------------------------------------------------------------------
-- bill_submissions: anonymous, 30-day TTL
-- ---------------------------------------------------------------------------
create table if not exists bill_submissions (
  id                uuid primary key default gen_random_uuid(),
  session_id        text not null,
  parsed_data       jsonb not null,
  recommended_plans jsonb,
  email             text,                                  -- only if user opts into the 6-month nudge
  created_at        timestamptz not null default now(),
  expires_at        timestamptz not null default (now() + interval '30 days')
);

create index if not exists bill_submissions_session_idx on bill_submissions (session_id);
create index if not exists bill_submissions_expires_idx on bill_submissions (expires_at);

-- ---------------------------------------------------------------------------
-- email_followups: email captures for the 6-month nudge
-- ---------------------------------------------------------------------------
create table if not exists email_followups (
  id                   uuid primary key default gen_random_uuid(),
  email                text not null unique,
  bill_submission_id   uuid references bill_submissions (id) on delete set null,
  postcode             text,
  current_retailer     text,
  saving_estimate_cents int,
  scheduled_for        timestamptz not null,               -- ~6 months from capture
  sent_at              timestamptz,
  unsubscribed_at      timestamptz,
  created_at           timestamptz not null default now()
);

create index if not exists email_followups_scheduled_idx
  on email_followups (scheduled_for)
  where sent_at is null and unsubscribed_at is null;

-- ---------------------------------------------------------------------------
-- fairbills_stats: single-row aggregate for the live counter
-- ---------------------------------------------------------------------------
create table if not exists fairbills_stats (
  id                            int primary key default 1,
  total_savings_estimated_cents bigint not null default 0,
  total_users                   int not null default 0,
  total_switches_reported       int not null default 0,
  last_updated                  timestamptz not null default now(),
  constraint fairbills_stats_singleton check (id = 1)
);

insert into fairbills_stats (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table plans            enable row level security;
alter table bill_submissions enable row level security;
alter table email_followups  enable row level security;
alter table fairbills_stats  enable row level security;

-- Public, read-only reference data
create policy "plans are publicly readable"
  on plans for select
  using (true);

create policy "stats are publicly readable"
  on fairbills_stats for select
  using (true);

-- bill_submissions and email_followups: no anon policy on purpose.
-- All access goes through the service role (server-side), which bypasses RLS.

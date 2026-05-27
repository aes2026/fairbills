-- FairBills — launch-list capture for coming-soon utilities (NBN, mains gas).
-- One row per (email, utility); re-submitting refreshes signed_up_at.

create table if not exists notify_signups (
  id           uuid primary key default gen_random_uuid(),
  email        text not null,
  utility      text not null check (utility in ('nbn', 'mains_gas', 'mobile', 'insurance')),
  signed_up_at timestamptz not null default now(),
  notified_at  timestamptz,
  unique (email, utility)
);

create index if not exists notify_signups_utility_idx on notify_signups (utility);

-- Service-role only: written via the API with the service key, never read by
-- the public client.
alter table notify_signups enable row level security;

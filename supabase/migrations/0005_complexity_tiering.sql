-- FairBills — comparison-confidence tiering.
-- Adds structural-value feature flags to both parsed bills (analytics) and
-- candidate plans (so confidence can be computed apples-to-apples).

-- Candidate plans: the features that make a comparison high/low confidence.
alter table plans
  add column if not exists has_ev_tariff             boolean default false,
  add column if not exists ev_tariff_rate_cents      int,
  add column if not exists has_super_off_peak        boolean default false,
  add column if not exists super_off_peak_rate_cents int,
  add column if not exists solar_fit_cents_per_kwh   int;

-- Parsed-bill analytics columns (PII-free: feature presence + amounts only).
alter table bill_submissions
  add column if not exists ev_tariff_present         boolean default false,
  add column if not exists ev_tariff_kwh             int,
  add column if not exists ev_tariff_rate_cents      int,
  add column if not exists super_off_peak_present    boolean default false,
  add column if not exists super_off_peak_kwh        int,
  add column if not exists super_off_peak_rate_cents int,
  add column if not exists solar_export_present      boolean default false,
  add column if not exists solar_export_kwh          int,
  add column if not exists solar_fit_cents_per_kwh   int,
  add column if not exists plan_complexity           text,
  add column if not exists comparison_confidence     text;

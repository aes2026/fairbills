-- FairBills — mains (reticulated) gas as a third live utility.
-- The `plans` table already has a `fuel_type` column (sync writes 'ELECTRICITY');
-- gas plans are stored with fuel_type = 'GAS'.
--
-- Gas tariffs are stepped DAILY rates from the AER PRD (singleRate.rates[] with
-- a per-day `volume` per step), so we store the full step array as JSONB rather
-- than fixed block columns — it faithfully handles 1, 2 or 3 steps.

alter table plans
  add column if not exists gas_supply_charge_cents_per_day int,
  add column if not exists gas_rates jsonb,
  add column if not exists gas_distributor text;

create index if not exists plans_fuel_type_idx on plans (fuel_type);

-- bill_submissions already carries fuel_type (check allows 'reticulated_gas').
alter table bill_submissions
  add column if not exists mj_used int,
  add column if not exists gas_supply_charge_cents_per_day int;

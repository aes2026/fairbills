-- Atomic increment for the live counter. Called when a user opts into the
-- 6-month nudge (a committed signal), adding their estimated saving to the
-- running total and bumping the user count. Runs as the caller (security
-- invoker); RLS keeps anon from writing the stats table.
create or replace function increment_fairbills_stats(saving_cents int)
returns void
language sql
as $$
  update fairbills_stats
  set total_users = total_users + 1,
      total_savings_estimated_cents =
        total_savings_estimated_cents + greatest(coalesce(saving_cents, 0), 0),
      last_updated = now()
  where id = 1;
$$;

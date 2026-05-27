import "server-only";

import { createServiceClient } from "@/lib/supabase/server";

export interface LiveStats {
  reclaimedCents: number;
  users: number;
  avgSavingCents: number | null;
}

/** Read the single fairbills_stats row. Returns null on any failure so the
 *  landing page can fall back gracefully rather than error. */
export async function getLiveStats(): Promise<LiveStats | null> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("fairbills_stats")
      .select("total_savings_estimated_cents,total_users")
      .eq("id", 1)
      .single();
    if (error || !data) return null;
    return {
      reclaimedCents: data.total_savings_estimated_cents,
      users: data.total_users,
      avgSavingCents:
        data.total_users > 0
          ? Math.round(data.total_savings_estimated_cents / data.total_users)
          : null,
    };
  } catch {
    return null;
  }
}

import { isEmailConfigured, sendFollowupEmail } from "@/lib/email";
import { createServiceClient } from "@/lib/supabase/server";
import { unsubscribeToken } from "@/lib/unsubscribe";

export const runtime = "nodejs";
export const maxDuration = 60;

const BATCH = 100;

function siteOrigin(req: Request): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;
}

// Triggered by Vercel Cron (see vercel.json). Vercel sends
// `Authorization: Bearer <CRON_SECRET>` when CRON_SECRET is set.
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("email_followups")
    .select("id,email,current_retailer,saving_estimate_cents")
    .lte("scheduled_for", new Date().toISOString())
    .is("sent_at", null)
    .is("unsubscribed_at", null)
    .limit(BATCH);

  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
  const due = data ?? [];

  // Dormant until Resend is configured — report what *would* send.
  if (!isEmailConfigured()) {
    return Response.json({
      ok: true,
      dryRun: true,
      due: due.length,
      note: "RESEND_API_KEY not set; no emails sent.",
    });
  }

  const origin = siteOrigin(req);
  let sent = 0;
  let failed = 0;
  for (const row of due) {
    try {
      const token = unsubscribeToken(row.email);
      await sendFollowupEmail(row.email, {
        retailer: row.current_retailer,
        savingCents: row.saving_estimate_cents,
        checkUrl: `${origin}/upload`,
        unsubscribeUrl: `${origin}/api/unsubscribe?email=${encodeURIComponent(row.email)}&token=${token}`,
      });
      await supabase
        .from("email_followups")
        .update({ sent_at: new Date().toISOString() })
        .eq("id", row.id);
      sent++;
    } catch (err) {
      console.error(`[cron] follow-up send failed for ${row.email}:`, (err as Error).message);
      failed++;
    }
  }

  return Response.json({ ok: true, due: due.length, sent, failed });
}

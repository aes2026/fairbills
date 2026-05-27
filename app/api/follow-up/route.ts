import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

/** Capture an email for the 6-month nudge. Used only for that follow-up. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    email?: string;
    postcode?: string | null;
    current_retailer?: string | null;
    saving_estimate_cents?: number | null;
  } | null;

  const email = body?.email?.trim().toLowerCase() ?? "";
  if (!EMAIL_RE.test(email) || email.length > 320) {
    return json({ ok: false, error: "That doesn't look like a valid email." }, 400);
  }

  // 6 months from now
  const scheduledFor = new Date();
  scheduledFor.setMonth(scheduledFor.getMonth() + 6);

  const saving =
    typeof body?.saving_estimate_cents === "number"
      ? Math.round(body.saving_estimate_cents)
      : null;

  const supabase = createServiceClient();
  const { error } = await supabase.from("email_followups").upsert(
    {
      email,
      postcode: body?.postcode ?? null,
      current_retailer: body?.current_retailer ?? null,
      saving_estimate_cents: saving,
      scheduled_for: scheduledFor.toISOString(),
      // a re-submission resets the clock and clears any prior unsubscribe/sent state
      sent_at: null,
      unsubscribed_at: null,
    },
    { onConflict: "email" },
  );

  if (error) {
    console.error("[follow-up] upsert failed:", error.message);
    return json({ ok: false, error: "Couldn't save your email. Try again." }, 500);
  }

  // Bump the live counter (a committed opt-in). Non-fatal if it fails.
  const { error: rpcError } = await supabase.rpc("increment_fairbills_stats", {
    saving_cents: saving ?? 0,
  });
  if (rpcError) console.error("[follow-up] stats bump failed:", rpcError.message);

  return json({ ok: true });
}

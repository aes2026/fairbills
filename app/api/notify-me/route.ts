import { z } from "zod";

import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const NotifyRequestSchema = z.object({
  email: z.string().email(),
  utility: z.enum(["nbn", "mains_gas"]),
});

function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

// POST { email, utility } → upsert a launch-list signup.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = NotifyRequestSchema.safeParse(body);
  if (!parsed.success) {
    return json({ ok: false, error: "Enter a valid email." }, 400);
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from("notify_signups").upsert(
    {
      email: parsed.data.email.toLowerCase().trim(),
      utility: parsed.data.utility,
      signed_up_at: new Date().toISOString(),
    },
    { onConflict: "email,utility" },
  );

  if (error) {
    console.error("[notify-me] upsert failed:", error.message);
    return json({ ok: false, error: "Couldn't save your email. Try again." }, 500);
  }

  return json({ ok: true });
}

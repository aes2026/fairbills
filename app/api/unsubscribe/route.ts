import { createServiceClient } from "@/lib/supabase/server";
import { verifyUnsubscribe } from "@/lib/unsubscribe";

export const runtime = "nodejs";

// One-click unsubscribe link target from the follow-up email.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const email = (url.searchParams.get("email") ?? "").toLowerCase();
  const token = url.searchParams.get("token") ?? "";
  const redirect = (status: string) =>
    Response.redirect(new URL(`/unsubscribe?status=${status}`, url.origin), 302);

  if (!email || !verifyUnsubscribe(email, token)) return redirect("invalid");

  try {
    const supabase = createServiceClient();
    const { error } = await supabase
      .from("email_followups")
      .update({ unsubscribed_at: new Date().toISOString() })
      .eq("email", email);
    return redirect(error ? "error" : "ok");
  } catch {
    return redirect("error");
  }
}

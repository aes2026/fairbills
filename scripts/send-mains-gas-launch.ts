/**
 * FairBills — one-off launch email to the mains-gas notify list.
 *
 * SAFE BY DEFAULT: with no flags this is a DRY RUN (prints recipients, sends
 * nothing). Add --send to actually email, or --to you@example.com to send a
 * single test to yourself first.
 *
 *   npm run email:mains-gas-launch                 # dry run (list only)
 *   npm run email:mains-gas-launch -- --to me@x.io # send one test
 *   npm run email:mains-gas-launch -- --send       # send to the whole list
 *
 * Requires RESEND_API_KEY. Marks notified_at so nobody is emailed twice.
 */

import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const FROM = process.env.FOLLOWUP_FROM ?? "FairBills <hello@fairbills.com.au>";
const CHECK_URL = "https://fairbills.vercel.app/check/mains-gas/upload";

const SUBJECT = "Mains gas comparison is live on FairBills";
const HTML = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#04342c;line-height:1.6;max-width:520px">
  <p>Hi,</p>
  <p>You asked to be told when we launched mains gas comparison. It&rsquo;s live now.</p>
  <p>Upload your gas bill and we&rsquo;ll check whether you&rsquo;re being overcharged. The same quiet trick happens with gas as electricity — loyal customers drift onto higher prices while new ones get a deal.</p>
  <p><a href="${CHECK_URL}" style="display:inline-block;background:#1d9e75;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:500">Check my gas bill</a></p>
  <p>Free, no account needed, about 5 minutes.</p>
  <p style="color:#888780;font-size:12px;margin-top:28px">You&rsquo;re getting this because you signed up at FairBills to be notified when mains gas launched. We won&rsquo;t email you again unless you check a bill yourself.</p>
</div>`;
const TEXT = `Hi,

You asked to be told when we launched mains gas comparison. It's live now.

Upload your gas bill and we'll check whether you're being overcharged: ${CHECK_URL}

Free, no account needed, about 5 minutes.

You're getting this because you signed up to be notified when mains gas launched.`;

async function main() {
  const argv = process.argv.slice(2);
  const send = argv.includes("--send");
  const toIdx = argv.indexOf("--to");
  const singleTo = toIdx >= 0 ? argv[toIdx + 1] : null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { data: signups, error } = await supabase
    .from("notify_signups")
    .select("email")
    .eq("utility", "mains_gas")
    .is("notified_at", null);
  if (error) throw new Error(error.message);

  const recipients = singleTo ? [{ email: singleTo }] : (signups ?? []);
  console.log(`[launch] mains_gas pending: ${signups?.length ?? 0}` + (singleTo ? ` (test → ${singleTo})` : ""));

  if (!send && !singleTo) {
    console.log("[launch] DRY RUN — no emails sent. Re-run with --send (or --to you@x.io to test).");
    for (const r of recipients) console.log(`  would email: ${r.email}`);
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY not configured");
  const resend = new Resend(apiKey);

  let sent = 0;
  for (const r of recipients) {
    const { error: sendErr } = await resend.emails.send({
      from: FROM,
      to: r.email,
      subject: SUBJECT,
      html: HTML,
      text: TEXT,
    });
    if (sendErr) {
      console.warn(`[launch] FAILED ${r.email}: ${sendErr.message}`);
      continue;
    }
    sent++;
    // Don't mark the throwaway --to test address as notified.
    if (!singleTo) {
      await supabase
        .from("notify_signups")
        .update({ notified_at: new Date().toISOString() })
        .eq("email", r.email)
        .eq("utility", "mains_gas");
    }
  }
  console.log(`[launch] sent ${sent} email(s)`);
}

main().catch((err) => {
  console.error("[launch] FATAL:", err);
  process.exit(1);
});

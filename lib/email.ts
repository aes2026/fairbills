import "server-only";

import { Resend } from "resend";

const FROM = process.env.FOLLOWUP_FROM ?? "FairBills <hello@fairbills.com.au>";

export interface FollowupPayload {
  retailer: string | null;
  savingCents: number | null;
  checkUrl: string;
  unsubscribeUrl: string;
}

export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

export function buildFollowupEmail(p: FollowupPayload): {
  subject: string;
  html: string;
  text: string;
} {
  const saving =
    p.savingCents && p.savingCents > 0
      ? `$${Math.round(p.savingCents / 100).toLocaleString("en-AU")}`
      : null;
  const subject = saving
    ? `Six months on — still leaving ${saving}/yr on the table?`
    : "Six months on — quick power-bill check?";
  const lead = saving
    ? `Six months ago we reckoned you could save about ${saving} a year on power.`
    : "Six months ago you checked your power bill with FairBills.";

  const text = [
    lead,
    "",
    "Energy plans change constantly, and discounts quietly expire after 12 months. Worth a 5-minute re-check?",
    "",
    `Re-check your bill: ${p.checkUrl}`,
    "",
    `Not interested? Unsubscribe: ${p.unsubscribeUrl}`,
  ].join("\n");

  const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#04342c;line-height:1.6;max-width:520px">
  <p>${lead}</p>
  <p>Energy plans change constantly, and discounts quietly expire after 12 months. Worth a 5-minute re-check?</p>
  <p><a href="${p.checkUrl}" style="display:inline-block;background:#1d9e75;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:500">Re-check my bill</a></p>
  <p style="color:#888780;font-size:12px;margin-top:28px">No commission, no kickbacks. <a href="${p.unsubscribeUrl}" style="color:#888780">Unsubscribe</a>.</p>
</div>`;

  return { subject, html, text };
}

export async function sendFollowupEmail(to: string, payload: FollowupPayload): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY not configured");
  const resend = new Resend(key);
  const { subject, html, text } = buildFollowupEmail(payload);
  const { error } = await resend.emails.send({ from: FROM, to, subject, html, text });
  if (error) throw new Error(error.message);
}

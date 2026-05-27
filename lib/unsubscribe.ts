import "server-only";

import crypto from "node:crypto";

function secret(): string {
  const s = process.env.FAIRBILLS_SECRET;
  if (!s) throw new Error("FAIRBILLS_SECRET is not set");
  return s;
}

/** Stable HMAC token for one-click unsubscribe links (no DB token storage). */
export function unsubscribeToken(email: string): string {
  return crypto.createHmac("sha256", secret()).update(email.toLowerCase()).digest("hex");
}

export function verifyUnsubscribe(email: string, token: string): boolean {
  try {
    const expected = Buffer.from(unsubscribeToken(email));
    const given = Buffer.from(token);
    return expected.length === given.length && crypto.timingSafeEqual(expected, given);
  } catch {
    return false;
  }
}

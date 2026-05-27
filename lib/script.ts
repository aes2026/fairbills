import phonesData from "@/data/retailer-phones.json";

/**
 * Deterministic switch-script generation. Per the brief, scripts are built from
 * a fixed template (no LLM) — we only interpolate the user's own figures, so
 * the wording is predictable and never improvised.
 */

interface ScriptInput {
  currentRetailer: string | null;
  currentPlan: string | null;
  postcode: string | null;
  topPickRetailer: string;
  topPickPlan: string;
  rateLabel: string; // e.g. "29c/kWh"
  supplyCents: number; // top pick daily supply, in cents
  savingCents: number; // vs current (may be <= 0)
}

function dollars(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString("en-AU")}`;
}
function supplyPerDay(cents: number): string {
  return `$${(cents / 100).toFixed(2)}/day supply`;
}
function normalise(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** Look up a retailer's published contact line, or null to fall back in the UI. */
export function lookupRetailerPhone(retailer: string | null): string | null {
  if (!retailer) return null;
  const key = normalise(retailer);
  for (const r of phonesData.retailers) {
    if (r.aliases.some((a) => normalise(a) === key || key.includes(normalise(a)))) {
      return r.phone;
    }
  }
  return null;
}

/** Option A — ask the current retailer to match the cheaper rate. */
export function buildMatchScript(input: ScriptInput): string {
  const plan = input.currentPlan ?? "my current plan";
  const savingClause =
    input.savingCents > 0
      ? ` — that's about ${dollars(input.savingCents)} a year cheaper than what I'm paying you`
      : "";
  return [
    `Hi, I've been a customer for a while on ${plan}, account [your account number].`,
    "",
    `I've just compared my rates and I can move to ${input.topPickRetailer}'s ${input.topPickPlan} at ${input.rateLabel} and ${supplyPerDay(input.supplyCents)}${savingClause}.`,
    "",
    "Before I switch, can you have a look and see what your best offer is? If you can match it or get close, I'd rather stay.",
  ].join("\n");
}

/** Option B — switch to the cheaper retailer. */
export function buildSwitchScript(input: ScriptInput): string {
  const where = input.postcode ? ` for my place in ${input.postcode}` : "";
  const from = input.currentRetailer ? ` I'm currently with ${input.currentRetailer}.` : "";
  return [
    `Hi, I'd like to sign up to your ${input.topPickPlan} plan.`,
    "",
    `I've compared plans and yours looks like the best value${where}.${from} I'd like to switch across.`,
    "",
    "Can you set that up, and let me know what you need from my latest bill? I don't want any break or doubling-up in supply.",
  ].join("\n");
}

/** Static fallbacks for when the current retailer resists. Same for everyone. */
export const PUSHBACK: { objection: string; response: string }[] = [
  {
    objection: "“That's the best I can do.”",
    response:
      "Thanks for checking. I'll go ahead and switch then — can you start my disconnection from [date]?",
  },
  {
    objection: "“I need to check with my manager.”",
    response: "Sure — when can I expect a call back? I'm planning to switch by Friday.",
  },
  {
    objection: "“We don't price-match.”",
    response:
      "No worries. I'll switch to the cheaper plan then — can you confirm there are no exit fees on my current plan?",
  },
];

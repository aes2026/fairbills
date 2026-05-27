import type { LpgAlternative, TenureBucket } from "@/lib/lpg";

/**
 * Deterministic bottled-LPG switch/negotiation script. Like the electricity
 * script, it's built from a fixed template — we only interpolate the user's own
 * figures, so the wording is predictable and never improvised.
 *
 * Identifying details (address, account number) are interpolated only when the
 * user supplied them via the bill-upload path; otherwise we leave a clearly
 * labelled placeholder for them to fill in before they call.
 */

interface LpgScriptInput {
  currentSupplier: string;
  currentPriceCents: number;
  bottleSizeKg: number;
  alternatives: LpgAlternative[];
  accountNumber?: string | null;
  customerName?: string | null;
  serviceAddress?: string | null;
  tenureBucket?: TenureBucket | null;
}

export interface ScriptPlaceholder {
  token: string;
  label: string;
  help?: string;
}

export interface LpgScript {
  body: string;
  placeholders: ScriptPlaceholder[];
  pushback: { objection: string; response: string }[];
  fullyAutoFilled: boolean;
}

function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function generateLpgScript(input: LpgScriptInput): LpgScript {
  const top3 = input.alternatives.slice(0, 3);
  const cheapest = top3[0] ?? null;

  const addressRef = input.serviceAddress?.trim()
    ? `at ${input.serviceAddress.trim()}`
    : "at [your address]";
  const acctRef = input.accountNumber?.trim()
    ? `account ${input.accountNumber.trim()}`
    : "account [your account number]";

  const tenureRef =
    input.tenureBucket === "3_plus"
      ? "I've been a customer for over three years"
      : input.tenureBucket === "1_to_3"
        ? "I've been a customer for a few years"
        : "I'm a long-standing customer";

  const competitorList =
    top3.length > 1 && cheapest
      ? `${cheapest.displayName} is quoting ${money(cheapest.pricePerBottleCents)}, and ${top3[1].displayName} is at ${money(top3[1].pricePerBottleCents)}`
      : cheapest
        ? `${cheapest.displayName} is quoting ${money(cheapest.pricePerBottleCents)}`
        : "other local suppliers are quoting noticeably less";

  const body = [
    `Hi, ${tenureRef} ${addressRef}, ${acctRef}.`,
    "",
    `I've been paying ${money(input.currentPriceCents)} per ${input.bottleSizeKg}kg bottle, but I've just checked around and ${competitorList}.`,
    "",
    "Before I move my account over, can you check what your best loyalty price is for me? I'd prefer to stay if you can get close to those numbers.",
  ].join("\n");

  const placeholders: ScriptPlaceholder[] = [];
  if (!input.serviceAddress?.trim()) {
    placeholders.push({ token: "[your address]", label: "Service address" });
  }
  if (!input.accountNumber?.trim()) {
    placeholders.push({
      token: "[your account number]",
      label: "Account number",
      help: "On your last delivery receipt",
    });
  }

  const cheapestRef = cheapest
    ? `${cheapest.displayName} is consistently ${money(cheapest.pricePerBottleCents)}`
    : "another local supplier is consistently cheaper";

  const pushback = [
    {
      objection: "“That's our standard rate.”",
      response:
        "I understand, but I've been a loyal customer and the difference adds up over a year. Can you put me through to retentions or a supervisor?",
    },
    {
      objection: "“We can give you 10% off your next bottle.”",
      response: `Thanks, but I need an ongoing price, not a one-off. ${cheapestRef}. Can you match that going forward?`,
    },
    {
      objection: "“We don't price-match.”",
      response:
        "No worries — then I'd like to arrange closing my account. Can you organise bottle pickup, and is there an exit or rental fee to settle?",
    },
  ];

  return {
    body,
    placeholders,
    pushback,
    fullyAutoFilled: !!input.serviceAddress?.trim() && !!input.accountNumber?.trim(),
  };
}

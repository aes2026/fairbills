import type { GasRankedPlan } from "@/lib/gas";
import type { ScriptPlaceholder } from "@/lib/scripts/bottled-gas";

/**
 * Deterministic mains-gas switch/negotiation script. Like electricity and
 * bottled gas, it's a fixed template with the user's own figures interpolated.
 * The key gas-specific addition is the dual-fuel caveat: many people hold power
 * and gas with the same retailer on a bundle discount, so the script asks the
 * retailer to confirm switching gas won't void it.
 */

interface GasScriptInput {
  currentRetailer: string | null;
  currentPlan: string | null;
  accountNumber?: string | null;
  serviceAddress?: string | null;
  topPick: GasRankedPlan;
  annualSavingCents: number;
  annualMj: number;
}

export interface GasScript {
  body: string;
  placeholders: ScriptPlaceholder[];
  pushback: { objection: string; response: string }[];
  fullyAutoFilled: boolean;
}

export function generateGasScript(input: GasScriptInput): GasScript {
  const acct = input.accountNumber?.trim() || "[your account number]";
  const address = input.serviceAddress?.trim() || "[your address]";
  const plan = input.currentPlan?.trim() || "my current gas plan";
  const saveClause =
    input.annualSavingCents > 0
      ? ` — that would save me about $${Math.round(input.annualSavingCents / 100)} a year based on my usage of around ${input.annualMj.toLocaleString("en-AU")} MJ`
      : "";

  const body = [
    `Hi, I'm a customer at ${address}, account ${acct}, currently on ${plan}.`,
    "",
    `I've just compared my gas rates and I can move to ${input.topPick.retailer}'s ${input.topPick.plan}${saveClause}.`,
    "",
    "Before I switch, can you check what your best offer is? If you can match it or come close, I'd rather stay.",
    "",
    "Also — if you supply my electricity too, can you confirm whether switching gas would affect any dual-fuel or bundle discount on my power account?",
  ].join("\n");

  const placeholders: ScriptPlaceholder[] = [];
  if (!input.serviceAddress?.trim()) {
    placeholders.push({ token: "[your address]", label: "Service address" });
  }
  if (!input.accountNumber?.trim()) {
    placeholders.push({
      token: "[your account number]",
      label: "Account number",
      help: "On the front of your gas bill",
    });
  }

  const pushback = [
    {
      objection: "“That's our standard rate.”",
      response:
        "I appreciate that, but the difference adds up over a year. Can you check what your retention or loyalty team can do?",
    },
    {
      objection: "“Switching might affect your bundle.”",
      response:
        "Can you tell me exactly what I'd lose on the electricity side? Then I can weigh it up properly.",
    },
    {
      objection: "“We don't price-match.”",
      response:
        "No worries — then I'd like to switch my gas across. Can you confirm there are no exit fees on my current plan?",
    },
  ];

  return {
    body,
    placeholders,
    pushback,
    fullyAutoFilled: !!input.serviceAddress?.trim() && !!input.accountNumber?.trim(),
  };
}

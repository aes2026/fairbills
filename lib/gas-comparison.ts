import { billingDays } from "@/lib/comparison";
import type { GasBill, GasCandidate, GasComparisonResult, GasRankedPlan, GasStep } from "@/lib/gas";

/**
 * Pure mains-gas comparison. No TOU/solar/EV complexity — gas is structurally
 * simpler than electricity. The one wrinkle is stepped tariffs:
 *  - Candidate plans (AER PRD) use DAILY step volumes (MJ/day).
 *  - Bills present block thresholds per BILLING PERIOD.
 * Both are reconciled into an annual cost on the user's usage.
 */

export const DEFAULT_GAS_BILL_DAYS = 90; // assume a quarter when dates are missing

/** Cost (cents) for one day's usage under stepped daily rates. */
export function steppedDailyCostCents(dailyMj: number, steps: GasStep[]): number {
  let remaining = dailyMj;
  let cost = 0;
  for (const s of steps) {
    if (remaining <= 0) break;
    const size = s.volume == null ? Infinity : s.volume;
    const portion = Math.min(remaining, size);
    cost += portion * s.rate;
    remaining -= portion;
  }
  // No remainder step but usage left over → charge the rest at the last rate.
  if (remaining > 0 && steps.length > 0) {
    cost += remaining * steps[steps.length - 1].rate;
  }
  return cost;
}

function candidateAnnualCents(annualMj: number, supplyCentsPerDay: number, steps: GasStep[]): number {
  const dailyMj = annualMj / 365;
  return supplyCentsPerDay * 365 + steppedDailyCostCents(dailyMj, steps) * 365;
}

/** Current annual cost from the bill's own supply + block rates (period thresholds). */
function billAnnualCents(bill: GasBill, days: number, annualMj: number): number | null {
  const supply = bill.gas_supply_charge_cents_per_day;
  const r1 = bill.block1_rate_cents_per_mj;
  if (supply == null || r1 == null || bill.mj_used == null) return null;

  const mj = bill.mj_used;
  let periodUsage: number;
  if (bill.block1_threshold_mj != null && bill.block2_rate_cents_per_mj != null) {
    const inBlock1 = Math.min(mj, bill.block1_threshold_mj);
    const inBlock2 = Math.max(0, mj - bill.block1_threshold_mj);
    periodUsage = inBlock1 * r1 + inBlock2 * bill.block2_rate_cents_per_mj;
  } else {
    periodUsage = mj * r1;
  }
  const periodCost = supply * days + periodUsage;
  return (periodCost * 365) / days;
}

export function compareGasBill(
  bill: GasBill,
  candidates: GasCandidate[],
): GasComparisonResult {
  const days =
    billingDays(bill.billing_period_start ?? null, bill.billing_period_end ?? null) ??
    DEFAULT_GAS_BILL_DAYS;
  const annualMj = Math.round((bill.mj_used ?? 0) * (365 / days));
  const currentAnnual = billAnnualCents(bill, days, annualMj);

  const ranked: GasRankedPlan[] = [];
  for (const c of candidates) {
    if (c.gas_supply_charge_cents_per_day == null || !c.gas_rates?.length) continue;
    const annual = Math.round(
      candidateAnnualCents(annualMj, c.gas_supply_charge_cents_per_day, c.gas_rates),
    );
    const usageOnly = annual - c.gas_supply_charge_cents_per_day * 365;
    ranked.push({
      id: c.id,
      retailer: c.retailer_name,
      plan: c.plan_name,
      distributor: c.gas_distributor,
      annualCents: annual,
      savingCents: currentAnnual == null ? 0 : Math.round(currentAnnual - annual),
      supplyCents: c.gas_supply_charge_cents_per_day,
      effectiveRateCents: annualMj > 0 ? Number((usageOnly / annualMj).toFixed(2)) : 0,
    });
  }

  ranked.sort((a, b) => a.annualCents - b.annualCents);

  // Cheapest plan per retailer so the list shows distinct brands.
  const seen = new Set<string>();
  const distinct: GasRankedPlan[] = [];
  for (const r of ranked) {
    const key = r.retailer.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    distinct.push(r);
  }
  const top5 = distinct.slice(0, 5);

  return {
    annualMj,
    billingDays: days,
    currentAnnualCents: currentAnnual == null ? null : Math.round(currentAnnual),
    topPick: top5[0] ?? null,
    plans: top5,
    bestSavingCents: top5[0] && top5[0].savingCents > 0 ? top5[0].savingCents : 0,
    candidateCount: candidates.length,
    seasonalWarning: days < 60,
  };
}

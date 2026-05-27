import type { ParsedBill, TariffType } from "@/lib/bill";

/**
 * v1 comparison engine. Pure functions — no DB access — so they're trivially
 * testable. The route layer fetches candidate plans and feeds them in.
 *
 * Honesty notes (the brief insists on accurate, un-rounded savings):
 *  - Flat tariffs are computed exactly from the user's actual usage.
 *  - Time-of-use is an ESTIMATE: bills don't reliably expose the peak/shoulder/
 *    off-peak usage split, so we apply an assumed split and flag it. Capturing
 *    per-period usage at parse time is a follow-up for true TOU accuracy.
 *  - Wholesale / "estimate" plans (spot-price passthrough) are excluded from
 *    ranking — their headline "rate" isn't a fixed rate, so including them
 *    would produce a misleadingly cheap top pick.
 */

export const DEFAULT_BILL_DAYS = 91; // assume a quarterly bill when dates are missing
export const ASSUMED_TOU_SPLIT = { peak: 0.4, shoulder: 0.2, offpeak: 0.4 } as const;

export interface ComparablePlan {
  id: string;
  plan_id: string;
  retailer_name: string;
  plan_name: string;
  distributor: string;
  tariff_type: string;
  supply_charge_per_day_cents: number;
  usage_rate_cents_flat: number | null;
  usage_rate_cents_peak: number | null;
  usage_rate_cents_shoulder: number | null;
  usage_rate_cents_offpeak: number | null;
  features: PlanFeatures | null;
}

export interface PlanFeatures {
  isFixed?: boolean | null;
  hasGreenPower?: boolean;
  hasSolarFit?: boolean;
  payOnTimeDiscount?: boolean;
}

interface RateSet {
  supply_charge_per_day_cents: number | null;
  usage_rate_cents_flat: number | null;
  usage_rate_cents_peak: number | null;
  usage_rate_cents_shoulder: number | null;
  usage_rate_cents_offpeak: number | null;
}

/** Inclusive day count of a billing period, or null if dates are unusable. */
export function billingDays(start: string | null, end: string | null): number | null {
  if (!start || !end) return null;
  const s = Date.parse(start);
  const e = Date.parse(end);
  if (Number.isNaN(s) || Number.isNaN(e) || e < s) return null;
  return Math.round((e - s) / 86_400_000) + 1;
}

/** Scale a billing-period usage figure to a full year. */
export function annualKwhFrom(kwhUsed: number, days: number | null): number {
  const d = days && days > 0 ? days : DEFAULT_BILL_DAYS;
  return (kwhUsed * 365) / d;
}

/**
 * Annualised cost in cents for a given rate set and tariff, or null if the
 * required rates are missing. For TOU, missing buckets are dropped and the
 * remaining buckets renormalised so total usage is still `annualKwh`.
 */
export function annualCostCents(
  rates: RateSet,
  tariff: TariffType,
  annualKwh: number,
): number | null {
  const supply = rates.supply_charge_per_day_cents;
  if (supply == null) return null;
  const supplyYear = supply * 365;

  if (tariff === "time_of_use") {
    const buckets: [number | null, number][] = [
      [rates.usage_rate_cents_peak, ASSUMED_TOU_SPLIT.peak],
      [rates.usage_rate_cents_shoulder, ASSUMED_TOU_SPLIT.shoulder],
      [rates.usage_rate_cents_offpeak, ASSUMED_TOU_SPLIT.offpeak],
    ];
    let fracSum = 0;
    let weighted = 0;
    for (const [rate, frac] of buckets) {
      if (rate == null) continue;
      fracSum += frac;
      weighted += rate * frac;
    }
    if (fracSum === 0) return null;
    const avgRate = weighted / fracSum;
    return supplyYear + annualKwh * avgRate;
  }

  // flat / controlled_load: single usage rate
  const rate = rates.usage_rate_cents_flat;
  if (rate == null) return null;
  return supplyYear + annualKwh * rate;
}

export function isWholesaleEstimate(plan: ComparablePlan): boolean {
  return /estimat|wholesale|spot ?price/i.test(plan.plan_name);
}

function fmtRate(cents: number | null): string {
  return cents == null ? "—" : `${Number(cents.toFixed(2))}c`;
}

/** Short headline rate, e.g. "30.25c/kWh" (flat) or "Peak 29c · Off-peak 26c" (TOU). */
export function rateLabel(plan: ComparablePlan, tariff: TariffType): string {
  if (tariff === "time_of_use") {
    const parts: string[] = [];
    if (plan.usage_rate_cents_peak != null) parts.push(`Peak ${fmtRate(plan.usage_rate_cents_peak)}`);
    if (plan.usage_rate_cents_offpeak != null) parts.push(`Off-peak ${fmtRate(plan.usage_rate_cents_offpeak)}`);
    return parts.join(" · ") || "—";
  }
  return plan.usage_rate_cents_flat == null ? "—" : `${fmtRate(plan.usage_rate_cents_flat)}/kWh`;
}

export interface RankedPlan {
  id: string;
  planId: string;
  retailer: string;
  plan: string;
  distributor: string;
  annualCents: number;
  savingCents: number;
  supplyCents: number;
  rateLabel: string;
  features: PlanFeatures | null;
}

export interface ComparisonResult {
  currentAnnualCents: number | null;
  annualKwh: number;
  billingDays: number | null;
  tariffType: TariffType;
  topPick: RankedPlan | null;
  plans: RankedPlan[];
  candidateCount: number;
  excludedWholesale: number;
  touEstimate: boolean;
}

export function compareBill(
  bill: ParsedBill,
  candidates: ComparablePlan[],
): ComparisonResult {
  const days = billingDays(bill.billing_period_start, bill.billing_period_end);
  const annual = annualKwhFrom(bill.kwh_used ?? 0, days);
  const tariff = bill.tariff_type;
  const currentAnnual =
    bill.kwh_used == null ? null : annualCostCents(bill, tariff, annual);

  let excludedWholesale = 0;
  const ranked: RankedPlan[] = [];

  for (const plan of candidates) {
    if (isWholesaleEstimate(plan)) {
      excludedWholesale++;
      continue;
    }
    const cost = annualCostCents(plan, tariff, annual);
    if (cost == null) continue;
    ranked.push({
      id: plan.id,
      planId: plan.plan_id,
      retailer: plan.retailer_name,
      plan: plan.plan_name,
      distributor: plan.distributor,
      annualCents: Math.round(cost),
      savingCents: currentAnnual == null ? 0 : Math.round(currentAnnual - cost),
      supplyCents: plan.supply_charge_per_day_cents,
      rateLabel: rateLabel(plan, tariff),
      features: plan.features,
    });
  }

  ranked.sort((a, b) => a.annualCents - b.annualCents);

  // Keep the cheapest plan per retailer so the top 5 shows distinct retailers
  // rather than several near-identical variants of one offer.
  const seenRetailers = new Set<string>();
  const distinct: RankedPlan[] = [];
  for (const r of ranked) {
    const key = r.retailer.trim().toLowerCase();
    if (seenRetailers.has(key)) continue;
    seenRetailers.add(key);
    distinct.push(r);
  }
  const top5 = distinct.slice(0, 5);

  return {
    currentAnnualCents: currentAnnual == null ? null : Math.round(currentAnnual),
    annualKwh: Math.round(annual),
    billingDays: days,
    tariffType: tariff,
    topPick: top5[0] ?? null,
    plans: top5,
    candidateCount: candidates.length,
    excludedWholesale,
    touEstimate: tariff === "time_of_use",
  };
}

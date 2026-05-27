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
  // Structural-value flags (drive comparison confidence). Optional so older
  // callers/tests still compile; treated as absent when undefined.
  has_ev_tariff?: boolean | null;
  has_super_off_peak?: boolean | null;
  solar_fit_cents_per_kwh?: number | null;
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

export type PlanComplexity =
  | "simple_flat"
  | "standard_tou"
  | "tou_with_solar"
  | "ev_specialised"
  | "complex_multi_tariff";

export type Confidence = "high" | "medium" | "low";

export type Outcome = "switch_recommended" | "switch_uncertain" | "stay_recommended";

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
  confidence: Confidence;
  confidenceReasons: string[];
}

export interface ComparisonResult {
  currentAnnualCents: number | null;
  annualKwh: number;
  billingDays: number | null;
  tariffType: TariffType;
  complexity: PlanComplexity;
  outcome: Outcome;
  outcomeExplanation: string;
  bestSavingCents: number | null;
  topPick: RankedPlan | null;
  plans: RankedPlan[];
  candidateCount: number;
  excludedWholesale: number;
  touEstimate: boolean;
}

/** Classify a parsed bill by how hard it is to compare apples-to-apples. */
export function classifyPlanComplexity(bill: ParsedBill): PlanComplexity {
  const hasEv = bill.ev_tariff_present;
  const hasSuperOffPeak = bill.super_off_peak_present;
  const hasSolar = bill.solar_export_present;
  const hasTou = bill.usage_rate_cents_peak != null;
  const hasFlat = bill.usage_rate_cents_flat != null;

  if (hasEv && (hasSuperOffPeak || hasSolar)) return "complex_multi_tariff";
  if (hasEv) return "ev_specialised";
  if (hasSuperOffPeak) return "complex_multi_tariff";
  if (hasTou && hasSolar) return "tou_with_solar";
  if (hasTou) return "standard_tou";
  if (hasFlat) return "simple_flat";
  return "complex_multi_tariff";
}

function n2(cents: number | null): string {
  return cents == null ? "" : `${Number(cents.toFixed(2))}`;
}

/**
 * Confidence of a single candidate comparison. Low when the candidate strips a
 * structural feature the user currently benefits from (EV tariff, free midday
 * window); medium when solar feed-in differs enough to move the maths; high
 * when it's a clean comparison.
 */
export function planConfidence(
  bill: ParsedBill,
  plan: ComparablePlan,
): { confidence: Confidence; reasons: string[] } {
  if (bill.ev_tariff_present && !plan.has_ev_tariff) {
    const rate = bill.ev_tariff_rate_cents != null ? ` at ${n2(bill.ev_tariff_rate_cents)}c/kWh` : "";
    return {
      confidence: "low",
      reasons: [
        `Your current plan includes a dedicated EV tariff${rate}. This plan doesn't — your EV charging would move to standard rates.`,
      ],
    };
  }
  if (bill.super_off_peak_present && !plan.has_super_off_peak) {
    const kwhLost = bill.super_off_peak_kwh ?? 0;
    const annualKwhLost = kwhLost * 12;
    const rate = plan.usage_rate_cents_flat ?? 30;
    const lostValue = Math.round((annualKwhLost * rate) / 100);
    const kwhClause = kwhLost ? ` You used about ${kwhLost} kWh there last period.` : "";
    return {
      confidence: "low",
      reasons: [
        `Your current plan has a free or near-free midday window.${kwhClause} On this plan that power would cost roughly $${lostValue}/year more.`,
      ],
    };
  }
  if (bill.solar_export_present && (bill.solar_export_kwh ?? 0) > 50) {
    const billFit = bill.solar_fit_cents_per_kwh ?? 0;
    const planFit = plan.solar_fit_cents_per_kwh ?? 0;
    const diff = Math.abs(billFit - planFit);
    if (diff > 2) {
      const annualExport = (bill.solar_export_kwh ?? 0) * 12;
      const impact = Math.round((annualExport * diff) / 100);
      return {
        confidence: "medium",
        reasons: [
          `Solar feed-in rates differ (${n2(billFit)}c vs ${n2(planFit)}c). For your export pattern, that swings savings by about $${impact}/year.`,
        ],
      };
    }
  }
  return { confidence: "high", reasons: [] };
}

const MEANINGFUL_SAVING_CENTS = 5000; // $50/yr

/**
 * Aggregate the per-plan confidences into one of three honest outcomes.
 * - switch_recommended: a high-confidence plan saves meaningful money.
 * - stay_recommended: the bill has structural value (EV/midday) that doesn't
 *   transfer, or nothing confidently beats the current plan.
 * - switch_uncertain: cheaper plans exist but only at lower confidence.
 */
export function deriveOutcome(
  bill: ParsedBill,
  ranked: RankedPlan[],
): { outcome: Outcome; explanation: string; bestSavingCents: number | null; best: RankedPlan | null } {
  const high = ranked.filter((r) => r.confidence === "high");
  const meaningful = high
    .filter((r) => r.savingCents > MEANINGFUL_SAVING_CENTS)
    .sort((a, b) => b.savingCents - a.savingCents);
  const hasStructuralValue = bill.ev_tariff_present || bill.super_off_peak_present;

  if (meaningful.length > 0) {
    const best = meaningful[0];
    return {
      outcome: "switch_recommended",
      best,
      bestSavingCents: best.savingCents,
      explanation: `You could save about $${Math.round(best.savingCents / 100)} a year on ${best.retailer} ${best.plan}.`,
    };
  }

  if (hasStructuralValue) {
    return {
      outcome: "stay_recommended",
      best: null,
      bestSavingCents: null,
      explanation:
        "Your current plan suits your usage well. We compared the available plans and none would save you meaningful money — and some would cost you more by stripping out features you currently benefit from, like a dedicated EV tariff or a free midday window.",
    };
  }

  const anyApparentSaving = ranked.some((r) => r.savingCents > MEANINGFUL_SAVING_CENTS);
  const anyLowerConfidence = ranked.some((r) => r.confidence !== "high");
  if (anyApparentSaving && anyLowerConfidence) {
    return {
      outcome: "switch_uncertain",
      best: null,
      bestSavingCents: null,
      explanation:
        "Your plan has features that don't translate cleanly to the plans we can confidently compare against. Switching is possible, but the maths depends on factors specific to you — here's what we found, with confidence ratings.",
    };
  }

  return {
    outcome: "stay_recommended",
    best: null,
    bestSavingCents: null,
    explanation:
      "Your current plan suits your usage well. We compared against the available plans and none would clearly save you money.",
  };
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
    const { confidence, reasons } = planConfidence(bill, plan);
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
      confidence,
      confidenceReasons: reasons,
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

  const complexity = classifyPlanComplexity(bill);
  const { outcome, explanation, bestSavingCents, best } = deriveOutcome(bill, top5);

  // For a switch recommendation the top pick is the best high-confidence plan
  // (not necessarily the globally cheapest, which may strip a feature). For
  // other outcomes, surface the cheapest as the headline candidate.
  const topPick = outcome === "switch_recommended" ? (best ?? top5[0] ?? null) : (top5[0] ?? null);

  return {
    currentAnnualCents: currentAnnual == null ? null : Math.round(currentAnnual),
    annualKwh: Math.round(annual),
    billingDays: days,
    tariffType: tariff,
    complexity,
    outcome,
    outcomeExplanation: explanation,
    bestSavingCents,
    topPick,
    plans: top5,
    candidateCount: candidates.length,
    excludedWholesale,
    touEstimate: tariff === "time_of_use",
  };
}

import { z } from "zod";

/**
 * Mains (reticulated) gas comparison types + sessionStorage keys.
 *
 * Gas usage is in MJ, not kWh. Plans use stepped DAILY rates (AER PRD), while
 * bills show block thresholds per billing period — the comparison engine
 * reconciles the two. Identifying fields stay client-side and are never
 * persisted, consistent with the rest of FairBills.
 */

/** A stepped daily rate: `volume` MJ/day for this step (null = remainder), `rate` c/MJ. */
export interface GasStep {
  volume: number | null;
  rate: number;
}

/** Parsed mains-gas bill — lenient so a partial OCR still validates. */
export const GasBillSchema = z.object({
  retailer_name: z.string().nullable(),
  plan_name: z.string().nullish(),
  account_number: z.string().nullish(),
  customer_name: z.string().nullish(),
  service_address: z.string().nullish(),
  billing_period_start: z.string().nullish(),
  billing_period_end: z.string().nullish(),
  total_amount_cents: z.number().nullish(),
  mj_used: z.number().nullable(),
  gas_supply_charge_cents_per_day: z.number().nullable(),
  block1_rate_cents_per_mj: z.number().nullable(),
  block1_threshold_mj: z.number().nullish(),
  block2_rate_cents_per_mj: z.number().nullish(),
  postcode: z.string().nullable(),
  gas_distributor: z.string().nullish(),
});
export type GasBill = z.infer<typeof GasBillSchema>;

export interface GasCandidate {
  id: string;
  retailer_name: string;
  plan_name: string;
  gas_distributor: string | null;
  gas_supply_charge_cents_per_day: number | null;
  gas_rates: GasStep[];
}

export interface GasRankedPlan {
  id: string;
  retailer: string;
  plan: string;
  distributor: string | null;
  annualCents: number;
  savingCents: number;
  supplyCents: number;
  effectiveRateCents: number; // blended c/MJ at the user's usage, for display
}

export interface GasComparisonResult {
  annualMj: number;
  billingDays: number;
  currentAnnualCents: number | null;
  topPick: GasRankedPlan | null;
  plans: GasRankedPlan[];
  bestSavingCents: number;
  candidateCount: number;
  seasonalWarning: boolean;
}

/** sessionStorage: raw parsed bill, handed from upload → confirm. */
export const GAS_PARSED_KEY = "fairbills:gas-parsed";
/** sessionStorage: the confirmed bill, handed from confirm → results/script. */
export const GAS_INPUT_KEY = "fairbills:gas-input";
/** sessionStorage: the comparison result, handed from results → script. */
export const GAS_RESULT_KEY = "fairbills:gas-result";

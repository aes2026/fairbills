import { z } from "zod";

export const TARIFF_TYPES = ["flat", "time_of_use", "controlled_load"] as const;
export type TariffType = (typeof TARIFF_TYPES)[number];

/**
 * Shape of a parsed Australian electricity bill. Most fields are nullable —
 * the brief's rule is "if you can't find a field, use null" — so a partial
 * parse still validates and the confirmation step can prompt for the gaps.
 * All monetary values are in CENTS (rates keep sub-cent precision).
 */
export const BillSchema = z.object({
  retailer_name: z.string().nullable(),
  plan_name: z.string().nullable(),
  billing_period_start: z.string().nullable(),
  billing_period_end: z.string().nullable(),
  total_amount_cents: z.number().nullable(),
  kwh_used: z.number().nullable(),
  supply_charge_per_day_cents: z.number().nullable(),
  usage_rate_cents_flat: z.number().nullable(),
  usage_rate_cents_peak: z.number().nullable(),
  usage_rate_cents_shoulder: z.number().nullable(),
  usage_rate_cents_offpeak: z.number().nullable(),
  postcode: z.string().nullable(),
  distributor: z.string().nullable(),
  tariff_type: z.enum(TARIFF_TYPES),
});

export type ParsedBill = z.infer<typeof BillSchema>;

/** sessionStorage key used to hand the parsed bill from upload → confirm. */
export const PARSED_BILL_KEY = "fairbills:parsed-bill";

/** sessionStorage key used to hand the chosen top pick from results → script. */
export const TOP_PICK_KEY = "fairbills:top-pick";

/** sessionStorage flag: "1" when the bill is a no-bill estimate, not a real upload. */
export const ESTIMATE_KEY = "fairbills:estimate";

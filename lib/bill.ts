import { z } from "zod";

export const TARIFF_TYPES = [
  "flat",
  "time_of_use",
  "controlled_load",
  "complex_multi_tariff",
] as const;
export type TariffType = (typeof TARIFF_TYPES)[number];

// Robust coercions for the LLM-extracted fields: the model is instructed to
// return false / null for absent features, but `.catch` keeps a stray shape
// from failing the whole parse.
const boolish = z.boolean().catch(false);
const numish = z.number().nullable().catch(null);
const strish = z.string().nullable().catch(null);

/**
 * Shape of a parsed Australian electricity bill. Most fields are nullable —
 * the brief's rule is "if you can't find a field, use null" — so a partial
 * parse still validates and the confirmation step can prompt for the gaps.
 * All monetary values are in CENTS (rates keep sub-cent precision).
 *
 * The complexity fields (EV tariff, super-off-peak, solar export, controlled
 * load) drive the comparison-confidence engine: a bill with structural value
 * that doesn't transfer to other plans gets honest "stay" advice rather than a
 * misleading "switch and save".
 */
export const BillSchema = z.object({
  retailer_name: z.string().nullable(),
  plan_name: z.string().nullable(),
  account_number: z.string().nullish(),
  customer_name: z.string().nullish(),
  service_address: z.string().nullish(),
  billing_period_start: z.string().nullable(),
  billing_period_end: z.string().nullable(),
  total_amount_cents: z.number().nullable(),
  kwh_used: z.number().nullable(),
  supply_charge_per_day_cents: z.number().nullable(),
  usage_rate_cents_flat: z.number().nullable(),
  usage_rate_cents_peak: z.number().nullable(),
  usage_rate_cents_shoulder: z.number().nullable(),
  usage_rate_cents_offpeak: z.number().nullable(),

  // --- complexity / structural-value fields ---
  ev_tariff_present: boolish,
  ev_tariff_kwh: numish,
  ev_tariff_rate_cents: numish,
  ev_tariff_window_description: strish,
  super_off_peak_present: boolish,
  super_off_peak_kwh: numish,
  super_off_peak_rate_cents: numish,
  super_off_peak_window_description: strish,
  controlled_load_present: boolish,
  controlled_load_kwh: numish,
  controlled_load_rate_cents: numish,
  solar_export_present: boolish,
  solar_export_kwh: numish,
  solar_fit_cents_per_kwh: numish,

  postcode: z.string().nullable(),
  distributor: z.string().nullable(),
  tariff_type: z.enum(TARIFF_TYPES).catch("flat"),
});

export type ParsedBill = z.infer<typeof BillSchema>;

/** sessionStorage key used to hand the parsed bill from upload → confirm. */
export const PARSED_BILL_KEY = "fairbills:parsed-bill";

/** sessionStorage key used to hand the chosen top pick from results → script. */
export const TOP_PICK_KEY = "fairbills:top-pick";

/** sessionStorage flag: "1" when the bill is a no-bill estimate, not a real upload. */
export const ESTIMATE_KEY = "fairbills:estimate";

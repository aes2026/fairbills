import { z } from "zod";

/**
 * Bottled-LPG comparison types + the sessionStorage keys that carry data
 * across the quick-check / upload → results → script flow.
 *
 * Privacy note (matches the electricity flow): identifying fields — account
 * number, customer name, service address — live ONLY in sessionStorage and
 * transit the server during a single comparison call. They are NEVER persisted
 * to the database. The compare route strips them before storing a submission.
 */

export const LPG_BOTTLE_SIZES = [9, 45] as const;
export type LpgBottleSize = (typeof LPG_BOTTLE_SIZES)[number];

export const TENURE_BUCKETS = ["under_1", "1_to_3", "3_plus"] as const;
export type TenureBucket = (typeof TENURE_BUCKETS)[number];

/** Normalised input both entry paths (quick-check + bill upload) produce. */
export const LpgComparisonInputSchema = z.object({
  postcode: z.string().regex(/^\d{4}$/),
  bottle_size_kg: z.union([z.literal(9), z.literal(45)]),
  current_supplier: z.string().min(1),
  price_per_bottle_cents: z.number().int().positive(),
  // Identifying fields — only set on the bill-upload path. Kept client-side.
  account_number: z.string().nullish(),
  customer_name: z.string().nullish(),
  service_address: z.string().nullish(),
  // Only set on the quick-check path.
  tenure_bucket: z.enum(TENURE_BUCKETS).nullish(),
});
export type LpgComparisonInput = z.infer<typeof LpgComparisonInputSchema>;

export interface LpgAlternative {
  supplier: string;
  displayName: string;
  type: string;
  pricePerBottleCents: number;
  savingPerBottleCents: number;
  isPromotional: boolean;
  promoConditions: string | null;
  notes: string | null;
}

export interface LpgSupplierContact {
  phone: string | null;
  email: string | null;
  contactUrl: string | null;
}

export interface LpgResult {
  postcode: string;
  bottleSizeKg: LpgBottleSize;
  currentSupplier: string;
  currentPriceCents: number;
  overpayingPerBottleCents: number;
  overpayingAnnualCents: number;
  estimatedBottlesPerYear: number;
  cheaperCount: number; // local prices strictly cheaper than the user's
  supplierCount: number; // distinct suppliers with a price in this area
  cheapestSupplier: string;
  cheapestPriceCents: number;
  medianPriceCents: number;
  priceRange: { minCents: number; maxCents: number };
  alternatives: LpgAlternative[];
  currentSupplierContacts: LpgSupplierContact | null;
  dataFreshnessDays: number | null;
}

/**
 * Shape of a parsed bottled-LPG bill / delivery receipt. These vary wildly
 * (printed invoices, handwritten dockets, photos), so almost everything is
 * nullable — a partial parse still validates and the confirm step fills gaps.
 */
export const LpgBillSchema = z.object({
  supplier_name: z.string().nullable(),
  account_number: z.string().nullish(),
  customer_name: z.string().nullish(),
  service_address: z.string().nullish(),
  postcode: z.string().nullable(),
  bottle_size_kg: z.number().nullable(),
  number_of_bottles: z.number().nullish(),
  price_per_bottle_cents: z.number().nullable(),
  total_amount_cents: z.number().nullish(),
  rental_fee_cents: z.number().nullish(),
  delivery_fee_cents: z.number().nullish(),
  delivery_date: z.string().nullish(),
  is_exchange: z.boolean().nullish(),
});
export type LpgBill = z.infer<typeof LpgBillSchema>;

/** sessionStorage: a parsed LPG bill, handed from upload → confirm. */
export const LPG_PARSED_KEY = "fairbills:lpg-parsed";

/** sessionStorage: the normalised input, handed from entry path → results. */
export const LPG_INPUT_KEY = "fairbills:lpg-input";

/** sessionStorage: the computed result, handed from results → script. */
export const LPG_RESULT_KEY = "fairbills:lpg-result";

import type {
  LpgAlternative,
  LpgComparisonInput,
  LpgResult,
} from "@/lib/lpg";
import type { LpgPriceRow, LpgSupplierRow } from "@/lib/supabase/types";

/**
 * Pure bottled-LPG comparison — no DB access, so it's trivially testable. The
 * route layer fetches the candidate prices + suppliers and feeds them in.
 *
 * Honesty notes:
 *  - Annual figures use a deliberately conservative bottle-per-year estimate
 *    (45kg ≈ 10/yr, 9kg ≈ 30/yr) and are clearly flagged as estimates in the UI.
 *  - "Overpaying" is the gap to the CHEAPEST verified local price, floored at
 *    zero — we never invent a saving when the user is already cheap.
 *  - Alternatives are distinct suppliers strictly cheaper than the user, so the
 *    list never pads itself with the user's own (or more expensive) options.
 */

/** Conservative annual bottle count by size — flagged as an estimate in the UI. */
export function estimatedBottlesPerYear(sizeKg: number): number {
  return sizeKg === 45 ? 10 : 30;
}

function median(sortedCents: number[]): number {
  if (sortedCents.length === 0) return 0;
  const mid = Math.floor(sortedCents.length / 2);
  return sortedCents.length % 2 === 0
    ? Math.round((sortedCents[mid - 1] + sortedCents[mid]) / 2)
    : sortedCents[mid];
}

export function computeLpgComparison(
  input: LpgComparisonInput,
  prices: LpgPriceRow[],
  suppliers: Map<string, LpgSupplierRow>,
): LpgResult | null {
  if (prices.length === 0) return null;

  const sorted = [...prices].sort(
    (a, b) => a.price_per_bottle_cents - b.price_per_bottle_cents,
  );
  const cheapest = sorted[0];
  const dearest = sorted[sorted.length - 1];

  const savingPerBottle = Math.max(
    0,
    input.price_per_bottle_cents - cheapest.price_per_bottle_cents,
  );
  const bottlesYr = estimatedBottlesPerYear(input.bottle_size_kg);
  const cheaperCount = sorted.filter(
    (p) => p.price_per_bottle_cents < input.price_per_bottle_cents,
  ).length;

  // Distinct OTHER suppliers strictly cheaper than the user's price, cheapest
  // first. We exclude the user's current supplier — the phone-call CTA already
  // covers negotiating with them, and "switch to the company you're already
  // with" reads as confusing.
  const currentKey = input.current_supplier.trim().toLowerCase();
  const seen = new Set<string>();
  const alternatives: LpgAlternative[] = [];
  for (const p of sorted) {
    if (p.price_per_bottle_cents >= input.price_per_bottle_cents) continue;
    const key = p.supplier.trim().toLowerCase();
    if (key === currentKey) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    const s = suppliers.get(p.supplier);
    alternatives.push({
      supplier: p.supplier,
      displayName: s?.display_name ?? p.supplier,
      type: s?.type ?? "",
      pricePerBottleCents: p.price_per_bottle_cents,
      savingPerBottleCents: input.price_per_bottle_cents - p.price_per_bottle_cents,
      isPromotional: !!p.is_promotional,
      promoConditions: p.promo_conditions,
      notes: s?.notes ?? null,
      contactUrl: s?.contact_page_url ?? null,
    });
    if (alternatives.length >= 5) break;
  }

  const cur = suppliers.get(input.current_supplier);
  const currentSupplierContacts = cur
    ? {
        phone: cur.phone_retentions,
        email: cur.email_retentions,
        contactUrl: cur.contact_page_url,
      }
    : null;

  const stamps = prices
    .map((p) => (p.scraped_at ? Date.parse(p.scraped_at) : NaN))
    .filter((n) => !Number.isNaN(n));
  const dataFreshnessDays = stamps.length
    ? Math.floor((Date.now() - Math.min(...stamps)) / 86_400_000)
    : null;

  return {
    postcode: input.postcode,
    bottleSizeKg: input.bottle_size_kg,
    currentSupplier: input.current_supplier,
    currentPriceCents: input.price_per_bottle_cents,
    overpayingPerBottleCents: savingPerBottle,
    overpayingAnnualCents: savingPerBottle * bottlesYr,
    estimatedBottlesPerYear: bottlesYr,
    cheaperCount,
    supplierCount: new Set(prices.map((p) => p.supplier)).size,
    cheapestSupplier: suppliers.get(cheapest.supplier)?.display_name ?? cheapest.supplier,
    cheapestPriceCents: cheapest.price_per_bottle_cents,
    medianPriceCents: median(sorted.map((p) => p.price_per_bottle_cents)),
    priceRange: {
      minCents: cheapest.price_per_bottle_cents,
      maxCents: dearest.price_per_bottle_cents,
    },
    alternatives,
    currentSupplierContacts,
    dataFreshnessDays,
  };
}

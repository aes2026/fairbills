import { LpgComparisonInputSchema } from "@/lib/lpg";
import { computeLpgComparison } from "@/lib/lpg-comparison";
import { createServiceClient } from "@/lib/supabase/server";
import type { LpgPriceRow, LpgSupplierRow } from "@/lib/supabase/types";

export const runtime = "nodejs";

function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

// GET /api/lpg/compare?postcode=2350&size=45 → quick coverage check for the form.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const postcode = url.searchParams.get("postcode")?.trim() ?? "";
  const size = Number(url.searchParams.get("size") ?? "45");
  if (!/^\d{4}$/.test(postcode)) {
    return json({ ok: false, error: "Enter a 4-digit postcode." }, 400);
  }
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("lpg_prices")
    .select("supplier")
    .eq("postcode", postcode)
    .eq("bottle_size_kg", size === 9 ? 9 : 45);
  if (error) return json({ ok: false, error: "Lookup failed." }, 500);
  const count = new Set((data ?? []).map((r) => r.supplier)).size;
  return json({ ok: true, covered: count > 0, supplierCount: count });
}

// POST normalised LpgComparisonInput → comparison result.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = LpgComparisonInputSchema.safeParse(body);
  if (!parsed.success) {
    return json({ ok: false, error: "Invalid comparison data." }, 400);
  }
  const input = parsed.data;

  const supabase = createServiceClient();

  let prices: LpgPriceRow[];
  let suppliers: LpgSupplierRow[];
  try {
    const [pricesRes, suppliersRes] = await Promise.all([
      supabase
        .from("lpg_prices")
        .select("*")
        .eq("postcode", input.postcode)
        .eq("bottle_size_kg", input.bottle_size_kg),
      supabase.from("lpg_suppliers").select("*"),
    ]);
    if (pricesRes.error) throw new Error(pricesRes.error.message);
    if (suppliersRes.error) throw new Error(suppliersRes.error.message);
    prices = (pricesRes.data ?? []) as LpgPriceRow[];
    suppliers = (suppliersRes.data ?? []) as LpgSupplierRow[];
  } catch (err) {
    console.error("[lpg/compare] lookup failed:", (err as Error).message);
    return json({ ok: false, error: "Price lookup failed." }, 500);
  }

  if (prices.length === 0) {
    return json(
      { ok: false, error: "We don't have bottled-gas prices for that postcode yet." },
      404,
    );
  }

  const supplierMap = new Map(suppliers.map((s) => [s.name, s]));
  const result = computeLpgComparison(input, prices, supplierMap);
  if (!result) {
    return json({ ok: false, error: "Couldn't build a comparison." }, 500);
  }

  // Store an ANONYMISED submission for analytics only. We deliberately strip
  // account_number / customer_name / service_address — identifying data must
  // never be persisted. Failure here is non-fatal to the comparison.
  const sessionId = req.headers.get("x-session-id") || crypto.randomUUID();
  try {
    await supabase.from("bill_submissions").insert({
      session_id: sessionId,
      fuel_type: "bottled_lpg",
      parsed_data: {},
      lpg_data: {
        postcode: input.postcode,
        bottle_size_kg: input.bottle_size_kg,
        current_supplier: input.current_supplier,
        price_per_bottle_cents: input.price_per_bottle_cents,
        tenure_bucket: input.tenure_bucket ?? null,
        overpaying_per_bottle_cents: result.overpayingPerBottleCents,
        overpaying_annual_cents: result.overpayingAnnualCents,
      },
    });
  } catch (err) {
    console.error("[lpg/compare] submission insert failed:", (err as Error).message);
  }

  return json({ ok: true, result });
}

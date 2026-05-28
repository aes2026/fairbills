import { BillSchema } from "@/lib/bill";
import { compareBill, type ComparablePlan } from "@/lib/comparison";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const PLAN_COLUMNS =
  "id,plan_id,retailer_name,plan_name,distributor,tariff_type,supply_charge_per_day_cents,usage_rate_cents_flat,usage_rate_cents_peak,usage_rate_cents_shoulder,usage_rate_cents_offpeak,features,has_ev_tariff,has_super_off_peak,solar_fit_cents_per_kwh";

const PAGE = 1000; // Supabase caps a single response at 1000 rows
const MAX_PAGES = 8; // safety bound (~8000 plans)

function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

type Supabase = ReturnType<typeof createServiceClient>;

/**
 * Fetch ALL rows matching a filtered query by paging with .range() — a single
 * response is capped at 1000 rows, and we must see every candidate to find the
 * true cheapest plan.
 */
async function fetchAllPlans(
  makeQuery: () => ReturnType<ReturnType<Supabase["from"]>["select"]>,
): Promise<ComparablePlan[]> {
  const out: ComparablePlan[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const { data, error } = await makeQuery().range(page * PAGE, page * PAGE + PAGE - 1);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as unknown as ComparablePlan[];
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = BillSchema.safeParse(body);
  if (!parsed.success) {
    return json({ ok: false, error: "Invalid bill data." }, 400);
  }
  const bill = parsed.data;

  if (bill.kwh_used == null) {
    return json({ ok: false, error: "We need your usage (kWh) to compare plans." }, 422);
  }
  if (
    bill.tariff_type === "flat" &&
    (bill.supply_charge_per_day_cents == null || bill.usage_rate_cents_flat == null)
  ) {
    return json(
      { ok: false, error: "We need your supply charge and usage rate to compare." },
      422,
    );
  }

  const supabase = createServiceClient();

  // A "complex_multi_tariff" bill has no equivalent candidate tariff in the AER
  // data, so we price it against flat plans. The confidence engine then flags
  // that the structural features (EV tariff, free midday) don't transfer —
  // which is exactly how a complex bill earns honest "stay" advice.
  const candidateTariff =
    bill.tariff_type === "complex_multi_tariff" ? "flat" : bill.tariff_type;

  // Prefer postcode matching — it pins the exact distributor zone (Ausgrid /
  // Endeavour / the three Essential Energy zones) without relying on the bill's
  // distributor wording.
  let candidates: ComparablePlan[] = [];
  try {
    if (bill.postcode) {
      candidates = await fetchAllPlans(() =>
        supabase
          .from("plans")
          .select(PLAN_COLUMNS)
          .eq("fuel_type", "ELECTRICITY")
          .eq("is_market_offer", true)
          .eq("tariff_type", candidateTariff)
          .contains("included_postcodes", [bill.postcode!]),
      );
    }

    // Fallback: distributor name prefix (e.g. "Essential Energy" → all three zones).
    if (candidates.length === 0 && bill.distributor) {
      const prefix = bill.distributor.trim().split(/\s+/)[0];
      candidates = await fetchAllPlans(() =>
        supabase
          .from("plans")
          .select(PLAN_COLUMNS)
          .eq("fuel_type", "ELECTRICITY")
          .eq("is_market_offer", true)
          .eq("tariff_type", candidateTariff)
          .ilike("distributor", `${prefix}%`),
      );
    }
  } catch (err) {
    console.error("[compare] plan lookup failed:", (err as Error).message);
    return json({ ok: false, error: "Plan lookup failed." }, 500);
  }

  const result = compareBill(bill, candidates);
  return json({ ok: true, ...result });
}

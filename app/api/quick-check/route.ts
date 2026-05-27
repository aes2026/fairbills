import { BillSchema, type ParsedBill } from "@/lib/bill";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Ballpark annual electricity use (kWh) for a NSW household by occupants.
// Rough AER/ABS-style averages — flagged as an estimate to the user.
const HOUSEHOLD_ANNUAL_KWH: Record<number, number> = {
  1: 3500,
  2: 5000,
  3: 6500,
  4: 8000,
  5: 9500,
};

const COLUMNS =
  "retailer_name,plan_name,distributor,supply_charge_per_day_cents,usage_rate_cents_flat";
const PAGE = 1000;
const MAX_PAGES = 8;

interface FlatPlan {
  retailer_name: string;
  plan_name: string;
  distributor: string;
  supply_charge_per_day_cents: number;
  usage_rate_cents_flat: number | null;
}

function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}
function normalise(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
function isEstimateName(name: string): boolean {
  return /estimat|wholesale|spot ?price/i.test(name);
}

type Supabase = ReturnType<typeof createServiceClient>;

async function fetchAllFlatPlans(
  supabase: Supabase,
  postcode: string,
): Promise<FlatPlan[]> {
  const out: FlatPlan[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const { data, error } = await supabase
      .from("plans")
      .select(COLUMNS)
      .eq("state", "NSW")
      .eq("is_market_offer", true)
      .eq("tariff_type", "flat")
      .contains("included_postcodes", [postcode])
      .range(page * PAGE, page * PAGE + PAGE - 1);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as unknown as FlatPlan[];
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

// GET /api/quick-check?postcode=2350 → coverage + distributor (for the live confirm line)
export async function GET(req: Request) {
  const postcode = new URL(req.url).searchParams.get("postcode")?.trim() ?? "";
  if (!/^\d{4}$/.test(postcode)) {
    return json({ ok: false, error: "Enter a 4-digit postcode." }, 400);
  }
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("plans")
    .select("distributor")
    .eq("state", "NSW")
    .eq("is_market_offer", true)
    .contains("included_postcodes", [postcode])
    .limit(1000);
  if (error) return json({ ok: false, error: "Lookup failed." }, 500);
  const distributors = [...new Set((data ?? []).map((r) => r.distributor))];
  if (distributors.length === 0) {
    return json({ ok: true, covered: false });
  }
  return json({ ok: true, covered: true, distributor: distributors[0] });
}

// POST { postcode, retailer, household } → synthetic ParsedBill estimate
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    postcode?: string;
    retailer?: string;
    household?: number;
  } | null;
  const postcode = body?.postcode?.trim() ?? "";
  const retailer = body?.retailer?.trim() ?? "";
  const household = Math.min(Math.max(Math.round(body?.household ?? 2), 1), 5);

  if (!/^\d{4}$/.test(postcode)) {
    return json({ ok: false, error: "Enter a 4-digit postcode." }, 400);
  }

  let plans: FlatPlan[];
  try {
    plans = (await fetchAllFlatPlans(createServiceClient(), postcode)).filter(
      (p) => p.usage_rate_cents_flat != null && !isEstimateName(p.plan_name),
    );
  } catch (err) {
    console.error("[quick-check] lookup failed:", (err as Error).message);
    return json({ ok: false, error: "Plan lookup failed." }, 500);
  }

  if (plans.length === 0) {
    return json(
      { ok: false, error: "We don't have plans for that postcode yet." },
      404,
    );
  }

  const annualKwh = HOUSEHOLD_ANNUAL_KWH[household] ?? 5000;
  const costOf = (p: FlatPlan) =>
    p.supply_charge_per_day_cents * 365 + annualKwh * (p.usage_rate_cents_flat ?? 0);

  // Representative "current" = median plan from the chosen retailer in this zone
  // (conservative — under-claims rather than over-claims savings). Falls back to
  // the whole-zone median if we don't recognise the retailer.
  const retailerKey = normalise(retailer);
  const retailerPlans = retailer
    ? plans.filter((p) => normalise(p.retailer_name) === retailerKey)
    : [];
  const pool = (retailerPlans.length ? retailerPlans : plans)
    .slice()
    .sort((a, b) => costOf(a) - costOf(b));
  const median = pool[Math.floor(pool.length / 2)];

  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - 364);
  const iso = (d: Date) => d.toISOString().slice(0, 10);

  const bill: ParsedBill = {
    retailer_name: retailer || null,
    plan_name: "Estimated typical plan",
    billing_period_start: iso(start),
    billing_period_end: iso(today),
    total_amount_cents: Math.round(costOf(median)),
    kwh_used: annualKwh,
    supply_charge_per_day_cents: median.supply_charge_per_day_cents,
    usage_rate_cents_flat: median.usage_rate_cents_flat,
    usage_rate_cents_peak: null,
    usage_rate_cents_shoulder: null,
    usage_rate_cents_offpeak: null,
    postcode,
    distributor: median.distributor,
    tariff_type: "flat",
  };

  const parsed = BillSchema.safeParse(bill);
  if (!parsed.success) {
    return json({ ok: false, error: "Couldn't build an estimate." }, 500);
  }
  return json({ ok: true, bill: parsed.data, distributor: median.distributor });
}

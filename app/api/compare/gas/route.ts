import { compareGasBill } from "@/lib/gas-comparison";
import { GasBillSchema, type GasCandidate, type GasStep } from "@/lib/gas";
import { createServiceClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";

export const runtime = "nodejs";

const GAS_COLUMNS =
  "id,retailer_name,plan_name,gas_distributor,gas_supply_charge_cents_per_day,gas_rates";

function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

type Supabase = ReturnType<typeof createServiceClient>;

interface GasPlanRow {
  id: string;
  retailer_name: string;
  plan_name: string;
  gas_distributor: string | null;
  gas_supply_charge_cents_per_day: number | null;
  gas_rates: unknown;
}

function toCandidates(rows: GasPlanRow[]): GasCandidate[] {
  return rows.map((r) => ({
    id: r.id,
    retailer_name: r.retailer_name,
    plan_name: r.plan_name,
    gas_distributor: r.gas_distributor,
    gas_supply_charge_cents_per_day: r.gas_supply_charge_cents_per_day,
    gas_rates: Array.isArray(r.gas_rates) ? (r.gas_rates as GasStep[]) : [],
  }));
}

function gasBase(supabase: Supabase) {
  return supabase
    .from("plans")
    .select(GAS_COLUMNS)
    .eq("fuel_type", "GAS")
    .eq("is_market_offer", true)
    .limit(1000);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = GasBillSchema.safeParse(body);
  if (!parsed.success) {
    return json({ ok: false, error: "Invalid gas bill data." }, 400);
  }
  const bill = parsed.data;

  if (bill.mj_used == null || bill.mj_used <= 0) {
    return json({ ok: false, error: "We need your gas usage (MJ) to compare." }, 422);
  }

  const supabase = createServiceClient();

  // Prefer postcode matching (pins the Jemena zone); fall back to distributor,
  // then to all NSW gas so regional users still see whatever exists.
  let rows: GasPlanRow[] = [];
  try {
    if (bill.postcode) {
      const { data, error } = await gasBase(supabase).contains("included_postcodes", [
        bill.postcode,
      ]);
      if (error) throw new Error(error.message);
      rows = (data ?? []) as unknown as GasPlanRow[];
    }
    if (rows.length === 0 && bill.gas_distributor) {
      const prefix = bill.gas_distributor.trim().split(/\s+/)[0];
      const { data, error } = await gasBase(supabase).ilike("gas_distributor", `${prefix}%`);
      if (error) throw new Error(error.message);
      rows = (data ?? []) as unknown as GasPlanRow[];
    }
    if (rows.length === 0) {
      const { data, error } = await gasBase(supabase);
      if (error) throw new Error(error.message);
      rows = (data ?? []) as unknown as GasPlanRow[];
    }
  } catch (err) {
    console.error("[compare/gas] lookup failed:", (err as Error).message);
    return json({ ok: false, error: "Plan lookup failed." }, 500);
  }

  if (rows.length === 0) {
    return json(
      { ok: false, error: "We don't have mains-gas plans for your area yet." },
      404,
    );
  }

  const result = compareGasBill(bill, toCandidates(rows));

  // Anonymised submission for analytics (no account/name/address).
  const sessionId = req.headers.get("x-session-id") || crypto.randomUUID();
  try {
    await supabase.from("bill_submissions").insert({
      session_id: sessionId,
      fuel_type: "reticulated_gas",
      parsed_data: {},
      mj_used: bill.mj_used,
      gas_supply_charge_cents_per_day: bill.gas_supply_charge_cents_per_day,
      recommended_plans: result.plans as unknown as Json,
    });
  } catch (err) {
    console.error("[compare/gas] submission insert failed:", (err as Error).message);
  }

  return json({ ok: true, result });
}

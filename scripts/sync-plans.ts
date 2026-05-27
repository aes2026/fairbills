/**
 * FairBills — AER PRD plan sync (v1, NSW electricity only).
 *
 * Loads every CURRENT residential electricity MARKET offer that applies to a
 * NSW distributor (Ausgrid / Endeavour Energy / Essential Energy) from the
 * AER Product Reference Data API, maps it to the `plans` schema, and upserts
 * it into Supabase.
 *
 * The AER PRD has no single aggregate endpoint — each retailer brand exposes
 * its own `<baseUri>/cds-au/v1/energy/plans`. We discover the ~78 brand base
 * URIs from a community-maintained list, then:
 *   1. page each retailer's electricity MARKET plans  (GET .../plans, x-v:1)
 *   2. keep RESIDENTIAL plans that cover a NSW distributor
 *   3. fetch each plan's detail                        (GET .../plans/{id}, x-v:3)
 *   4. map rates → `plans` rows (one per NSW distributor the plan covers)
 *
 * Usage:
 *   npm run sync:plans -- --dry-run                 # fetch+map, print, no DB
 *   npm run sync:plans -- --dry-run --limit 5 --retailers agl,energy-locals
 *   npm run sync:plans                              # full run, writes to DB
 *
 * Flags:
 *   --dry-run            don't touch the DB; print a summary + sample rows
 *   --limit N            cap the number of plan DETAILS fetched (for testing)
 *   --retailers a,b,c    only these brand slugs
 *   --concurrency N      parallel requests (default 6)
 */

import { createClient } from "@supabase/supabase-js";

import type { TariffType } from "../lib/supabase/types";

/** A `plans` row as produced by the sync (raw_data kept loose for the AER payload). */
interface MappedPlan {
  id: string;
  plan_id: string;
  retailer_name: string;
  retailer_id: string;
  plan_name: string;
  state: string;
  distributor: string;
  tariff_type: TariffType;
  fuel_type: string;
  customer_type: string;
  is_market_offer: boolean;
  supply_charge_per_day_cents: number;
  usage_rate_cents_flat: number | null;
  usage_rate_cents_peak: number | null;
  usage_rate_cents_shoulder: number | null;
  usage_rate_cents_offpeak: number | null;
  controlled_load_cents: number | null;
  solar_fit_cents: number | null;
  solar_fit_cents_per_kwh: number | null;
  has_ev_tariff: boolean;
  ev_tariff_rate_cents: number | null;
  has_super_off_peak: boolean;
  super_off_peak_rate_cents: number | null;
  // gas-only (null for electricity rows)
  gas_supply_charge_cents_per_day: number | null;
  gas_rates: { volume: number | null; rate: number }[] | null;
  gas_distributor: string | null;
  included_postcodes: string[] | null;
  features: Record<string, unknown>;
  effective_from: string;
  effective_to: string | null;
  raw_data: unknown;
  last_synced_at: string;
}

const ENDPOINTS_URL =
  "https://jxeeno.github.io/energy-cdr-prd-endpoints/energy-prd-endpoints.json";
// NSW electricity distributors. The AER labels them "Ausgrid", "Endeavour"
// (NOT "Endeavour Energy"), and several Essential Energy zones ("Essential
// Energy", "Essential Energy Standard", "Essential Energy Far West"). Match by
// prefix and store the exact zone label so the comparison engine can pick the
// right network tariff for the user.
function isNswDistributor(name: string): boolean {
  return /^(ausgrid|endeavour|essential energy)/i.test(name.trim());
}
const LIST_VERSION = 1;
const DETAIL_VERSION = 3;
const PAGE_SIZE = 1000;
const MAX_RETRIES = 4;

// ---------------------------------------------------------------------------
// args
// ---------------------------------------------------------------------------
interface Args {
  dryRun: boolean;
  limit?: number;
  retailers?: Set<string>;
  concurrency: number;
  fuels: ("ELECTRICITY" | "GAS")[];
}

function parseArgs(argv: string[]): Args {
  const args: Args = { dryRun: false, concurrency: 6, fuels: ["ELECTRICITY", "GAS"] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") args.dryRun = true;
    else if (a === "--limit") args.limit = Number(argv[++i]);
    else if (a === "--concurrency") args.concurrency = Number(argv[++i]);
    else if (a === "--fuel") {
      const f = argv[++i]?.toUpperCase();
      args.fuels = f === "GAS" ? ["GAS"] : f === "ELECTRICITY" ? ["ELECTRICITY"] : ["ELECTRICITY", "GAS"];
    } else if (a === "--retailers")
      args.retailers = new Set(
        argv[++i].split(",").map((s) => s.trim().toLowerCase()).filter(Boolean),
      );
  }
  return args;
}

// ---------------------------------------------------------------------------
// AER PRD types (only the fields we use)
// ---------------------------------------------------------------------------
interface BrandEndpoint {
  brandName: string;
  industries?: string[];
  productReferenceDataBaseUri: string;
}

interface PlanSummary {
  planId: string;
  type?: string;
  fuelType?: string;
  brand?: string;
  brandName?: string;
  displayName?: string;
  customerType?: string;
  effectiveFrom?: string;
  geography?: { distributors?: string[]; includedPostcodes?: string[] };
  __baseUri?: string; // the retailer base URI this plan was listed from
}

interface RateBlock {
  type?: string; // PEAK | OFF_PEAK | SHOULDER
  timeOfUseType?: string; // legacy/alt key, kept as a fallback
  rates?: { unitPrice?: string }[];
  timeOfUse?: { days?: string[]; startTime?: string; endTime?: string }[];
}
interface TariffPeriod {
  rateBlockUType?: string;
  dailySupplyCharge?: string;
  singleRate?: { rates?: { unitPrice?: string }[] };
  timeOfUseRates?: RateBlock[];
}
interface ElectricityContract {
  pricingModel?: string;
  isFixed?: boolean;
  tariffPeriod?: TariffPeriod[];
  controlledLoad?: { singleRate?: { rates?: { unitPrice?: string }[] } }[];
  solarFeedInTariff?: {
    tariffUType?: string;
    singleTariff?: { rates?: { unitPrice?: string }[] };
  }[];
  greenPowerCharges?: unknown[];
  discounts?: { displayName?: string; description?: string }[];
  incentives?: { displayName?: string; description?: string; category?: string }[];
}
interface GasRate {
  unitPrice?: string;
  volume?: number | string;
}
interface GasTariffPeriod {
  dailySupplyCharge?: string;
  rateBlockUType?: string;
  singleRate?: { rates?: GasRate[] };
  blockRate?: { rates?: GasRate[] }[];
}
interface GasContract {
  pricingModel?: string;
  isFixed?: boolean;
  tariffPeriod?: GasTariffPeriod[];
}
interface PlanDetail {
  data: PlanSummary & {
    electricityContract?: ElectricityContract;
    gasContract?: GasContract;
  };
}

/** Known NSW gas distribution networks — used only as a fallback when a plan
 * lists no postcodes. (Jemena = Sydney/Newcastle/Wollongong + Capital/Country;
 * AGN/Central Ranges/Evoenergy = regional NSW towns like Wagga, Albury,
 * Tamworth, Queanbeyan.) */
function isNswGasDistributor(name: string): boolean {
  return /jemena|australian gas networks|central ranges|evoenergy|agn/i.test(
    (name ?? "").trim(),
  );
}
function hasNswPostcode(postcodes: string[] | undefined): boolean {
  return (postcodes ?? []).some((p) => /^2\d{3}$/.test(p));
}

// ---------------------------------------------------------------------------
// http
// ---------------------------------------------------------------------------
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function cdsGet<T>(url: string, version: number): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "x-v": String(version), "x-min-v": "1" },
      });
      if (res.status === 429 || res.status >= 500) {
        throw new Error(`${res.status} ${res.statusText}`);
      }
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} for ${url}`);
      }
      return (await res.json()) as T;
    } catch (err) {
      lastErr = err;
      if (attempt < MAX_RETRIES) await sleep(500 * 2 ** attempt);
    }
  }
  throw lastErr;
}

/** Run async work over items with bounded concurrency. */
async function pool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await worker(items[i], i);
    }
  });
  await Promise.all(runners);
  return results;
}

// ---------------------------------------------------------------------------
// mapping
// ---------------------------------------------------------------------------
function slugOf(baseUri: string): string {
  return baseUri.split("/").filter(Boolean).pop() ?? baseUri;
}

/** dollars → cents, preserving up to 3 decimal places. */
function toCents(dollars: string | number | undefined | null): number | null {
  if (dollars === undefined || dollars === null || dollars === "") return null;
  const n = Number(dollars);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100 * 1000) / 1000;
}

function tariffTypeFrom(ec: ElectricityContract | undefined): TariffType {
  const pm = (ec?.pricingModel ?? "").toUpperCase();
  if (pm.includes("TIME_OF_USE")) return "time_of_use";
  if (ec?.tariffPeriod?.[0]?.rateBlockUType === "timeOfUseRates") {
    return "time_of_use";
  }
  return "flat"; // SINGLE_RATE / SINGLE_RATE_CONT_LOAD
}

/** Hour (0-23) from an AER "HHMM" time string, or null. */
function hourOf(t: string | undefined): number | null {
  if (!t) return null;
  const h = parseInt(t.slice(0, 2), 10);
  return Number.isFinite(h) ? h : null;
}

/**
 * Conservatively detect structural-value features on a candidate plan.
 * Deliberately under-detects: a false negative just makes a comparison
 * low-confidence (honest "stay"), whereas a false positive could wrongly
 * recommend switching off a plan that actually loses the feature.
 *  - EV tariff: a sub-15c/kWh rate confined to an overnight window (starts
 *    00:00, ends by ~06:00).
 *  - Super off-peak / solar soak: a sub-5c/kWh rate in a midday window (10-15h).
 */
function detectPlanFeatures(ec: ElectricityContract | undefined): {
  has_ev_tariff: boolean;
  ev_tariff_rate_cents: number | null;
  has_super_off_peak: boolean;
  super_off_peak_rate_cents: number | null;
} {
  let hasEv = false;
  let evRate: number | null = null;
  let hasSuper = false;
  let superRate: number | null = null;

  for (const tp of ec?.tariffPeriod ?? []) {
    for (const tour of tp.timeOfUseRates ?? []) {
      const price = Number(tour.rates?.[0]?.unitPrice); // dollars/kWh
      if (!Number.isFinite(price)) continue;
      const windows = tour.timeOfUse ?? [];

      if (price < 0.15) {
        const overnight = windows.some((w) => {
          const s = hourOf(w.startTime);
          const e = hourOf(w.endTime);
          return s === 0 && e != null && e <= 6;
        });
        if (overnight) {
          hasEv = true;
          evRate = Math.round(price * 100);
        }
      }
      if (price < 0.05) {
        const midday = windows.some((w) => {
          const s = hourOf(w.startTime);
          return s != null && s >= 10 && s <= 15;
        });
        if (midday) {
          hasSuper = true;
          superRate = Math.round(price * 100);
        }
      }
    }
  }
  return {
    has_ev_tariff: hasEv,
    ev_tariff_rate_cents: evRate,
    has_super_off_peak: hasSuper,
    super_off_peak_rate_cents: superRate,
  };
}

function mapPlan(detail: PlanDetail): MappedPlan[] {
  const d = detail.data;
  const ec = d.electricityContract;
  const tp = ec?.tariffPeriod?.[0];
  const tariff_type = tariffTypeFrom(ec);
  const featureFlags = detectPlanFeatures(ec);

  let flat: number | null = null;
  let peak: number | null = null;
  let shoulder: number | null = null;
  let offpeak: number | null = null;

  if (tariff_type === "flat") {
    flat = toCents(tp?.singleRate?.rates?.[0]?.unitPrice);
  } else {
    for (const tou of tp?.timeOfUseRates ?? []) {
      const type = (tou.type ?? tou.timeOfUseType ?? "").toUpperCase();
      const price = toCents(tou.rates?.[0]?.unitPrice);
      if (type.includes("OFF")) offpeak = price;
      else if (type.includes("SHOULDER")) shoulder = price;
      else if (type.includes("PEAK")) peak = price;
    }
  }

  const controlled = toCents(
    ec?.controlledLoad?.[0]?.singleRate?.rates?.[0]?.unitPrice,
  );
  const solar = toCents(
    ec?.solarFeedInTariff?.find((t) => t.tariffUType === "singleTariff")
      ?.singleTariff?.rates?.[0]?.unitPrice,
  );

  const payOnTimeDiscount = (ec?.discounts ?? []).some((x) =>
    /pay[- ]?on[- ]?time|prompt payment|direct debit/i.test(
      `${x.displayName ?? ""} ${x.description ?? ""}`,
    ),
  );

  const features = {
    isFixed: ec?.isFixed ?? null,
    hasGreenPower: Array.isArray(ec?.greenPowerCharges) && ec.greenPowerCharges.length > 0,
    hasSolarFit: solar !== null,
    payOnTimeDiscount,
    incentives: (ec?.incentives ?? []).map((i) => ({
      displayName: i.displayName,
      description: i.description,
      category: i.category,
    })),
  };

  const nswDistributors = (d.geography?.distributors ?? []).filter(isNswDistributor);
  const supply = toCents(tp?.dailySupplyCharge) ?? 0;
  const effectiveFrom = (d.effectiveFrom ?? new Date().toISOString()).slice(0, 10);

  return nswDistributors.map((dist) => ({
    id: `${d.planId}__${dist}`,
    plan_id: d.planId,
    retailer_name: d.brandName ?? "",
    retailer_id: d.brand ?? "",
    plan_name: d.displayName ?? d.planId,
    state: "NSW",
    distributor: dist,
    tariff_type,
    fuel_type: "ELECTRICITY",
    customer_type: d.customerType ?? "RESIDENTIAL",
    is_market_offer: (d.type ?? "MARKET") === "MARKET",
    supply_charge_per_day_cents: supply,
    usage_rate_cents_flat: flat,
    usage_rate_cents_peak: peak,
    usage_rate_cents_shoulder: shoulder,
    usage_rate_cents_offpeak: offpeak,
    controlled_load_cents: controlled,
    solar_fit_cents: solar,
    solar_fit_cents_per_kwh: solar != null ? Math.round(solar) : null,
    has_ev_tariff: featureFlags.has_ev_tariff,
    ev_tariff_rate_cents: featureFlags.ev_tariff_rate_cents,
    has_super_off_peak: featureFlags.has_super_off_peak,
    super_off_peak_rate_cents: featureFlags.super_off_peak_rate_cents,
    gas_supply_charge_cents_per_day: null,
    gas_rates: null,
    gas_distributor: null,
    included_postcodes: d.geography?.includedPostcodes ?? null,
    features,
    effective_from: effectiveFrom,
    effective_to: null,
    raw_data: detail,
    last_synced_at: new Date().toISOString(),
  }));
}

function mapGasPlan(detail: PlanDetail): MappedPlan[] {
  const d = detail.data;
  const gc = d.gasContract;
  const tp = gc?.tariffPeriod?.[0];
  if (!gc || !tp) return [];

  const supplyCents = toCents(tp.dailySupplyCharge);
  const rawRates: GasRate[] =
    tp.singleRate?.rates ?? tp.blockRate?.flatMap((b) => b.rates ?? []) ?? [];

  // Stepped daily rates: each {volume MJ/day (null for the final/remainder
  // step), rate c/MJ}. Sub-cent precision matters for gas, so rates stay
  // fractional in the JSONB.
  const gasRates = rawRates
    .map((r) => {
      const vol = r.volume == null ? null : Number(r.volume);
      const rate = toCents(r.unitPrice);
      return { volume: vol != null && Number.isFinite(vol) ? vol : null, rate };
    })
    .filter((r): r is { volume: number | null; rate: number } => r.rate != null);

  if (gasRates.length === 0) return [];

  const gasDist = (d.geography?.distributors ?? [])[0] ?? null;
  const supplyInt = supplyCents != null ? Math.round(supplyCents) : null;

  return [
    {
      id: d.planId,
      plan_id: d.planId,
      retailer_name: d.brandName ?? "",
      retailer_id: d.brand ?? "",
      plan_name: d.displayName ?? d.planId,
      state: "NSW",
      // The electricity `distributor` column is NOT NULL; reuse the gas network.
      distributor: gasDist ?? "Gas network",
      tariff_type: "flat",
      fuel_type: "GAS",
      customer_type: d.customerType ?? "RESIDENTIAL",
      is_market_offer: (d.type ?? "MARKET") === "MARKET",
      supply_charge_per_day_cents: supplyInt ?? 0,
      usage_rate_cents_flat: null,
      usage_rate_cents_peak: null,
      usage_rate_cents_shoulder: null,
      usage_rate_cents_offpeak: null,
      controlled_load_cents: null,
      solar_fit_cents: null,
      solar_fit_cents_per_kwh: null,
      has_ev_tariff: false,
      ev_tariff_rate_cents: null,
      has_super_off_peak: false,
      super_off_peak_rate_cents: null,
      gas_supply_charge_cents_per_day: supplyInt,
      gas_rates: gasRates,
      gas_distributor: gasDist,
      included_postcodes: d.geography?.includedPostcodes ?? null,
      features: {},
      effective_from: (d.effectiveFrom ?? new Date().toISOString()).slice(0, 10),
      effective_to: null,
      raw_data: detail,
      last_synced_at: new Date().toISOString(),
    },
  ];
}

// ---------------------------------------------------------------------------
// fetch helpers
// ---------------------------------------------------------------------------
async function listNswResidential(
  baseUri: string,
  fuelType: "ELECTRICITY" | "GAS",
): Promise<PlanSummary[]> {
  const out: PlanSummary[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const url =
      `${baseUri}/cds-au/v1/energy/plans` +
      `?type=MARKET&effective=CURRENT&fuelType=${fuelType}&page=${page}&page-size=${PAGE_SIZE}`;
    const data = await cdsGet<{
      data?: { plans?: PlanSummary[] };
      meta?: { totalPages?: number };
    }>(url, LIST_VERSION);
    out.push(...(data.data?.plans ?? []));
    totalPages = data.meta?.totalPages ?? 1;
    page++;
  } while (page <= totalPages);

  return out.filter((p) => {
    if (p.customerType !== "RESIDENTIAL") return false;
    const dists = p.geography?.distributors ?? [];
    if (fuelType === "GAS") {
      const incl = p.geography?.includedPostcodes ?? [];
      // All NSW gas: any plan that serves a NSW (2xxx) postcode, regardless of
      // distributor. Plans with no postcodes fall back to a known NSW network.
      return hasNswPostcode(incl) || (incl.length === 0 && dists.some(isNswGasDistributor));
    }
    return dists.some(isNswDistributor);
  });
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const startedAt = Date.now();
  console.log(
    `[sync] start  dryRun=${args.dryRun} concurrency=${args.concurrency}` +
      (args.limit ? ` limit=${args.limit}` : "") +
      (args.retailers ? ` retailers=${[...args.retailers].join(",")}` : ""),
  );

  // 1. discover retailer endpoints
  const endpointsResp = await cdsGet<{ data: BrandEndpoint[] }>(ENDPOINTS_URL, 1).catch(
    async () => {
      // the endpoints file is plain JSON, not a CDS resource; fall back to fetch
      const r = await fetch(ENDPOINTS_URL);
      return (await r.json()) as { data: BrandEndpoint[] };
    },
  );
  let endpoints = endpointsResp.data.filter((e) => e.productReferenceDataBaseUri);
  if (args.retailers) {
    endpoints = endpoints.filter((e) =>
      args.retailers!.has(slugOf(e.productReferenceDataBaseUri).toLowerCase()),
    );
  }
  console.log(`[sync] retailers to scan: ${endpoints.length}`);

  // 2-3. per fuel type: collect summaries, fetch details, map to rows
  const rows: MappedPlan[] = [];
  for (const fuel of args.fuels) {
    console.log(`[sync] === ${fuel} ===`);
    const summaries: PlanSummary[] = [];
    for (const ep of endpoints) {
      const baseUri = ep.productReferenceDataBaseUri.trim();
      const slug = slugOf(baseUri);
      try {
        const plans = await listNswResidential(baseUri, fuel);
        for (const p of plans) p.__baseUri = baseUri;
        summaries.push(...plans);
        if (plans.length) console.log(`[sync]   ${slug}: ${plans.length} NSW residential ${fuel}`);
      } catch (err) {
        console.warn(`[sync]   ${slug}: list FAILED — ${(err as Error).message}`);
      }
    }
    let toFetch = summaries;
    if (args.limit && toFetch.length > args.limit) toFetch = toFetch.slice(0, args.limit);
    console.log(`[sync] ${fuel} details to fetch: ${toFetch.length} (of ${summaries.length})`);

    let detailFailures = 0;
    const map = fuel === "GAS" ? mapGasPlan : mapPlan;
    const rowsNested = await pool(toFetch, args.concurrency, async (summary) => {
      try {
        const baseUri = (
          summary.__baseUri ?? `https://cdr.energymadeeasy.gov.au/${summary.brand}`
        ).trim();
        const detail = await cdsGet<PlanDetail>(
          `${baseUri}/cds-au/v1/energy/plans/${summary.planId}`,
          DETAIL_VERSION,
        );
        return map(detail);
      } catch (err) {
        detailFailures++;
        console.warn(`[sync]   detail FAILED ${summary.planId} — ${(err as Error).message}`);
        return [] as MappedPlan[];
      }
    });
    const fuelRows = rowsNested.flat();
    rows.push(...fuelRows);
    console.log(`[sync] ${fuel} mapped rows: ${fuelRows.length} (detail failures: ${detailFailures})`);
  }

  // 4. write (or print)
  if (args.dryRun) {
    const sample = rows.slice(0, 3);
    console.log("[sync] DRY RUN — sample rows:");
    for (const r of sample) {
      console.log(
        JSON.stringify(
          {
            id: r.id,
            retailer: r.retailer_name,
            plan: r.plan_name,
            distributor: r.distributor,
            tariff_type: r.tariff_type,
            supply_c_day: r.supply_charge_per_day_cents,
            flat_c_kwh: r.usage_rate_cents_flat,
            peak: r.usage_rate_cents_peak,
            shoulder: r.usage_rate_cents_shoulder,
            offpeak: r.usage_rate_cents_offpeak,
            features: r.features,
          },
          null,
          2,
        ),
      );
    }
    const byTariff = rows.reduce<Record<string, number>>((acc, r) => {
      acc[r.tariff_type] = (acc[r.tariff_type] ?? 0) + 1;
      return acc;
    }, {});
    console.log("[sync] by tariff_type:", byTariff);
    const byFuel = rows.reduce<Record<string, number>>((acc, r) => {
      acc[r.fuel_type] = (acc[r.fuel_type] ?? 0) + 1;
      return acc;
    }, {});
    console.log("[sync] by fuel_type:", byFuel);
    const gasSample = rows.find((r) => r.fuel_type === "GAS");
    if (gasSample) {
      console.log("[sync] gas sample:", JSON.stringify({
        id: gasSample.id, retailer: gasSample.retailer_name, plan: gasSample.plan_name,
        gas_distributor: gasSample.gas_distributor,
        gas_supply_charge_cents_per_day: gasSample.gas_supply_charge_cents_per_day,
        gas_rates: gasSample.gas_rates,
      }, null, 1));
    }
  } else {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error(
        "Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. " +
          "Run with --dry-run, or create .env.local (see .env.example).",
      );
    }
    // Untyped client on purpose: the authoritative Database type is generated
    // from the live schema (Supabase MCP / CLI) once the migration is applied.
    const supabase = createClient(url, key, {
      auth: { persistSession: false },
    });
    const BATCH = 500;
    let written = 0;
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);
      const { error } = await supabase.from("plans").upsert(batch, { onConflict: "id" });
      if (error) throw new Error(`upsert failed at row ${i}: ${error.message}`);
      written += batch.length;
      console.log(`[sync]   upserted ${written}/${rows.length}`);
    }
    console.log(`[sync] wrote ${written} rows to plans`);
  }

  console.log(`[sync] done in ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);
}

main().catch((err) => {
  console.error("[sync] FATAL:", err);
  process.exit(1);
});

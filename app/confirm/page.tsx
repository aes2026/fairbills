"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Zap } from "lucide-react";

import {
  BillSchema,
  PARSED_BILL_KEY,
  TARIFF_TYPES,
  type ParsedBill,
  type TariffType,
} from "@/lib/bill";

const TARIFF_LABELS: Record<TariffType, string> = {
  flat: "Flat (single rate)",
  time_of_use: "Time of use",
  controlled_load: "Controlled load",
};

function centsToDollars(cents: number | null): string {
  return cents == null ? "" : (cents / 100).toFixed(2);
}
function numOrNull(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export default function ConfirmPage() {
  const router = useRouter();
  const [bill, setBill] = useState<ParsedBill | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");

  useEffect(() => {
    const raw = sessionStorage.getItem(PARSED_BILL_KEY);
    if (!raw) return setState("missing");
    const parsed = BillSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return setState("missing");
    setBill(parsed.data);
    setState("ready");
  }, []);

  function set<K extends keyof ParsedBill>(key: K, value: ParsedBill[K]) {
    setBill((b) => (b ? { ...b, [key]: value } : b));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!bill) return;
    sessionStorage.setItem(PARSED_BILL_KEY, JSON.stringify(bill));
    router.push("/results");
  }

  if (state === "loading") return null;

  if (state === "missing" || !bill) {
    return (
      <main className="min-h-full bg-surface-muted px-5 py-10">
        <div className="mx-auto w-full max-w-[560px] rounded-[12px] bg-surface p-7 text-center">
          <p className="text-sm text-text-secondary">
            We don&rsquo;t have a bill to check yet.
          </p>
          <Link
            href="/upload"
            className="mt-4 inline-flex h-11 items-center rounded-[8px] bg-brand-500 px-5 text-sm font-medium text-white"
          >
            Upload a bill
          </Link>
        </div>
      </main>
    );
  }

  const canCompare =
    bill.kwh_used != null &&
    bill.supply_charge_per_day_cents != null &&
    (bill.tariff_type === "flat"
      ? bill.usage_rate_cents_flat != null
      : bill.usage_rate_cents_peak != null || bill.usage_rate_cents_offpeak != null);

  const inputCls =
    "w-full rounded-[8px] border-[0.5px] border-black/30 bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-brand-500";
  const labelCls = "mb-1 block text-[12px] font-medium text-text-secondary";

  return (
    <main className="min-h-full bg-surface-muted px-5 py-10">
      <form
        onSubmit={onSubmit}
        className="mx-auto w-full max-w-[560px] rounded-[12px] bg-surface p-7"
      >
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-[8px] bg-brand-500">
              <Zap className="size-4 text-white" />
            </span>
            <span className="text-[15px] font-medium">FairBills</span>
          </Link>
          <span className="text-xs text-text-tertiary">Is this right?</span>
        </div>

        <h2 className="text-2xl font-medium tracking-[-0.3px]">
          Quick check — did we get this right?
        </h2>
        <p className="mt-2 mb-6 text-sm text-text-secondary">
          We pulled these from your bill. Fix anything that looks off before we
          compare.
        </p>

        {/* Three headline fields */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className={labelCls}>Retailer</label>
            <input
              className={inputCls}
              value={bill.retailer_name ?? ""}
              onChange={(e) => set("retailer_name", e.target.value || null)}
            />
          </div>
          <div>
            <label className={labelCls}>Plan</label>
            <input
              className={inputCls}
              value={bill.plan_name ?? ""}
              onChange={(e) => set("plan_name", e.target.value || null)}
            />
          </div>
          <div>
            <label className={labelCls}>This bill ($)</label>
            <input
              className={inputCls}
              inputMode="decimal"
              value={centsToDollars(bill.total_amount_cents)}
              onChange={(e) => {
                const n = numOrNull(e.target.value);
                set("total_amount_cents", n == null ? null : Math.round(n * 100));
              }}
            />
          </div>
        </div>

        {/* Details that drive the comparison */}
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Electricity used (kWh)</label>
            <input
              className={inputCls}
              inputMode="decimal"
              value={bill.kwh_used ?? ""}
              onChange={(e) => set("kwh_used", numOrNull(e.target.value))}
            />
          </div>
          <div>
            <label className={labelCls}>Supply charge (c/day)</label>
            <input
              className={inputCls}
              inputMode="decimal"
              value={bill.supply_charge_per_day_cents ?? ""}
              onChange={(e) =>
                set("supply_charge_per_day_cents", numOrNull(e.target.value))
              }
            />
          </div>
          <div>
            <label className={labelCls}>Tariff</label>
            <select
              className={inputCls}
              value={bill.tariff_type}
              onChange={(e) => set("tariff_type", e.target.value as TariffType)}
            >
              {TARIFF_TYPES.map((t) => (
                <option key={t} value={t}>
                  {TARIFF_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Postcode</label>
            <input
              className={inputCls}
              inputMode="numeric"
              value={bill.postcode ?? ""}
              onChange={(e) => set("postcode", e.target.value || null)}
            />
          </div>
          <div>
            <label className={labelCls}>Account number</label>
            <input
              className={inputCls}
              value={bill.account_number ?? ""}
              onChange={(e) => set("account_number", e.target.value || null)}
              placeholder="Used in your script"
            />
          </div>

          {bill.tariff_type === "time_of_use" ? (
            <>
              <div>
                <label className={labelCls}>Peak rate (c/kWh)</label>
                <input
                  className={inputCls}
                  inputMode="decimal"
                  value={bill.usage_rate_cents_peak ?? ""}
                  onChange={(e) => set("usage_rate_cents_peak", numOrNull(e.target.value))}
                />
              </div>
              <div>
                <label className={labelCls}>Shoulder rate (c/kWh)</label>
                <input
                  className={inputCls}
                  inputMode="decimal"
                  value={bill.usage_rate_cents_shoulder ?? ""}
                  onChange={(e) =>
                    set("usage_rate_cents_shoulder", numOrNull(e.target.value))
                  }
                />
              </div>
              <div>
                <label className={labelCls}>Off-peak rate (c/kWh)</label>
                <input
                  className={inputCls}
                  inputMode="decimal"
                  value={bill.usage_rate_cents_offpeak ?? ""}
                  onChange={(e) =>
                    set("usage_rate_cents_offpeak", numOrNull(e.target.value))
                  }
                />
              </div>
            </>
          ) : (
            <div>
              <label className={labelCls}>Usage rate (c/kWh)</label>
              <input
                className={inputCls}
                inputMode="decimal"
                value={bill.usage_rate_cents_flat ?? ""}
                onChange={(e) => set("usage_rate_cents_flat", numOrNull(e.target.value))}
              />
            </div>
          )}
        </div>

        {!canCompare && (
          <p className="mt-4 rounded-[8px] bg-warning-50 px-4 py-3 text-[13px] text-warning-800">
            Fill in your usage (kWh), supply charge and{" "}
            {bill.tariff_type === "flat" ? "usage rate" : "at least one rate"} so we
            can compare accurately.
          </p>
        )}

        <button
          type="submit"
          disabled={!canCompare}
          className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-[8px] bg-brand-500 text-[15px] font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Looks right — show me better deals
          <ArrowRight className="size-4" />
        </button>
        <Link
          href="/upload"
          className="mt-3 block text-center text-[13px] text-text-secondary hover:text-text-primary"
        >
          Start over
        </Link>
      </form>
    </main>
  );
}

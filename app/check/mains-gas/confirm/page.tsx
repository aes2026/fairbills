"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Loader2, ThermometerSun, Zap } from "lucide-react";

import { getSessionId } from "@/lib/household";
import { GAS_INPUT_KEY, GAS_PARSED_KEY, GAS_RESULT_KEY, GasBillSchema, type GasBill } from "@/lib/gas";

function centsToStr(c: number | null | undefined): string {
  return c == null ? "" : String(Number(c.toFixed(2)));
}
function numOrNull(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export default function MainsGasConfirmPage() {
  const router = useRouter();
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");
  const [bill, setBill] = useState<GasBill | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem(GAS_PARSED_KEY);
    if (!raw) return setState("missing");
    const parsed = GasBillSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return setState("missing");
    setBill(parsed.data);
    setState("ready");
  }, []);

  function set<K extends keyof GasBill>(key: K, value: GasBill[K]) {
    setBill((b) => (b ? { ...b, [key]: value } : b));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!bill) return;
    if (!bill.postcode || !/^\d{4}$/.test(bill.postcode)) {
      setError("Enter a valid 4-digit postcode.");
      return;
    }
    if (bill.mj_used == null || bill.mj_used <= 0) {
      setError("Enter how much gas you used (MJ).");
      return;
    }
    if (bill.gas_supply_charge_cents_per_day == null || bill.block1_rate_cents_per_mj == null) {
      setError("We need your supply charge and usage rate to compare.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/compare/gas", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-session-id": getSessionId() },
        body: JSON.stringify(bill),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        sessionStorage.setItem(GAS_INPUT_KEY, JSON.stringify(bill));
        sessionStorage.setItem(GAS_RESULT_KEY, JSON.stringify(data.result));
        router.push("/check/mains-gas/results");
        return;
      }
      setError(data.error ?? "Couldn't build a comparison.");
      setSubmitting(false);
    } catch {
      setError("Couldn't reach the server. Try again.");
      setSubmitting(false);
    }
  }

  if (state === "loading") return null;

  if (state === "missing" || !bill) {
    return (
      <main className="min-h-dvh bg-surface-muted px-5 py-10">
        <div className="mx-auto w-full max-w-2xl rounded-[12px] bg-surface p-7 text-center">
          <p className="text-sm text-text-secondary">We don&rsquo;t have a gas bill to check yet.</p>
          <Link
            href="/check/mains-gas/upload"
            className="mt-4 inline-flex h-11 items-center rounded-[8px] bg-brand-500 px-5 text-sm font-medium text-white"
          >
            Upload a gas bill
          </Link>
        </div>
      </main>
    );
  }

  const inputCls =
    "w-full rounded-[8px] border-[0.5px] border-black/30 bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-brand-500";
  const labelCls = "mb-1 block text-[12px] font-medium text-text-secondary";

  return (
    <main className="min-h-dvh bg-surface-muted px-5 py-10">
      <form onSubmit={onSubmit} className="mx-auto w-full max-w-2xl rounded-[12px] bg-surface p-6 sm:p-7">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-[8px] bg-brand-500">
              <Zap className="size-4 text-white" />
            </span>
            <span className="text-[15px] font-medium">FairBills</span>
          </Link>
          <span className="flex items-center gap-1.5 text-xs text-text-tertiary">
            <ThermometerSun className="size-3.5 text-brand-600" /> Is this right?
          </span>
        </div>

        <h2 className="text-2xl font-medium tracking-[-0.3px]">Does this look right?</h2>
        <p className="mt-2 mb-6 text-sm text-text-secondary">
          We pulled these from your gas bill. Fix anything that&rsquo;s off before we compare.
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Retailer</label>
            <input
              className={inputCls}
              value={bill.retailer_name ?? ""}
              onChange={(e) => set("retailer_name", e.target.value || null)}
            />
          </div>
          <div>
            <label className={labelCls}>Postcode</label>
            <input
              className={inputCls}
              inputMode="numeric"
              maxLength={4}
              value={bill.postcode ?? ""}
              onChange={(e) => set("postcode", e.target.value.replace(/\D/g, "").slice(0, 4))}
            />
          </div>
          <div>
            <label className={labelCls}>Gas used (MJ)</label>
            <input
              className={inputCls}
              inputMode="numeric"
              value={bill.mj_used ?? ""}
              onChange={(e) => set("mj_used", numOrNull(e.target.value))}
            />
          </div>
          <div>
            <label className={labelCls}>Supply charge (c/day)</label>
            <input
              className={inputCls}
              inputMode="decimal"
              value={centsToStr(bill.gas_supply_charge_cents_per_day)}
              onChange={(e) => set("gas_supply_charge_cents_per_day", numOrNull(e.target.value))}
            />
          </div>
          <div>
            <label className={labelCls}>Usage rate (c/MJ)</label>
            <input
              className={inputCls}
              inputMode="decimal"
              value={centsToStr(bill.block1_rate_cents_per_mj)}
              onChange={(e) => set("block1_rate_cents_per_mj", numOrNull(e.target.value))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Bill start</label>
              <input
                className={inputCls}
                type="date"
                value={bill.billing_period_start ?? ""}
                onChange={(e) => set("billing_period_start", e.target.value || null)}
              />
            </div>
            <div>
              <label className={labelCls}>Bill end</label>
              <input
                className={inputCls}
                type="date"
                value={bill.billing_period_end ?? ""}
                onChange={(e) => set("billing_period_end", e.target.value || null)}
              />
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Account number</label>
            <input
              className={inputCls}
              value={bill.account_number ?? ""}
              onChange={(e) => set("account_number", e.target.value || null)}
              placeholder="Used in your script — stays on your device"
            />
          </div>
          <div>
            <label className={labelCls}>Name on the account</label>
            <input
              className={inputCls}
              value={bill.customer_name ?? ""}
              onChange={(e) => set("customer_name", e.target.value || null)}
            />
          </div>
          <div>
            <label className={labelCls}>Service address</label>
            <input
              className={inputCls}
              value={bill.service_address ?? ""}
              onChange={(e) => set("service_address", e.target.value || null)}
            />
          </div>
        </div>

        <p className="mt-4 text-[11px] leading-relaxed text-text-tertiary">
          If your plan has a second usage tier we&rsquo;ll handle it from the bill — most NSW
          households see a single effective rate. Your name, address and account number stay on
          your device and are never stored.
        </p>

        {error && (
          <p className="mt-4 rounded-[8px] bg-danger-50 px-4 py-3 text-[13px] text-danger-800">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-[8px] bg-brand-500 text-[15px] font-medium text-white hover:bg-brand-600 disabled:opacity-50"
        >
          {submitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              Looks right — show me better deals
              <ArrowRight className="size-4" />
            </>
          )}
        </button>
        <Link
          href="/check/mains-gas/upload"
          className="mt-3 block text-center text-[13px] text-text-secondary hover:text-text-primary"
        >
          Start over
        </Link>
      </form>
    </main>
  );
}

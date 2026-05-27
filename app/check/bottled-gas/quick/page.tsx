"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Check, Flame, Loader2, Zap } from "lucide-react";

import { getSessionId } from "@/lib/household";
import {
  LPG_INPUT_KEY,
  LPG_RESULT_KEY,
  type LpgComparisonInput,
  type TenureBucket,
} from "@/lib/lpg";

type SizeChoice = "45" | "9" | "both";

const SUPPLIERS = ["Origin LPG", "Elgas", "Supagas", "Local / other"];

const TENURES: { value: TenureBucket; label: string; sub?: string }[] = [
  { value: "under_1", label: "Under 1 yr" },
  { value: "1_to_3", label: "1–3 yrs" },
  { value: "3_plus", label: "3+ yrs", sub: "Highest risk" },
];

export default function BottledGasQuickCheckPage() {
  const router = useRouter();
  const [postcode, setPostcode] = useState("");
  const [size, setSize] = useState<SizeChoice>("45");
  const [supplier, setSupplier] = useState(SUPPLIERS[0]);
  const [price, setPrice] = useState("");
  const [tenure, setTenure] = useState<TenureBucket>("1_to_3");
  const [coverage, setCoverage] = useState<{ covered: boolean; supplierCount: number } | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sizeKg = size === "9" ? 9 : 45;

  // Live postcode → supplier-count confirmation (debounced).
  useEffect(() => {
    if (!/^\d{4}$/.test(postcode)) {
      setCoverage(null);
      return;
    }
    const ctrl = new AbortController();
    const id = setTimeout(async () => {
      try {
        const res = await fetch(`/api/lpg/compare?postcode=${postcode}&size=${sizeKg}`, {
          signal: ctrl.signal,
        });
        const data = await res.json();
        if (data.ok) setCoverage({ covered: data.covered, supplierCount: data.supplierCount });
      } catch {
        /* ignore aborted/failed lookups */
      }
    }, 400);
    return () => {
      clearTimeout(id);
      ctrl.abort();
    };
  }, [postcode, sizeKg]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{4}$/.test(postcode)) {
      setError("Enter a valid 4-digit postcode.");
      return;
    }
    const dollars = Number(price.replace(/[^0-9.]/g, ""));
    if (!Number.isFinite(dollars) || dollars <= 0) {
      setError("Enter what you paid for your last refill.");
      return;
    }
    setSubmitting(true);
    setError(null);

    const input: LpgComparisonInput = {
      postcode,
      bottle_size_kg: sizeKg,
      current_supplier: supplier,
      price_per_bottle_cents: Math.round(dollars * 100),
      tenure_bucket: tenure,
    };

    try {
      const res = await fetch("/api/lpg/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-session-id": getSessionId() },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        sessionStorage.setItem(LPG_INPUT_KEY, JSON.stringify(input));
        sessionStorage.setItem(LPG_RESULT_KEY, JSON.stringify(data.result));
        router.push("/check/bottled-gas/results");
        return;
      }
      setError(data.error ?? "Couldn't build a comparison.");
      setSubmitting(false);
    } catch {
      setError("Couldn't reach the server. Try again.");
      setSubmitting(false);
    }
  }

  const cardCls =
    "mb-2 rounded-[8px] border-[0.5px] border-black/15 bg-surface px-3.5 py-3";
  const labelCls =
    "mb-2 text-[11px] font-medium tracking-[0.3px] text-text-tertiary uppercase";
  const chip = (active: boolean) =>
    `rounded-[8px] py-2 text-xs font-medium ${
      active
        ? "border-2 border-brand-500 bg-brand-50 text-text-primary"
        : "border-[0.5px] border-black/15 bg-surface text-text-primary"
    }`;

  return (
    <main className="min-h-dvh bg-surface-muted px-5 py-10">
      <form onSubmit={onSubmit} className="mx-auto w-full max-w-2xl rounded-[12px] bg-surface p-6 sm:p-7">
        <div className="mb-5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-[8px] bg-brand-500">
              <Zap className="size-4 text-white" />
            </span>
            <span className="text-[15px] font-medium">FairBills</span>
          </Link>
          <span className="flex items-center gap-1.5 text-xs text-text-tertiary">
            <Flame className="size-3.5 text-warning-600" /> Bottled gas check
          </span>
        </div>

        <h2 className="text-[22px] font-medium tracking-[-0.3px]">Five quick questions.</h2>
        <p className="mt-1 mb-5 text-[13px] text-text-secondary">
          No bill needed — just what you remember from your last delivery.
        </p>

        {/* 1. postcode */}
        <div className={cardCls}>
          <div className={labelCls}>1 · Your postcode</div>
          <input
            className="w-full bg-transparent text-base text-text-primary outline-none"
            inputMode="numeric"
            maxLength={4}
            placeholder="2350"
            value={postcode}
            onChange={(e) => setPostcode(e.target.value.replace(/\D/g, "").slice(0, 4))}
          />
          {coverage?.covered && (
            <div className="mt-1 flex items-center gap-1 text-[11px] text-brand-600">
              <Check className="size-3" /> {coverage.supplierCount} supplier
              {coverage.supplierCount === 1 ? "" : "s"} with prices in this area
            </div>
          )}
          {coverage && !coverage.covered && (
            <div className="mt-1 text-[11px] text-danger-600">
              No bottled-gas prices for this postcode yet.
            </div>
          )}
        </div>

        {/* 2. bottle size */}
        <div className={cardCls}>
          <div className={labelCls}>2 · What size bottles</div>
          <div className="grid grid-cols-3 gap-1.5">
            <button type="button" onClick={() => setSize("45")} className={chip(size === "45")}>
              45kg
              <span className="mt-0.5 block text-[9px] font-normal text-text-tertiary">
                Most common
              </span>
            </button>
            <button type="button" onClick={() => setSize("9")} className={chip(size === "9")}>
              9kg
              <span className="mt-0.5 block text-[9px] font-normal text-text-tertiary">
                BBQ size
              </span>
            </button>
            <button type="button" onClick={() => setSize("both")} className={chip(size === "both")}>
              Both
              <span className="mt-0.5 block text-[9px] font-normal text-text-tertiary">Mixed</span>
            </button>
          </div>
          {size === "both" && (
            <div className="mt-1.5 text-[10px] text-text-tertiary">
              We&rsquo;ll compare on your 45kg bottles — that&rsquo;s where the money is.
            </div>
          )}
        </div>

        {/* 3. current supplier */}
        <div className={cardCls}>
          <div className={labelCls}>3 · Your current supplier</div>
          <div className="grid grid-cols-2 gap-1.5">
            {SUPPLIERS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSupplier(s)}
                className={chip(supplier === s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* 4. last refill price */}
        <div className={cardCls}>
          <div className={labelCls}>4 · What did you pay for your last refill?</div>
          <div className="flex items-center gap-1">
            <span className="text-[22px] font-medium">$</span>
            <input
              className="w-full bg-transparent text-[22px] font-medium text-text-primary outline-none"
              inputMode="decimal"
              placeholder="147"
              value={price}
              onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ""))}
            />
            <span className="shrink-0 text-xs text-text-tertiary">per bottle</span>
          </div>
          <div className="mt-1 text-[10px] text-text-tertiary">
            Rough is fine — check your receipt or bank statement.
          </div>
        </div>

        {/* 5. tenure */}
        <div className="mb-5 rounded-[8px] border-[0.5px] border-black/15 bg-surface px-3.5 py-3">
          <div className={labelCls}>5 · How long with them?</div>
          <div className="grid grid-cols-3 gap-1.5">
            {TENURES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTenure(t.value)}
                className={chip(tenure === t.value)}
              >
                {t.label}
                {t.sub && (
                  <span className="mt-0.5 block text-[9px] font-normal text-danger-600">
                    {t.sub}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="mb-4 rounded-[8px] bg-danger-50 px-4 py-3 text-[13px] text-danger-800">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-[8px] bg-brand-500 text-[15px] font-medium text-white hover:bg-brand-600 disabled:opacity-50"
        >
          {submitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              Check if I&rsquo;m being ripped off
              <ArrowRight className="size-4" />
            </>
          )}
        </button>

        <p className="mt-4 text-center text-xs text-text-tertiary">
          Got a receipt handy?{" "}
          <Link href="/check/bottled-gas/upload" className="font-medium text-info-600">
            Upload it instead
          </Link>{" "}
          for exact figures.
        </p>
      </form>
    </main>
  );
}

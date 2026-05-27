"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Check, InfoIcon, Loader2, Zap } from "lucide-react";

import { ESTIMATE_KEY, PARSED_BILL_KEY } from "@/lib/bill";

const RETAILERS = [
  "Origin Energy",
  "AGL",
  "EnergyAustralia",
  "Red Energy",
  "Alinta Energy",
  "Energy Locals",
  "Momentum Energy",
  "Powershop",
  "Tango Energy",
  "Lumo Energy",
  "Nectr",
  "Kogan Energy",
  "Sumo",
  "GloBird Energy",
  "OVO Energy",
  "1st Energy",
  "Other / not sure",
];

const HOUSEHOLD_OPTIONS = [1, 2, 3, 4, 5];

export default function QuickCheckPage() {
  const router = useRouter();
  const [postcode, setPostcode] = useState("");
  const [retailer, setRetailer] = useState(RETAILERS[0]);
  const [household, setHousehold] = useState(2);
  const [coverage, setCoverage] = useState<
    { covered: boolean; distributor?: string } | null
  >(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live postcode → distributor confirmation (debounced).
  useEffect(() => {
    if (!/^\d{4}$/.test(postcode)) {
      setCoverage(null);
      return;
    }
    const ctrl = new AbortController();
    const id = setTimeout(async () => {
      try {
        const res = await fetch(`/api/quick-check?postcode=${postcode}`, {
          signal: ctrl.signal,
        });
        const data = await res.json();
        if (data.ok) setCoverage({ covered: data.covered, distributor: data.distributor });
      } catch {
        /* ignore aborted/failed lookups */
      }
    }, 400);
    return () => {
      clearTimeout(id);
      ctrl.abort();
    };
  }, [postcode]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{4}$/.test(postcode)) {
      setError("Enter a valid 4-digit postcode.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/quick-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postcode, retailer, household }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        sessionStorage.setItem(PARSED_BILL_KEY, JSON.stringify(data.bill));
        sessionStorage.setItem(ESTIMATE_KEY, "1");
        router.push("/results");
        return;
      }
      setError(data.error ?? "Couldn't build an estimate.");
      setSubmitting(false);
    } catch {
      setError("Couldn't reach the server. Try again.");
      setSubmitting(false);
    }
  }

  const inputCls =
    "w-full rounded-[8px] border-[0.5px] border-black/30 bg-surface px-3.5 py-2.5 text-[15px] text-text-primary outline-none focus:border-brand-500";

  return (
    <main className="min-h-full bg-surface-muted px-5 py-10">
      <form onSubmit={onSubmit} className="mx-auto w-full max-w-[560px] rounded-[12px] bg-surface p-7">
        <div className="mb-5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-[8px] bg-brand-500">
              <Zap className="size-4 text-white" />
            </span>
            <span className="text-[15px] font-medium">FairBills</span>
          </Link>
          <span className="flex items-center gap-1.5 text-xs text-text-tertiary">
            Quick check · <span className="font-medium text-brand-600">~30 sec</span>
          </span>
        </div>

        <h2 className="text-[22px] font-medium tracking-[-0.3px]">Three quick questions.</h2>
        <p className="mt-1 mb-6 text-[13px] text-text-secondary">
          We&rsquo;ll get you a ballpark in 30 seconds.
        </p>

        {/* Q1 postcode */}
        <div className="mb-4">
          <label className="mb-1.5 block text-[13px] font-medium">1. Your postcode</label>
          <input
            className={inputCls}
            inputMode="numeric"
            maxLength={4}
            placeholder="2350"
            value={postcode}
            onChange={(e) => setPostcode(e.target.value.replace(/\D/g, "").slice(0, 4))}
          />
          {coverage?.covered && (
            <div className="mt-1 flex items-center gap-1 text-[11px] text-brand-600">
              <Check className="size-3" /> NSW · {coverage.distributor} network
            </div>
          )}
          {coverage && !coverage.covered && (
            <div className="mt-1 text-[11px] text-danger-600">
              We don&rsquo;t have plans for this postcode yet.
            </div>
          )}
        </div>

        {/* Q2 retailer */}
        <div className="mb-4">
          <label className="mb-1.5 block text-[13px] font-medium">
            2. Who&rsquo;s your current electricity retailer?
          </label>
          <select
            className={inputCls}
            value={retailer}
            onChange={(e) => setRetailer(e.target.value)}
          >
            {RETAILERS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <div className="mt-1 text-[11px] text-text-tertiary">
            Not sure? Check the logo on your last bill or email.
          </div>
        </div>

        {/* Q3 household */}
        <div className="mb-6">
          <label className="mb-1.5 block text-[13px] font-medium">
            3. How many people live in your home?
          </label>
          <div className="grid grid-cols-5 gap-1.5">
            {HOUSEHOLD_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setHousehold(n)}
                className={`rounded-[8px] py-2.5 text-sm font-medium ${
                  household === n
                    ? "border-2 border-brand-500 bg-brand-50 text-text-primary"
                    : "border-[0.5px] border-black/15 bg-surface text-text-primary"
                }`}
              >
                {n === 5 ? "5+" : n}
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
              Show me my estimate
              <ArrowRight className="size-4" />
            </>
          )}
        </button>

        {/* Upsell */}
        <div className="mt-[18px] flex items-start gap-2.5 rounded-[8px] bg-warning-50 px-3.5 py-3">
          <InfoIcon className="mt-0.5 size-4 shrink-0 text-warning-600" />
          <div className="text-xs leading-relaxed text-[#633806]">
            Got a bill handy? <Link href="/upload" className="font-medium text-info-600">Upload it instead</Link>{" "}
            for exact figures rather than a ballpark.
          </div>
        </div>
      </form>
    </main>
  );
}

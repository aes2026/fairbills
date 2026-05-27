"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Lightbulb, Loader2, Zap } from "lucide-react";

import { EmailCapture } from "@/components/email-capture";

import {
  BillSchema,
  ESTIMATE_KEY,
  PARSED_BILL_KEY,
  TOP_PICK_KEY,
  type ParsedBill,
} from "@/lib/bill";
import type { ComparisonResult, RankedPlan } from "@/lib/comparison";
import { setHouseholdFuel } from "@/lib/household";

const STAGES = [
  "Comparing 77 retailers…",
  "Crunching your usage…",
  "Finding your best plan…",
];

function dollars(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString("en-AU")}`;
}
function num(n: number): number {
  return Number(n.toFixed(2));
}
function currentRateLabel(bill: ParsedBill): string {
  const supply = bill.supply_charge_per_day_cents;
  const supplyStr = supply == null ? "" : ` · $${(supply / 100).toFixed(2)}/day supply`;
  if (bill.tariff_type === "time_of_use") {
    const parts: string[] = [];
    if (bill.usage_rate_cents_peak != null) parts.push(`Peak ${num(bill.usage_rate_cents_peak)}c`);
    if (bill.usage_rate_cents_offpeak != null) parts.push(`Off-peak ${num(bill.usage_rate_cents_offpeak)}c`);
    return parts.join(" · ") + supplyStr;
  }
  const f = bill.usage_rate_cents_flat;
  return (f == null ? "" : `${num(f)}c/kWh`) + supplyStr;
}
function pills(f: RankedPlan["features"]): string[] {
  if (!f) return [];
  const out: string[] = [];
  if (f.payOnTimeDiscount) out.push("Pay-on-time discount");
  if (f.hasGreenPower) out.push("Green power");
  if (f.hasSolarFit) out.push("Solar feed-in");
  return out.slice(0, 3);
}

export default function ResultsPage() {
  const [bill, setBill] = useState<ParsedBill | null>(null);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "missing">("loading");
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState(0);
  const [estimate, setEstimate] = useState(false);

  useEffect(() => {
    if (status !== "loading") return;
    const id = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 1800);
    return () => clearInterval(id);
  }, [status]);

  useEffect(() => {
    const raw = sessionStorage.getItem(PARSED_BILL_KEY);
    if (!raw) return setStatus("missing");
    const parsed = BillSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return setStatus("missing");
    setBill(parsed.data);
    setEstimate(sessionStorage.getItem(ESTIMATE_KEY) === "1");

    (async () => {
      try {
        const res = await fetch("/api/compare", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed.data),
        });
        const data = await res.json();
        if (res.ok && data.ok) {
          const cmp = data as ComparisonResult;
          setResult(cmp);
          if (cmp.topPick) {
            sessionStorage.setItem(TOP_PICK_KEY, JSON.stringify(cmp.topPick));
          }
          const saving =
            cmp.topPick && cmp.topPick.savingCents > 0 ? cmp.topPick.savingCents : 0;
          setHouseholdFuel({
            fuel: "electricity",
            title: `Electricity · ${parsed.data.retailer_name ?? "your retailer"}`,
            action:
              saving > 0 && cmp.topPick
                ? `Switch to ${cmp.topPick.retailer} ${cmp.topPick.plan}`
                : "You're already on a sharp deal",
            annualSavingCents: saving,
            resultHref: "/results",
            scriptHref: "/script",
          });
          setStatus("ready");
        } else {
          setError(data.error ?? "Something went wrong comparing plans.");
          setStatus("error");
        }
      } catch {
        setError("Couldn't reach the server. Try again.");
        setStatus("error");
      }
    })();
  }, []);

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <main className="min-h-dvh bg-surface-muted px-5 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-4 flex items-center justify-between rounded-[12px] bg-surface px-5 py-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-[8px] bg-brand-500">
              <Zap className="size-4 text-white" />
            </span>
            <span className="text-[15px] font-medium">FairBills</span>
          </Link>
          <span className="text-xs text-text-tertiary">Step 2 of 3</span>
        </div>
        {children}
      </div>
    </main>
  );

  if (status === "loading") {
    return (
      <Shell>
        <div className="flex flex-col items-center rounded-[12px] bg-surface px-6 py-16 text-center">
          <Loader2 className="size-7 animate-spin text-brand-600" />
          <div className="mt-4 text-[15px] font-medium">{STAGES[stage]}</div>
        </div>
      </Shell>
    );
  }

  if (status === "missing") {
    return (
      <Shell>
        <div className="rounded-[12px] bg-surface p-7 text-center">
          <p className="text-sm text-text-secondary">No bill to compare yet.</p>
          <Link
            href="/upload"
            className="mt-4 inline-flex h-11 items-center rounded-[8px] bg-brand-500 px-5 text-sm font-medium text-white"
          >
            Upload a bill
          </Link>
        </div>
      </Shell>
    );
  }

  if (status === "error" || !result || !bill) {
    return (
      <Shell>
        <div className="rounded-[12px] bg-surface p-7 text-center">
          <p className="text-sm text-danger-800">{error ?? "Something went wrong."}</p>
          <Link
            href="/confirm"
            className="mt-4 inline-flex h-11 items-center rounded-[8px] bg-brand-500 px-5 text-sm font-medium text-white"
          >
            Check your details
          </Link>
        </div>
      </Shell>
    );
  }

  const { topPick, plans, currentAnnualCents, candidateCount, touEstimate } = result;
  const hasSaving = !!topPick && topPick.savingCents > 0 && currentAnnualCents != null;
  const runnersUp = plans.slice(1);

  return (
    <Shell>
      {/* Headline */}
      {plans.length === 0 ? (
        <div className="rounded-[12px] bg-brand-700 px-6 py-6">
          <div className="text-xs font-medium tracking-[0.5px] text-brand-400">
            HMMM
          </div>
          <div className="mt-1 text-[22px] font-medium text-white">
            No market plans found for your area yet.
          </div>
          <p className="mt-2 text-[13px] leading-relaxed text-[#c0dd97]">
            We couldn&rsquo;t match a current {bill.tariff_type.replace("_", " ")} plan to
            your postcode. Double-check your details, or try again later.
          </p>
        </div>
      ) : hasSaving ? (
        <div className="rounded-[12px] bg-brand-700 px-6 py-6">
          <div className="text-xs font-medium tracking-[0.5px] text-brand-400">
            {estimate ? "YOU COULD SAVE ABOUT" : "YOU’RE OVERPAYING BY"}
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-[44px] font-medium tracking-[-1px] text-white">
              {dollars(topPick!.savingCents)}
            </span>
            <span className="text-base text-[#c0dd97]">a year</span>
          </div>
          <p className="mt-1.5 text-[13px] leading-relaxed text-[#c0dd97]">
            {estimate
              ? `Rough estimate from a typical ${bill.retailer_name ?? "retailer"} plan for an average home — upload your bill for exact figures.`
              : `Based on your last bill from ${bill.retailer_name ?? "your retailer"}${bill.plan_name ? ` (${bill.plan_name})` : ""}, compared against the cheapest plan available in your area.`}
          </p>
        </div>
      ) : (
        <div className="rounded-[12px] bg-brand-700 px-6 py-6">
          <div className="text-xs font-medium tracking-[0.5px] text-brand-400">
            GOOD NEWS
          </div>
          <div className="mt-1 text-[22px] font-medium text-white">
            You&rsquo;re already on a sharp deal.
          </div>
          <p className="mt-2 text-[13px] leading-relaxed text-[#c0dd97]">
            We checked {candidateCount.toLocaleString("en-AU")} plans for your area —
            none clearly beat what you&rsquo;re paying. Leave your email and we&rsquo;ll
            re-check in 6 months in case that changes.
          </p>
        </div>
      )}

      {/* Capture email when there's nothing better to switch to today */}
      {!hasSaving && plans.length > 0 && (
        <div className="mt-3">
          <EmailCapture
            postcode={bill.postcode}
            retailer={bill.retailer_name}
            savingCents={topPick?.savingCents ?? null}
          />
        </div>
      )}

      {/* Current plan */}
      <div className="mt-3 rounded-[12px] border-[0.5px] border-black/15 bg-surface px-[18px] py-4">
        <div className="mb-2.5 text-[11px] font-medium tracking-[0.5px] text-text-tertiary uppercase">
          {estimate ? "Estimated current plan" : "Your current plan"}
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <div className="text-[15px] font-medium">
              {bill.retailer_name ?? "Your retailer"}
              {bill.plan_name ? ` ${bill.plan_name}` : ""}
            </div>
            <div className="mt-0.5 text-xs text-text-secondary">{currentRateLabel(bill)}</div>
          </div>
          {currentAnnualCents != null && (
            <div className="shrink-0 text-lg font-medium">{dollars(currentAnnualCents)}/yr</div>
          )}
        </div>
      </div>

      {/* Top pick */}
      {topPick && (
        <div className="relative mt-2.5 rounded-[12px] border-2 border-brand-500 bg-surface px-[18px] py-4">
          <div className="absolute -top-2.5 left-3.5 rounded-full bg-brand-500 px-2.5 py-0.5 text-[11px] font-medium text-white">
            {hasSaving ? `Top pick · Save ${dollars(topPick.savingCents)}` : "Cheapest available"}
          </div>
          <div className="mt-1.5 mb-2.5 flex items-baseline justify-between gap-3">
            <div>
              <div className="text-[15px] font-medium">
                {topPick.retailer} · {topPick.plan}
              </div>
              <div className="mt-0.5 text-xs text-text-secondary">
                {topPick.rateLabel} · ${(topPick.supplyCents / 100).toFixed(2)}/day supply
              </div>
            </div>
            <div className="shrink-0 text-lg font-medium text-brand-600">
              {dollars(topPick.annualCents)}/yr
            </div>
          </div>
          {pills(topPick.features).length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {pills(topPick.features).map((p) => (
                <span
                  key={p}
                  className="rounded-full bg-brand-100 px-2.5 py-0.5 text-[11px] text-[#27500a]"
                >
                  {p}
                </span>
              ))}
            </div>
          )}
          <Link
            href="/script"
            className="flex h-11 w-full items-center justify-center gap-1.5 rounded-[8px] bg-brand-500 text-sm font-medium text-white hover:bg-brand-600"
          >
            Get my switch script
            <ArrowRight className="size-4" />
          </Link>
        </div>
      )}

      {/* Runners up */}
      {runnersUp.length > 0 && (
        <div className="mt-2.5 overflow-hidden rounded-[12px] border-[0.5px] border-black/15 bg-surface">
          {runnersUp.map((p, i) => (
            <div
              key={p.id}
              className={`flex items-center justify-between px-[18px] py-3.5 ${
                i > 0 ? "border-t border-black/10" : ""
              }`}
            >
              <div>
                <div className="text-sm font-medium">
                  {p.retailer} · {p.plan}
                </div>
                <div className="mt-0.5 text-[11px] text-text-secondary">
                  {p.savingCents > 0
                    ? `Save ${dollars(p.savingCents)}/yr`
                    : `${dollars(p.annualCents)}/yr`}
                </div>
              </div>
              <span className="text-xs text-info-600">{p.rateLabel}</span>
            </div>
          ))}
        </div>
      )}

      {/* Try this first */}
      {hasSaving && (
        <div className="mt-4 flex items-start gap-2.5 rounded-[8px] bg-warning-50 px-3.5 py-3">
          <Lightbulb className="mt-0.5 size-[18px] shrink-0 text-warning-600" />
          <div>
            <div className="text-[13px] font-medium text-warning-800">Try this first</div>
            <div className="mt-0.5 text-xs leading-relaxed text-[#633806]">
              Before switching, ring {bill.retailer_name ?? "your retailer"} and ask them
              to match {topPick!.retailer}&rsquo;s rate. They often will — and the switch
              script works either way.
            </div>
          </div>
        </div>
      )}

      {touEstimate && (
        <p className="mt-3 text-[11px] leading-relaxed text-text-tertiary">
          Time-of-use estimate: your bill doesn&rsquo;t show how usage splits across
          peak/off-peak, so we assume a typical split. Treat these figures as a guide.
        </p>
      )}
    </Shell>
  );
}

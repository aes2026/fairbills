"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Flame, Info, ThermometerSun, Zap } from "lucide-react";

import { setHouseholdFuel } from "@/lib/household";
import { GAS_INPUT_KEY, GAS_RESULT_KEY, type GasBill, type GasComparisonResult } from "@/lib/gas";

function dollars(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString("en-AU")}`;
}

export default function MainsGasResultsPage() {
  const [result, setResult] = useState<GasComparisonResult | null>(null);
  const [bill, setBill] = useState<GasBill | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");

  useEffect(() => {
    const rawResult = sessionStorage.getItem(GAS_RESULT_KEY);
    const rawInput = sessionStorage.getItem(GAS_INPUT_KEY);
    if (!rawResult) return setState("missing");
    try {
      const r = JSON.parse(rawResult) as GasComparisonResult;
      const b = rawInput ? (JSON.parse(rawInput) as GasBill) : null;
      setResult(r);
      setBill(b);
      setState("ready");
      const retailer = b?.retailer_name ?? "your retailer";
      setHouseholdFuel({
        fuel: "reticulated_gas",
        title: `Mains gas · ${retailer}`,
        action:
          r.bestSavingCents > 0 && r.topPick
            ? `Switch to ${r.topPick.retailer} ${r.topPick.plan}`
            : "You're already on a sharp deal",
        annualSavingCents: r.bestSavingCents,
        resultHref: "/check/mains-gas/results",
        scriptHref: "/check/mains-gas/script",
      });
    } catch {
      setState("missing");
    }
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
          <Link href="/household" className="text-xs text-info-600">
            Your household →
          </Link>
        </div>
        {children}
      </div>
    </main>
  );

  if (state === "loading") return <Shell>{null}</Shell>;

  if (state === "missing" || !result) {
    return (
      <Shell>
        <div className="rounded-[12px] bg-surface p-7 text-center">
          <p className="text-sm text-text-secondary">No mains-gas check to show yet.</p>
          <Link
            href="/check/mains-gas/upload"
            className="mt-4 inline-flex h-11 items-center rounded-[8px] bg-brand-500 px-5 text-sm font-medium text-white"
          >
            Upload a gas bill
          </Link>
        </div>
      </Shell>
    );
  }

  const { topPick, plans, currentAnnualCents, bestSavingCents, annualMj, seasonalWarning } = result;
  const hasSaving = bestSavingCents > 0 && !!topPick;
  const runnersUp = plans.slice(1);
  const retailer = bill?.retailer_name ?? "your retailer";

  return (
    <Shell>
      {seasonalWarning && (
        <div className="mb-3 flex items-start gap-2.5 rounded-[12px] border border-warning-600/30 bg-warning-50 px-4 py-3">
          <Info className="mt-0.5 size-[18px] shrink-0 text-warning-600" />
          <div>
            <div className="text-[13px] font-medium text-warning-800">Heads up: this is a single bill</div>
            <p className="mt-0.5 text-xs leading-relaxed text-[#633806]">
              Gas usage swings a lot between summer and winter. For the most accurate comparison,
              check again with a winter bill if this one is from summer.
            </p>
          </div>
        </div>
      )}

      {/* Headline */}
      {hasSaving ? (
        <div className="rounded-[12px] bg-brand-700 px-6 py-6">
          <div className="text-xs font-medium tracking-[0.5px] text-brand-400">YOU COULD SAVE</div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-[44px] font-medium tracking-[-1px] text-white">
              {dollars(bestSavingCents)}
            </span>
            <span className="text-base text-[#c0dd97]">a year</span>
          </div>
          <p className="mt-1.5 text-[13px] leading-relaxed text-[#c0dd97]">
            On {topPick!.retailer} {topPick!.plan}, based on your usage of about{" "}
            {annualMj.toLocaleString("en-AU")} MJ a year.
          </p>
        </div>
      ) : (
        <div className="rounded-[12px] bg-brand-700 px-6 py-6">
          <div className="text-xs font-medium tracking-[0.5px] text-brand-400">GOOD NEWS</div>
          <div className="mt-1 text-[22px] font-medium text-white">
            You&rsquo;re already on a sharp gas deal.
          </div>
          <p className="mt-2 text-[13px] leading-relaxed text-[#c0dd97]">
            We checked {result.candidateCount} plans for your area — none clearly beat what
            you&rsquo;re paying.
          </p>
        </div>
      )}

      {/* Current plan */}
      <div className="mt-3 rounded-[12px] border-[0.5px] border-black/15 bg-surface px-[18px] py-4">
        <div className="mb-2.5 text-[11px] font-medium tracking-[0.5px] text-text-tertiary uppercase">
          Your current plan
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <div className="text-[15px] font-medium">{retailer}</div>
            <div className="mt-0.5 text-xs text-text-secondary">
              {annualMj.toLocaleString("en-AU")} MJ/yr
              {bill?.gas_supply_charge_cents_per_day != null
                ? ` · $${(bill.gas_supply_charge_cents_per_day / 100).toFixed(2)}/day supply`
                : ""}
            </div>
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
                {topPick.effectiveRateCents}c/MJ · ${(topPick.supplyCents / 100).toFixed(2)}/day supply
              </div>
            </div>
            <div className="shrink-0 text-lg font-medium text-brand-600">
              {dollars(topPick.annualCents)}/yr
            </div>
          </div>
          <Link
            href="/check/mains-gas/script"
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
                  {p.savingCents > 0 ? `Save ${dollars(p.savingCents)}/yr` : `${dollars(p.annualCents)}/yr`}
                </div>
              </div>
              <span className="text-xs text-info-600">{p.effectiveRateCents}c/MJ</span>
            </div>
          ))}
        </div>
      )}

      {/* Try this first */}
      {hasSaving && (
        <div className="mt-4 flex items-start gap-2.5 rounded-[8px] bg-warning-50 px-3.5 py-3">
          <Flame className="mt-0.5 size-[18px] shrink-0 text-warning-600" />
          <div>
            <div className="text-[13px] font-medium text-warning-800">Try this first</div>
            <div className="mt-0.5 text-xs leading-relaxed text-[#633806]">
              Before switching, ring {retailer} and ask them to match {topPick!.retailer}&rsquo;s
              rate. Many do — and the script covers any dual-fuel bundle on your power account.
            </div>
          </div>
        </div>
      )}

      {/* Electricity cross-sell */}
      <Link
        href="/upload"
        className="mt-3 flex items-center gap-2.5 rounded-[8px] border-[0.5px] border-dashed border-brand-500 bg-surface px-3.5 py-3 hover:bg-brand-50"
      >
        <ThermometerSun className="size-4 shrink-0 text-brand-500" />
        <div className="flex-1">
          <div className="text-xs font-medium">Got a power bill too?</div>
          <div className="text-[10px] text-text-secondary">
            Same retailers, same loyalty tax — most households save another $300+
          </div>
        </div>
        <span className="text-[11px] font-medium text-brand-600">Add it →</span>
      </Link>
    </Shell>
  );
}

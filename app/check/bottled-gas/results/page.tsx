"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, PhoneCall, Zap } from "lucide-react";

import { setHouseholdFuel } from "@/lib/household";
import { LPG_RESULT_KEY, type LpgResult } from "@/lib/lpg";

function dollars(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString("en-AU")}`;
}
function clampPct(n: number): number {
  return Math.max(2, Math.min(98, n));
}

export default function BottledGasResultsPage() {
  const [result, setResult] = useState<LpgResult | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");

  useEffect(() => {
    const raw = sessionStorage.getItem(LPG_RESULT_KEY);
    if (!raw) return setState("missing");
    try {
      const r = JSON.parse(raw) as LpgResult;
      setResult(r);
      setState("ready");
      const supplierName =
        r.currentSupplier === "Local / other" ? "your supplier" : r.currentSupplier;
      setHouseholdFuel({
        fuel: "bottled_lpg",
        title: `Bottled gas · ${supplierName}`,
        action:
          r.overpayingAnnualCents > 0
            ? `Ring ${supplierName} to match local pricing`
            : "You're already on a sharp deal",
        annualSavingCents: r.overpayingAnnualCents,
        resultHref: "/check/bottled-gas/results",
        scriptHref: "/check/bottled-gas/script",
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
          <p className="text-sm text-text-secondary">No bottled-gas check to show yet.</p>
          <Link
            href="/check/bottled-gas/start"
            className="mt-4 inline-flex h-11 items-center rounded-[8px] bg-brand-500 px-5 text-sm font-medium text-white"
          >
            Start a bottled-gas check
          </Link>
        </div>
      </Shell>
    );
  }

  const {
    overpayingPerBottleCents,
    overpayingAnnualCents,
    estimatedBottlesPerYear,
    currentPriceCents,
    cheapestPriceCents,
    medianPriceCents,
    cheaperCount,
    supplierCount,
    priceRange,
    alternatives,
    bottleSizeKg,
    postcode,
    dataFreshnessDays,
  } = result;

  const hasSaving = overpayingPerBottleCents > 0 && alternatives.length > 0;
  // The axis spans the whole picture INCLUDING the user, so when they pay more
  // than any supplier their marker still sits on the bar (not floating past it).
  const axisMin = Math.min(priceRange.minCents, currentPriceCents);
  const axisMax = Math.max(priceRange.maxCents, currentPriceCents);
  const span = Math.max(1, axisMax - axisMin);
  const userPos = clampPct(((currentPriceCents - axisMin) / span) * 100);
  const bestPos = clampPct(((cheapestPriceCents - axisMin) / span) * 100);
  const supplierName =
    result.currentSupplier === "Local / other" ? "your supplier" : result.currentSupplier;

  const [best, ...rest] = alternatives;

  return (
    <Shell>
      {/* Headline */}
      {hasSaving ? (
        <div className="rounded-[12px] bg-brand-700 px-6 py-6">
          <div className="text-xs font-medium tracking-[0.5px] text-brand-400">
            YOU&rsquo;RE OVERPAYING BY
          </div>
          <div className="mt-1.5 flex items-baseline gap-2.5">
            <span className="text-[40px] font-medium tracking-[-1px] text-white">
              {dollars(overpayingPerBottleCents)}
            </span>
            <span className="text-[13px] text-[#c0dd97]">
              per bottle · roughly {dollars(overpayingAnnualCents)}/year
            </span>
          </div>
          <p className="mt-1.5 text-[13px] leading-relaxed text-[#c0dd97]">
            Based on about {estimatedBottlesPerYear} refills a year, compared with the cheapest
            verified {bottleSizeKg}kg price in {postcode}.
          </p>
        </div>
      ) : (
        <div className="rounded-[12px] bg-brand-700 px-6 py-6">
          <div className="text-xs font-medium tracking-[0.5px] text-brand-400">GOOD NEWS</div>
          <div className="mt-1 text-[22px] font-medium text-white">
            You&rsquo;re already on a sharp deal.
          </div>
          <p className="mt-2 text-[13px] leading-relaxed text-[#c0dd97]">
            We checked {supplierCount} supplier{supplierCount === 1 ? "" : "s"} for {bottleSizeKg}kg
            bottles in {postcode} — none clearly beat what you&rsquo;re paying.
          </p>
        </div>
      )}

      {/* Price spectrum */}
      <div className="mt-3 rounded-[12px] border-[0.5px] border-black/15 bg-surface px-[18px] py-4">
        <div className="mb-5 text-[10px] font-medium tracking-[0.5px] text-text-tertiary uppercase">
          {bottleSizeKg}kg refill prices in {postcode}
        </div>
        <div className="relative mb-1.5 h-14">
          <div
            className="absolute right-0 left-0 h-1.5 rounded-full"
            style={{
              bottom: 24,
              background: "linear-gradient(to right, #EAF3DE 0%, #FAEEDA 50%, #FCEBEB 100%)",
            }}
          />
          {/* Best marker */}
          <div
            className="absolute top-0 -translate-x-1/2"
            style={{ left: `${bestPos}%` }}
          >
            <div className="rounded-[5px] bg-brand-700 px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap text-white">
              Best · {dollars(cheapestPriceCents)}
            </div>
            <div className="mx-auto mt-1 h-3 w-0.5 bg-brand-700" />
          </div>
          {/* You marker */}
          <div
            className="absolute top-0 -translate-x-1/2"
            style={{ left: `${userPos}%` }}
          >
            <div className="rounded-[5px] bg-danger-800 px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap text-white">
              You · {dollars(currentPriceCents)}
            </div>
            <div className="mx-auto mt-1 h-3 w-0.5 bg-danger-800" />
          </div>
          <div className="absolute bottom-0 left-0 text-[10px] text-text-tertiary">
            {dollars(axisMin)}
          </div>
          <div className="absolute right-0 bottom-0 text-[10px] text-text-tertiary">
            {dollars(axisMax)}
          </div>
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-text-secondary">
          {cheaperCount > 0
            ? `${cheaperCount} local price${cheaperCount === 1 ? "" : "s"} ${
                cheaperCount === 1 ? "is" : "are"
              } cheaper than yours. Most pay around ${dollars(medianPriceCents)}.`
            : `You're at or below the local median of ${dollars(medianPriceCents)}.`}
        </p>
      </div>

      {/* Alternatives */}
      {alternatives.length > 0 && (
        <div className="mt-3 rounded-[12px] border-[0.5px] border-black/15 bg-surface px-[18px] py-4">
          <div className="mb-2.5 text-[10px] font-medium tracking-[0.5px] text-text-tertiary uppercase">
            Cheaper suppliers in your area
          </div>

          {/* Best for switching */}
          <div className="relative mb-2 rounded-[8px] border-2 border-brand-600 bg-brand-50 px-3 py-2.5">
            <div className="absolute -top-2 left-2.5 rounded-full bg-brand-600 px-1.5 py-0.5 text-[9px] font-medium text-white">
              Best for switching
            </div>
            <div className="mt-1 flex items-center justify-between gap-3">
              <div>
                <div className="text-[13px] font-medium text-brand-700">{best.displayName}</div>
                {best.notes && (
                  <div className="text-[10px] text-[#3b6d11]">{best.notes}</div>
                )}
              </div>
              <div className="shrink-0 text-right">
                <div className="text-base font-medium text-brand-700">
                  {dollars(best.pricePerBottleCents)}
                </div>
                <div className="text-[9px] text-[#3b6d11]">
                  save {dollars(best.savingPerBottleCents)}/bottle
                </div>
              </div>
            </div>
          </div>

          {rest.map((a) => (
            <div
              key={a.supplier}
              className="flex items-center justify-between border-t border-black/10 py-2.5"
            >
              <div>
                <div className="text-xs font-medium">{a.displayName}</div>
                {a.notes && <div className="text-[10px] text-text-secondary">{a.notes}</div>}
              </div>
              <div className="shrink-0 text-right">
                <div className="text-[13px] font-medium">{dollars(a.pricePerBottleCents)}</div>
                <div className="text-[9px] text-brand-600">save {dollars(a.savingPerBottleCents)}</div>
              </div>
            </div>
          ))}

          <div className="mt-2 border-t border-black/10 pt-2 text-[9px] text-text-tertiary">
            Prices from supplier sites and published offers
            {dataFreshnessDays != null ? ` · checked ${dataFreshnessDays} day${dataFreshnessDays === 1 ? "" : "s"} ago` : ""}
            . Verify the current price when you call.
          </div>
        </div>
      )}

      {/* Try this first — call CTA */}
      {hasSaving && (
        <div className="mt-3 rounded-[12px] border-[0.5px] border-warning-600/40 bg-warning-50 px-4 py-3.5">
          <div className="flex items-start gap-2.5">
            <PhoneCall className="mt-0.5 size-5 shrink-0 text-warning-600" />
            <div className="flex-1">
              <div className="text-[13px] font-medium text-[#412402]">
                Try this first: a 4-minute phone call
              </div>
              <p className="mt-0.5 mb-2.5 text-[11px] leading-relaxed text-[#633806]">
                {supplierName} will often match a competitor&rsquo;s price to keep you. We&rsquo;ve
                written exactly what to say.
              </p>
              <Link
                href="/check/bottled-gas/script"
                className="inline-flex items-center gap-1.5 rounded-[6px] bg-brand-700 px-3.5 py-2 text-xs font-medium text-white hover:bg-brand-800"
              >
                Get my phone script
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Electricity cross-sell */}
      <Link
        href="/upload"
        className="mt-3 flex items-center gap-2.5 rounded-[8px] border-[0.5px] border-dashed border-brand-500 bg-surface px-3.5 py-3 hover:bg-brand-50"
      >
        <Zap className="size-4 shrink-0 text-brand-500" />
        <div className="flex-1">
          <div className="text-xs font-medium">Got a power bill too?</div>
          <div className="text-[10px] text-text-secondary">
            Most households save another $300+ on electricity
          </div>
        </div>
        <span className="text-[11px] font-medium text-brand-600">Add it →</span>
      </Link>
    </Shell>
  );
}

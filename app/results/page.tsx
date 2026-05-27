"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Bell,
  Check,
  CheckCircle2,
  Info,
  Lightbulb,
  Loader2,
  Share2,
  Zap,
} from "lucide-react";

import { EmailCapture } from "@/components/email-capture";
import { PlanFeatureBreakdown } from "@/components/plan-feature-breakdown";

import {
  BillSchema,
  ESTIMATE_KEY,
  PARSED_BILL_KEY,
  TOP_PICK_KEY,
  type ParsedBill,
} from "@/lib/bill";
import type { ComparisonResult, Confidence, RankedPlan } from "@/lib/comparison";
import { setHouseholdFuel } from "@/lib/household";

const STAGES = [
  "Comparing 77 retailers…",
  "Crunching your usage…",
  "Checking what actually transfers…",
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

function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  const map: Record<Confidence, { label: string; cls: string }> = {
    high: { label: "High confidence", cls: "bg-brand-100 text-[#27500a]" },
    medium: { label: "Medium confidence", cls: "bg-warning-50 text-warning-800" },
    low: { label: "Low confidence", cls: "bg-danger-50 text-danger-800" },
  };
  const { label, cls } = map[confidence];
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${cls}`}>{label}</span>
  );
}

function ShareStayButton() {
  const [copied, setCopied] = useState(false);
  async function onShare() {
    const text = "FairBills told me to stay on my current energy plan — no commissions, just honest advice. Check yours free:";
    const url = typeof window !== "undefined" ? `${window.location.origin}/share-stay` : "";
    try {
      if (navigator.share) {
        await navigator.share({ title: "FairBills", text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text} ${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* dismissed */
    }
  }
  return (
    <button
      type="button"
      onClick={onShare}
      className="flex flex-1 items-center justify-center gap-1.5 rounded-[8px] bg-brand-700 py-3 text-sm font-medium text-white hover:bg-brand-800"
    >
      {copied ? <Check className="size-4" /> : <Share2 className="size-4" />}
      {copied ? "Copied" : "Share: I was told to stay put"}
    </button>
  );
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
            cmp.outcome === "switch_recommended" ? (cmp.bestSavingCents ?? 0) : 0;
          setHouseholdFuel({
            fuel: "electricity",
            title: `Electricity · ${parsed.data.retailer_name ?? "your retailer"}`,
            action:
              cmp.outcome === "switch_recommended" && cmp.topPick
                ? `Switch to ${cmp.topPick.retailer} ${cmp.topPick.plan}`
                : cmp.outcome === "stay_recommended"
                  ? "You're on the right plan"
                  : "Complex plan — worth a closer look",
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
          <Link href="/household" className="text-xs text-info-600">
            Your household →
          </Link>
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

  const { topPick, plans, currentAnnualCents, candidateCount, touEstimate, outcome } = result;

  // No candidate plans matched the postcode/distributor at all — a coverage
  // gap, not a verdict on their plan. (A complex bill still has candidates,
  // priced against flat plans, so it reaches its outcome branch below.)
  if (candidateCount === 0) {
    return (
      <Shell>
        <div className="rounded-[12px] bg-brand-700 px-6 py-6">
          <div className="text-xs font-medium tracking-[0.5px] text-brand-400">HMMM</div>
          <div className="mt-1 text-[22px] font-medium text-white">
            No market plans found for your area yet.
          </div>
          <p className="mt-2 text-[13px] leading-relaxed text-[#c0dd97]">
            We couldn&rsquo;t match a current {bill.tariff_type.replace(/_/g, " ")} plan to your
            postcode. Double-check your details, or try again later.
          </p>
        </div>
      </Shell>
    );
  }

  const runnersUp = plans.slice(1);

  // ---- Outcome C: stay recommended -------------------------------------
  if (outcome === "stay_recommended") {
    return (
      <Shell>
        <div className="rounded-[12px] bg-brand-700 px-6 py-6">
          <div className="mb-2.5 flex items-center gap-2">
            <CheckCircle2 className="size-5 text-brand-400" />
            <span className="text-xs font-medium tracking-[0.5px] text-brand-400">GOOD NEWS</span>
          </div>
          <h2 className="text-[24px] font-medium tracking-[-0.3px] text-white">
            Looks like you&rsquo;re on the right plan.
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-[#c0dd97]">
            {result.outcomeExplanation}
          </p>
        </div>

        <div className="mt-3 rounded-[12px] border-[0.5px] border-black/15 bg-surface px-[18px] py-4">
          <div className="mb-2 text-[11px] font-medium tracking-[0.5px] text-text-tertiary uppercase">
            Why your current plan works
          </div>
          <PlanFeatureBreakdown bill={bill} />
        </div>

        {(bill.super_off_peak_present || bill.solar_export_present || bill.ev_tariff_present) && (
          <div className="mt-3 rounded-[12px] border-[0.5px] border-info-600/20 bg-info-50 px-[18px] py-4">
            <div className="mb-1.5 text-[13px] font-medium text-info-800">
              Want to save more without switching?
            </div>
            <ul className="space-y-1.5 text-[12px] leading-relaxed text-info-800">
              {bill.super_off_peak_present && (
                <li>
                  • Shift more usage into your free midday window — dishwasher, washing machine,
                  hot-water heating, anything that can run in the middle of the day.
                </li>
              )}
              {bill.solar_export_present && (
                <li>
                  • Check your solar inverter isn&rsquo;t curtailing. Some setups export less than
                  they should during peak generation.
                </li>
              )}
              {bill.ev_tariff_present && (
                <li>
                  • Schedule EV charging to sit inside the overnight window only — avoid daytime
                  top-ups at standard rates.
                </li>
              )}
            </ul>
          </div>
        )}

        <div className="mt-3 rounded-[12px] border-[0.5px] border-black/15 bg-surface px-[18px] py-4 text-[13px] leading-relaxed text-text-secondary">
          We don&rsquo;t get paid to switch you to another retailer, so when staying put is right,
          we say so. Check back in 12 months — plans change, and so might your usage.
        </div>

        <div className="mt-3">
          <EmailCapture postcode={bill.postcode} retailer={bill.retailer_name} savingCents={null} />
        </div>

        <div className="mt-3 rounded-[12px] border-[0.5px] border-brand-500/40 bg-brand-50 px-[18px] py-4">
          <p className="mb-3 text-[13px] leading-relaxed text-brand-700">
            We told you to stay where you are — not what comparison sites usually do. If that was
            useful, let someone else know:
          </p>
          <div className="flex">
            <ShareStayButton />
          </div>
        </div>
      </Shell>
    );
  }

  // ---- Outcome B: switch uncertain -------------------------------------
  if (outcome === "switch_uncertain") {
    return (
      <Shell>
        <div className="rounded-[12px] border border-warning-600/30 bg-warning-50 p-5">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 size-5 shrink-0 text-warning-600" />
            <div>
              <h2 className="text-[16px] font-medium text-warning-800">
                Your plan is complex — switching may or may not save you money.
              </h2>
              <p className="mt-1 text-[13px] leading-relaxed text-[#633806]">
                {result.outcomeExplanation}
              </p>
            </div>
          </div>
        </div>

        {currentAnnualCents != null && (
          <div className="mt-3 rounded-[12px] border-[0.5px] border-black/15 bg-surface px-[18px] py-4">
            <div className="mb-2.5 text-[11px] font-medium tracking-[0.5px] text-text-tertiary uppercase">
              Your current plan
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <div className="text-[15px] font-medium">
                  {bill.retailer_name ?? "Your retailer"}
                  {bill.plan_name ? ` ${bill.plan_name}` : ""}
                </div>
                <div className="mt-0.5 text-xs text-text-secondary">{currentRateLabel(bill)}</div>
              </div>
              <div className="shrink-0 text-lg font-medium">{dollars(currentAnnualCents)}/yr</div>
            </div>
          </div>
        )}

        <div className="mt-3 space-y-2.5">
          <div className="text-[11px] font-medium tracking-[0.5px] text-text-tertiary uppercase">
            What we found, with confidence ratings
          </div>
          {plans.map((p) => (
            <div
              key={p.id}
              className="rounded-[12px] border-[0.5px] border-black/15 bg-surface px-[18px] py-3.5"
            >
              <div className="flex items-baseline justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-medium">
                      {p.retailer} · {p.plan}
                    </span>
                    <ConfidenceBadge confidence={p.confidence} />
                  </div>
                  <div className="mt-0.5 text-xs text-text-secondary">{p.rateLabel}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-[15px] font-medium">
                    {p.savingCents > 0 ? `Save ${dollars(p.savingCents)}` : dollars(p.annualCents)}
                  </div>
                  <div className="text-[10px] text-text-tertiary">
                    {p.savingCents > 0 ? "per year" : "per year"}
                  </div>
                </div>
              </div>
              {p.confidenceReasons.length > 0 && (
                <p className="mt-2 border-t border-black/10 pt-2 text-[11px] leading-relaxed text-[#633806]">
                  {p.confidenceReasons[0]}
                </p>
              )}
            </div>
          ))}
        </div>

        {topPick && (
          <Link
            href="/script"
            className="mt-4 flex h-11 w-full items-center justify-center gap-1.5 rounded-[8px] border-[0.5px] border-black/30 bg-surface text-sm font-medium text-text-primary hover:bg-surface-muted"
          >
            Get a script to ask {bill.retailer_name ?? "your retailer"} to sharpen your rate
            <ArrowRight className="size-4" />
          </Link>
        )}

        <div className="mt-3">
          <EmailCapture
            postcode={bill.postcode}
            retailer={bill.retailer_name}
            savingCents={null}
          />
        </div>
      </Shell>
    );
  }

  // ---- Outcome A: switch recommended -----------------------------------
  return (
    <Shell>
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
            : `Based on your last bill from ${bill.retailer_name ?? "your retailer"}${bill.plan_name ? ` (${bill.plan_name})` : ""}, compared against the cheapest plan we can confidently match to your usage.`}
        </p>
      </div>

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
            Top pick · Save {dollars(topPick.savingCents)}
          </div>
          <div className="mt-1.5 mb-2 flex items-baseline justify-between gap-3">
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
          <div className="mb-3 flex items-center gap-1 text-[11px] text-brand-600">
            <CheckCircle2 className="size-3.5" /> High confidence — we have good data on this
            comparison.
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
      <div className="mt-4 flex items-start gap-2.5 rounded-[8px] bg-warning-50 px-3.5 py-3">
        <Lightbulb className="mt-0.5 size-[18px] shrink-0 text-warning-600" />
        <div>
          <div className="text-[13px] font-medium text-warning-800">Try this first</div>
          <div className="mt-0.5 text-xs leading-relaxed text-[#633806]">
            Before switching, ring {bill.retailer_name ?? "your retailer"} and ask them to match{" "}
            {topPick!.retailer}&rsquo;s rate. They often will — and the switch script works either
            way.
          </div>
        </div>
      </div>

      {touEstimate && (
        <p className="mt-3 text-[11px] leading-relaxed text-text-tertiary">
          Time-of-use estimate: your bill doesn&rsquo;t show how usage splits across
          peak/off-peak, so we assume a typical split. Treat these figures as a guide.
        </p>
      )}
    </Shell>
  );
}

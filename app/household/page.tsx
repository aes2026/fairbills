"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell, Check, Copy, Flame, Plus, Share2, Zap } from "lucide-react";

import { EmailCapture } from "@/components/email-capture";
import {
  getHousehold,
  type FuelKind,
  type HouseholdFuelSummary,
} from "@/lib/household";

function dollars(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString("en-AU")}`;
}

const ICON: Record<FuelKind, typeof Zap> = {
  electricity: Zap,
  bottled_lpg: Flame,
};

function FuelCard({ s }: { s: HouseholdFuelSummary }) {
  const Icon = ICON[s.fuel];
  const iconWrap = s.fuel === "electricity" ? "bg-brand-50 text-brand-600" : "bg-warning-50 text-warning-600";
  return (
    <div className="rounded-[8px] border-[0.5px] border-black/15 bg-surface px-3.5 py-3">
      <div className="mb-2 flex items-center gap-2.5">
        <span className={`flex size-9 shrink-0 items-center justify-center rounded-[8px] ${iconWrap}`}>
          <Icon className="size-4" />
        </span>
        <div className="flex-1">
          <div className="text-[13px] font-medium">{s.title}</div>
          <div className="text-[10px] text-text-secondary">{s.action}</div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-[15px] font-medium text-brand-600">
            {s.annualSavingCents > 0 ? dollars(s.annualSavingCents) : "—"}
          </div>
          <div className="text-[9px] text-text-tertiary">per year</div>
        </div>
      </div>
      <div className="flex gap-1.5">
        <Link
          href={s.resultHref}
          className="flex flex-1 items-center justify-center rounded-[6px] border-[0.5px] border-black/15 bg-surface py-1.5 text-[11px] font-medium hover:bg-surface-muted"
        >
          View options
        </Link>
        <Link
          href={s.scriptHref}
          className="flex flex-1 items-center justify-center rounded-[6px] bg-brand-500 py-1.5 text-[11px] font-medium text-white hover:bg-brand-600"
        >
          Get script
        </Link>
      </div>
    </div>
  );
}

export default function HouseholdPage() {
  const [summaries, setSummaries] = useState<HouseholdFuelSummary[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    const h = getHousehold();
    const list = (["electricity", "bottled_lpg"] as FuelKind[])
      .map((k) => h[k])
      .filter((x): x is HouseholdFuelSummary => !!x);
    setSummaries(list);
    setLoaded(true);
  }, []);

  const total = summaries.reduce((sum, s) => sum + Math.max(0, s.annualSavingCents), 0);

  async function onShare() {
    const text = `FairBills found my household could save about ${dollars(total)} a year on energy. Check yours free:`;
    const url = typeof window !== "undefined" ? window.location.origin : "";
    try {
      if (navigator.share) {
        await navigator.share({ title: "FairBills", text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text} ${url}`);
      setShared(true);
      setTimeout(() => setShared(false), 1800);
    } catch {
      /* user dismissed share / clipboard unavailable */
    }
  }

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <main className="min-h-dvh bg-surface-muted px-5 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-4 flex items-center justify-between rounded-[12px] bg-surface px-5 py-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-[8px] bg-brand-500">
              <Zap className="size-4 text-white" />
            </span>
            <span className="text-[15px] font-medium">FairBills · Your household</span>
          </Link>
          <span className="text-xs text-text-tertiary">
            {summaries.length} bill{summaries.length === 1 ? "" : "s"}
          </span>
        </div>
        {children}
      </div>
    </main>
  );

  if (!loaded) return <Shell>{null}</Shell>;

  if (summaries.length === 0) {
    return (
      <Shell>
        <div className="rounded-[12px] bg-surface p-7 text-center">
          <p className="text-sm text-text-secondary">
            No bills checked yet. Start with one and we&rsquo;ll build your household picture.
          </p>
          <Link
            href="/check"
            className="mt-4 inline-flex h-11 items-center rounded-[8px] bg-brand-500 px-5 text-sm font-medium text-white"
          >
            Check a bill
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      {/* Combined total */}
      <div className="rounded-[12px] bg-brand-700 px-6 py-6">
        <div className="text-xs font-medium tracking-[0.5px] text-brand-400">
          {total > 0 ? "YOUR HOUSEHOLD IS OVERPAYING BY" : "YOUR HOUSEHOLD LOOKS SHARP"}
        </div>
        {total > 0 ? (
          <>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-[44px] font-medium tracking-[-1.5px] text-white">
                {dollars(total)}
              </span>
              <span className="text-base text-[#c0dd97]">a year</span>
            </div>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[#c0dd97]">
              Across the bills you&rsquo;ve checked. Work through each one below to claim it.
            </p>
          </>
        ) : (
          <p className="mt-2 text-[13px] leading-relaxed text-[#c0dd97]">
            Nothing clearly beats what you&rsquo;re paying right now. Leave your email and
            we&rsquo;ll re-check in 6 months.
          </p>
        )}
      </div>

      {/* Per-fuel cards */}
      <div className="mt-3 flex flex-col gap-2">
        {summaries.map((s) => (
          <FuelCard key={s.fuel} s={s} />
        ))}
      </div>

      {/* Add another bill */}
      <Link
        href="/check"
        className="mt-3 flex items-center gap-2.5 rounded-[8px] border-[0.5px] border-dashed border-black/30 bg-surface px-3.5 py-3 hover:bg-surface-muted"
      >
        <Plus className="size-4 shrink-0 text-text-tertiary" />
        <div className="flex-1">
          <div className="text-xs font-medium text-text-secondary">Add another bill</div>
          <div className="text-[10px] text-text-tertiary">Power, bottled gas, different property?</div>
        </div>
        <span className="text-[11px] font-medium text-info-600">Add →</span>
      </Link>

      {/* Actions */}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onShare}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-[8px] bg-brand-800 py-2.5 text-xs font-medium text-white hover:opacity-90"
        >
          {shared ? <Check className="size-3.5" /> : <Share2 className="size-3.5" />}
          {shared ? "Copied" : "Share saving"}
        </button>
        <a
          href="#remind"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-[8px] border-[0.5px] border-black/30 bg-surface py-2.5 text-xs font-medium text-text-primary hover:bg-surface-muted"
        >
          <Bell className="size-3.5" /> Remind in 6 months
        </a>
      </div>

      <div id="remind" className="mt-3">
        <EmailCapture />
      </div>

      <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-text-tertiary">
        <Copy className="size-3" /> Your household stays on this device — nothing is stored on our
        servers.
      </div>
    </Shell>
  );
}

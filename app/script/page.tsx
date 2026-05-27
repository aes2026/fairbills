"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, ChevronDown, Copy, Phone, Shield, Zap } from "lucide-react";

import { EmailCapture } from "@/components/email-capture";
import { BillSchema, PARSED_BILL_KEY, TOP_PICK_KEY, type ParsedBill } from "@/lib/bill";
import type { RankedPlan } from "@/lib/comparison";
import {
  PUSHBACK,
  buildMatchScript,
  buildSwitchScript,
  lookupRetailerPhone,
} from "@/lib/script";

type Tab = "match" | "switch";

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          /* clipboard unavailable */
        }
      }}
      className="inline-flex items-center gap-1.5 rounded-[8px] bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600"
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {copied ? "Copied" : label}
    </button>
  );
}

export default function ScriptPage() {
  const [bill, setBill] = useState<ParsedBill | null>(null);
  const [topPick, setTopPick] = useState<RankedPlan | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");
  const [tab, setTab] = useState<Tab>("match");
  const [pushbackOpen, setPushbackOpen] = useState(false);

  useEffect(() => {
    const rawBill = sessionStorage.getItem(PARSED_BILL_KEY);
    const rawPick = sessionStorage.getItem(TOP_PICK_KEY);
    if (!rawBill || !rawPick) return setState("missing");
    const parsed = BillSchema.safeParse(JSON.parse(rawBill));
    if (!parsed.success) return setState("missing");
    setBill(parsed.data);
    setTopPick(JSON.parse(rawPick) as RankedPlan);
    setState("ready");
  }, []);

  if (state === "loading") return null;

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <main className="min-h-full bg-surface-muted px-5 py-10">
      <div className="mx-auto w-full max-w-[560px] rounded-[12px] bg-surface p-7">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-[8px] bg-brand-500">
              <Zap className="size-4 text-white" />
            </span>
            <span className="text-[15px] font-medium">FairBills</span>
          </Link>
          <span className="text-xs text-text-tertiary">Step 3 of 3</span>
        </div>
        {children}
      </div>
    </main>
  );

  if (state === "missing" || !bill || !topPick) {
    return (
      <Shell>
        <p className="text-sm text-text-secondary">
          We need your comparison first to write the script.
        </p>
        <Link
          href="/results"
          className="mt-4 inline-flex h-11 items-center rounded-[8px] bg-brand-500 px-5 text-sm font-medium text-white"
        >
          Back to results
        </Link>
      </Shell>
    );
  }

  const scriptInput = {
    currentRetailer: bill.retailer_name,
    currentPlan: bill.plan_name,
    postcode: bill.postcode,
    topPickRetailer: topPick.retailer,
    topPickPlan: topPick.plan,
    rateLabel: topPick.rateLabel,
    supplyCents: topPick.supplyCents,
    savingCents: topPick.savingCents,
  };

  const currentRetailer = bill.retailer_name ?? "your retailer";
  const script = tab === "match" ? buildMatchScript(scriptInput) : buildSwitchScript(scriptInput);
  const callRetailer = tab === "match" ? currentRetailer : topPick.retailer;
  const phone = lookupRetailerPhone(callRetailer);

  return (
    <Shell>
      <h2 className="text-[22px] font-medium tracking-[-0.3px]">Two ways to play this.</h2>
      <p className="mt-1.5 mb-5 text-[13px] text-text-secondary">
        Most people get a better rate either way. Try Option A first — it&rsquo;s a
        4-minute phone call.
      </p>

      {/* Tabs */}
      <div className="mb-3 flex gap-1.5">
        <button
          type="button"
          onClick={() => setTab("match")}
          className={`flex-1 rounded-[8px] px-3 py-2.5 text-left ${
            tab === "match"
              ? "border-2 border-brand-500 bg-surface"
              : "border-[0.5px] border-black/15 bg-surface"
          }`}
        >
          <div
            className={`text-[11px] font-medium ${
              tab === "match" ? "text-brand-600" : "text-text-tertiary"
            }`}
          >
            OPTION A · RECOMMENDED
          </div>
          <div className="text-[13px] font-medium">Ask {currentRetailer} to match</div>
        </button>
        <button
          type="button"
          onClick={() => setTab("switch")}
          className={`flex-1 rounded-[8px] px-3 py-2.5 text-left ${
            tab === "switch"
              ? "border-2 border-brand-500 bg-surface"
              : "border-[0.5px] border-black/15 bg-surface"
          }`}
        >
          <div
            className={`text-[11px] font-medium ${
              tab === "switch" ? "text-brand-600" : "text-text-tertiary"
            }`}
          >
            OPTION B
          </div>
          <div className="text-[13px] font-medium text-text-secondary">
            Switch to {topPick.retailer}
          </div>
        </button>
      </div>

      {/* Phone callout */}
      <div className="mb-3 flex items-center justify-between rounded-[12px] border-[0.5px] border-black/15 bg-surface px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <Phone className="size-[18px] text-brand-500" />
          <div>
            <div className="text-[13px] text-text-secondary">
              {phone
                ? `Call ${callRetailer} on`
                : `Find ${callRetailer}'s number`}
            </div>
            <div className="text-base font-medium">
              {phone ?? "on your latest bill or their website"}
            </div>
          </div>
        </div>
        {phone && <CopyButton text={phone.replace(/\s/g, "")} />}
      </div>

      {/* Script */}
      <div className="mb-3 rounded-[12px] border-[0.5px] border-black/15 bg-surface px-5 py-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-[11px] font-medium tracking-[0.5px] text-text-tertiary uppercase">
            Your script
          </div>
          <CopyButton text={script} />
        </div>
        <p className="text-sm leading-relaxed whitespace-pre-line text-text-primary">{script}</p>
      </div>

      {/* If they push back (only relevant when negotiating) */}
      {tab === "match" && (
        <div className="overflow-hidden rounded-[12px] border-[0.5px] border-black/15 bg-surface">
          <button
            type="button"
            onClick={() => setPushbackOpen((o) => !o)}
            className="flex w-full items-center justify-between bg-surface-muted px-4 py-3"
          >
            <span className="flex items-center gap-2">
              <Shield className="size-4 text-text-secondary" />
              <span className="text-[13px] font-medium">If they push back</span>
            </span>
            <ChevronDown
              className={`size-4 text-text-tertiary transition-transform ${
                pushbackOpen ? "rotate-180" : ""
              }`}
            />
          </button>
          {pushbackOpen && (
            <div className="space-y-2.5 border-t border-black/10 px-4 py-3.5 text-[13px] leading-relaxed text-text-secondary">
              {PUSHBACK.map((p) => (
                <div key={p.objection}>
                  <span className="font-medium text-text-primary">{p.objection}</span> →{" "}
                  {p.response}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 6-month nudge */}
      <div className="mt-4">
        <EmailCapture
          postcode={bill.postcode}
          retailer={bill.retailer_name}
          savingCents={topPick.savingCents}
        />
      </div>
    </Shell>
  );
}

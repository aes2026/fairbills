"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  Mail,
  Phone,
  Shield,
  Zap,
} from "lucide-react";

import {
  LPG_INPUT_KEY,
  LPG_RESULT_KEY,
  type LpgComparisonInput,
  type LpgResult,
} from "@/lib/lpg";
import { generateLpgScript } from "@/lib/scripts/bottled-gas";

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

export default function BottledGasScriptPage() {
  const [result, setResult] = useState<LpgResult | null>(null);
  const [input, setInput] = useState<LpgComparisonInput | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");
  const [pushbackOpen, setPushbackOpen] = useState(false);

  useEffect(() => {
    const rawResult = sessionStorage.getItem(LPG_RESULT_KEY);
    const rawInput = sessionStorage.getItem(LPG_INPUT_KEY);
    if (!rawResult || !rawInput) return setState("missing");
    try {
      setResult(JSON.parse(rawResult) as LpgResult);
      setInput(JSON.parse(rawInput) as LpgComparisonInput);
      setState("ready");
    } catch {
      setState("missing");
    }
  }, []);

  if (state === "loading") return null;

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <main className="min-h-dvh bg-surface-muted px-5 py-10">
      <div className="mx-auto w-full max-w-2xl rounded-[12px] bg-surface p-6 sm:p-7">
        <div className="mb-6 flex items-center justify-between">
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

  if (state === "missing" || !result || !input) {
    return (
      <Shell>
        <p className="text-sm text-text-secondary">
          We need your comparison first to write the script.
        </p>
        <Link
          href="/check/bottled-gas/results"
          className="mt-4 inline-flex h-11 items-center rounded-[8px] bg-brand-500 px-5 text-sm font-medium text-white"
        >
          Back to results
        </Link>
      </Shell>
    );
  }

  const supplierName =
    result.currentSupplier === "Local / other" ? "your supplier" : result.currentSupplier;

  const script = generateLpgScript({
    currentSupplier: supplierName,
    currentPriceCents: result.currentPriceCents,
    bottleSizeKg: result.bottleSizeKg,
    alternatives: result.alternatives,
    accountNumber: input.account_number,
    customerName: input.customer_name,
    serviceAddress: input.service_address,
    tenureBucket: input.tenure_bucket,
  });

  const contacts = result.currentSupplierContacts;
  const phone = contacts?.phone ?? null;
  const email = contacts?.email ?? null;
  const contactUrl = contacts?.contactUrl ?? null;
  const mailto = email
    ? `mailto:${email}?subject=${encodeURIComponent("Loyalty pricing review request")}&body=${encodeURIComponent(script.body)}`
    : null;

  return (
    <Shell>
      <h2 className="text-[22px] font-medium tracking-[-0.3px]">The 4-minute phone call.</h2>
      <p className="mt-1.5 mb-1 text-[13px] text-text-secondary">
        Most loyal customers get a discount on the first ask.
      </p>
      {script.fullyAutoFilled && (
        <p className="mb-4 inline-flex items-center gap-1 text-[11px] text-brand-600">
          <Check className="size-3" /> Script ready — just call.
        </p>
      )}
      {!script.fullyAutoFilled && <div className="mb-4" />}

      {/* How to reach them */}
      <div className="mb-3 space-y-2">
        {phone && (
          <div className="flex items-center justify-between rounded-[12px] border-[0.5px] border-black/15 bg-surface px-4 py-3.5">
            <div className="flex items-center gap-2.5">
              <Phone className="size-[18px] text-brand-500" />
              <div>
                <div className="text-[13px] text-text-secondary">Call {supplierName} on</div>
                <div className="text-base font-medium">{phone}</div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <a
                href={`tel:${phone.replace(/\s/g, "")}`}
                className="inline-flex items-center rounded-[8px] bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600"
              >
                Call
              </a>
              <CopyButton text={phone.replace(/\s/g, "")} />
            </div>
          </div>
        )}

        {email ? (
          <div className="flex items-center justify-between gap-3 rounded-[12px] border-[0.5px] border-black/15 bg-surface px-4 py-3.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <Mail className="size-[18px] shrink-0 text-brand-500" />
              <div className="min-w-0">
                <div className="text-[13px] text-text-secondary">Prefer to write?</div>
                <div className="truncate text-sm font-medium">{email}</div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <CopyButton text={email} />
              <a
                href={mailto!}
                className="inline-flex items-center gap-1.5 rounded-[8px] border-[0.5px] border-black/30 px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-surface-muted"
              >
                Compose
              </a>
            </div>
          </div>
        ) : contactUrl ? (
          <a
            href={contactUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-[12px] border-[0.5px] border-black/15 bg-surface px-4 py-3.5 hover:bg-surface-muted"
          >
            <div className="flex items-center gap-2.5">
              <Mail className="size-[18px] text-brand-500" />
              <div>
                <div className="text-[13px] text-text-secondary">No public email</div>
                <div className="text-sm font-medium">Open {supplierName}&rsquo;s contact page</div>
              </div>
            </div>
            <ExternalLink className="size-4 text-info-600" />
          </a>
        ) : !phone ? (
          <div className="rounded-[12px] border-[0.5px] border-black/15 bg-surface px-4 py-3.5 text-[13px] text-text-secondary">
            Find {supplierName}&rsquo;s number on your last delivery receipt, then read them the
            script below.
          </div>
        ) : null}
      </div>

      {/* Script */}
      <div className="mb-3 rounded-[12px] border-[0.5px] border-black/15 bg-surface px-5 py-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-[11px] font-medium tracking-[0.5px] text-text-tertiary uppercase">
            Your script
          </div>
          <CopyButton text={script.body} />
        </div>
        <p className="text-sm leading-relaxed whitespace-pre-line text-text-primary">
          {script.body}
        </p>
        {script.placeholders.length > 0 && (
          <div className="mt-3 border-t border-black/10 pt-3">
            <div className="text-[11px] text-text-tertiary">
              Fill in before you call:
            </div>
            <ul className="mt-1 space-y-0.5">
              {script.placeholders.map((p) => (
                <li key={p.token} className="text-[11px] text-text-secondary">
                  <span className="font-medium text-text-primary">{p.label}</span>
                  {p.help ? ` — ${p.help}` : ""}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* If they push back */}
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
            {script.pushback.map((p) => (
              <div key={p.objection}>
                <span className="font-medium text-text-primary">{p.objection}</span> →{" "}
                {p.response}
              </div>
            ))}
          </div>
        )}
      </div>

      <Link
        href="/household"
        className="mt-4 flex h-11 w-full items-center justify-center gap-1.5 rounded-[8px] border-[0.5px] border-black/15 bg-surface text-sm font-medium text-text-primary hover:bg-surface-muted"
      >
        See your whole household
      </Link>
    </Shell>
  );
}

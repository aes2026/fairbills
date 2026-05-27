"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Flame, Loader2, Zap } from "lucide-react";

import { getSessionId } from "@/lib/household";
import {
  LPG_INPUT_KEY,
  LPG_PARSED_KEY,
  LPG_RESULT_KEY,
  LpgBillSchema,
  type LpgComparisonInput,
} from "@/lib/lpg";

const SUPPLIERS = ["Origin LPG", "Elgas", "Supagas", "Local / other"];

/** Best-effort map a free-text supplier name onto one of our known suppliers. */
function matchSupplier(name: string | null): string {
  const n = (name ?? "").toLowerCase();
  if (n.includes("origin")) return "Origin LPG";
  if (n.includes("elgas")) return "Elgas";
  if (n.includes("supagas")) return "Supagas";
  return "Local / other";
}

export default function BottledGasConfirmPage() {
  const router = useRouter();
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [supplier, setSupplier] = useState(SUPPLIERS[0]);
  const [size, setSize] = useState<9 | 45>(45);
  const [price, setPrice] = useState("");
  const [postcode, setPostcode] = useState("");
  const [account, setAccount] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");

  useEffect(() => {
    const raw = sessionStorage.getItem(LPG_PARSED_KEY);
    if (!raw) return setState("missing");
    const parsed = LpgBillSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return setState("missing");
    const b = parsed.data;
    setSupplier(matchSupplier(b.supplier_name));
    setSize(b.bottle_size_kg != null && b.bottle_size_kg < 20 ? 9 : 45);
    setPrice(b.price_per_bottle_cents != null ? (b.price_per_bottle_cents / 100).toFixed(2) : "");
    setPostcode(b.postcode ?? "");
    setAccount(b.account_number ?? "");
    setName(b.customer_name ?? "");
    setAddress(b.service_address ?? "");
    setState("ready");
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{4}$/.test(postcode)) {
      setError("Enter a valid 4-digit postcode.");
      return;
    }
    const dollars = Number(price.replace(/[^0-9.]/g, ""));
    if (!Number.isFinite(dollars) || dollars <= 0) {
      setError("Enter the price you paid per bottle.");
      return;
    }
    setSubmitting(true);
    setError(null);

    const input: LpgComparisonInput = {
      postcode,
      bottle_size_kg: size,
      current_supplier: supplier,
      price_per_bottle_cents: Math.round(dollars * 100),
      account_number: account.trim() || null,
      customer_name: name.trim() || null,
      service_address: address.trim() || null,
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

  if (state === "loading") return null;

  if (state === "missing") {
    return (
      <main className="min-h-dvh bg-surface-muted px-5 py-10">
        <div className="mx-auto w-full max-w-2xl rounded-[12px] bg-surface p-7 text-center">
          <p className="text-sm text-text-secondary">We don&rsquo;t have a receipt to check yet.</p>
          <Link
            href="/check/bottled-gas/upload"
            className="mt-4 inline-flex h-11 items-center rounded-[8px] bg-brand-500 px-5 text-sm font-medium text-white"
          >
            Upload a receipt
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
            <Flame className="size-3.5 text-warning-600" /> Is this right?
          </span>
        </div>

        <h2 className="text-2xl font-medium tracking-[-0.3px]">Does this look right?</h2>
        <p className="mt-2 mb-6 text-sm text-text-secondary">
          We pulled these from your receipt. Fix anything that&rsquo;s off before we compare.
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Supplier</label>
            <select className={inputCls} value={supplier} onChange={(e) => setSupplier(e.target.value)}>
              {SUPPLIERS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Bottle size</label>
            <div className="grid grid-cols-2 gap-1.5">
              {([45, 9] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSize(s)}
                  className={`rounded-[8px] py-2 text-sm font-medium ${
                    size === s
                      ? "border-2 border-brand-500 bg-brand-50 text-text-primary"
                      : "border-[0.5px] border-black/15 bg-surface text-text-primary"
                  }`}
                >
                  {s}kg
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelCls}>Price per bottle ($)</label>
            <input
              className={inputCls}
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ""))}
              placeholder="147.00"
            />
          </div>
          <div>
            <label className={labelCls}>Postcode</label>
            <input
              className={inputCls}
              inputMode="numeric"
              maxLength={4}
              value={postcode}
              onChange={(e) => setPostcode(e.target.value.replace(/\D/g, "").slice(0, 4))}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Account number</label>
            <input
              className={inputCls}
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              placeholder="Used in your script — stays on your device"
            />
          </div>
          <div>
            <label className={labelCls}>Name on the account</label>
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Service address</label>
            <input
              className={inputCls}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
        </div>

        <p className="mt-4 text-[11px] leading-relaxed text-text-tertiary">
          Your name, address and account number stay on your device — we use them only to fill in
          your phone script, and never store them.
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
              Looks right — check my price
              <ArrowRight className="size-4" />
            </>
          )}
        </button>
        <Link
          href="/check/bottled-gas/upload"
          className="mt-3 block text-center text-[13px] text-text-secondary hover:text-text-primary"
        >
          Start over
        </Link>
      </form>
    </main>
  );
}

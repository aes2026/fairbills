"use client";

import { useState } from "react";
import { Bell, Check, Loader2 } from "lucide-react";

interface EmailCaptureProps {
  postcode?: string | null;
  retailer?: string | null;
  savingCents?: number | null;
}

export function EmailCapture({ postcode, retailer, savingCents }: EmailCaptureProps) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("saving");
    setError(null);
    try {
      const res = await fetch("/api/follow-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          postcode: postcode ?? null,
          current_retailer: retailer ?? null,
          saving_estimate_cents: savingCents ?? null,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setState("done");
        return;
      }
      setError(data.error ?? "Couldn't save your email.");
      setState("error");
    } catch {
      setError("Couldn't reach the server. Try again.");
      setState("error");
    }
  }

  return (
    <div className="flex items-start gap-2.5 rounded-[8px] bg-info-50 px-4 py-3.5">
      <Bell className="mt-0.5 size-[18px] shrink-0 text-info-600" />
      <div className="flex-1">
        <div className="text-[13px] font-medium text-info-800">
          Want a nudge in 6 months?
        </div>
        {state === "done" ? (
          <div className="mt-1 flex items-center gap-1.5 text-xs text-info-600">
            <Check className="size-3.5" /> You&rsquo;re in. We&rsquo;ll quietly re-check in 6
            months — no spam.
          </div>
        ) : (
          <>
            <div className="mt-0.5 text-xs leading-relaxed text-info-600">
              Most discounts expire after 12 months. Drop your email and we&rsquo;ll quietly
              check your bills again — no spam, just savings.
            </div>
            <form onSubmit={onSubmit} className="mt-2.5 flex gap-2">
              <input
                type="email"
                required
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="min-w-0 flex-1 rounded-[8px] border-[0.5px] border-info-600/30 bg-surface px-3 py-2 text-[13px] text-text-primary outline-none focus:border-info-600"
              />
              <button
                type="submit"
                disabled={state === "saving"}
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[8px] bg-info-600 px-3.5 text-[13px] font-medium text-white hover:bg-info-800 disabled:opacity-50"
              >
                {state === "saving" ? <Loader2 className="size-3.5 animate-spin" /> : "Notify me"}
              </button>
            </form>
            {error && <div className="mt-1.5 text-[11px] text-danger-600">{error}</div>}
          </>
        )}
      </div>
    </div>
  );
}

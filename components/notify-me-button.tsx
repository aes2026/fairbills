"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";

type Utility = "nbn" | "mains_gas";

/**
 * Inline-expand launch-list capture. "Tell me when" → email field → confirmed.
 * No modal, no navigation — the button morphs in place.
 */
export function NotifyMeButton({ utility }: { utility: Utility }) {
  const [state, setState] = useState<"idle" | "expanded" | "saving" | "submitted">("idle");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (state === "submitted") {
    return (
      <div className="flex items-center gap-1.5 text-[13px] font-medium text-brand-600">
        <Check className="size-4" /> We&rsquo;ll let you know.
      </div>
    );
  }

  if (state === "expanded" || state === "saving") {
    return (
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setState("saving");
          setError(null);
          try {
            const res = await fetch("/api/notify-me", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email, utility }),
            });
            const data = await res.json();
            if (res.ok && data.ok) {
              setState("submitted");
              return;
            }
            setError(data.error ?? "Couldn't save your email.");
            setState("expanded");
          } catch {
            setError("Couldn't reach the server.");
            setState("expanded");
          }
        }}
        className="w-full"
      >
        <div className="flex gap-2">
          <input
            type="email"
            required
            autoFocus
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="min-w-0 flex-1 rounded-[8px] border-[0.5px] border-black/30 bg-surface px-3 py-2 text-[13px] text-text-primary outline-none focus:border-brand-500"
          />
          <button
            type="submit"
            disabled={state === "saving"}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[8px] bg-brand-500 px-3.5 text-[13px] font-medium text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {state === "saving" ? <Loader2 className="size-3.5 animate-spin" /> : "Notify"}
          </button>
        </div>
        {error && <div className="mt-1.5 text-[11px] text-danger-600">{error}</div>}
      </form>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setState("expanded")}
      className="inline-flex h-9 items-center rounded-[8px] border-[0.5px] border-black/30 bg-surface px-4 text-[13px] font-medium text-text-primary hover:bg-surface-muted"
    >
      Tell me when
    </button>
  );
}

import { CarFront, Sun, Sunset, Zap } from "lucide-react";

import type { ParsedBill } from "@/lib/bill";

/** A standard flat rate to value structural features against (c/kWh). */
const STANDARD_RATE_CENTS = 30;

interface Feature {
  icon: React.ReactNode;
  label: string;
  value: string;
}

/**
 * Makes the structural value of a complex plan visible: roughly how much each
 * feature (EV tariff, free midday window, solar feed-in) is worth per year
 * versus standard rates. Figures are estimates, scaled from the bill's period
 * to a year using a conservative ×12.
 */
export function PlanFeatureBreakdown({ bill }: { bill: ParsedBill }) {
  const features: Feature[] = [];

  if (bill.ev_tariff_present && bill.ev_tariff_kwh && bill.ev_tariff_rate_cents != null) {
    const annualKwh = bill.ev_tariff_kwh * 12;
    const saved = Math.round((annualKwh * (STANDARD_RATE_CENTS - bill.ev_tariff_rate_cents)) / 100);
    features.push({
      icon: <CarFront className="size-4" />,
      label: `EV tariff at ${Number(bill.ev_tariff_rate_cents.toFixed(2))}c/kWh`,
      value: `~$${Math.max(0, saved)}/yr vs standard rates`,
    });
  }

  if (bill.super_off_peak_present && bill.super_off_peak_kwh) {
    const annualKwh = bill.super_off_peak_kwh * 12;
    const rate = bill.super_off_peak_rate_cents ?? 0;
    const saved = Math.round((annualKwh * (STANDARD_RATE_CENTS - rate)) / 100);
    features.push({
      icon: <Sun className="size-4" />,
      label: "Free or near-free midday window",
      value: `~$${Math.max(0, saved)}/yr vs standard rates`,
    });
  }

  if (bill.solar_export_present && bill.solar_export_kwh && bill.solar_fit_cents_per_kwh != null) {
    const annualExport = bill.solar_export_kwh * 12;
    const credit = Math.round((annualExport * bill.solar_fit_cents_per_kwh) / 100);
    features.push({
      icon: <Sunset className="size-4" />,
      label: `Solar feed-in at ${Number(bill.solar_fit_cents_per_kwh.toFixed(2))}c/kWh`,
      value: `~$${credit}/yr credited back`,
    });
  }

  if (features.length === 0) {
    features.push({
      icon: <Zap className="size-4" />,
      label: "Your rates already sit near the cheapest available",
      value: "Good value",
    });
  }

  return (
    <div className="space-y-0.5">
      {features.map((f) => (
        <div
          key={f.label}
          className="flex items-center justify-between gap-3 border-b border-black/10 py-2.5 last:border-0"
        >
          <div className="flex items-center gap-2">
            <span className="text-brand-600">{f.icon}</span>
            <span className="text-[13px] text-text-primary">{f.label}</span>
          </div>
          <span className="shrink-0 text-[13px] font-medium text-brand-600">{f.value}</span>
        </div>
      ))}
    </div>
  );
}

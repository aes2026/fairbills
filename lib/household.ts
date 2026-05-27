/**
 * Client-side household state. The combined-household view is built entirely
 * from these localStorage summaries rather than the database — it keeps the
 * cross-fuel picture on the user's own device (consistent with our rule that
 * personal bill data stays client-side) and avoids double-counting when a
 * results page is revisited.
 */

export type FuelKind = "electricity" | "bottled_lpg";

export interface HouseholdFuelSummary {
  fuel: FuelKind;
  /** e.g. "Electricity · Origin" */
  title: string;
  /** e.g. "Switch to Tango Home Select" */
  action: string;
  annualSavingCents: number;
  /** Where the "View options / suppliers" button links. */
  resultHref: string;
  /** Where the "Get script" button links. */
  scriptHref: string;
  updatedAt: number;
}

export const HOUSEHOLD_KEY = "fairbills:household";
const SESSION_KEY = "fairbills:session-id";

/** Stable per-browser id, used to tag anonymised submissions for analytics. */
export function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function getHousehold(): Record<FuelKind, HouseholdFuelSummary | undefined> {
  if (typeof window === "undefined") return {} as Record<FuelKind, HouseholdFuelSummary>;
  try {
    const raw = window.localStorage.getItem(HOUSEHOLD_KEY);
    if (!raw) return {} as Record<FuelKind, HouseholdFuelSummary>;
    return JSON.parse(raw) as Record<FuelKind, HouseholdFuelSummary>;
  } catch {
    return {} as Record<FuelKind, HouseholdFuelSummary>;
  }
}

/** Record (or replace) the latest summary for one fuel type. */
export function setHouseholdFuel(summary: Omit<HouseholdFuelSummary, "updatedAt">): void {
  if (typeof window === "undefined") return;
  const current = getHousehold();
  current[summary.fuel] = { ...summary, updatedAt: Date.now() };
  window.localStorage.setItem(HOUSEHOLD_KEY, JSON.stringify(current));
}

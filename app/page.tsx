import Link from "next/link";
import {
  ArrowDownRight,
  ArrowRight,
  Clock,
  Code,
  Database,
  FileUp,
  HandCoins,
  Lock,
  MessageSquare,
  Search,
  ShieldCheck,
  Upload,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { getLiveStats } from "@/lib/stats";

export const revalidate = 60;

const heroTrust = [
  { icon: Lock, label: "No account needed" },
  { icon: HandCoins, label: "No commission, no kickbacks" },
  { icon: Clock, label: "5 minutes" },
];

const steps = [
  {
    icon: FileUp,
    step: "STEP 1",
    title: "Upload your bill",
    body: "A photo or PDF works. We pull your plan, usage and current rates automatically.",
  },
  {
    icon: Search,
    step: "STEP 2",
    title: "See the better deals",
    body: "We check every plan from all 77 retailers and rank them by what you’d actually pay.",
  },
  {
    icon: MessageSquare,
    step: "STEP 3",
    title: "Get the switch script",
    body: "Copy-paste message or phone script. Or ask your current retailer to match it first.",
  },
];

const trustPoints = [
  {
    icon: Database,
    title: "Government data",
    body: "Plans pulled live from the AER’s Energy Made Easy database. Same source the government uses.",
  },
  {
    icon: HandCoins,
    title: "No kickbacks",
    body: "We don’t take commission from retailers. The cheapest plan is the cheapest plan, full stop.",
  },
  {
    icon: Lock,
    title: "Your data stays yours",
    body: "No account required. Bills are processed and discarded. We never sell your details.",
  },
  {
    icon: Code,
    title: "Open source",
    body: "Code’s on GitHub. Don’t trust us — check it yourself or get someone you trust to.",
  },
];

const runnersUp = [
  { rank: "2nd", name: "AGL Value Saver", saving: "Save $312/yr" },
  {
    rank: "3rd",
    name: "Energy Locals Local Hero",
    saving: "Save $278/yr · 100% renewable",
  },
];

function fmtMoney(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString("en-AU")}`;
}

export default async function Home() {
  const stats = await getLiveStats();
  const hasData = !!stats && stats.reclaimedCents > 0;

  return (
    <main className="mx-auto w-full max-w-3xl bg-surface text-text-primary lg:max-w-4xl xl:max-w-5xl">
      {/* Top nav */}
      <header className="flex items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-[8px] bg-brand-500">
            <Zap className="size-5 text-white" />
          </span>
          <span className="text-lg font-medium">FairBills</span>
        </Link>
        <nav className="hidden items-center gap-5 sm:flex">
          <a href="#how-it-works" className="text-sm text-text-secondary hover:text-text-primary">
            How it works
          </a>
          <a href="#why-trust" className="text-sm text-text-secondary hover:text-text-primary">
            About
          </a>
          <a href="#" className="text-sm text-text-secondary hover:text-text-primary">
            FAQ
          </a>
        </nav>
      </header>

      {/* Hero */}
      <section className="px-6 pt-8 pb-12">
        <div className="mb-5 inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1.5">
          <ShieldCheck className="size-3.5 text-[#3b6d11]" />
          <span className="text-xs font-medium text-[#3b6d11]">
            Powered by official AER data · Free forever
          </span>
        </div>

        <h1 className="text-[32px] font-medium leading-[1.15] tracking-[-0.5px] md:text-[42px]">
          Your power company
          <br />
          is taking the piss.
        </h1>

        <p className="mt-4 mb-7 max-w-[520px] text-[17px] leading-relaxed text-text-secondary">
          Aussies on rollover plans are quietly overpaying by hundreds a year.
          Upload your bill — we’ll show you the cheapest plan for your house and
          write the script to switch in 5 minutes.
        </p>

        <div className="mb-9 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            variant="ghost"
            nativeButton={false}
            render={<Link href="/upload" />}
            className="h-11 w-full gap-2 rounded-[8px] bg-brand-500 px-[22px] text-[15px] text-white hover:bg-brand-600 hover:text-white sm:w-auto"
          >
            <Upload className="size-4" />
            Upload my bill
          </Button>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/quick-check" />}
            className="h-11 w-full rounded-[8px] border-[0.5px] border-black/30 bg-surface px-[22px] text-[15px] text-text-primary hover:bg-surface-muted sm:w-auto"
          >
            No bill? Estimate instead
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-x-7 gap-y-2 text-[13px] text-text-tertiary">
          {heroTrust.map(({ icon: Icon, label }) => (
            <span key={label} className="flex items-center gap-1.5">
              <Icon className="size-3.5" />
              {label}
            </span>
          ))}
        </div>
      </section>

      {/* Live ticker */}
      <section className="px-6 pb-12">
        <div className="rounded-[12px] bg-brand-800 p-7">
          {hasData ? (
            <>
              <p className="mb-3 text-center text-xs font-medium tracking-[1.5px] text-brand-400">
                SAVINGS WE’VE FOUND FOR AUSSIES
              </p>
              <p className="mb-[18px] text-center text-5xl font-medium tracking-[-2px] text-white tabular-nums">
                {fmtMoney(stats!.reclaimedCents)}
              </p>
              <div className="flex items-stretch justify-center gap-4 sm:gap-6">
                <div className="text-center">
                  <div className="text-xl font-medium text-brand-400">
                    {stats!.users.toLocaleString("en-AU")}
                  </div>
                  <div className="mt-0.5 text-[11px] text-[#c0dd97]">bills checked</div>
                </div>
                <div className="w-px bg-[#27500a]" aria-hidden />
                <div className="text-center">
                  <div className="text-xl font-medium text-brand-400">
                    {stats!.avgSavingCents != null ? fmtMoney(stats!.avgSavingCents) : "—"}
                  </div>
                  <div className="mt-0.5 text-[11px] text-[#c0dd97]">average saving</div>
                </div>
                <div className="w-px bg-[#27500a]" aria-hidden />
                <div className="text-center">
                  <div className="text-xl font-medium text-brand-400">~5 min</div>
                  <div className="mt-0.5 text-[11px] text-[#c0dd97]">typical time</div>
                </div>
              </div>
              <p className="mt-3.5 text-center text-[11px] text-brand-400">
                Live · updated every 60 seconds
              </p>
            </>
          ) : (
            <div className="text-center">
              <p className="mb-2 text-xs font-medium tracking-[1.5px] text-brand-400">
                FRESH OUT OF THE OVEN
              </p>
              <p className="mx-auto max-w-[420px] text-lg font-medium text-white">
                Be one of the first to claw back the loyalty tax.
              </p>
              <p className="mt-2 text-[13px] text-[#c0dd97]">
                Free, no account, about 5 minutes.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="px-6 pb-8">
        <h2 className="text-[22px] font-medium tracking-[-0.3px]">How it works</h2>
        <p className="mt-1.5 mb-7 text-sm text-text-secondary">
          Three steps. No sign-up. You’re in control the whole way.
        </p>

        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-3">
          {steps.map(({ icon: Icon, step, title, body }) => (
            <div
              key={step}
              className="rounded-[12px] border-[0.5px] border-black/15 bg-surface p-5"
            >
              <div className="mb-3.5 flex size-9 items-center justify-center rounded-[8px] bg-brand-50">
                <Icon className="size-[18px] text-brand-600" />
              </div>
              <div className="mb-1 text-[11px] font-medium tracking-[0.3px] text-brand-600">
                {step}
              </div>
              <div className="mb-1.5 text-[15px] font-medium">{title}</div>
              <p className="text-[13px] leading-snug text-text-secondary">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Sample result preview */}
      <section className="px-6 pb-8">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-[22px] font-medium tracking-[-0.3px]">
            A peek at what you’ll see
          </h2>
          <span className="text-xs text-text-tertiary">Sample · Armidale 2350</span>
        </div>

        <div className="rounded-[12px] border-[0.5px] border-black/15 bg-surface p-5">
          {/* Current plan */}
          <div className="mb-3.5 flex items-center justify-between rounded-[8px] bg-danger-50 px-4 py-3.5">
            <div>
              <div className="mb-0.5 text-[11px] font-medium tracking-[0.3px] text-danger-600">
                YOUR CURRENT PLAN
              </div>
              <div className="text-sm font-medium text-danger-800">
                Origin Predictable Plan · standing offer
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl font-medium text-danger-800">$2,184</div>
              <div className="text-[11px] text-danger-600">est. yearly cost</div>
            </div>
          </div>

          {/* Best for you */}
          <div className="mb-2 rounded-[8px] border-2 border-[#639922] bg-brand-100 px-4 py-3.5">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-[#639922] px-2.5 py-0.5 text-[11px] font-medium text-white">
                  Best for you
                </span>
                <span className="text-sm font-medium text-brand-700">
                  Tango Energy Home Select
                </span>
              </div>
              <div className="text-right">
                <div className="text-xl font-medium text-brand-700">$1,793</div>
                <div className="text-[11px] text-[#3b6d11]">est. yearly cost</div>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-[#639922]/25 pt-2.5">
              <div className="flex items-center gap-1 text-[13px] text-[#27500a]">
                <ArrowDownRight className="size-3.5" />
                Save $391/yr · no lock-in · pay on time discount
              </div>
              <span className="text-[13px] font-medium text-brand-700">Get script →</span>
            </div>
          </div>

          {/* Runners up */}
          {runnersUp.map(({ rank, name, saving }, i) => (
            <div
              key={rank}
              className={`flex items-center justify-between px-4 py-2.5 text-[13px] text-text-secondary ${
                i > 0 ? "border-t border-black/15" : ""
              }`}
            >
              <span>
                {rank}: {name}
              </span>
              <span>{saving}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Why trust this */}
      <section id="why-trust" className="px-6 pb-10">
        <h2 className="mb-[18px] text-[22px] font-medium tracking-[-0.3px]">
          Why you can trust this
        </h2>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          {trustPoints.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex items-start gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-info-50">
                <Icon className="size-4 text-info-600" />
              </div>
              <div>
                <div className="mb-0.5 text-sm font-medium">{title}</div>
                <p className="text-[13px] leading-snug text-text-secondary">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 pb-6">
        <div className="rounded-[12px] bg-brand-700 px-8 py-9 text-center">
          <h2 className="mb-2 text-[26px] font-medium text-brand-100">
            Stop paying the loyalty tax.
          </h2>
          <p className="mb-[22px] text-[15px] text-[#c0dd97]">
            It takes a coffee break. Costs you nothing.
          </p>
          <Button
            variant="ghost"
            nativeButton={false}
            render={<Link href="/upload" />}
            className="h-12 gap-2 rounded-[8px] bg-brand-400 px-7 text-[15px] text-brand-700 hover:bg-brand-400/90 hover:text-brand-700"
          >
            <Upload className="size-4" />
            Check my bill now
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="mx-6 flex flex-col gap-3 border-t border-black/15 px-0 pt-4 pb-6 text-xs text-text-tertiary sm:flex-row sm:items-center sm:justify-between">
        <span>FairBills · Made in Armidale, NSW</span>
        <div className="flex gap-4">
          <a href="#" className="hover:text-text-secondary">
            Privacy
          </a>
          <a href="#" className="hover:text-text-secondary">
            Terms
          </a>
          <a href="#" className="hover:text-text-secondary">
            GitHub
          </a>
        </div>
      </footer>
    </main>
  );
}

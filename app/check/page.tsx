import Link from "next/link";
import { ChevronRight, Flame, HelpCircle, ThermometerSun, Zap } from "lucide-react";

export const metadata = { title: "What are we checking? — FairBills" };

export default function CheckPage() {
  return (
    <main className="min-h-dvh bg-surface-muted px-5 py-10">
      <div className="mx-auto w-full max-w-2xl rounded-[12px] bg-surface p-6 sm:p-7">
        <Link href="/" className="mb-7 flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-[8px] bg-brand-500">
            <Zap className="size-4 text-white" />
          </span>
          <span className="text-[15px] font-medium">FairBills</span>
        </Link>

        <h2 className="text-[22px] font-medium tracking-[-0.3px]">What are we checking?</h2>
        <p className="mt-1.5 mb-5 text-sm text-text-secondary">
          Pick one to start. Add the others later for combined household savings.
        </p>

        {/* Electricity */}
        <Link
          href="/upload"
          className="mb-2.5 flex items-center gap-3.5 rounded-[12px] border-[0.5px] border-black/15 bg-surface px-[18px] py-4 hover:bg-surface-muted"
        >
          <span className="flex size-[42px] shrink-0 items-center justify-center rounded-[8px] bg-brand-50">
            <Zap className="size-[22px] text-brand-600" />
          </span>
          <span className="flex-1">
            <span className="flex items-center gap-2">
              <span className="text-[15px] font-medium">Electricity</span>
              <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] text-[#27500a]">
                Most common
              </span>
            </span>
            <span className="mt-0.5 block text-xs text-text-secondary">
              Upload your power bill · about 8 seconds
            </span>
          </span>
          <ChevronRight className="size-[18px] text-text-tertiary" />
        </Link>

        {/* Bottled LPG */}
        <Link
          href="/check/bottled-gas/start"
          className="relative mb-2.5 flex items-center gap-3.5 rounded-[12px] border-2 border-brand-500 bg-surface px-[18px] py-[18px] hover:bg-brand-50"
        >
          <span className="absolute -top-2.5 left-3.5 rounded-full bg-brand-500 px-2.5 py-0.5 text-[10px] font-medium tracking-[0.3px] text-white">
            NEW · BIGGEST SAVINGS
          </span>
          <span className="flex size-[42px] shrink-0 items-center justify-center rounded-[8px] bg-warning-50">
            <Flame className="size-[22px] text-warning-600" />
          </span>
          <span className="flex-1">
            <span className="block text-[15px] font-medium">Bottled gas (LPG)</span>
            <span className="mt-0.5 block text-xs text-text-secondary">
              Refilled bottles · Origin, Elgas, Supagas · 30 sec
            </span>
          </span>
          <ChevronRight className="size-[18px] text-brand-600" />
        </Link>

        {/* Mains gas */}
        <Link
          href="/check/mains-gas/upload"
          className="flex items-center gap-3.5 rounded-[12px] border-[0.5px] border-black/15 bg-surface px-[18px] py-4 hover:bg-surface-muted"
        >
          <span className="flex size-[42px] shrink-0 items-center justify-center rounded-[8px] bg-brand-50">
            <ThermometerSun className="size-[22px] text-brand-600" />
          </span>
          <span className="flex-1">
            <span className="block text-[15px] font-medium">Mains gas (piped)</span>
            <span className="mt-0.5 block text-xs text-text-secondary">
              If your gas comes through pipes, not bottles
            </span>
          </span>
          <ChevronRight className="size-[18px] text-text-tertiary" />
        </Link>

        <div className="mt-4 flex items-start gap-2.5 rounded-[8px] bg-info-50 px-3.5 py-3">
          <HelpCircle className="mt-0.5 size-4 shrink-0 text-info-600" />
          <p className="text-xs leading-relaxed text-info-800">
            <span className="font-medium text-info-600">Not sure?</span> If a driver delivers
            bottles to your property, it&rsquo;s bottled. If it just arrives through a pipe,
            it&rsquo;s mains.
          </p>
        </div>
      </div>
    </main>
  );
}

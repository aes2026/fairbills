import Link from "next/link";
import { FileText, Flame, Zap } from "lucide-react";

export const metadata = { title: "Bottled gas check — FairBills" };

export default function BottledGasStartPage() {
  return (
    <main className="min-h-dvh bg-surface-muted px-5 py-10">
      <div className="mx-auto w-full max-w-2xl rounded-[12px] bg-surface p-6 sm:p-7">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-[8px] bg-brand-500">
              <Zap className="size-4 text-white" />
            </span>
            <span className="text-[15px] font-medium">FairBills</span>
          </Link>
          <span className="flex items-center gap-1.5 text-xs text-text-tertiary">
            <Flame className="size-3.5 text-warning-600" /> Bottled gas check
          </span>
        </div>

        <h2 className="text-[22px] font-medium tracking-[-0.3px]">Two ways to do this.</h2>
        <p className="mt-1.5 mb-5 text-sm text-text-secondary">Pick whatever&rsquo;s easiest.</p>

        <Link
          href="/check/bottled-gas/upload"
          className="mb-3 flex items-start gap-3.5 rounded-[12px] border-[0.5px] border-black/15 bg-surface px-[18px] py-4 hover:bg-surface-muted"
        >
          <span className="flex size-[42px] shrink-0 items-center justify-center rounded-[8px] bg-brand-50">
            <FileText className="size-[22px] text-brand-600" />
          </span>
          <span className="flex-1">
            <span className="block text-[15px] font-medium">I have a bill or receipt</span>
            <span className="mt-0.5 block text-xs text-text-secondary">
              Upload a PDF or photo · about 8 seconds
            </span>
            <span className="mt-1 inline-block rounded-full bg-brand-100 px-2 py-0.5 text-[10px] text-[#27500a]">
              Most accurate
            </span>
          </span>
        </Link>

        <Link
          href="/check/bottled-gas/quick"
          className="flex items-start gap-3.5 rounded-[12px] border-[0.5px] border-black/15 bg-surface px-[18px] py-4 hover:bg-surface-muted"
        >
          <span className="flex size-[42px] shrink-0 items-center justify-center rounded-[8px] bg-warning-50">
            <Flame className="size-[22px] text-warning-600" />
          </span>
          <span className="flex-1">
            <span className="block text-[15px] font-medium">No bill handy</span>
            <span className="mt-0.5 block text-xs text-text-secondary">
              Answer 5 quick questions · about 30 seconds
            </span>
            <span className="mt-1 block text-[11px] text-text-tertiary">
              Still gets you a solid estimate
            </span>
          </span>
        </Link>
      </div>
    </main>
  );
}
